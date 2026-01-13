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
        #SQLManager类的引用
        self.db = SQLManager()
        #配置文件的引用
        self.devices = config.DEVICES 
        #DataFetcher类的引用
        self.fetcher = DataFetcher()
    #根据时间、设备名称、报表类型来存储单条数据，目前默认是存储小时报表，但是后续肯定得有分钟报表。
    #而且分钟报表和小时报表的数据结构不同，肯定是要做筛选的
    
    def fetch_and_store(self, target_time, name, port_id,data_type):
        """执行单次数据抓取与入库"""

        """增强版：带有数据质量校验的抓取"""
        token = AuthManager.get_local_token()
        #小时报表的开始和结束时间设置。
        #网站中各设备的小时数据不是整点算出的，通常都比整点晚。
        #比如想差11:00的数据，你开始时间和结束时间都使用11:00是查不到数据的，保险的话，将时间延后5分钟

        begin_time = target_time.strftime('%Y-%m-%d %H:%M:%S')
        # end_time_obj = target_time + timedelta(minutes=5)
        # #end_time比起始时间多5分钟。起始时间是11:00的话，结束时间就是11:05
        # end_time = end_time_obj.strftime('%Y-%m-%d %H:%M:%S')


        if data_type == config.DATA_TYPES["HOUR"]:
            # 窗口补偿delay：小时报表延迟通常比分钟报表长
            # 小时报表：延后5分钟以确保数据已生成
            delay = 5
            end_time = (target_time + timedelta(minutes=delay)).strftime('%Y-%m-%d %H:%M:%S')
        else:
            # 分钟报表：经过实际观察，每台锅炉的分钟报表延后时间不等，最长的延后5分钟
            # 小时报表：延后5分钟以确保数据已生成
            delay = 2 
            end_time = (target_time + timedelta(minutes=delay)).strftime('%Y-%m-%d %H:%M:%S')


        #异常重试逻辑
        for attempt in range(config.RETRY_COUNT):
            try:
                # 调用你原有的 DataFetcher.fetch_online_data
                # 暂时是抓取小时报表数据，后续要补充分钟报表的数据
                data_list = self.fetcher.fetch_online_data(
                    token, port_id, begin_time, end_time, data_type
                )  
                #如果查到的数据行数大于0
                #这个判断条件不是还好，因为网页API只要是正确的时间，哪怕没有生产数据，也会返回单列值为"-"的数据行
                if data_list and len(data_list) > 0:
                    #这里可以考虑加入对数据行的判断，
                    #如果数据行的stop-stopDcsType列不为"-"，则说明当前锅炉是停机状态，那么其他列的数据就可以是"-"
                    #反之就是正常运行状态，如果有数据列的值为"-"，说明网站查询的数据有误，应该重试或者进行其他处理方式，至少是不写入数据库，下次查询到一并补充
                    entry = data_list[0]
                    #根据上面注释的内容，进行数据有效性判断逻辑
                    # 检查停机状态字段：stop-stopDcsType
                    stop_type = entry.get('stop-stopDcsType', '-')
                    # 如果 stop_type 不为 "-"，说明是【已知停机】状态
                    if stop_type != "-":
                        logging.info(f"[{name}] {begin_time} 设备停机({stop_type})，允许空数据入库")
                        self.db.save_entry(name, entry,config.DATA_TYPES['HOUR'])
                        return True
                    # 如果是正常运行状态 (stop_type == "-")
                    else:
                        # 检查关键数据列（如氮氧化物 a21026-cou 或 流量 a00000-cou）是否为 "-"
                        # 只要有一个关键排放指标是 "-"，说明网站数据还没结算好
                        nox_val = entry.get('a21026-cou', '-')
                        if nox_val == "-":
                            logging.warning(f"[{name}] {begin_time} 运行中但关键指标为'-' (未结算)，触发第{attempt+1}次重试...")
                            # 不 return，进入下一次循环重试
                        else:
                            # 数据正常，写入数据库
                            self.db.save_entry(name, entry,config.DATA_TYPES['HOUR'])
                            logging.info(f"[{name}] {begin_time} 数据采集并校验成功")
                            return True
                    self.db.save_entry(name, data_list[0],config.DATA_TYPES['HOUR'])
                    return True
                else:
                    print(f"[{name}] {begin_time} 暂无数据更新")
                    logging.warning(f"[{name}] {begin_time} 暂无数据, 重试中...")
            except Exception as e:
                print(f"[{name}] 采集异常(第{attempt+1}次): {e}")
            #如果全部没有正常return，说明需要重新采集
            #根据配置文件中设定，等待60秒，重试次数最多为7次，即7分钟
            time.sleep(config.RETRY_INTERVAL)
        return False

    def sync_hourly(self):
        logging.info(">>> 正在检查历史数据完整性...")
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        latest_available = now - timedelta(hours=1)

        for name, port_id in self.devices.items():
            last_time = self.db.get_last_time(name,config.DATA_TYPES['HOUR']) 
            if not last_time:
                last_time = latest_available - timedelta(hours=24)
            
            check_time = last_time + timedelta(hours=1)
            while check_time <= latest_available:
                logging.info(f"正在补齐 {name} 历史数据: {check_time}")
                success = self.fetch_and_store(check_time, name, port_id, config.DATA_TYPES["HOUR"])
                
                if success:
                    # 只有成功了才继续往后走
                    check_time += timedelta(hours=1)
                else:
                    # 如果这个时间点死活采不到（比如网站还没出数），
                    # 停止补齐当前设备，防止后面全是空跑，等下次轮询再试
                    logging.warning(f"[{name}] {check_time} 补齐中断，等待下次同步")
                    break 
        logging.info(">>> 历史数据自检完成。")


    def sync_minutes(self, start_time, end_time):
        """同步指定时段的分钟均值数据 (批量模式)"""
        begin_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
        token = AuthManager.get_local_token()
        data_type = config.DATA_TYPES["MINUTE"]

        for name, port_id in self.devices.items():
            try:
                # 一次性获取该时段所有分钟数据
                data_list = self.fetcher.fetch_online_data(
                    token, port_id, begin_str, end_str, data_type
                )
                if data_list:
                    count = 0
                    for entry in data_list:
                        if self.db.save_entry(name, entry, data_type):
                            count += 1
                    logging.info(f"[{name}] 批量补录 {count} 条分钟数据")
            except Exception as e:
                logging.error(f"[{name}] 分钟数据同步失败: {e}")
    def start_service(self):
            self.sync_hourly() # 启动先补历史数据
            
            logging.info(">>> 后台采集服务已启动...")
            while True:
                now = datetime.now()
                # 1. 强制对齐到下一个整点 05 分
                next_run = (now + timedelta(hours=1)).replace(minute=5, second=0, microsecond=0)
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