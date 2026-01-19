"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Activity } from "lucide-react"
import { TrendChart } from "./trend-chart"

interface TargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boilerId: string
  paramType: string // 接收从 Page 传来的类型
  historyData: { time: string; value: number }[]
}

export function TargetDialog({ 
  open, 
  onOpenChange, 
  boilerId, 
  paramType, 
  historyData = [] 
}: TargetDialogProps) {

  // 核心修复：数据适配转换
  const formattedChartData = useMemo(() => {
    // 强制转换为小写进行匹配，确保 Dust / dust 都能匹配上
    const type = paramType.toLowerCase();
    
    return historyData.map(d => ({
      time: d.time,
      // 只要匹配上了，就把 value 给它，其余为 0
      nox: type === 'nox' ? d.value : 0,
      so2: type === 'so2' ? d.value : 0,
      dust: type === 'dust' ? d.value : 0,
    }))
  }, [historyData, paramType])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            {/* 标题显示具体设备和参数 */}
            {boilerId} - {paramType.toUpperCase()} 历史趋势
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            展示过去 8 小时的实时监测详情（采样间隔 20 分钟）
          </DialogDescription>
        </DialogHeader>

        {/* 纯粹的图表展示区，增加了高度 */}
        <div className="h-[250px] w-full mt-4 bg-muted/10 rounded-xl p-4 border border-border/50">
          {historyData.length > 0 ? (
            <TrendChart data={formattedChartData} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              暂无该时段历史数据
            </div>
          )}
        </div>
        
        {/* 页脚简单化 */}
        <div className="mt-4 text-center">
           <button 
             onClick={() => onOpenChange(false)}
             className="text-xs text-muted-foreground hover:text-primary transition-colors"
           >
             点击空白处或此处关闭窗口
           </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}