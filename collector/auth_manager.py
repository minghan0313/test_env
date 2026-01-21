import time
import random
from playwright.sync_api import sync_playwright
from utils.image_tool import save_base64_img
from utils.captcha_solver import CaptchaSolver
from utils.token_manager import TokenManager
from data_fetcher import DataFetcher
import sys
from pathlib import Path

# 获取当前文件的爷爷目录（即项目根目录）
# __file__ 是 collector/main.py
# .resolve().parents[1] 就是项目根目录 Auto/
root_path = str(Path(__file__).resolve().parents[1])

if root_path not in sys.path:
    sys.path.insert(0, root_path)
from core import settings  # 导入模块本身

class AuthManager:
    # --- 新增内部变量：记录上次验证的时间，避免短时间内重复验证 ---
    _last_verify_time = 0

    #将main中的本地从保存的Token验证逻辑放入到core中，降低main的耦合
    @classmethod
    def get_local_token(cls,force_refresh=False):
        """
        统一获取Token的入口
        优化思路：
        1. 只要 force_refresh 为 False，优先信任本地缓存，减少验证请求。
        2. 如果本地没缓存，或者被外部明确告知 Token 已失效（force_refresh=True），才执行 UI 登录。
        """
        #查是否有保存的Token
        cached_token = TokenManager.get_token()
        #优化逻辑：如果外部没强制要求刷新，且我们有缓存，直接返回
        # 理由：避免 CollectionEngine 每一轮循环的每一个设备抓取前都发一次验证请求给服务器
        if cached_token and not force_refresh:
            return cached_token
        
        # 验证是否有效 (仅在没有缓存，或外部要求强制刷新时才执行)
        if cached_token and force_refresh:
            print("收到强制刷新请求，正在准备重新登录...")

        # 3、缓存不存在或已确认失效，执行UI自动化登录
        print("正在重新登录获取新的Token...")
        new_token = cls.get_access_token()

        if new_token:
            TokenManager.save_token(new_token)
            print("新Token已经写入缓存")
            return new_token
        
        return None
        # if cached_token:
        #     print("正在验证本地Token有效性...")
        #     try:
        #         #使用配置中的设备进行验证
        #         test_res = DataFetcher.fetch_online_data(cached_token,settings.DEVICES["SOUTH_2"],"2025-01-01 00:00:00","2025-01-01 00:05:00")
        #         if test_res is not None:
        #             print("本地缓存有效，跳过浏览器登录")
        #             return cached_token
        #     except Exception as e:
        #         print("网站服务出现异常")
        # #2、缓存部存在或失效，执行UI自动化登录
        # print("正在重新登录获取新的Token...")
        # new_token= cls.get_access_token()
        # if new_token:
        #     TokenManager.save_token(new_token)
        #     print("新Token已经写入缓存")
        #     return new_token

    @classmethod
    def get_access_token(cls):
        """执行登录流程，成功返回token，失败返回None"""
        with sync_playwright() as p:
            # 1. 启动环境
            browser = p.chromium.launch(headless=False) 
            #context = browser.new_context(no_viewport=True)
            #修改，模拟真实浏览器环境，减少被识别为爬虫的概率 ---
            context = browser.new_context(
                no_viewport=True,
                user_agent=settings.USER_AGENT # 使用与 DataFetcher 一致的 UA
            )
            page = context.new_page()
            
            try:
                # 2. 登录操作
                page.goto(settings.LOGIN_URL)
                page.fill('input[formcontrolname="userName"]', settings.USER_NAME)
                page.fill('input[formcontrolname="password"]', settings.PASSWORD)
                page.click(".lodin_yanzheng button")
                
                # 3. 验证码处理
                page.wait_for_selector(".SVdivimg02 img", state="visible")
                time.sleep(1) # 等待图片加载完毕
                
                bg_src = page.evaluate('document.querySelector(".SVdivimg02 img").src')
                tmp_path = "../utils/temp_captcha.png"
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
                page.wait_for_url(settings.TARGET_URL, timeout=10000)
                
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
        for i in range(5): # 最多尝试 5 次
            token_value = page.evaluate(f'localStorage.getItem("{key}")')
            if token_value:
                return token_value
            time.sleep(1)
        return None
    

# staticmethod不能访问类中的任何资源，它只能执行预定义好的功能，没有强制要求参数，可以有参数也可以没有参数，有参数的情况下，不强制第一个参数为类cls
# classmethod第一个参数就必须强制为cls，然后可以通过cls来访问和使用类中的数据和方法