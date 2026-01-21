# collector/data_fetcher.py
import requests
from core import settings 

class DataFetcher:
    """
    数据抓取器：专门负责与目标网站的 API 接口进行数据交换
    """
    @staticmethod
    def fetch_online_data(token, port_id, start_time, end_time, data_type):
        """
        向网站发送 POST 请求并返回数据列表
        """
        url = settings.POST_URL 
        
        # 构造“伪装”好的请求头，让服务器觉得我们是正常的浏览器访问
        headers = {
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": settings.USER_AGENT,
            # 增加 Referer 告诉服务器我们是从查询页面过来的，降低 403 风险
            "Referer": "http://27.191.132.93:9191/psIndex/dataQuery?tab=dataQuery"
        }

        # 构造请求参数 (网站接口要求的固定格式)
        query_params = {
            "portTypeId": "port_type2", # 废气类
            "portId": port_id,          # 具体的锅炉 ID
            "startTime": start_time,
            "endTime": end_time,
            "dataType": data_type,      # 'hour' 或 'minute'
            # 这一串编码代表了我们需要的指标：烟气量、SO2、NOx 等
            "headers": "time,stop-stopDcsType,a00000-cou,a34013-avg,a21026-avg,a21002-avg,a21001-avg",
            "size": 50000,
            "index": 1,
            "psId": "259556ea91e848b08f8fbad7df00d9d1" 
        }

        try:
            # 发送 POST 网络请求，设置 15 秒超时防止程序卡死
            response = requests.post(url, headers=headers, json=query_params, timeout=15)
            
            # 只有状态码是 200 (成功) 时才处理数据
            if response.status_code == 200:
                # 返回数据中的 'data' 部分（这是一个列表）
                return response.json().get('data', [])
            
            # # 5xx 错误处理：服务器挂了
            # elif response.status_code >= 500:
            #     print(f"服务器故障({response.status_code})，请停止抓取并等待服务器恢复。")
            #     # 返回一个特殊标记，告诉外层不要重试
            #     return "SERVER_ERROR"
            

            elif response.status_code in [401, 403]:
                # 如果被拒绝访问，返回 None，触发外层的强制刷新逻辑
                print(f"[警告] 服务器返回 {response.status_code}，身份凭证可能失效。")
                return None
            else:
                print(f"[错误] 数据抓取失败，状态码: {response.status_code}")
                return None
        except Exception as e:
            print(f"[异常] 网络请求发生错误: {e}")
            return None