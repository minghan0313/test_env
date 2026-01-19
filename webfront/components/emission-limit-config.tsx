"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, RotateCcw } from "lucide-react" 
import axios from "axios"

interface LimitConfig {
  total_flow: number
  so2_flow: number
  nox_flow: number
  dust_flow: number
  so2_rate_high: number
  nox_rate_high: number
  nox_rate_low: number
  dust_rate_high: number
}

interface EmissionLimitConfigProps {
  sysLimits: LimitConfig | null;
  onSaveSuccess: () => void;
}

export function EmissionLimitConfig({ sysLimits, onSaveSuccess }: EmissionLimitConfigProps) {
  const [config, setConfig] = useState<LimitConfig | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (sysLimits) {
      setConfig(sysLimits)
      setHasChanges(false)
    }
  }, [sysLimits])

  const handleChange = (field: keyof LimitConfig, value: string) => {
    if (!config) return
    const numValue = Number.parseFloat(value) || 0
    setConfig((prev) => prev ? ({ ...prev, [field]: numValue }) : null)
    setHasChanges(true)
  }

  // --- 修改后的保存逻辑：适配单参数更新接口 ---
  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    
    try {
      // 1. 将 8 个参数转换成 8 个独立的请求任务
      const updateTasks = Object.entries(config).map(([key, value]) => {
        return axios.post("http://127.0.0.1:8000/api/v1/config/updatelimit", {
          key: key,
          value: value
        });
      });

      // 2. 并行发送所有请求
      await Promise.all(updateTasks);
      
      setHasChanges(false)
      if (onSaveSuccess) onSaveSuccess()
      alert("参数已全部成功同步至数据库")
    } catch (error: any) {
      console.error("批量保存失败", error)
      alert("部分或全部参数保存失败，请检查后端连接")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (sysLimits) {
      setConfig(sysLimits)
      setHasChanges(false)
    }
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs italic">正在从服务器读取限值...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-1 overflow-y-auto scrollbar-hide">
      <div className="flex-1 space-y-6">
        {/* 排放配额组 */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
            排放配额 (Quota)
          </h4>
          <div className="flex flex-col gap-3.5 px-1">
            <div className="flex flex-col gap-1.5 bg-primary/5 p-2 rounded-md">
              <Label className="text-[11px] font-bold text-primary tracking-tight">全厂合计总配额</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.total_flow}
                  onChange={(e) => handleChange("total_flow", e.target.value)}
                  className="h-8 text-xs font-mono bg-background"
                />
                <span className="text-[10px] text-primary/60 w-8">m³</span>
              </div>
            </div>

            {[
              { id: "nox_flow", label: "NOx 总量限值", key: "nox_flow" },
              { id: "so2_flow", label: "SO2 总量限值", key: "so2_flow" },
              { id: "dust_flow", label: "粉尘总量限值", key: "dust_flow" },
            ].map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 px-1">
                <Label className="text-[10px] font-semibold text-foreground/70">{item.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config[item.key as keyof LimitConfig]}
                    onChange={(e) => handleChange(item.key as keyof LimitConfig, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground w-8">m³</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* 浓度限值组 */}
        <div className="space-y-4 pb-4">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-l-2 border-orange-400 pl-2">
            浓度指标 (Rates)
          </h4>
          <div className="flex flex-col gap-3.5 px-1">
            {[
              { id: "nox_rate_high", label: "NOx 折算上限", key: "nox_rate_high", color: "text-orange-600" },
              { id: "nox_rate_low", label: "NOx 折算下限", key: "nox_rate_low", color: "text-orange-400" },
              { id: "so2_rate_high", label: "SO2 折算上限", key: "so2_rate_high", color: "text-blue-600" },
              { id: "dust_rate_high", label: "粉尘折算上限", key: "dust_rate_high", color: "text-emerald-600" },
            ].map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 px-1">
                <Label className={`text-[10px] font-bold ${item.color}`}>{item.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config[item.key as keyof LimitConfig]}
                    onChange={(e) => handleChange(item.key as keyof LimitConfig, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[9px] text-muted-foreground w-10 shrink-0 uppercase">mg/m³</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-auto pt-4 border-t border-border/40 bg-card">
        {hasChanges ? (
          <div className="flex flex-col gap-2 p-1">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full h-9 text-xs font-bold shadow-md">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
              {isSaving ? "正在批量更新..." : "应用新参数 (APPLY)"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset} disabled={isSaving} className="w-full h-8 text-[10px] text-muted-foreground">
              <RotateCcw className="w-3 h-3 mr-2" /> 放弃更改
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest text-center">
              数据库同步进行中
            </p>
          </div>
        )}
      </div>
    </div>
  )
}