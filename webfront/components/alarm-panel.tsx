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
// 接收的 boilers 此时是一个对象 Map
interface AlarmPanelProps {
  boilers?: BoilerData[]
}

export function AlarmPanel({ boilers = [] }: AlarmPanelProps) {
  
  // 【最关键的一行】：将对象转为数组
  // 如果 boilers 已经是数组，则直接使用；如果是对象，则取其 values 构成数组
  const boilerList = Array.isArray(boilers) ? boilers : Object.values(boilers);

 //状态判定逻辑
  const getStatus = (value: number, type: 'nox' | 'so2' | 'dust') => {
    if (type === 'nox') {
      if (value > 50) return "exceeded" as const;
      if (value < 20 && value > 0) return "warning" as const; // 氨逃逸风险
      return "normal" as const;
    }
    if (value > 30) return "exceeded" as const;
    return "normal" as const;
  };

  return (
    /* 核心修改：取消 h-full 解决空白问题，p-3.5 保持精致感 */
    <div className="bg-card rounded-lg border border-border p-3.5 shadow-sm min-h-fit">
      
      {/* 标题栏：增加单位显示，提高专业感 */}
      <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
        机组实时折算监控
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          Unit: m³
        </span>
      </div>
      
      {/* 3. 动态循环渲染卡片：保持 grid-cols-2，但缩小 gap 增加紧凑度 */}
      <div className="grid grid-cols-2 gap-2">
        {boilerList.map((boiler:any) => (
          <BoilerCard 
            key={boiler.boiler_name} 
            // 优化：ID 简简化显示，如果名字太长，这里可以做截取
            id={boiler.boiler_name} 
            nox={boiler.nox_zs || 0}
            so2={boiler.so2_zs || 0}
            dust={boiler.dust_zs || 0}
            noxStatus={getStatus(boiler.nox_zs, 'nox')}
            so2Status={getStatus(boiler.so2_zs, 'so2')}
            dustStatus={getStatus(boiler.dust_zs, 'dust')}
            //直接透传后端处理好的 7 个历史点数据
            trendData={boiler.history || {
              nox: Array(7).fill(0),
              so2: Array(7).fill(0),
              dust: Array(7).fill(0),
            }}
          />
        ))}

        {/* 4. 无数据状态：压缩高度 */}
        {boilerList.length === 0 && (
          <div className="col-span-2 py-6 text-center text-xs text-muted-foreground italic">
            正在等待数据流输入...
          </div>
        )}
      </div>
    </div>
  )
}