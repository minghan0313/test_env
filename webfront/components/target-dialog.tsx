"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus, Plus, Activity } from "lucide-react" // 确保 Activity 在这里
import { TrendChart } from "./trend-chart"            // 确保路径指向你的趋势图组件


interface TargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  //新增：目标设备
  boilerId: string;      // 比如 "NORTH_1"
  paramType: 'nox' | 'so2' | 'dust'; // 比如 'nox'
  // 趋势数据：24个点 (8小时 * 3个点/小时)
  historyData: { time: string; value: number }[];
  // 原始限值
  currentTarget: number
  onTargetChange: (target: number) => void
}

export function TargetDialog({ open, onOpenChange, currentTarget, onTargetChange, boilerId, paramType, historyData = [] }: TargetDialogProps) {
  const [tempTarget, setTempTarget] = useState(currentTarget)

  // 【核心适配逻辑】：将后端 [{time, value}] 转为 TrendChart 需要的格式
  const unitLabel = paramType === 'nox' ? 'kg NOx' : paramType === 'so2' ? 'kg SO₂' : 'kg Dust';
  const formattedChartData = historyData.map(d => ({
    time: d.time,
    nox: paramType === 'nox' ? d.value : 0,
    so2: paramType === 'so2' ? d.value : 0,
    dust: paramType === 'dust' ? d.value : 0,
  }))

  // 当弹窗打开时，同步当前的限值
  useEffect(() => {
    if (open) {
      setTempTarget(currentTarget)
    }
  }, [open, currentTarget])

  const handleIncrement = () => {
    setTempTarget((prev) => Math.min(prev + 50, 10000))
  }

  const handleDecrement = () => {
    setTempTarget((prev) => Math.max(prev - 50, 10))
  }

  const handleSave = () => {
    onTargetChange(tempTarget)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 宽度设为 450px 保证图表有足够的展示空间 */}
      <DialogContent className="max-w-[450px] rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {boilerId} - {paramType.toUpperCase()} 历史趋势
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            显示最近 8 小时运行参数走势，您可以根据趋势调整今日排放限额。
          </DialogDescription>
        </DialogHeader>

        {/* --- 趋势图表展示区 --- */}
        <div className="h-44 w-full my-4 bg-muted/20 rounded-xl p-3 border border-border/50 relative">
          {formattedChartData.length > 0 ? (
            <TrendChart data={formattedChartData} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              正在加载历史数据...
            </div>
          )}
        </div>

        {/* --- 限值调整区 --- */}
        <div className="py-4 border-t border-border/40">
          <Label htmlFor="target-input" className="text-[11px] font-bold text-muted-foreground uppercase mb-4 block text-center">
            修改今日总量目标 (限值)
          </Label>
          
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleDecrement}
              disabled={tempTarget <= 0}
              className="h-12 w-12 rounded-full border border-border shadow-sm hover:bg-accent"
            >
              <Minus className="h-5 w-5" />
            </Button>

            <div className="relative">
              <Input
                id="target-input"
                type="number"
                value={tempTarget}
                onChange={(e) => setTempTarget(Number(e.target.value))}
                className="w-32 h-14 text-center text-2xl font-bold bg-secondary/50 border-border tabular-nums focus-visible:ring-primary rounded-xl"
              />
              {/* 动态显示对应的污染物单位 */}
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-primary/80 whitespace-nowrap">
                {unitLabel}
              </span>
            </div>

            <Button
              variant="secondary"
              size="icon"
              onClick={handleIncrement}
              disabled={tempTarget >= 20000}
              className="h-12 w-12 rounded-full border border-border shadow-sm hover:bg-accent"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            取消
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            确认修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}