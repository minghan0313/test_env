import sqlite3
import json
import config
from datetime import datetime

class SQLManager:
    def __init__(self):
        self.db_path = config.DB_PATH
        self._init_db()

    def _init_db(self):
        """初始化数据库表结构"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # 建立复合主键 (time + boiler_name) 彻底防止重复
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS boiler_data (
                    time DATETIME,
                    boiler_name TEXT,
                    status TEXT
                    total REAL
                    dust REAL,
                    so2 REAL,
                    nox REAL,
                    full_data TEXT,
                    PRIMARY KEY (time, boiler_name)
                )
            ''')
            conn.commit()

    def save_entry(self, boiler_name, entry):
        """
        保存单条抓取记录。
        核心列用于快速聚合计算，full_data 用于保存所有27+列原始数据。
        """
        if not entry:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                sql = '''INSERT OR REPLACE INTO boiler_data 
                         (time, boiler_name, status,total,dust,so2,nox,full_data)
                         VALUES (?,?,?,?,?,?,?,?)'''
                
                # 提取配置中定义的关键列
                data_tuple = (
                    entry.get('time'),
                    boiler_name,
                    entry.get('a21001-otherFlag', '-'), # 对应 status
                    entry.get('a00000-cou', 0), # 对应 total
                    entry.get('a21026-cou', 0),          # 对应 nox
                    entry.get('a21002-cou', 0),          # 对应 so2
                    entry.get('a34013-cou', 0),          # 对应 dust
                    json.dumps(entry, ensure_ascii=False) # 原始快照备份
                )
                cursor.execute(sql, data_tuple)
                conn.commit()
        except Exception as e:
            print(f"[{boiler_name}] 数据库写入异常: {e}")

    def get_last_time(self, boiler_name):
        """获取最后一条成功记录的时间点"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT MAX(time) FROM boiler_data WHERE boiler_name=?", (boiler_name,))
                res = cursor.fetchone()
                if res and res[0]:
                    # 某些版本的 SQLite 返回字符串，确保转换正确
                    return datetime.strptime(str(res[0]), '%Y-%m-%d %H:%M:%S')
                return None
        except Exception as e:
            print(f"查询最后时间异常: {e}")
            return None

    def get_today_total(self, boiler_name, metric='nox'):
        """统计今日累计排量"""
        today_str = datetime.now().strftime('%Y-%m-%d 00:00:00')
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                # 使用参数化查询防止注入（虽然 metric 是内部传入，但养成好习惯）
                cursor.execute(f"SELECT SUM({metric}) FROM boiler_data WHERE boiler_name=? AND time >= ?", 
                               (boiler_name, today_str))
                res = cursor.fetchone()
                return res[0] if res and res[0] else 0.0
        except Exception as e:
            print(f"统计累计值异常: {e}")
            return 0.0