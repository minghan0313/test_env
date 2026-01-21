import time
import logging
from datetime import datetime, timedelta
import random

#引用上层目录core的代码文件
import sys
from pathlib import Path
root_path = str(Path(__file__).resolve().parents[1])

if root_path not in sys.path:
    sys.path.insert(0, root_path)

from collector.auth_manager import AuthManager
from data_fetcher import DataFetcher
from core.sql_manager import SQLManager
from core import settings  # 导入模块本身

# 配置日志，方便后台服务排查
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CollectionEngine:
    def __init__(self):
        #SQLManager类的引用
        self.db = SQLManager()
        #配置文件的引用
        self.devices = settings.DEVICES 
        #DataFetcher类的引用
        self.fetcher = DataFetcher()
    #根据时间、设备名称、报表类型来存储单条数据，目前默认是存储小时报表，但是后续肯定得有分钟报表。
    #而且分钟报表和小时报表的数据结构不同，肯定是要做筛选的
    

    def is_entry_valid(self, entry, name, target_time_str,data_type):
        """
        核心校验函数：判断单条数据行是否可以入库
        逻辑：
        1. 如果是停机状态（stop-stopDcsType != "-"），合法，允许入库。
        2. 如果是运行状态，但关键指标（a21026-cou 或 a21026-avg）为 "-"，不合法，需重试。
        """
        #逻辑更改，网站上设备的数据，即使是停机状态，也不会为-
        #所以只要有-的数据，就是非法的，不用判断是否停机
        #stop_type = entry.get('stop-stopDcsType', '-')
        
        # 逻辑 1：设备已知停机
        # 不用这个逻辑去判断
        # if stop_type != "-":
        #     logging.info(f"[{name}] {target_time_str} 设备停机({stop_type})，数据校验通过（允许空值）")
        #     return True
        
        # 逻辑 2：设备运行中，校验关键指标
        # 兼容小时报表(-cou)和分钟报表(-avg)
        # 直接使用这个逻辑，即有为-的数据就是不合法数据
        nox_val = entry.get('a21026-cou') or entry.get('a21026-avg') or "-"
        
        if nox_val == "-":
            logging.warning(f"[{name}]的{data_type}报表在时间 {target_time_str} 关键指标未结算('-')，校验失败")
            return False
        
        return True

   
    def fetch_and_store(self, target_time, name, port_id,data_type):
        #增加一个table_name的参数，用来方便输出哪个表的什么时间数据校验出现异常
        table_name= ""
        """执行单次数据抓取与入库"""

        """增强版：带有数据质量校验的抓取"""
        #获取当前 Token (此时 get_local_token 默认 force_refresh=False，只读缓存)
        token = AuthManager.get_local_token()
        #小时报表的开始和结束时间设置。
        #网站中各设备的小时数据不是整点算出的，通常都比整点晚。
        #比如想差11:00的数据，你开始时间和结束时间都使用11:00是查不到数据的，保险的话，将时间延后5分钟

        begin_time = target_time.strftime('%Y-%m-%d %H:%M:%S')
        # end_time_obj = target_time + timedelta(minutes=5)
        # #end_time比起始时间多5分钟。起始时间是11:00的话，结束时间就是11:05
        # end_time = end_time_obj.strftime('%Y-%m-%d %H:%M:%S')


        if data_type == settings.DATA_TYPES["HOUR"]:
            # 窗口补偿delay：小时报表延迟通常比分钟报表长
            # 小时报表：延后5分钟以确保数据已生成
            delay = 5
            end_time = (target_time + timedelta(minutes=delay)).strftime('%Y-%m-%d %H:%M:%S')
            table_name= "小时表"
        else:
            # 分钟报表：经过实际观察，每台锅炉的分钟报表延后时间不等，最长的延后5分钟
            # 小时报表：延后5分钟以确保数据已生成
            delay = 2 
            end_time = (target_time + timedelta(minutes=delay)).strftime('%Y-%m-%d %H:%M:%S')
            table_name= "分钟表"

        #异常重试逻辑
        #数据校验失败后，不写入数据库，由start_service中每5分钟一次的扫盲去补全
        #这样省下了在这里等待的时间
        try:
            # 调用你原有的 DataFetcher.fetch_online_data
            # 暂时是抓取小时报表数据，后续要补充分钟报表的数据
            data_list = self.fetcher.fetch_online_data(
                token, port_id, begin_time, end_time, data_type
            )

            #【重点修改】如果抓取结果为 None (可能是 403 或 401)
            if data_list is None:
                logging.warning(f"[{name}] {begin_time} 抓取异常，尝试强制刷新 Token...")
                
                # 调用强制刷新逻辑，打开浏览器重新登录
                new_token = AuthManager.get_local_token(force_refresh=True)
                
                if new_token:
                    # 使用新 Token 重新抓取一次
                    data_list = self.fetcher.fetch_online_data(new_token, port_id, begin_time, end_time, data_type)
                else:
                    logging.error("强制刷新 Token 失败，请检查账号状态。")
                    return False
                

            #如果查到的数据行数大于0
            #这个判断条件不是还好，因为网页API只要是正确的时间，哪怕没有生产数据，也会返回单列值为"-"的数据行
            if data_list and len(data_list) > 0:
                #这里可以考虑加入对数据行的判断，
                #如果数据行的stop-stopDcsType列不为"-"，则说明当前锅炉是停机状态，那么其他列的数据就可以是"-"
                #反之就是正常运行状态，如果有数据列的值为"-"，说明网站查询的数据有误，应该重试或者进行其他处理方式，至少是不写入数据库，下次查询到一并补充
                entry = data_list[0]
                #====将下面的数据行有效性逻辑提炼出去形成单独的is_entry_valid函数
                #根据上面注释的内容，进行数据有效性判断逻辑
                # 检查停机状态字段：stop-stopDcsType
                # stop_type = entry.get('stop-stopDcsType', '-')
                # 如果 stop_type 不为 "-"，说明是【已知停机】状态
                # if stop_type != "-":
                #     logging.info(f"[{name}] {begin_time} 设备停机({stop_type})，允许空数据入库")
                #     self.db.save_entry(name, entry,config.DATA_TYPES['HOUR'])
                #     return True
                # # 如果是正常运行状态 (stop_type == "-")
                # else:
                #     # 检查关键数据列（如氮氧化物 a21026-cou 或 流量 a00000-cou）是否为 "-"
                #     # 只要有一个关键排放指标是 "-"，说明网站数据还没结算好
                #     nox_val = entry.get('a21026-cou', '-')
                #     if nox_val == "-":
                #         logging.warning(f"[{name}] {begin_time} 运行中但关键指标为'-' (未结算)，触发第{attempt+1}次重试...")
                #         # 不 return，进入下一次循环重试
                #     else:
                #         # 数据正常，写入数据库
                #         self.db.save_entry(name, entry,config.DATA_TYPES['HOUR'])
                #         logging.info(f"[{name}] {begin_time} 数据采集并校验成功")
                #         return True
                #====将上面的数据行有效性逻辑提炼出去形成单独的is_entry_valid函数   
                # 使用提炼后的校验函数

                if self.is_entry_valid(entry, name, begin_time,table_name):
                    self.db.save_entry(name, entry, data_type)
                    logging.info(f"[{name}] {begin_time} 数据入库成功")
                    return True
                else:
                    # 校验失败（未结算），直接结束本次任务，不再重试，不写入数据库，由扫盲逻辑后续补全
                    logging.warning(f"数据行校验失败，网站暂无生成有效数据")
                    return False
            else:
                print(f"[{name}] {begin_time} 网站暂无数据更新")
                return False
        except Exception as e:
            logging.error(f"[{name}] {begin_time} 请求发生异常: {e}")
            return False


    def sync_hourly(self):
        logging.info(">>> 正在检查小时表历史数据完整性...")
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        latest_available = now - timedelta(hours=1)

        for name, port_id in self.devices.items():
            last_time = self.db.get_last_time(name,settings.DATA_TYPES['HOUR']) 
            if not last_time:
                last_time = latest_available - timedelta(hours=24)
            
            check_time = last_time + timedelta(hours=1)
            while check_time <= latest_available:
                logging.info(f"正在补齐 {name} 历史数据: {check_time}")
                success = self.fetch_and_store(check_time, name, port_id, settings.DATA_TYPES["HOUR"])
                
                if success:
                    # 只有成功了才继续往后走
                    check_time += timedelta(hours=1)
                else:
                    # 如果这个时间点死活采不到（比如网站还没出数），
                    # 停止补齐当前设备，防止后面全是空跑，等下次轮询再试
                    logging.warning(f"[{name}] {check_time} 小时表补齐中断，等待下次同步")
                    break 
        logging.info(">>> 小时表历史数据自检完成。")

    def sync_minutes(self):
        """
        自动同步函数：默认抓取并补录当前时间点前 2 小时内的所有分钟数据。
        无需外部传参，适合放入定时任务或循环体中。
        """
        # 1. 计算时间窗口
        now = datetime.now()
        start_time = now - timedelta(hours=2) # 起始点：2小时前
        end_time = now                        # 结束点：现在
        
        # 格式化为 API 所需的字符串格式
        begin_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
        
        # 2. 获取令牌和数据类型标记
        token = AuthManager.get_local_token()
        data_type = settings.DATA_TYPES["MINUTE"]

        logging.info(f">>> 开始自动同步分钟表数据窗口: {begin_str} 至 {end_str}")

        # 3. 遍历设备进行批量抓取
        for name, port_id in self.devices.items():
            try:
                # 一次性请求该设备在 2 小时内的所有分钟数据（约 120 条）
                data_list = self.fetcher.fetch_online_data(
                    token, port_id, begin_str, end_str, data_type
                )
                
                if data_list:
                    count = 0
                    for entry in data_list:
                        # 获取当前行的时间戳用于日志或校验
                        entry_time = entry.get('time', 'Unknown')
                        
                        # 4. 数据有效性校验：复用你之前提炼的校验函数
                        # 确保只有结算完成（非 "-"）的数据才入库
                        if self.is_entry_valid(entry, name, entry_time,settings.DATA_TYPES["MINUTE"]):
                            if self.db.save_entry(name, entry, data_type):
                                count += 1
                                
                    logging.info(f"[{name}] 窗口内发现 {len(data_list)} 条数据，成功入分钟表/更新 {count} 条")
                else:
                    logging.warning(f"[{name}] 在该时间段内未查询到任何分钟数据")
                    
            except Exception as e:
                logging.error(f"[{name}] 分钟数据自动同步发生异常: {e}")

    # def sync_minutes(self, start_time, end_time):
    #     """同步指定时段的分钟均值数据 (批量模式)"""
    #     begin_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
    #     end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
    #     token = AuthManager.get_local_token()
    #     data_type = settings.DATA_TYPES["MINUTE"]

    #     for name, port_id in self.devices.items():
    #         try:
    #             # 一次性获取该时段所有分钟数据
    #             data_list = self.fetcher.fetch_online_data(
    #                 token, port_id, begin_str, end_str, data_type
    #             )
    #             if data_list:
    #                 count = 0
    #                 for entry in data_list:
    #                     if self.db.save_entry(name, entry, data_type):
    #                         count += 1
    #                 logging.info(f"[{name}] 批量补录 {count} 条分钟数据")
    #         except Exception as e:
    #             logging.error(f"[{name}] 分钟数据同步失败: {e}")
    def start_service(self):
            self.sync_hourly() # 启动先补全小时历史数据
            self.sync_minutes()  #启动先补全分钟历史数据
            # 获取当前实时心跳时间（用于频率计算）
            #last_min_sync = datetime.now() - timedelta(minutes=15)
            last_min_sync = datetime.now()
            logging.info(">>> 采集服务启动：由时间驱动改为空档驱动自愈模式...")
            while True:
                now = datetime.now().replace(minute=0, second=0, microsecond=0)
                # 检查过去 48 小时内的所有空档 (确保 2 天内绝无断档)
                check_start = now - timedelta(days=2)
                check_end = now - timedelta(hours=1) # 1小时前的数据理论上都该结账了

                for name, port_id in self.devices.items():
                    # 1. 小时报表扫盲
                    h_type = settings.DATA_TYPES["HOUR"]
                    existing_set = self.db.get_existing_timestamps(name, check_start, check_end, h_type)
                    
                    curr = check_start
                    while curr <= check_end:
                        t_str = curr.strftime('%Y-%m-%d %H:%M:%S')
                        if t_str not in existing_set:
                            logging.info(f"发现小时表空档: [{name}] {t_str}，正在补采...")
                            self.fetch_and_store(curr, name, port_id, h_type)
                        curr += timedelta(hours=1)

                #==========================
                # --- B. 分钟报表滑窗补全 (受 last_min_sync 控制，约
                # 每 10 分钟执行一次) ---
                # 逻辑：判断距离上次分钟同步是否超过 180 秒（3分钟）
                # 获取当前实时心跳时间（用于频率计算）
                current_beat = datetime.now()

                if (current_beat - last_min_sync).total_seconds() >= 180:
                    logging.info(">>> 触发分钟数据例行同步（过去2小时窗口）...")
                    
                    # 调用无参函数，内部会自动计算 [now-2h, now] 范围并批量入库
                    self.sync_minutes()
                    
                    # 更新同步时间戳
                    last_min_sync = current_beat
                #==========================
                logging.info(">>> 本轮扫描完成，5分钟后进行下一轮检测...")
                #等待10秒
                #固定的10秒不是很安全，容易触发网站的保护机制
                wait_time = random.randint(60, 300) # 随机等待 1 到 3 分钟，避免触发网站的检测
                logging.info(f">>> 本轮扫描完成，将在 {wait_time} 秒后进行下一轮检测...")
                time.sleep(wait_time)

                time.sleep(10)