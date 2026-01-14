"use client"

interface CircularGaugeProps {
  label: string
  percentage: number
  emission: number
  unit: string
  color: string
}

export function CircularGauge({ label, percentage, emission, unit, color }: CircularGaugeProps) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="bg-secondary/50 rounded-lg p-4 flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Progress arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{percentage}%</span>
          <span className="text-xs text-muted-foreground">of quota</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-lg font-semibold" style={{ color }}>
          {label}
        </p>
        <p className="text-sm text-muted-foreground">
          {emission} {unit}
        </p>
      </div>
    </div>
  )
}
