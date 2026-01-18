"use client"

import { useMemo } from "react"

// 1. 定义后端趋势数据的结构
interface TrendPoint {
  time: string
  nox: number
  so2: number
  dust: number
}

interface TrendChartProps {
  data?: TrendPoint[]
}

export function TrendChart({ data = [] }: TrendChartProps) {
  // 2. 数据处理：确保始终有数据展示，如果后端没返回则显示空数组
  // 我们只取时间的小时部分作为坐标轴标签
  const chartData = useMemo(() => {
    if (data.length === 0) return []
    return data.map(d => ({
      ...d,
      displayTime: d.time.includes(' ') ? d.time.split(' ')[1].substring(0, 5) : d.time
    }))
  }, [data])

  // 3. 计算坐标系参数
  const chartHeight = 200
  const chartWidth = 1000 // 增加宽度提高解析度
  
  // 动态计算 Y 轴最大值，至少为 50，防止数据太小时图表太扁
  const maxValue = useMemo(() => {
    const highest = Math.max(...data.map(d => Math.max(d.nox, d.so2, d.dust)), 0)
    return Math.max(highest * 1.2, 50) 
  }, [data])

  const getY = (value: number) => chartHeight - (value / maxValue) * chartHeight

  const createPath = (key: "nox" | "so2" | "dust") => {
    if (chartData.length < 2) return ""
    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * chartWidth
      // 增加对通用键名 "value" 的支持（对应你 SQL 返回的格式）
      const val = d[key] !== undefined ? d[key] : (d as any).value;

      // const y = getY(d[key])
      // return `${i === 0 ? "M" : "L"} ${x} ${y}`
      const y = getY(val || 0)
      return `${i === 0 ? "M" : "L"} ${x} ${y}`
      
    })
    return points.join(" ")
  }

  return (
    <div className="h-full flex flex-col">
      {/* Legend - 图例 */}
      <div className="flex flex-wrap gap-4 mb-4">
        <LegendItem color="#3b82f6" label="NOx (kg)" />
        <LegendItem color="#f59e0b" label="SO₂ (kg)" />
        <LegendItem color="#8b5cf6" label="Dust (kg)" />
        
        <div className="ml-auto hidden md:flex gap-3 text-[10px] text-muted-foreground italic">
          * 24H Full Plant Total Emission
        </div>
      </div>

      {/* Chart - SVG绘图区 */}
      <div className="flex-1 relative mt-2">
        {chartData.length > 0 ? (
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            preserveAspectRatio="none" 
            className="w-full h-full"
          >
            {/* 网格背景线 */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1="0"
                y1={chartHeight * p}
                x2={chartWidth}
                y2={chartHeight * p}
                stroke="currentColor"
                strokeOpacity="0.05"
                strokeWidth="1"
              />
            ))}

            {/* 绘制三条趋势线 */}
            <path d={createPath("nox")} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
            <path d={createPath("so2")} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
            <path d={createPath("dust")} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
            No trend data available for the last 24h
          </div>
        )}

        {/* Y-axis labels - Y轴刻度 */}
        <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-[9px] text-muted-foreground font-mono">
          <span>{maxValue.toFixed(0)}</span>
          <span>{(maxValue * 0.5).toFixed(0)}</span>
          <span>0</span>
        </div>
      </div>

      {/* X-axis - X轴时间点 */}
      <div className="flex justify-between mt-2 text-[9px] text-muted-foreground font-mono px-1">
        {chartData.length > 0 ? (
          <>
            <span>{chartData[0].displayTime}</span>
            <span>{chartData[Math.floor(chartData.length / 2)]?.displayTime}</span>
            <span>{chartData[chartData.length - 1].displayTime}</span>
          </>
        ) : (
          <>
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </>
        )}
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}