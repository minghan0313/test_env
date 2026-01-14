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
import { Minus, Plus } from "lucide-react"

interface TargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTarget: number
  onTargetChange: (target: number) => void
}

export function TargetDialog({ open, onOpenChange, currentTarget, onTargetChange }: TargetDialogProps) {
  const [tempTarget, setTempTarget] = useState(currentTarget)

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
      <DialogContent className="max-w-[340px] rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">修改今日总量目标</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            设置全厂今日 NOx 排放的最大累计限额 (kg)。
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <Label htmlFor="target-input" className="sr-only">
            Target value
          </Label>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleDecrement}
              disabled={tempTarget <= 10}
              className="h-12 w-12 rounded-full border border-border"
            >
              <Minus className="h-5 w-5" />
            </Button>

            <div className="relative">
              <Input
                id="target-input"
                type="number"
                value={tempTarget}
                onChange={(e) => setTempTarget(Number(e.target.value))}
                className="w-28 h-14 text-center text-2xl font-semibold bg-secondary border-border tabular-nums focus-visible:ring-primary"
              />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary">kg NOx</span>
            </div>

            <Button
              variant="secondary"
              size="icon"
              onClick={handleIncrement}
              disabled={tempTarget >= 10000}
              className="h-12 w-12 rounded-full border border-border"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            取消
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            确认修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}