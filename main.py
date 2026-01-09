import os
import config
from core.auth_manager import AuthManager
from core.data_fetcher import DataFetcher
from core.report_generator import ReportGenerator


def main():
    #主流程需要Token，直接向AuthManager要本地缓存的token
    #验证不通过或者没有的话，AuthManager会自己再去网站抓取并保存和返回
    token = AuthManager.get_local_token()
    
    if not token:
        print("流程终止：未能获取到有效 Token。")
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
        "2026-01-09 00:00:00", 
        "2026-01-09 23:00:00",
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