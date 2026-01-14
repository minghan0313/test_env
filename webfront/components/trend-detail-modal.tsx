"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface TrendDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: string
  pollutant: "NOx" | "SO2" | "Dust"
  data: number[]
  unit?: string
}

const pollutantColors = {
  NOx: "#3b82f6",
  SO2: "#f59e0b",
  Dust: "#8b5cf6",
}

const pollutantThresholds = {
  NOx: { warning: 50, exceeded: 80 },
  SO2: { warning: 50, exceeded: 70 },
  Dust: { warning: 30, exceeded: 45 },
}

export function TrendDetailModal({
  open,
  onOpenChange,
  deviceId,
  pollutant,
  data,
  unit = "mg/m³",
}: TrendDetailModalProps) {
  const color = pollutantColors[pollutant]
  const thresholds = pollutantThresholds[pollutant]

  const min = Math.min(...data)
  const max = Math.max(...data)
  const avg = data.reduce((a, b) => a + b, 0) / data.length
  const current = data[data.length - 1]

  // Determine y-axis range with padding
  const yMin = Math.floor(Math.min(min, thresholds.warning * 0.5) / 10) * 10
  const yMax = Math.ceil(Math.max(max, thresholds.exceeded * 1.2) / 10) * 10
  const yRange = yMax - yMin || 1

  // Chart dimensions
  const chartWidth = 500
  const chartHeight = 200
  const padding = { top: 20, right: 40, bottom: 30, left: 50 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Generate time labels (last 8 hours)
  const timeLabels = Array.from({ length: 8 }, (_, i) => {
    const hour = new Date()
    hour.setHours(hour.getHours() - (7 - i))
    return hour.getHours().toString().padStart(2, "0") + ":00"
  })

  // Generate data points
  const points = data.map((value, index) => {
    const x = padding.left + (index / (data.length - 1)) * innerWidth
    const y = padding.top + innerHeight - ((value - yMin) / yRange) * innerHeight
    return { x, y, value }
  })

  const pathD = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ")

  // Area path for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`

  // Threshold line positions
  const warningY = padding.top + innerHeight - ((thresholds.warning - yMin) / yRange) * innerHeight
  const exceededY = padding.top + innerHeight - ((thresholds.exceeded - yMin) / yRange) * innerHeight

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = yMin + (yRange / 4) * i
    const y = padding.top + innerHeight - (i / 4) * innerHeight
    return { value: Math.round(value), y }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px] p-0 gap-0">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="flex items-center gap-3 text-base font-semibold">
            <span className="font-mono text-primary">{deviceId}</span>
            <span className="text-muted-foreground">/</span>
            <span style={{ color }}>{pollutant === "SO2" ? "SO₂" : pollutant}</span>
            <span className="text-muted-foreground text-sm font-normal">Last 8 Hours</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5">
          {/* Stats row */}
          <div className="flex gap-6 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current:</span>{" "}
              <span className="font-mono font-medium">
                {current.toFixed(1)} {unit}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg:</span>{" "}
              <span className="font-mono font-medium">
                {avg.toFixed(1)} {unit}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Min:</span>{" "}
              <span className="font-mono font-medium">
                {min.toFixed(1)} {unit}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Max:</span>{" "}
              <span className="font-mono font-medium">
                {max.toFixed(1)} {unit}
              </span>
            </div>
          </div>

          {/* Chart */}
          <svg width={chartWidth} height={chartHeight} className="overflow-visible">
            <defs>
              <linearGradient id={`gradient-${pollutant}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yTicks.map((tick) => (
              <line
                key={tick.value}
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + innerWidth}
                y2={tick.y}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
            ))}

            {/* Threshold zones */}
            {exceededY > padding.top && (
              <rect
                x={padding.left}
                y={padding.top}
                width={innerWidth}
                height={Math.max(0, exceededY - padding.top)}
                fill="#ef4444"
                fillOpacity={0.08}
              />
            )}
            {warningY > exceededY && (
              <rect
                x={padding.left}
                y={exceededY}
                width={innerWidth}
                height={Math.max(0, warningY - exceededY)}
                fill="#f59e0b"
                fillOpacity={0.08}
              />
            )}

            {/* Threshold lines */}
            <line
              x1={padding.left}
              y1={warningY}
              x2={padding.left + innerWidth}
              y2={warningY}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <line
              x1={padding.left}
              y1={exceededY}
              x2={padding.left + innerWidth}
              y2={exceededY}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 2"
            />

            {/* Threshold labels */}
            <text x={padding.left + innerWidth + 4} y={warningY} fontSize={10} fill="#f59e0b" dominantBaseline="middle">
              Warn
            </text>
            <text
              x={padding.left + innerWidth + 4}
              y={exceededY}
              fontSize={10}
              fill="#ef4444"
              dominantBaseline="middle"
            >
              Limit
            </text>

            {/* Area fill */}
            <path d={areaD} fill={`url(#gradient-${pollutant})`} />

            {/* Data line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {/* Data points */}
            {points.map((point, index) => (
              <circle key={index} cx={point.x} cy={point.y} r={3} fill={color} />
            ))}

            {/* Y-axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + innerHeight}
              stroke="currentColor"
              strokeOpacity={0.2}
            />
            {yTicks.map((tick) => (
              <text
                key={tick.value}
                x={padding.left - 8}
                y={tick.y}
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.6}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tick.value}
              </text>
            ))}

            {/* X-axis labels */}
            {timeLabels.map((label, index) => (
              <text
                key={label}
                x={padding.left + (index / (timeLabels.length - 1)) * innerWidth}
                y={padding.top + innerHeight + 16}
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.6}
                textAnchor="middle"
              >
                {label}
              </text>
            ))}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500" />
              <span>
                Warning ({thresholds.warning} {unit})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-500" />
              <span>
                Exceedance ({thresholds.exceeded} {unit})
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
