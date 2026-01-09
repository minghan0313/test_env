import os
from utils.token_manager import TokenManager
from core.auth_manager import AuthManager
from core.data_fetcher import DataFetcher
from core.report_generator import ReportGenerator
import config


def get_workable_token():
    """
    自动化 Token 逻辑闭环：
    1. 读本地缓存 -> 2. 验证有效性 -> 3. 若失效则 UI 登录 -> 4. 拿到新 Token 立即回写本地
    """
    
    # --- 步骤 1: 尝试从本地加载 ---
    cached_token = TokenManager.get_token()
    
    if cached_token:
        # --- 步骤 2: 验证有效性 ---
        print("💡 正在验证本地 Token 有效性...")
        # 注意：这里的 'TEST_ID' 实际运行时请换成 config.py 中的一个真实 portId
        test_res = DataFetcher.fetch_online_data(cached_token, config.DEVICES["SOUTH_2"], "2025-01-01 00:00:00", "2025-01-01 00:05:00")
        
        if test_res is not None:
            print("🚀 本地缓存有效，跳过浏览器登录！")
            return cached_token
        else:
            print("⏳ 缓存 Token 已过期。")

    # --- 步骤 3: 本地不可用，执行 UI 自动化登录 ---
    print("🖥️ 启动自动化登录流程...")
    new_token = AuthManager.get_access_token()
    
    if new_token:
        # --- 步骤 4: 【核心修复点】拿到新 Token 后立即保存到本地文件 ---
        TokenManager.save_token(new_token)
        print("✅ 新 Token 已成功回写，下次运行将直接读取缓存。")
        return new_token
    
    print("❌ 登录失败，无法获取 Token。")
    return None




def main():

    token = get_workable_token()
    
    if not token:
        print("🔴 流程终止：未能获取到有效 Token。")
        return
    
    print("启动自动化组件...")
    # 直接调用核心组件获取 Token
    #token = AuthManager.get_access_token()
    
    # if token:
    #     print(f"获取成功！Token 前 30 位: {token[:30]}")
        # 2. 抓取数据（传入设备ID和时间）
    raw_data = DataFetcher.fetch_online_data(
        token, 
        config.DEVICES["SOUTH_1"], 
        "2026-01-07 00:00:00", 
        "2026-01-08 00:00:00",
        config.DATA_TYPES["HOUR"]
    )
    print(raw_data)
        
        # # 3. 生成 SQL 或保存
        # sql = DataFetcher.generate_sql(raw_data)
        # with open("insert_task.sql", "w") as f:
        #     f.write(sql)


    base_dir = os.path.dirname(os.path.abspath(__file__))
    # 拼接出 Excel 的完整绝对路径
    template_full_path = os.path.join(base_dir, "template.xlsx")

    # C. 一键生成“带智能预警”的报表
    ReportGenerator.generate_daily_report(
        template_path=template_full_path,
        output_path="生产调度管控日报_AI自动生成.xlsx",
        all_data=raw_data
    )
if __name__ == "__main__":
    main()