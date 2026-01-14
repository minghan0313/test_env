"use client"

import { Card } from "@/components/ui/card"
import { Sparkline } from "@/components/sparkline"
import { ChevronRight } from "lucide-react"

interface Boiler {
  id: string
  name: string
  status: "online" | "warning" | "offline" | "maintenance"
  emission: number
  unit: string
  trend: number[]
}

const boilers: Boiler[] = [
  {
    id: "1",
    name: "Boiler A1",
    status: "online",
    emission: 142,
    unit: "kg/h",
    trend: [45, 52, 48, 55, 60, 58, 62, 65, 63, 68, 70, 72],
  },
  {
    id: "2",
    name: "Boiler A2",
    status: "warning",
    emission: 198,
    unit: "kg/h",
    trend: [60, 65, 70, 75, 80, 85, 88, 92, 95, 98, 96, 94],
  },
  {
    id: "3",
    name: "Boiler B1",
    status: "online",
    emission: 125,
    unit: "kg/h",
    trend: [40, 42, 38, 45, 43, 41, 44, 46, 48, 45, 47, 49],
  },
  {
    id: "4",
    name: "Boiler B2",
    status: "offline",
    emission: 0,
    unit: "kg/h",
    trend: [30, 28, 25, 20, 15, 10, 5, 2, 0, 0, 0, 0],
  },
  {
    id: "5",
    name: "Boiler C1",
    status: "online",
    emission: 156,
    unit: "kg/h",
    trend: [50, 55, 58, 54, 56, 60, 62, 58, 61, 64, 66, 68],
  },
  {
    id: "6",
    name: "Boiler C2",
    status: "maintenance",
    emission: 0,
    unit: "kg/h",
    trend: [45, 40, 35, 30, 25, 20, 15, 10, 5, 0, 0, 0],
  },
  {
    id: "7",
    name: "Boiler D1",
    status: "online",
    emission: 52,
    unit: "kg/h",
    trend: [20, 22, 25, 23, 26, 28, 30, 28, 32, 30, 33, 35],
  },
]

const statusConfig = {
  online: { color: "bg-[oklch(0.72_0.19_155)]", label: "Online" },
  warning: { color: "bg-[oklch(0.75_0.16_85)]", label: "Warning" },
  offline: { color: "bg-[oklch(0.65_0.22_25)]", label: "Offline" },
  maintenance: { color: "bg-[oklch(0.6_0.15_250)]", label: "Maintenance" },
}

export function BoilerList() {
  return (
    <div className="overflow-y-auto flex-1 px-4 pb-24" style={{ maxHeight: "calc(100vh - 340px)" }}>
      <div className="space-y-3">
        {boilers.map((boiler) => (
          <BoilerCard key={boiler.id} boiler={boiler} />
        ))}
      </div>
    </div>
  )
}

function BoilerCard({ boiler }: { boiler: Boiler }) {
  const { color, label } = statusConfig[boiler.status]
  const trendDirection = boiler.trend.length >= 2 ? boiler.trend[boiler.trend.length - 1] - boiler.trend[0] : 0

  return (
    <Card className="p-4 bg-card border-border/50 active:bg-secondary/50 transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
        {/* Status indicator and name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} aria-label={label} />
            <span className="font-medium text-foreground truncate">{boiler.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{label}</span>
            {boiler.status !== "offline" && boiler.status !== "maintenance" && (
              <span className="text-sm text-muted-foreground">
                • {boiler.emission} {boiler.unit}
              </span>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="w-20 h-10 flex-shrink-0">
          <Sparkline data={boiler.trend} status={boiler.status} trendDirection={trendDirection} />
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>
    </Card>
  )
}
