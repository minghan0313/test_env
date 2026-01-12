import time
import logging
from datetime import datetime, timedelta
import config
from core.auth_manager import AuthManager
from core.data_fetcher import DataFetcher
from core.sql_manager import SQLManager


# 配置日志，方便后台服务排查
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CollectionEngine:
    def __init__(self):
        self.db = SQLManager()
        # 引用已有的设备字典
        self.devices = config.DEVICES 
        #新增 DataFetcher引用
        self.fetcher = DataFetcher()
    def fetch_and_store(self, target_time, name, port_id,data_type):
        """执行单次数据抓取与入库"""
        token = AuthManager.get_local_token()
        begin_time = target_time.strftime('%Y-%m-%d %H:%M:%S')
        end_time_obj = target_time + timedelta(minutes=5)
        end_time = end_time_obj.strftime('%Y-%m-%d %H:%M:%S')
        #网站中各设备的小时数据不是整点算出的，通常都比整点晚。
        #比如想差11:00的数据，你开始时间和结束时间都使用11:00是查不到数据的，保险的话，将时间延后5分钟
        #异常重试逻辑
        for attempt in range(config.RETRY_COUNT):
            try:
                # 调用你原有的 DataFetcher.fetch_online_data
                # 主要是抓取小时数据
                data_list = self.fetcher.fetch_online_data(
                    token, port_id, begin_time, end_time, data_type
                )
                
                if data_list and len(data_list) > 0:
                    self.db.save_entry(name, data_list[0])
                    return True
                else:
                    print(f"[{name}] {begin_time} 暂无数据更新")
                    logging.warning(f"[{name}] {begin_time} 暂无数据, 重试中...")
            except Exception as e:
                print(f"[{name}] 采集异常(第{attempt+1}次): {e}")
            
            time.sleep(config.RETRY_INTERVAL)
        return False

    def run_sync(self):
        """自动补全逻辑（补课模式）"""
        logging.info(">>> 正在检查历史数据完整性...")
        # 核心修正：
        # 如果现在是 14:40，now 变成 14:00
        # latest_available 变成 13:00
        # 这确保了补课逻辑最高只补到网站已生成的最新小时数据
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        latest_available = now - timedelta(hours=1)

        for name, port_id in self.devices.items():
            # 获取数据库最后一条小时数据的时间
            last_time = self.db.get_last_time(name) 
            
            # 如果没数据，默认补最近 24 小时
            if not last_time:
                last_time = latest_available - timedelta(hours=24)
            
            # 补齐从最后时间到当前小时的所有缺口
            check_time = last_time + timedelta(hours=1)
            # 修改点：while 条件从 <= now 改为 <= latest_available
            #while check_time <= now:
            while check_time <= latest_available:
                logging.info(f"正在补齐 {name} 历史数据: {check_time}")
                success = self.fetch_and_store(check_time, name, port_id, config.DATA_TYPES["HOUR"])
                if not success:
                    # 如果补课失败，跳过该小时或记录错误，不阻塞后续流程
                    print(f"无法补齐 {name} {check_time} 的数据")
                    logging.error(f"无法补齐 {name} {check_time} 的数据")
                check_time += timedelta(hours=1)
        
        logging.info(">>> 历史数据对齐完成。")   


    def run_catch_up(self):
        """
        补课逻辑：程序启动时，自动补齐从上次运行至今的所有缺漏数据。
        """
        print(">>> 启动自动补课自检...")
        now_minute = datetime.now().replace(second=0, microsecond=0)
        
        for name, port_id in self.devices.items():
            #SQLManager类中有get_last_time函数
            last_time = self.db.get_last_time(name)
            
            # 如果是新库，默认补齐今天凌晨之后的所有数据
            if not last_time:
                last_time = now_minute.replace(hour=0, minute=0) - timedelta(minutes=1)
            
            # 补课区间：(最后一条时间 + 1min) -> 当前前一分钟
            check_time = last_time + timedelta(minutes=1)
            while check_time < now_minute:
                print(f"正在补录数据 [{name}] 时间: {check_time}")
                self.fetch_and_store(check_time, name, port_id,config.DATA_TYPES["HOUR"])
                check_time += timedelta(minutes=1)
                
        print(">>> 历史数据对齐完成。")
        logging.info(">>> 历史数据对齐完成。")

    def start_service(self):
            self.run_sync() # 启动先补历史数据
            
            logging.info(">>> 后台采集服务已启动...")
            while True:
                now = datetime.now()
                # 1. 强制对齐到下一个整点 02 分
                next_run = (now + timedelta(hours=1)).replace(minute=2, second=0, microsecond=0)
                wait_seconds = (next_run - now).total_seconds()
                # 2. 如果 wait_seconds 超过 3600 (比如现在是 5:01，算出来下个点是 6:02)
                # 这种计算逻辑很稳，能保证即便采集稍微超时，也会找准下一个整点
                
                logging.info(f"等待下一次采集，目标时间: {next_run.strftime('%H:%M:%S')}")
                time.sleep(wait_seconds)
                
                # 3. 采集的时候，target_time 应该取“当前小时的整点”
                # 这样即便 6:02 唤醒，采的也是 6:00 的小时数据
                target_time =(datetime.now() - timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
                
                for name, port_id in self.devices.items():
                    self.fetch_and_store(target_time, name, port_id, config.DATA_TYPES["HOUR"])