"use client"

import { useMemo } from "react"

interface TrendPoint {
  time: string
  nox: number
  so2: number
  dust: number
}

interface TrendChartProps {
  data?: TrendPoint[]
  showLegend?: boolean
}

export function TrendChart({ data = [], showLegend = false }: TrendChartProps) {
  // 1. 处理数据：格式化显示时间
  const chartData = useMemo(() => {
    if (data.length === 0) return []
    return data.map(d => ({
      ...d,
      // 提取 HH:mm 格式
      displayTime: d.time.includes(' ') ? d.time.split(' ')[1].substring(0, 5) : d.time
    }))
  }, [data])

  const chartHeight = 250 // 增加绘图区高度，为双行文字留空间
  const chartWidth = 1000 
  
  const maxValue = useMemo(() => {
    const highest = Math.max(...data.map(d => {
      const valNox = d.nox !== undefined ? d.nox : (d as any).value || 0;
      return Math.max(valNox, d.so2 || 0, d.dust || 0);
    }), 0)
    return Math.max(highest * 1.3, 50) // 增加到 1.3 倍，防止文字顶到天花板
  }, [data])

  const getY = (value: number) => chartHeight - (value / maxValue) * chartHeight

  const createPath = (key: "nox" | "so2" | "dust") => {
    if (chartData.length < 2) return ""
    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * chartWidth
      const val = d[key] !== undefined ? d[key] : (d as any).value;
      const y = getY(val || 0)
      return `${i === 0 ? "M" : "L"} ${x} ${y}`
    })
    return points.join(" ")
  }

  /**
   * --- 核心修改：渲染双行数据标注 ---
   * 在每个点位上方同时显示：数值 (Value) 和 时间 (Time)
   */
  const renderDataLabels = (key: "nox" | "so2" | "dust") => {
    return chartData.map((d, i) => {
      const val = d[key] !== undefined ? d[key] : (d as any).value;
      if (val === undefined || val === 0) return null;

      const x = (i / (chartData.length - 1)) * chartWidth
      const y = getY(val)

      return (
        <g key={`${key}-label-group-${i}`}>
          {/* 第一行：显示数值 (Y轴信息) */}
          <text
            x={x}
            y={y - 22} // 位置最高
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            className="fill-primary font-mono"
          >
            {val.toFixed(1)}
          </text>
          {/* 第二行：显示时间 (X轴信息) */}
          <text
            x={x}
            y={y - 8}  // 紧贴在点位上方
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            className="fill-muted-foreground/80 font-mono"
          >
            {d.displayTime}
          </text>
          {/* 小圆点：标注实际数据位置 */}
          <circle cx={x} cy={y} r="3" className="fill-primary" />
        </g>
      )
    })
  }

  return (
    <div className="h-full flex flex-col">
      {showLegend && (
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 rounded-full bg-[#3b82f6]" />
            <span className="text-sm font-bold text-muted-foreground">NOx (kg)</span>
          </div>
          {/* ... 其他图例 ... */}
        </div>
      )}

      <div className="flex-1 relative mt-10 mb-6"> 
        {chartData.length > 0 ? (
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            preserveAspectRatio="none" 
            className="w-full h-full overflow-visible"
          >
            {/* 网格背景 */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line key={p} x1="0" y1={chartHeight * p} x2={chartWidth} y2={chartHeight * p} stroke="currentColor" strokeOpacity="0.05" />
            ))}

            {/* 趋势线 */}
            <path d={createPath("nox")} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinejoin="round" />
            <path d={createPath("so2")} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
            <path d={createPath("dust")} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinejoin="round" />

            {/* 渲染 X+Y 轴数据标注 */}
            {renderDataLabels("nox")}
            {renderDataLabels("so2")}
            {renderDataLabels("dust")}
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">暂无趋势数据</div>
        )}

        {/* Y 轴刻度 */}
        <div className="absolute -left-10 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground font-mono font-black">
          <span>{maxValue.toFixed(0)}</span>
          <span>0</span>
        </div>
      </div>

      {/* X 轴底部大时间显示 */}
      <div className="flex justify-between mt-6 text-xl text-foreground font-mono font-black px-2 border-t-2 border-border/50 pt-4">
        {chartData.length > 0 ? (
          <>
            <span>开始: {chartData[0].displayTime}</span>
            <span>中间: {chartData[Math.floor(chartData.length / 2)]?.displayTime}</span>
            <span>当前: {chartData[chartData.length - 1].displayTime}</span>
          </>
        ) : (
          <span>--:--</span>
        )}
      </div>
    </div>
  )
}