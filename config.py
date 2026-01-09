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

