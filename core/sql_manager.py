import sqlite3
import json
import core.settings as settings
# 修改这一行，增加 timedelta
from datetime import datetime, timedelta
import logging

class SQLManager:
    def __init__(self):
        self.db_path = settings.DB_PATH
        print(self.db_path)
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
            # 建立系统配置表：存储限值、总量目标等
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sys_limit (
                    param_name TEXT PRIMARY KEY,
                    param_value REAL,
                    update_time DATETIME
                )
            ''')
            conn.commit()

    def save_entry(self, boiler_name, entry,data_type):
        """
        统一保存入口
        data_type: 传入 config.DATA_TYPES["HOUR"] 或 config.DATA_TYPES["MINUTE"]
        """

        if data_type == settings.DATA_TYPES["HOUR"] :
            #print("写入小时表")
            return self._save_entry_hour(boiler_name, entry)
        else:
            #print("写入分钟表")
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
        table = "boiler_data_hour" if data_type == settings.DATA_TYPES["HOUR"] else "boiler_data_minute"
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
            table = "boiler_data_hour" if data_type == settings.DATA_TYPES["HOUR"] else "boiler_data_minute"
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
        

    # ==========================================
    # 2. Web 服务新增逻辑 (新增用于报表和统计)
    # ==========================================
    #限值数据表，排放总量限制值和排放率限制值
    def set_limit(self, key, value):

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cursor.execute(
                    "INSERT OR REPLACE INTO sys_limit (param_name, param_value, update_time) VALUES (?, ?, ?)",
                    (key, value, now)
                )
                conn.commit()
                return True
        except Exception as e:
            logging.error(f"保存配置[{key}]失败: {e}")
            return False
    #读取数据表
    def get_limit(self):
        """
        查询 sys_limit 表中所有的参数配置，并以字典形式返回
        返回示例: {"nox_limit_daily": 500, "so2_limit_hourly": 35, ...}
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                # 设置 row_factory 可以让你通过列名访问数据，虽然这里我们手动转字典更直接
                cursor = conn.cursor()
                
                # 查询所有的名称和对应的值
                query = "SELECT param_name, param_value FROM sys_limit"
                cursor.execute(query)
                rows = cursor.fetchall()
                
                # 使用字典推导式将结果集转换为字典
                # row[0] 是 param_name, row[1] 是 param_value
                config_dict = {row[0]: row[1] for row in rows}
                
                logging.info(f"成功加载系统配置项，共 {len(config_dict)} 条")
                return config_dict
                
        except Exception as e:
            logging.error(f"批量读取系统配置异常: {e}")
            return {} # 发生异常返回空字典，防止后续逻辑崩溃

    def get_today_flowed(self):
        """核心需求：获取今日全厂运行中(status='-')的总排量汇总"""
        today_start = datetime.now().strftime('%Y-%m-%d 00:00:00')
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row 
                cursor = conn.cursor()
                # 统计所有 status 为 '-' 的设备排放总量
                sql = """
                    SELECT 
                        SUM(nox_pf) as total_nox, 
                        SUM(so2_pf) as total_so2, 
                        SUM(dust_pf) as total_dust 
                    FROM boiler_data_hour 
                    WHERE time >= ? AND status = '-'
                """
                cursor.execute(sql, (today_start,))
                row = cursor.fetchone()
                return {
                    "total_nox": row["total_nox"] if row["total_nox"] else 0.0,
                    "total_so2": row["total_so2"] if row["total_so2"] else 0.0,
                    "total_dust": row["total_dust"] if row["total_dust"] else 0.0
                }
        except Exception as e:
            logging.error(f"获取今日统计失败: {e}")
            return {"total_nox": 0.0, "total_so2": 0.0, "total_dust": 0.0}

    def get_last_entry(self, boiler_name, data_type):
        """获取指定设备最新的一条记录（用于实时监控卡片）"""
        table = "boiler_data_hour" if data_type == settings.DATA_TYPES["HOUR"] else "boiler_data_minute"
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                sql = f"SELECT * FROM {table} WHERE boiler_name = ? ORDER BY time DESC LIMIT 1"
                cursor.execute(sql, (boiler_name,))
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logging.error(f"获取最新快照失败: {e}")
            return None

    def get_recent_trend(self, hours=24):
        """新增：获取最近 X 小时的全厂排放趋势数据（用于折线图）"""
        start_time = (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M:%S')
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                # 按小时分组统计全厂总排放
                sql = """
                    SELECT time, SUM(nox_pf) as nox, SUM(so2_pf) as so2, SUM(dust_pf) as dust
                    FROM boiler_data_hour
                    WHERE time >= ? AND status = '-'
                    GROUP BY time
                    ORDER BY time ASC
                """
                cursor.execute(sql, (start_time,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logging.error(f"趋势查询失败: {e}")
            return []

    def get_all_boilers_realtime(self):
        """
        获取所有锅炉的实时数据。
        逻辑：如果设备状态为'停运'，则强制将实时值和历史趋势值设为 0。
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # SQL 保持不变（获取 7 个采样点）
                sql = """
                    SELECT boiler_name, time, nox_zs, so2_zs, dust_zs, status
                    FROM (
                        SELECT *, ROW_NUMBER() OVER (PARTITION BY boiler_name ORDER BY time DESC) as rn
                        FROM boiler_data_minute
                    )
                    WHERE (rn - 1) % 5 = 0 AND rn <= 31
                    ORDER BY boiler_name, time ASC;
                """
                cursor.execute(sql)
                rows = cursor.fetchall()

                formatted_results = {}
                for row in rows:
                    name = row["boiler_name"]
                    status = row["status"]
                    # --- 核心判断逻辑 ---
                    is_off = (status == "停运")
                    
                    # 初始化结构
                    if name not in formatted_results:
                        formatted_results[name] = {
                            "boiler_name": name,
                            "nox_zs": 0.0, "so2_zs": 0.0, "dust_zs": 0.0,
                            "status": "-", "update_time": "",
                            "history": {"nox": [], "so2": [], "dust": [], "times": []}
                        }
                    
                    # 1. 填充历史数组：如果停运则存入 0，否则存入实际值
                    h_nox = 0.0 if is_off else round(row["nox_zs"] or 0, 2)
                    h_so2 = 0.0 if is_off else round(row["so2_zs"] or 0, 2)
                    h_dust = 0.0 if is_off else round(row["dust_zs"] or 0, 2)
                    
                    formatted_results[name]["history"]["nox"].append(h_nox)
                    formatted_results[name]["history"]["so2"].append(h_so2)
                    formatted_results[name]["history"]["dust"].append(h_dust)
                    formatted_results[name]["history"]["times"].append(row["time"][-8:-3]) 
                    
                    # 2. 更新实时值：同样根据状态判定
                    formatted_results[name]["nox_zs"] = h_nox
                    formatted_results[name]["so2_zs"] = h_so2
                    formatted_results[name]["dust_zs"] = h_dust
                    formatted_results[name]["status"] = status
                    formatted_results[name]["update_time"] = row["time"]

                return formatted_results
        except Exception as e:
            logging.error(f"获取实时状态列表失败: {e}")
            return {}
        
    def get_boiler_history_detail(self, boiler_name, param_type, hours=8):
            """
            获取指定设备历史详情。
            业务规则：若 status 为'停运'，则该点数值强制归零。
            采样：每 20 分钟一个点。
            """
            column_map = {
                "nox": "nox_zs",
                "so2": "so2_zs",
                "dust": "dust_zs"
            }
            col = column_map.get(param_type.lower(), "nox_zs")
            limit_rn = hours * 60

            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    # 在 SQL 层面通过 CASE WHEN 实现状态判定
                    sql = f"""
                        SELECT 
                            time, 
                            CASE 
                                WHEN status = '停运' THEN 0 
                                ELSE {col} 
                            END as value
                        FROM (
                            SELECT time, {col}, status,
                                ROW_NUMBER() OVER (ORDER BY time DESC) as rn
                            FROM boiler_data_minute
                            WHERE boiler_name = ?
                        )
                        WHERE (rn - 1) % 20 = 0 AND rn <= ?
                        ORDER BY time ASC
                    """
                    cursor.execute(sql, (boiler_name, limit_rn))
                    
                    return [
                        {
                            "time": row["time"], 
                            "value": round(row["value"] or 0, 2)
                        } 
                        for row in cursor.fetchall()
                    ]
            except Exception as e:
                logging.error(f"查询设备[{boiler_name}]历史详情失败: {e}")
                return []


    #提供每台锅炉当天已经排放的各项数值的总量 
    def get_today_single_flowed(self):
        """
        核心需求：获取今日各台设备（单炉）的排放总量汇总
        返回格式: { "NORTH_1": {"nox": 0.0, "so2": 0.0, "dust": 0.0}, ... }
        """
        today_start = datetime.now().strftime('%Y-%m-%d 00:00:00')
        # 初始化结果集，确保即使数据库没数据，7台设备也都有默认值 0.0
        results = {name: {"nox": 0.0, "so2": 0.0, "dust": 0.0} for name in settings.DEVICES.keys()}
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row 
                cursor = conn.cursor()
                
                # 使用 GROUP BY boiler_name 进行分组统计
                sql = """
                    SELECT 
                        boiler_name,
                        SUM(nox_pf) as total_nox, 
                        SUM(so2_pf) as total_so2, 
                        SUM(dust_pf) as total_dust 
                    FROM boiler_data_hour 
                    WHERE time >= ? AND status = '-'
                    GROUP BY boiler_name
                """
                cursor.execute(sql, (today_start,))
                rows = cursor.fetchall()
                
                for row in rows:
                    b_name = row["boiler_name"]
                    # 只有当该设备在我们的配置列表中时才记录
                    if b_name in results:
                        results[b_name] = {
                            "nox": row["total_nox"] if row["total_nox"] else 0.0,
                            "so2": row["total_so2"] if row["total_so2"] else 0.0,
                            "dust": row["total_dust"] if row["total_dust"] else 0.0
                        }
                return results

        except Exception as e:
            logging.error(f"获取今日单炉统计失败: {e}")
            return results

    #获得限制值
    def get_all_limits(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                # row_factory 使结果可以通过字典方式访问
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                query = "SELECT param_name, param_value FROM sys_limit"
                cursor.execute(query)
                rows = cursor.fetchall()
                # 将多行 KV 转为单对象
                return {row['param_name']: row['param_value'] for row in rows}
        except Exception as e:
            logging.error(f"获取所有限值配置失败: {e}")
            return {}
    #更新限制值
    def update_all_limits(self, config_data: dict):
        """
        批量更新限值。
        接收前端传来的字典，循环更新数据库。
        """
        import datetime
        current_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 使用事务（Transaction）确保数据一致性，要么全成功，要么全失败
        try:
            for name, value in config_data.items():
                query = """
                    UPDATE sys_limit 
                    SET param_value = ?, update_time = ? 
                    WHERE param_name = ?
                """
                self.db.execute(query, (value, current_time, name))
            return True
        except Exception as e:
            print(f"数据库更新失败: {e}")
            return False