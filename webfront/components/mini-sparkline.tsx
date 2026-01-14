"use client"

import { cn } from "@/lib/utils"

interface MiniSparklineProps {
  data: number[]
  color: string
  onClick?: () => void
  className?: string
}

export function MiniSparkline({ data, color, onClick, className }: MiniSparklineProps) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Generate SVG path
  const width = 48
  const height = 16
  const padding = 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const pathD = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ")

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded px-1 py-0.5 transition-all",
        "hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40",
        "cursor-pointer",
        className,
      )}
      aria-label="View detailed trend"
    >
      <svg width={width} height={height} className="overflow-visible">
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* End point indicator */}
        <circle cx={points[points.length - 1]?.x} cy={points[points.length - 1]?.y} r={2} fill={color} />
      </svg>
    </button>
  )
}
