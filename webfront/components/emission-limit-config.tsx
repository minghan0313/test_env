"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

// 定义新的接口结构
interface LimitConfig {
  total_flow: number      // 合计总量
  so2_flow: number        // SO2总量
  nox_flow: number        // NOx总量
  dust_flow: number       // 烟尘总量
  so2_rate_high: number   // SO2折算上限
  nox_rate_high: number   // NOx折算上限
  nox_rate_low: number    // NOx折算下限
  dust_rate_high: number  // 粉尘折算上限
}

// 设置新的默认值
const defaultConfig: LimitConfig = {
  total_flow: 678,
  so2_flow: 230,
  nox_flow: 478,
  dust_flow: 70,
  so2_rate_high: 30,
  nox_rate_high: 50,
  nox_rate_low: 6,
  dust_rate_high: 100,
}

export function EmissionLimitConfig() {
  const [config, setConfig] = useState<LimitConfig>(defaultConfig)
  const [hasChanges, setHasChanges] = useState(false)

  // 处理输入变化
  const handleChange = (field: keyof LimitConfig, value: string) => {
    const numValue = Number.parseFloat(value) || 0
    setConfig((prev) => ({ ...prev, [field]: numValue }))
    setHasChanges(true)
  }

  const handleSave = () => {
    // 实际开发中此处应调用 axios.post 发送给后端
    setHasChanges(false)
    console.log("Saved config:", config)
  }

  const handleReset = () => {
    setConfig(defaultConfig)
    setHasChanges(false)
  }

  return (
    <div className="flex flex-col h-full p-1">
      <div className="flex-1 space-y-6">
        
        {/* 第一组：排放总量配额 (Flow Limits) */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
            日排放配额 (Daily Quota)
          </h4>
          
          <div className="flex flex-col gap-3.5">
            {/* 合计总量 - 特殊高亮 */}
            <div className="flex flex-col gap-1.5 bg-primary/5 p-2 rounded-md border border-primary/10">
              <Label htmlFor="total_flow" className="text-xs font-bold text-primary">全厂合计总配额</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="total_flow"
                  type="number"
                  value={config.total_flow}
                  onChange={(e) => handleChange("total_flow", e.target.value)}
                  className="h-8 text-xs font-mono bg-background"
                />
                <span className="text-[10px] text-primary/80 w-12 shrink-0">kg/d</span>
              </div>
            </div>

            {/* 各参数总量 */}
            {[
              { id: "nox_flow", label: "NOx 总量限值", key: "nox_flow" },
              { id: "so2_flow", label: "SO₂ 总量限值", key: "so2_flow" },
              { id: "dust_flow", label: "烟尘总量限值", key: "dust_flow" },
            ].map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 px-1">
                <Label htmlFor={item.id} className="text-xs font-semibold text-foreground/70">{item.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={item.id}
                    type="number"
                    value={config[item.key as keyof LimitConfig]}
                    onChange={(e) => handleChange(item.key as keyof LimitConfig, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">kg/d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* 第二组：折算浓度限值 (Rate Limits) */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-l-2 border-orange-400 pl-2">
            折算浓度限值 (Rates)
          </h4>
          
          <div className="flex flex-col gap-3.5">
            {[
              { id: "nox_rate_high", label: "NOx 折算上限", key: "nox_rate_high", color: "text-orange-600" },
              { id: "nox_rate_low", label: "NOx 折算下限", key: "nox_rate_low", color: "text-orange-400" },
              { id: "so2_rate_high", label: "SO₂ 折算上限", key: "so2_rate_high", color: "text-blue-600" },
              { id: "dust_rate_high", label: "粉尘折算上限", key: "dust_rate_high", color: "text-emerald-600" },
            ].map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 px-1">
                <Label htmlFor={item.id} className={`text-xs font-semibold ${item.color}`}>
                  {item.label}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={item.id}
                    type="number"
                    value={config[item.key as keyof LimitConfig]}
                    onChange={(e) => handleChange(item.key as keyof LimitConfig, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">mg/m³</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="mt-auto pt-6 border-t border-border/40">
        {hasChanges ? (
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={handleSave} className="w-full h-9 text-xs font-bold shadow-md">
              应用新参数 (Apply)
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset} className="w-full h-8 text-xs text-muted-foreground">
              放弃更改
            </Button>
          </div>
        ) : (
          <p className="text-[10px] text-center text-muted-foreground/50 italic py-2">
            参数配置与运行环境同步中
          </p>
        )}
      </div>
    </div>
  )
}