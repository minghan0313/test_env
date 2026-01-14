"use client"

interface EmissionProgressProps {
  percentage: number
  current: number
  target: number
}

export function EmissionProgress({ percentage, current, target }: EmissionProgressProps) {
  const radius = 90
  const strokeWidth = 12
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getStatusColor = () => {
    if (percentage >= 90) return "oklch(0.65 0.22 25)"
    if (percentage >= 70) return "oklch(0.75 0.16 85)"
    return "oklch(0.72 0.19 155)"
  }

  const getStatusLabel = () => {
    if (percentage >= 90) return "Critical"
    if (percentage >= 70) return "Warning"
    return "Normal"
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Daily emission at ${percentage}% of target`}
        >
          {/* Background circle */}
          <circle
            stroke="oklch(0.22 0.005 260)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={getStatusColor()}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground tabular-nums">{percentage}%</span>
          <span className="text-sm font-medium mt-1" style={{ color: getStatusColor() }}>
            {getStatusLabel()}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-8 mt-6">
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground tabular-nums">{current}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">kg CO₂</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-2xl font-semibold text-muted-foreground tabular-nums">{target}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Target</p>
        </div>
      </div>
    </div>
  )
}
