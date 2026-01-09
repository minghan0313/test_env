import time
import random
from playwright.sync_api import sync_playwright
from utils.image_tool import save_base64_img
from utils.captcha_solver import CaptchaSolver
import config

class AuthManager:
    @classmethod
    def get_access_token(cls):
        """执行登录流程，成功返回token，失败返回None"""
        with sync_playwright() as p:
            # 1. 启动环境
            browser = p.chromium.launch(headless=False) 
            context = browser.new_context(no_viewport=True)
            page = context.new_page()
            
            try:
                # 2. 登录操作
                page.goto(config.LOGIN_URL)
                page.fill('input[formcontrolname="userName"]', config.USER_NAME)
                page.fill('input[formcontrolname="password"]', config.PASSWORD)
                page.click(".lodin_yanzheng button")
                
                # 3. 验证码处理
                page.wait_for_selector(".SVdivimg02 img", state="visible")
                time.sleep(1) # 等待图片加载完毕
                
                bg_src = page.evaluate('document.querySelector(".SVdivimg02 img").src')
                tmp_path = "temp_captcha.png"
                save_base64_img(bg_src, tmp_path)
                
                # 识别距离
                distance = CaptchaSolver.get_gap_x(tmp_path)
                if distance is None: raise Exception("未能识别缺口")
                
                # 缩放转换
                rect = page.locator(".SVdivimg02").bounding_box()
                real_move = (distance - 5) * (rect['width'] / 350)
                
                # 模拟滑动
                cls._human_move(page, real_move)
                
                # 4. 提交并等待跳转
                page.wait_for_timeout(1000)
                page.click(".login-form-button")
                page.wait_for_url(config.TARGET_URL, timeout=10000)
                
                # 5. 提取Token
                token = cls._retry_get_local_storage(page, "token")
                return token
                
            except Exception as e:
                print(f"AuthManager 运行异常: {e}")
                return None
            finally:
                browser.close()

    @staticmethod
    def _human_move(page, distance):
        """私有方法：模拟人类滑动轨迹"""
        slider = page.locator("#SVdivimg04")
        box = slider.bounding_box()
        start_x, start_y = box['x'] + box['width']/2, box['y'] + box['height']/2
        
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        
        # 渐进式滑动逻辑
        curr_x = start_x
        target_x = start_x + distance
        while curr_x < target_x:
            step = (target_x - curr_x) / random.uniform(2, 4)
            if step < 1: break
            curr_x += step
            page.mouse.move(curr_x, start_y + random.uniform(-1, 1))
            time.sleep(random.uniform(0.01, 0.03))
        
        page.mouse.move(target_x, start_y)
        time.sleep(0.5)
        page.mouse.up()

    @staticmethod
    def _retry_get_local_storage(page, key):
        """重试机制获取LocalStorage"""
        token_key = key
        token_value = page.evaluate(f'localStorage.getItem("{token_key}")')

        if token_value: 
            #token_value = "bearer "+ token_value
            return token_value
        time.sleep(0.5)

        return None
    

# staticmethod不能访问类中的任何资源，它只能执行预定义好的功能，没有强制要求参数，可以有参数也可以没有参数，有参数的情况下，不强制第一个参数为类cls
# classmethod第一个参数就必须强制为cls，然后可以通过cls来访问和使用类中的数据和方法