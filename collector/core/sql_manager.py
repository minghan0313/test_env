import sqlite3
import json
import config
from datetime import datetime
import logging

class SQLManager:
    def __init__(self):
        self.db_path = config.DB_PATH
        self._init_db()

    def _init_db(self):
        """初始化数据库表结构"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # 建立复合主键 (time + boiler_name) 彻底防止重复
            # 1. 小时报表：主要存累计量 (-cou)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS boiler_data_hour (
                    time DATETIME,
                    boiler_name TEXT,
                    status TEXT
                    total_pf REAL
                    dust_pf REAL,
                    so2_pf REAL,
                    nox_pf REAL,
                    full_data TEXT,
                    PRIMARY KEY (time, boiler_name)
                )
            ''')
            # 2. 分钟报表：主要存实测/折算均值 (-avg, -zsAvg)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS boiler_data_minute (
                    time DATETIME,
                    boiler_name TEXT,
                    status TEXT,
                    total_pf REAL,
                    dust_pf REAL,
                    dust_zs REAL,
                    so2_pf REAL,
                    so2_zs REAL,
                    nox_pf REAL,
                    nox_zs REAL,
                    full_data TEXT,
                    PRIMARY KEY (time, boiler_name)
                )
            ''')
            conn.commit()

    def save_entry(self, boiler_name, entry,data_type):
        """
        统一保存入口
        data_type: 传入 config.DATA_TYPES["HOUR"] 或 config.DATA_TYPES["MINUTE"]
        """

        if data_type == config.DATA_TYPES["HOUR"] :
            print("写入小时表")
            return self._save_entry_hour(boiler_name, entry)
        else:
            print("写入分钟表")
            return self._save_entry_minute(boiler_name, entry)
    
    def _save_entry_hour(self, boiler_name, entry):
        """保存小时数据"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                sql = '''INSERT OR REPLACE INTO boiler_data_hour 
                         (time, boiler_name, status, total_pf, dust_pf, so2_pf, nox_pf, full_data)
                         VALUES (?,?,?,?,?,?,?,?)'''
                data_tuple = (
                    entry.get('time'),
                    boiler_name,
                    entry.get('stop-stopDcsType', '-'),
                    entry.get('a00000-cou', 0),    # 累计排放流量
                    entry.get('a34013-cou', 0),    # 颗粒物排放累计
                    entry.get('a21002-cou', 0),    # SO2排放累计
                    entry.get('a21026-cou', 0),    # NOx排放累计
                    json.dumps(entry, ensure_ascii=False)
                )
                cursor.execute(sql, data_tuple)
                conn.commit()
                return True
        except Exception as e:
            logging.error(f"小时表入库失败: {e}")
            return False

    def _save_entry_minute(self, boiler_name, entry):
            """保存分钟数据（含实测值和折算值）"""
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    sql = '''INSERT OR REPLACE INTO boiler_data_minute 
                            (time, boiler_name, status, total_pf, dust_pf, dust_zs, so2_pf, so2_zs, nox_pf, nox_zs, full_data)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?)'''
                    
                    # 分钟数据通常取 avg(均值) 和 zsAvg(折算均值)
                    data_tuple = (
                        entry.get('time'),
                        boiler_name,
                        entry.get('stop-stopDcsType', '-'),
                        entry.get('a00000-cou', 0),    # 瞬时流量
                        entry.get('a34013-cou', 0),    # 颗粒物实测
                        entry.get('a34013-zsavg', 0),  # 颗粒物折算
                        entry.get('a21002-cou', 0),    # SO2实测
                        entry.get('a21002-zsavg', 0),  # SO2折算
                        entry.get('a21026-cou', 0),    # NOx实测
                        entry.get('a21026-zsavg', 0),  # NOx折算
                        json.dumps(entry, ensure_ascii=False)
                    )
                    cursor.execute(sql, data_tuple)
                    conn.commit()
                    return True
            except Exception as e:
                logging.error(f"分钟表入库失败: {e}")
                return False

        # if not entry:
        #     return
        
        # try:
        #     with sqlite3.connect(self.db_path) as conn:
        #         cursor = conn.cursor()
        #         sql = '''INSERT OR REPLACE INTO boiler_data 
        #                  (time, boiler_name, status,total,dust,so2,nox,full_data)
        #                  VALUES (?,?,?,?,?,?,?,?)'''
                
        #         # 提取配置中定义的关键列
        #         data_tuple = (
        #             entry.get('time'),
        #             boiler_name,
        #             entry.get('stop-stopDcsType', '-'), # 对应 status
        #             entry.get('a00000-cou', 0), # 对应 total
        #             entry.get('a21026-cou', 0),          # 对应 nox
        #             entry.get('a21002-cou', 0),          # 对应 so2
        #             entry.get('a34013-cou', 0),          # 对应 dust
        #             json.dumps(entry, ensure_ascii=False) # 原始快照备份
        #         )
        #         cursor.execute(sql, data_tuple)
        #         conn.commit()
        # except Exception as e:
        #     print(f"[{boiler_name}] 数据库写入异常: {e}")

    # def get_last_time(self, boiler_name):
    #     """获取最后一条成功记录的时间点"""
    #     try:
    #         with sqlite3.connect(self.db_path) as conn:
    #             cursor = conn.cursor()
    #             cursor.execute("SELECT MAX(time) FROM boiler_data WHERE boiler_name=?", (boiler_name,))
    #             res = cursor.fetchone()
    #             if res and res[0]:
    #                 # 某些版本的 SQLite 返回字符串，确保转换正确
    #                 return datetime.strptime(str(res[0]), '%Y-%m-%d %H:%M:%S')
    #             return None
    #     except Exception as e:
    #         print(f"查询最后时间异常: {e}")
    #         return None
        
    def get_last_time(self, boiler_name, data_type):
        """修正后的获取最后记录时间方法"""
        table = "boiler_data_hour" if data_type == config.DATA_TYPES["HOUR"] else "boiler_data_minute"
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(f"SELECT MAX(time) FROM {table} WHERE boiler_name=?", (boiler_name,))
                res = cursor.fetchone()
                if res and res[0]:
                    return datetime.strptime(str(res[0]), '%Y-%m-%d %H:%M:%S')
                return None
        except Exception as e:
            logging.error(f"查询最后时间异常({table}): {e}")
            return None
        
    #这个函数和上面的get_last_time的功能不是一样的。
    #get_last_time 只能告诉你“最后一次成功的时间”，但它无法发现“中间断掉的空档”。
    #中间空档（Gap）：程序运行着，但 11:00 采集时网站报错了，12:00 却采集成功了。
    #此时 get_last_time 会返回 12:00。
    #如果你的逻辑是“从最后时间往后采”，那么 11:00 的数据将永远丢失。
    def get_existing_timestamps(self, boiler_name, start_time, end_time, data_type):
            """查询指定时间段内，数据库已存在的记录时间点"""
            table = "boiler_data_hour" if data_type == config.DATA_TYPES["HOUR"] else "boiler_data_minute"
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        f"SELECT time FROM {table} WHERE boiler_name=? AND time BETWEEN ? AND ?",
                        (boiler_name, start_time.strftime('%Y-%m-%d %H:%M:%S'), end_time.strftime('%Y-%m-%d %H:%M:%S'))
                    )
                    # 返回一个 set，方便后续进行高效的差集运算
                    return {row[0] for row in cursor.fetchall()}
            except Exception as e:
                logging.error(f"查询已有时间戳异常: {e}")
                return set()
        

    def get_today_total(self, boiler_name, data_type):
        """获取指定表最后一条数据的时间，用于补课自检"""
        table = "boiler_data_hour" if "HOUR" in data_type else "boiler_data_minute"
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                # 使用参数化查询防止注入（虽然 metric 是内部传入，但养成好习惯）
                cursor.execute(f"SELECT MAX(time) FROM {table} WHERE boiler_name=?", (boiler_name,))
                res = cursor.fetchone()
                return res[0] if res and res[0] else 0.0
        except Exception as e:
            print(f"统计累计值异常: {e}")
            logging.error(f"查询最后记录时间失败({table}): {e}")
            return 0.0