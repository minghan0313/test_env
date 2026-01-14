"use client"
//这个组件的功能是页面右侧锅炉实时监控卡片的容器内容

import { BoilerCard } from "./boiler-card"

// 1. 定义从后端传来的锅炉数据结构
interface BoilerData {
  boiler_name: string
  nox_zs: number
  so2_zs: number
  dust_zs: number
  status: string
}

interface AlarmPanelProps {
  boilers?: BoilerData[]
}

export function AlarmPanel({ boilers = [] }: AlarmPanelProps) {
  
  // 2. 状态判定逻辑 (需求 7 & 需求 8)
  // 根据业务需求：NOx > 50 报警，NOx < 20 氨逃逸风险
  const getStatus = (value: number, type: 'nox' | 'so2' | 'dust') => {
    if (type === 'nox') {
      if (value > 50) return "exceeded" as const;
      if (value < 20 && value > 0) return "warning" as const; // 氨逃逸风险
      return "normal" as const;
    }
    // SO2 和 Dust 的判定逻辑，这里暂设为常态，可根据需要调整
    if (value > 30) return "exceeded" as const;
    return "normal" as const;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm h-full">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Concentration Alarm Panel
      </h2>
      
      {/* 3. 动态循环渲染 7 台锅炉卡片 */}
      <div className="grid grid-cols-2 gap-2.5">
        {boilers.map((boiler) => (
          <BoilerCard 
            key={boiler.boiler_name} 
            id={boiler.boiler_name} // 显示锅炉名称
            nox={boiler.nox_zs || 0}
            so2={boiler.so2_zs || 0}
            dust={boiler.dust_zs || 0}
            // 传递计算出的状态
            noxStatus={getStatus(boiler.nox_zs, 'nox')}
            so2Status={getStatus(boiler.so2_zs, 'so2')}
            dustStatus={getStatus(boiler.dust_zs, 'dust')}
            // 实时状态下，趋势图暂用空数据或固定数据
            trendData={{
              nox: [0, 0, 0, 0, 0, 0, 0, boiler.nox_zs],
              so2: [0, 0, 0, 0, 0, 0, 0, boiler.so2_zs],
              dust: [0, 0, 0, 0, 0, 0, 0, boiler.dust_zs],
            }}
          />
        ))}

        {/* 4. 如果没数据时显示提示 */}
        {boilers.length === 0 && (
          <div className="col-span-2 py-10 text-center text-sm text-muted-foreground">
            No boiler data received...
          </div>
        )}
      </div>
    </div>
  )
}