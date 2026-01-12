import os

# 基础路径
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
IMAGE_DIR = os.path.join(BASE_PATH, "test_img")

# 确保图片文件夹存在
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

# 目标信息
LOGIN_URL = "http://27.191.132.93:9090/login"
TARGET_URL = "http://27.191.132.93:9191/psIndex/psInfos?tab=psInfos"

# 账号信息（建议实际使用时从环境变量读取）
USER_NAME = "13483532123"
PASSWORD = "A@a8505242"
#请求网页数据时候的header信息
POST_URL = "http://27.191.132.93:9191/common_online/online_statistics/v5/dataQuery/list"
USER_AGENT= "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
#网站中对应的锅炉信息
DEVICES = {
    "NORTH_1": "6a4d38b993ce43d98f7e2955543ea015",
    "NORTH_2": "097f85d183e840d8a2f218bc47c3cc00",
    "NORTH_3": "ae13185765ac44b984f43560c89e0208",
    "NORTH_4": "c7b6be6137ae4175ba424149eaa9008f",
    "NORTH_5": "d6e392dd48884380b724270e71e26d6a",
    "SOUTH_1": "a4fc0dac6f274a7e897e343bece96620",
    "SOUTH_2": "4e3f35e98d71434ebeecdb5f69c411de",
}
#网站中对应的数据类型 dataTpye 2061是小时数据  2051是分钟数据  2031是日数据
DATA_TYPES = {
    "DAY" : "2031",
    "MINUTE" : "2051",
    "HOUR" : "2061",
}

# 环保限值
THRESHOLDS = {
    "dust": 10.0, "so2": 35.0, "nox": 50.0
}
# 设备与Excel列的映射 (这样修改报表格式非常直观)
DEVICE_EXCEL_COLS = {
    "NORTH_4": ["N", "O", "P", "Q"],
    "NORTH_5": ["R", "S", "T", "U"],
    "SOUTH_1": ["V", "W", "X", "Y"],
    "SOUTH_2": ["Z", "AA", "AB", "AC"]
}



# 数据库文件路径
DB_PATH = os.path.join(BASE_PATH, "emission_storage.db")
# 采集策略
FETCH_DELAY_SECONDS = 45  # 每分钟的第45秒发起请求，确保服务端数据已生成
RETRY_COUNT = 3           # 网络异常重试次数
RETRY_INTERVAL = 5        # 重试间隔（秒）

# 核心指标映射 (根据你之前提供的 JSON 键位)
# a21026: NOx, a21002: SO2, a34013/a21001: 烟尘/粉尘
CORE_PARAMS = {
    "Recordtime":"a00000-rt",   #时间
    "Status":"stop-stopDcsType",    #锅炉状态
    "Total":"a00000-cou",  #烟气排放量
    "Dust": "a34013-cou",   #粉尘量
    "SO2": "a21026-cou",    #SO2量
    "NOx": "a21002-cou",    #NOX量
}

# 所有的锅炉列表 (保持你原有的 DEVICES 结构即可)
# 如果 DataFetcher 需要 port_id，请确保 DEVICES 字典完整