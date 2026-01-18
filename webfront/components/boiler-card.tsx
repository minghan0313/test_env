"use client"

//响应式报警卡片

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MiniSparkline } from "./mini-sparkline"
import { TrendDetailModal } from "./trend-detail-modal"

/**
 * 【TS 语法：字面量类型联合】
 * 规定状态只能是这三个字符串之一，增强代码健壮性
 */
type PollutantStatus = "normal" | "warning" | "exceeded"



interface TrendData {
  nox: number[]
  so2: number[]
  dust: number[]
}

interface BoilerCardProps {
  id: string
  nox: number
  so2: number
  dust: number
  noxStatus: PollutantStatus
  so2Status: PollutantStatus
  dustStatus: PollutantStatus
  trendData: TrendData
  // --- 新增这一行，告诉 TS 允许接收这个点击回调函数 ---
  onTrendClick?: (type: "NOx" | "SO2" | "Dust") => void;
}

/**
 * 【配置对象策略】：将视觉逻辑从代码中分离
 * 以后想改颜色，直接改这个对象，不用去 HTML 里翻找
 */
const statusConfig = {
  normal: {
    dotClass: "bg-green-500",
    textClass: "text-green-600",
  },
  warning: {
    dotClass: "bg-yellow-500",
    textClass: "text-yellow-600",
  },
  exceeded: {
    // 关键：animate-pulse 会让元素产生呼吸闪烁效果，吸引调度员注意
    dotClass: "bg-red-500 animate-pulse",
    textClass: "text-red-600 font-bold",
  },
}

const pollutantColors = {
  NOx: "#3b82f6",
  SO2: "#f59e0b",
  Dust: "#8b5cf6",
}

interface PollutantRowProps {
  label: string
  pollutantKey: "NOx" | "SO2" | "Dust"
  value: number
  status: PollutantStatus
  trendData: number[]
  onTrendClick: () => void
}

/**
 * 【子组件：PollutantRow】
 * 颗粒度进一步拆细，负责渲染卡片中的一行（如 NOx 那一行）
 */
function PollutantRow({ label, pollutantKey, value, status, trendData, onTrendClick }: PollutantRowProps) {
  const config = statusConfig[status]  // 根据传入的状态获取对应的颜色配置
  const color = pollutantColors[pollutantKey]  

  return (
    <div className="flex items-center justify-between gap-1">
      {/* 左侧：状态灯和名称 */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* 状态小圆点 */}
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dotClass)} aria-hidden="true" />
        <span className="text-muted-foreground truncate">{label}</span>
      </div>
      {/* 右侧：趋势图和数值 */}
      <div className="flex items-center gap-1">
        {/* 趋势小图：点击可以弹出大图 */}
        <MiniSparkline data={trendData} color={color} onClick={onTrendClick} />
        {/* 数值显示：保留 1 位小数 */}
        <span className={cn("font-mono text-[11px] w-[55px] text-right", config.textClass)}>
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

export function BoilerCard({ id, nox, so2, dust, noxStatus, so2Status, dustStatus, trendData, onTrendClick }: BoilerCardProps) {
  /**
   * 【React Hook：useState】
   * 即使数据是从外部传进来的，组件内部也可以有自己的“小秘密”
   * modalOpen: 弹窗是否打开
   * selectedPollutant: 当前选中的是哪种污染物（决定弹窗里画哪条线）
   */
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPollutant, setSelectedPollutant] = useState<"NOx" | "SO2" | "Dust">("NOx")

  // 点击趋势图的动作：记录选了谁，然后打开弹窗
  const handleTrendClick = (pollutant: "NOx" | "SO2" | "Dust") => {
    // setSelectedPollutant(pollutant)
    // setModalOpen(true)
    setSelectedPollutant(pollutant);
  // setModalOpen(true); // 如果你打算完全复用 TargetDialog，这一行可以注释掉
  // 【关键】：在这里通知父组件，加载 8 小时历史详情
    if (onTrendClick) {
      onTrendClick(pollutant);
    }
  }
  // 根据选中的标签，从大包裹里挑出对应的那条趋势线
  const getSelectedTrendData = () => {
    switch (selectedPollutant) {
      case "NOx": return trendData.nox
      case "SO2": return trendData.so2
      case "Dust": return trendData.dust
      default: return []
    }
  }

  return (
    // React 有一条铁律：一个组件的 return 只能返回“一个”根元素。
    // 如果你尝试这样写，编译器会报错：
    // //错误：这相当于返回了两个独立的对象，React 会感到困惑
    // return (
    //   <div>卡片外壳</div>
    //   <TrendDetailModal /> 
    // )
    // 为了解决这个问题，你通常有两个选择：
    // 方案 A：加个 <div>
    // return (
    //   <div>
    //     <div>卡片外壳</div>
    //     <TrendDetailModal />
    //   </div>
    // )
    // 缺点：这会在网页里产生大量没用的 <div>，可能会破坏你的 CSS 布局（比如 Flex 或 Grid 布局）。
    // 方案 B：使用 Fragment <>
    // return (
    //   <>
    //     <div>卡片外壳</div>
    //     <TrendDetailModal />
    //   </>
    // )
    // 优点：它满足了 React “只有一个根元素”的要求，但在最终生成的网页 HTML 中，这个 <> 会像隐形了一样完全消失。
    <>
      {/* 卡片外壳：使用了动态类名
        如果 NOx 超标，背景变淡红 bg-red-50/50，边框变红 border-red-200
      */}
      <div className={cn(
        "rounded-lg border border-border p-2.5 transition-all hover:shadow-md",
        noxStatus === "exceeded" ? "bg-red-50/50 border-red-200" : "bg-muted/30"
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs font-semibold text-foreground truncate" title={id}>
            {id}
          </span>
          {noxStatus === "exceeded" && (
            <span className="text-[9px] bg-red-500 text-white px-1 rounded animate-pulse">ALARM</span>
          )}
        </div>

        <div className="space-y-1.5 text-[11px]">
          <PollutantRow
            label="NOx"
            pollutantKey="NOx"
            value={nox}
            status={noxStatus}
            trendData={trendData.nox}
            onTrendClick={() => handleTrendClick("NOx")}
          />
          <PollutantRow
            label="SO₂"
            pollutantKey="SO2"
            value={so2}
            status={so2Status}
            trendData={trendData.so2}
            onTrendClick={() => handleTrendClick("SO2")}
          />
          <PollutantRow
            label="Dust"
            pollutantKey="Dust"
            value={dust}
            status={dustStatus}
            trendData={trendData.dust}
            onTrendClick={() => handleTrendClick("Dust")}
          />
        </div>
      </div>

      {/* 趋势详情弹出层：
        这是一个“传送门”组件，它不在卡片内部显示，而是点击后盖在整个屏幕上
      */}
      {/* <TrendDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        deviceId={id}
        pollutant={selectedPollutant}
        data={getSelectedTrendData()}
      /> */}
    </>
  )
}