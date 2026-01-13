from core.collection_engine import CollectionEngine
from core.auth_manager import AuthManager

def main():
    print("=== 环保数据采集后台服务启动 ===")

    # 1. 基础环境校验
    # 启动前先确保 Token 能拿通，如果这里报错，说明网络或账号有问题，直接报错提醒人工干预
    print("正在校验登录凭证...")
    token = AuthManager.get_local_token()
    if not token:
        print("致命错误：无法获取有效 Token，请检查账号配置或网络状态。")
        return

    # 2. 实例化采集引擎
    # 所有的设备循环、时间计算、补课逻辑、异常重试全部封装在 engine 内部
    engine = CollectionEngine()
    
    try:
        # 3. 启动补课逻辑 (同步执行)
        # 这一步会根据数据库 MAX(time) 自动追平所有历史缺失数据
        engine.sync_hourly() 
        
        # 4. 启动实时采集服务 (持久运行)
        # 这里会进入你设计的每小时 02 分执行的死循环
        print(">>> 后台采集引擎已进入就绪状态。")
        engine.start_service()
        
    except KeyboardInterrupt:
        print("\n用户手动停止服务。")
    except Exception as e:
        print(f"服务发生非预期崩溃: {e}")

if __name__ == "__main__":
    main()