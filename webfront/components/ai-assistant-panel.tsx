"use client"

import { Sparkles, TrendingDown, Zap } from "lucide-react"

// 模拟诊断数据
const mockInsights = [
  {
    id: 1,
    title: "NOx 排放优化建议",
    content: "3# 锅炉 NOx 呈上升趋势。建议降低燃烧器二次风门开度 5%，预计可降低折算浓度 8mg/m³。",
    icon: TrendingDown,
    priority: "warning",
    time: "10m"
  },
  {
    id: 2,
    title: "SO2 波动预警",
    content: "检测到 5# 锅炉负荷增加。建议提前将脱硫循环泵功率提升至 85% 以稳定排放指标。",
    icon: Zap,
    priority: "alert",
    time: "25m"
  }
]

// 优化后的 DeepSeek 标志
function DeepSeekLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      fill="none" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="512" cy="512" r="512" fill="#60A5FA" fillOpacity="0.1"/>
      <path 
        d="M512 256C370.6 256 256 370.6 256 512S370.6 768 512 768 768 657.4 768 512 653.4 256 512 256ZM512 704C406 704 320 618 320 512S406 320 512 320 704 406 704 512 618 704 512 704Z" 
        fill="#3B82F6"
      />
      <circle cx="512" cy="512" r="128" fill="#3B82F6"/>
    </svg>
  )
}

export function AIAssistantPanel() {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden">
      {/* Header - 融入 DeepSeek 标志 */}
      <div className="px-4 py-2 border-b border-border bg-muted/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 这里是标志部分 */}
          <div className="relative flex items-center justify-center">
            <DeepSeekLogo className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-card" />
          </div>
          
          <h2 className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            AI 生产决策辅助
            <span className="text-[9px] font-bold text-primary/80">
              DEEPSEEK
            </span>
          </h2>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[8px] text-muted-foreground font-bold">ANALYZING</span>
        </div>
      </div>

      {/* Insights List - 维持两条消息高度 */}
      <div className="p-2 space-y-2 max-h-[168px] overflow-y-auto scrollbar-hide">
        {mockInsights.map((item) => {
          const IconComponent = item.icon
          const styles = {
            warning: "border-amber-500/20 bg-amber-500/5 text-amber-700",
            alert: "border-red-500/20 bg-red-500/5 text-red-700"
          }
          const iconColors = {
            warning: "text-amber-500",
            alert: "text-red-500"
          }

          return (
            <div 
              key={item.id} 
              className={`p-2 rounded border transition-colors ${styles[item.priority as keyof typeof styles]}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <IconComponent className={`w-3 h-3 ${iconColors[item.priority as keyof typeof iconColors]}`} />
                  <span className="text-[10px] font-bold">{item.title}</span>
                </div>
                <span className="text-[8px] opacity-60 font-mono">{item.time}</span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-90">
                {item.content}
              </p>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/5 flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary/40" />
          <span className="text-[9px] text-muted-foreground italic">
            由 DeepSeek R1 驱动生产诊断
          </span>
        </div>
      </div>
    </div>
  )
}