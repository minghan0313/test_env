import sys
import os
from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

# 1. 路径适配：确保能找到根目录下的 core 文件夹
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from core.sql_manager import SQLManager
from core.settings import DATA_TYPES

# 定义配置更新的请求体格式
class LimitUpdate(BaseModel):
    key: str    # 如 "nox_limit_daily" 或 "nox_zs_standard"
    value: float


# 定义8个参排放限制值的请求体格式
class LimitConfig(BaseModel):
    total_flow: float
    so2_flow: float
    nox_flow: float
    dust_flow: float
    so2_rate_high: float
    nox_rate_high: float
    nox_rate_low: float
    dust_rate_high: float


app = FastAPI(title="环保排放监控系统 API", version="1.2.0")
# 在 app = FastAPI() 之后添加
#默认情况下，浏览器会阻止 3000 端口（前端）访问 8000 端口（后端）。
#需要设置为允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 允许所有来源
    allow_methods=["*"],
    allow_headers=["*"],
)
db = SQLManager()

@app.get("/")
async def root():
    return {"message": "环保平台 API 服务运行中", "now": datetime.now()}

# --- 核心数据接口 ---

@app.get("/api/v1/dashboard/summary")
async def get_summary():
    """
    需求 2, 4, 9: 获取今日统计、动态限值以及小时配额建议
    """
    # 1. 从数据库读取动态限值 (默认值设为 500.0)
    allparams_limit = db.get_limit()
    #将读取到的限值分配给各变量保存
    so2_rate_high_limit=allparams_limit.get("so2_rate_high",0.0)
    so2_rate_low_limit=allparams_limit.get("so2_rate_low",0.0)
    so2_flow_limit=allparams_limit.get("so2_flow",0.0)

    nox_rate_high_limit=allparams_limit.get("nox_rate_high",0.0)
    nox_rate_low_limit=allparams_limit.get("nox_rate_low",0.0)
    nox_flow_limit=allparams_limit.get("nox_flow",0.0)
    
    dust_rate_high_limit=allparams_limit.get("dust_rate_high",0.0)
    dust_rate_low_limit=allparams_limit.get("dust_rate_low",0.0)
    dust_flow_limit=allparams_limit.get("dust_flow",0.0)
    
    total_flow_limit = allparams_limit.get("total_flow",0)

    #获取3个参数分别的排放总量，
    allparams_flowed = db.get_today_flowed()
    nox_flowed = allparams_flowed.get("total_nox", 0.0)
    so2_flowed = allparams_flowed.get("total_so2", 0.0)
    dust_flowed = allparams_flowed.get("total_dust", 0.0)
    
    # 计算小时配额建议
    now = datetime.now()
    remaining_hours = 24 - now.hour
    if remaining_hours <= 0: remaining_hours = 1
    
    nox_flow_advice = (nox_flow_limit - nox_flowed) / remaining_hours
    so2_flow_advice = (so2_flow_limit - so2_flowed) / remaining_hours
    dust_flow_advice = (dust_flow_limit - dust_flowed) / remaining_hours
    #计算总排放量建议
    total_flow_advice = (total_flow_limit-nox_flowed-so2_flowed-dust_flowed) / remaining_hours
    return {
        "nox_flowed": round(nox_flowed, 2),
        "so2_flowed": round(so2_flowed, 2),
        "dust_flowed": round(dust_flowed, 2),
        "nox_flow_limit":nox_flow_limit,
        "so2_flow_limit":so2_flow_limit,
        "dust_flow_limit":dust_flow_limit,
        "total_flow_limit":total_flow_limit,
        "nox_percent": round((nox_flowed / nox_flow_limit) * 100, 2) if nox_flow_limit > 0 else 0,
        "so2_percent": round((so2_flowed / so2_flow_limit) * 100, 2) if so2_flowed > 0 else 0,
        "dust_percent": round((dust_flowed / dust_flow_limit) * 100, 2) if dust_flowed > 0 else 0,
        #"total_percent": round(((nox_flowed+so2_flowed+dust_flowed) / total_flow_limit) * 100, 2) if dust_flowed > 0 else 0,
        #避免分母为0的情况
        "total_percent": round(((nox_flowed + so2_flowed + dust_flowed) / total_flow_limit) * 100, 2) if total_flow_limit > 0 else 0,
        "advice_nox_hourly_limit": round(max(0, nox_flow_advice), 2),
        "advice_so2_hourly_limit": round(max(0, so2_flow_advice), 2),
        "advice_dust_hourly_limit": round(max(0, dust_flow_advice), 2),
        "total_flow_advice_limit": round(max(0, total_flow_advice), 2),
        "unit": "m³",
        "update_time": now.strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/v1/boilers/realtime")
async def get_realtime():
    """
    获取全厂所有锅炉的最新的分钟以及以5分钟为步长的前6个折算数据快照
    """
    #感觉这个需求有问题，应该是获取每个设备当天已经排放的nox、so2和dust的总值，然后和当前已经排放的各项总量的占比
    return db.get_all_boilers_realtime()

#查询前8个小时，每小时3个数据点的历史数据
@app.get("/api/v1/boilers/history-detail")
async def get_boiler_history(
    boiler: str, 
    param: str = "nox", 
    hours: int = 8
):
    """
    前端调用示例: /api/v1/boilers/history-detail?boiler=NORTH_1&param=nox
    """
    # 这里的 sql_manager 是你实例化的 SQLManager 对象
    data = db.get_boiler_history_detail(boiler, param, hours)
    
    if not data:
        # 如果没查到数据，返回空列表而不是 404，防止前端报错
        return []
    return data

@app.get("/api/v1/boilers/singleflowed")
async def get_single_flowed():
    """
    获取每台锅炉的当天排放各项数值的总量
    """
    #感觉这个需求有问题，应该是获取每个设备当天已经排放的nox、so2和dust的总值，然后和当前已经排放的各项总量的占比
    return db.get_today_single_flowed()



@app.get("/api/v1/config/emission-limits")
def read_limits():
    return db.get_all_limits()

@app.post("/api/v1/config/emission-limits")
def update_limits(config: LimitConfig):
    # 将模型转为字典传给 SQLManager
    success = db.update_all_limits(config.dict())
    if success:
        return {"message": "配置更新成功"}
    else:
        return {"message": "更新失败"}, 500


@app.get("/api/v1/analytics/trend")
async def get_trend(hours: int = Query(24, ge=1, le=72)):
    """
    需求 3: 获取历史排放趋势数据 (用于折线图)
    """
    data = db.get_recent_trend(hours=hours)
    return {"data": data}

# --- 配置管理接口 ---

@app.post("/api/v1/config/updatelimit")
async def update_limit(data: LimitUpdate):
    """
    设置动态限值：总量目标或浓度标准
    key 示例: 'nox_limit_daily' (500kg), 'nox_zs_standard' (50mg)
    """
    success = db.set_limit(data.key, data.value)
    if success:
        return {"status": "success", "key": data.key, "new_value": data.value}
    else:
        return {"status": "error", "message": "保存配置失败"}

@app.get("/api/v1/config/getlimit")
async def fetch_limit():
    """获取所有限值配置 (给垂直面板用)"""
    return db.get_all_limits()

if __name__ == "__main__":
    import uvicorn
    # 运行提示：请确保在 Auto 根目录下执行 python -m webservice.main
    uvicorn.run(app, host="0.0.0.0", port=8000)