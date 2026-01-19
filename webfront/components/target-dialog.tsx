"use client"

import { useMemo } from "react"
/**
 * 导入 Shadcn UI 的 Dialog 原型组件
 * 这些组件负责底层的弹出逻辑、遮罩层和无障碍支持
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Activity } from "lucide-react" // 导入图标
import { TrendChart } from "./trend-chart" // 导入我们自定义的趋势图组件

/**
 * 接口定义：规定了父组件（Page.tsx）必须传给弹窗的“包裹”
 */
interface TargetDialogProps {
  open: boolean              // 弹窗的开关状态
  onOpenChange: (open: boolean) => void // 改变开关状态的函数（由父组件提供）
  boilerId: string           // 当前选中的锅炉 ID（如 NORTH_1）
  paramType: string          // 当前选中的参数类型（如 nox, so2, dust）
  historyData: { time: string; value: number }[] // 从后端 API 拿到的 24 个历史数据点
}

export function TargetDialog({ 
  open, 
  onOpenChange, 
  boilerId, 
  paramType, 
  historyData = [] 
}: TargetDialogProps) {

  /**
   * --- 关键逻辑：数据适配层 ---
   * 为什么要用 useMemo？
   * 答：为了性能。只有当 historyData 或 paramType 改变时，才重新计算图表数据，避免重复运行循环。
   */
  const formattedChartData = useMemo(() => {
    // 1. 防御性编程：将参数转为小写，防止因为后端传 NOx 而前端判断 nox 导致不匹配
    const type = (paramType || "").toLowerCase();
    
    // 2. 将后端通用格式 [{time, value}] 转换为 TrendChart 专用的 [{time, nox, so2, dust}] 格式
    return historyData.map(d => ({
      time: d.time,
      // 逻辑判断：如果当前弹窗是看 nox 的，就把数值填入 nox 字段，否则填 0
      // 这样 TrendChart 就会只画出对应颜色的那一条线
      nox: type === 'nox' ? d.value : 0,
      so2: type === 'so2' ? d.value : 0,
      dust: type === 'dust' ? d.value : 0,
    }))
  }, [historyData, paramType])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* --- 窗体尺寸定制 ---
        sm:max-w-none: 移除 UI 库默认的小屏幕宽度限制
        w-[90vw]: 强制窗体占据浏览器 90% 的宽度（横向拉伸 2 倍的效果）
        min-h-[70vh]: 强制窗体占据浏览器 70% 的高度
        rounded-3xl: 使用更大的圆角，配合大窗体的视觉比例
      */}
      <DialogContent className="sm:max-w-none w-[90vw] min-h-[70vh] rounded-3xl bg-card border-border shadow-2xl flex flex-col">
        
        {/* 头部区域：显示当前查看的上下文 */}
        <DialogHeader className="px-4">
          <DialogTitle className="flex items-center gap-3 text-3xl font-black">
            <Activity className="h-8 w-8 text-primary" />
            {/* 动态显示标题，例如：NORTH_1 - NOX 历史详情趋势 */}
            {boilerId} - {paramType?.toUpperCase()} 历史详情趋势分析
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground mt-2">
            当前展示最近 8 小时监测数据（20分钟采样点，共 24 个点）。
          </DialogDescription>
        </DialogHeader>

        {/* --- 核心图表容器 ---
          flex-1: 利用 Flex 布局自动撑开垂直方向的剩余空间
          bg-muted/10: 极淡的背景色，衬托出图表区
          p-8: 增加大面积内边距，确保折线上的数值标签有足够的空间不被遮挡
        */}
        <div className="flex-1 w-full mt-8 bg-muted/10 rounded-2xl p-8 border border-border/50 relative min-h-[500px]">
          {/* 条件渲染：有数据才画图，没数据显提示 */}
          {historyData.length > 0 ? (
            <TrendChart 
              data={formattedChartData} 
              showLegend={false} // 在详情弹窗中，我们不需要显示图例说明文字
            />
          ) : (
            <div className="h-full flex items-center justify-center text-xl text-muted-foreground">
              正在从服务器加载历史数据，请稍候...
            </div>
          )}
        </div>
        
        {/* 页脚区域：提供简单的退出交互 */}
        <div className="mt-8 flex justify-center pb-4">
           <button 
             onClick={() => onOpenChange(false)} // 点击调用父组件关闭函数
             className="px-8 py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-all hover:scale-105 border border-border rounded-full hover:bg-muted"
           >
             关闭并返回仪表盘
           </button>
        </div>

      </DialogContent>
    </Dialog>
  )
}