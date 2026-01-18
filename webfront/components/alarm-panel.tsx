"use client"
// 这个组件的功能是页面右侧锅炉实时监控卡片的容器内容

import { BoilerCard } from "./boiler-card"

// 1. 定义从后端传来的锅炉数据结构
interface BoilerData {
  boiler_name: string
  nox_zs: number
  so2_zs: number
  dust_zs: number
  status: string
  update_time: string
  history: {
    nox: number[]
    so2: number[]
    dust: number[]
    times: string[]
  }
}

// 【Props 接口修改】：增加了可选的 onDetailClick 函数
interface AlarmPanelProps {
  boilers?: BoilerData[]
  onDetailClick?: (boilerId: string, type: string) => void // 新增：点击详情的回调
}

export function AlarmPanel({ boilers = [], onDetailClick }: AlarmPanelProps) {
  
  // 将对象转为数组
  const boilerList = Array.isArray(boilers) ? boilers : Object.values(boilers);

  // 状态判定逻辑
  const getStatus = (value: number, type: 'nox' | 'so2' | 'dust') => {
    if (type === 'nox') {
      if (value > 50) return "exceeded" as const;
      if (value < 20 && value > 0) return "warning" as const;
      return "normal" as const;
    }
    if (value > 30) return "exceeded" as const;
    return "normal" as const;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3.5 shadow-sm min-h-fit">
      
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
          机组实时折算监控
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          Unit: mg/m³
        </span>
      </div>
      
      {/* 3. 动态循环渲染卡片 */}
      <div className="grid grid-cols-2 gap-2">
        {boilerList.map((boiler: any) => (
          <BoilerCard 
            key={boiler.boiler_name} 
            // 简化显示 ID，如 NORTH_1 显示为 N1
            id={boiler.boiler_name.replace('NORTH_', 'N').replace('SOUTH_', 'S')} 
            nox={boiler.nox_zs || 0}
            so2={boiler.so2_zs || 0}
            dust={boiler.dust_zs || 0}
            noxStatus={getStatus(boiler.nox_zs, 'nox')}
            so2Status={getStatus(boiler.so2_zs, 'so2')}
            dustStatus={getStatus(boiler.dust_zs, 'dust')}
            
            // 传入实时趋势小图数据
            trendData={boiler.history || {
              nox: Array(7).fill(0),
              so2: Array(7).fill(0),
              dust: Array(7).fill(0),
            }}

            // 【核心修改点】：绑定点击动作
            // 当 BoilerCard 内部触发 onTrendClick 时，
            // 我们执行父组件传来的 onDetailClick，并把当前 boiler 的名字传过去
            onTrendClick={(type: "NOx" | "SO2" | "Dust") => { // 明确指定 type 的类型
              if (onDetailClick) {
                onDetailClick(boiler.boiler_name, type);
              }
            }}
          />
        ))}

        {/* 4. 无数据状态 */}
        {boilerList.length === 0 && (
          <div className="col-span-2 py-6 text-center text-xs text-muted-foreground italic">
            正在等待数据流输入...
          </div>
        )}
      </div>
    </div>
  )
}