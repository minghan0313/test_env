"use client"

interface SparklineProps {
  data: number[]
  status: "online" | "warning" | "offline" | "maintenance"
  trendDirection: number
}

const statusColors = {
  online: "oklch(0.72 0.19 155)",
  warning: "oklch(0.75 0.16 85)",
  offline: "oklch(0.45 0 0)",
  maintenance: "oklch(0.6 0.15 250)",
}

export function Sparkline({ data, status, trendDirection }: SparklineProps) {
  if (data.length < 2) return null

  const width = 80
  const height = 40
  const padding = 4

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(" ")

  const color = statusColors[status]
  const fillOpacity = status === "offline" ? 0.1 : 0.2

  // Create area path
  const firstPoint = `${padding},${height - padding}`
  const lastPoint = `${width - padding},${height - padding}`
  const areaPath = `M ${firstPoint} L ${points} L ${lastPoint} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Trend: ${trendDirection >= 0 ? "increasing" : "decreasing"}`}
      role="img"
    >
      {/* Fill area */}
      <path d={areaPath} fill={color} fillOpacity={fillOpacity} />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r={3}
          fill={color}
        />
      )}
    </svg>
  )
}
