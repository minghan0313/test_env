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
    daily_limit = db.get_limit("nox_limit_daily", 500.0)
    
    # 2. 调用 SQLManager 获取今日已排放汇总 (status='-')
    stats = db.get_today_stats()
    used_nox = stats.get("total_nox", 0.0)
    
    # 3. 需求 9: 计算小时配额建议
    now = datetime.now()
    remaining_hours = 24 - now.hour
    if remaining_hours <= 0: remaining_hours = 1
    
    advice = (daily_limit - used_nox) / remaining_hours
    
    return {
        "nox_used": round(used_nox, 2),
        "nox_limit": daily_limit,
        "percent": round((used_nox / daily_limit) * 100, 2) if daily_limit > 0 else 0,
        "advice_hourly_limit": round(max(0, advice), 2),
        "unit": "kg",
        "update_time": now.strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/v1/boilers/realtime")
async def get_realtime():
    """
    需求 10: 获取全厂所有锅炉的最新的分钟折算数据快照 (用于大屏卡片)
    """
    return db.get_all_boilers_realtime()

@app.get("/api/v1/analytics/trend")
async def get_trend(hours: int = Query(24, ge=1, le=72)):
    """
    需求 3: 获取历史排放趋势数据 (用于折线图)
    """
    data = db.get_recent_trend(hours=hours)
    return {"data": data}

# --- 配置管理接口 ---

@app.post("/api/v1/config/limit")
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

@app.get("/api/v1/config/limit/{key}")
async def fetch_limit(key: str, default: float = 0.0):
    """读取指定的限值配置"""
    value = db.get_limit(key, default)
    return {"key": key, "value": value}

if __name__ == "__main__":
    import uvicorn
    # 运行提示：请确保在 Auto 根目录下执行 python -m webservice.main
    uvicorn.run(app, host="0.0.0.0", port=8000)