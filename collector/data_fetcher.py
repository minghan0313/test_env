import requests

#引用上层目录core的代码文件
import sys
from pathlib import Path
root_path = str(Path(__file__).resolve().parents[1])

if root_path not in sys.path:
    sys.path.insert(0, root_path)

from core import settings  # 导入模块本身

class DataFetcher:
    @staticmethod
    def fetch_online_data(token, port_id, start_time, end_time, data_type=settings.DATA_TYPES["HOUR"]):
        """
        根据 Token 获取指定的在线监控数据
        """
        url = settings.POST_URL  # 建议放进 config
        
        headers = {
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "Origin": "http://27.191.132.93:9191",    #POST请求的时候不需要这个header信息 还是加上吧，避免风控
            "Referer": "http://27.191.132.93:9191/psIndex/dataQuery?tab=dataQuery",  #POST请求的时候不需要这个header信息  还是加上吧，避免风控
            "User-Agent": settings.USER_AGENT # 建议放进 config
        }
        payload = {
            "portTypeId": "port_type2",
            "portId": port_id,
            "startTime": start_time,
            "endTime": end_time,
            "dataType": data_type,
            "headers": "time,stop-stopDcsType,a00000-cou,a00000-otherFlag,a34013-avg,a34013-zsavg,a34013-cou,a34013-flag,a34013-otherFlag,a21026-avg,a21026-zsavg,a21026-cou,a21026-flag,a21026-otherFlag,a21002-avg,a21002-zsavg,a21002-cou,a21002-flag,a21002-otherFlag,a21001-avg,a21001-zsavg,a21001-cou,a21001-flag,a21001-otherFlag,a19001-avg,a01011-avg,a01012-avg,a01014-avg,a01013-avg",
            "size": 50000,
            "index": 1,
            "allTime": None,
            "psId": "259556ea91e848b08f8fbad7df00d9d1"
        }
        #print(payload)
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            return response.json().get('data', [])
        else:
            print(f"数据抓取失败，状态码: {response.status_code}")
            return None

    # @staticmethod
    # def generate_sql(data_list):
    #     """
    #     将抓取到的 JSON 数据转换为 SQL 插入语句
    #     """
    #     if not data_list:
    #         return ""
            
    #     # 这里放入你写的拼接 while 循环逻辑...
    #     # 建议使用 join 方式优化字符串拼接，效率更高
    #     # ...
    #     return insert_sql