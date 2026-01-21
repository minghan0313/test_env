"use client" // 告知 Next.js：这个文件包含浏览器交互（如计时器、状态更新），不能只在服务器上运行

import { useEffect, useState } from "react"   //【React 语法】：引入 React 的核心“钩子”函数。
import { Activity } from "lucide-react" // 【库引入】：引入一个心电图图标。
import { useTheme } from "next-themes" // 【库引入】：引入主题控制钩子
import { Button } from "@/components/ui/button" // 【组件引入】：引入 Shadcn UI 的按钮
import { Sun, Moon, Zap } from "lucide-react" // 【库引入】：引入太阳、月亮、闪电图标

/**
 * 【TS 语法：Interface 接口】
 * 作用：它是组件的“说明书”。
 * 规定了父组件（page.tsx）给这个组件传数据时，必须遵守的格式。
 */
interface DashboardHeaderProps {
  nox_advice?: number   // 表示 advice 这个参数是可选的（?），且必须是数字类型（number）。
  so2_advice?: number   // 表示 advice 这个参数是可选的（?），且必须是数字类型（number）。
  dust_advice?: number   // 表示 advice 这个参数是可选的（?），且必须是数字类型（number）。
}

/**
 * 【TS 语法：解构赋值与默认值】
 * { advice = 0 }: 表示从传入的参数中提取 advice，如果父组件没传，它就默认是 0。
 */
export function DashboardHeader({ nox_advice = 0, so2_advice = 0, dust_advice = 0 }: DashboardHeaderProps) {

  // 【主题逻辑】：从 next-themes 中获取当前主题和设置主题的方法
  const { theme, setTheme } = useTheme()

  /**
   * 【React 语法：useState 状态】
   * 语法：const [变量名, 设置变量的函数] = useState<类型>(初始值)
   * 作用：currentTime 用来存储当前的时间字符串。
   * <string | null>: 这是 TS 语法，表示这个变量要么是字符串，要么是空的（null）。
   */
  const [currentTime, setCurrentTime] = useState<string | null>(null)
  
  // 【React 语法】：mounted 状态用于解决服务器端渲染(SSR)和客户端渲染不匹配的问题
  const [mounted, setMounted] = useState(false)

  // 你可以把这行代码想象成你和 React 签了一个“契约”：
  // currentTime：是 React 帮你保管的一个数据副本（状态）。
  // setCurrentTime：是 React 专门配给你的这块数据的唯一修改权工具（Setter 函数）。

  /**
   * 【React 语法：useEffect 副作用】
   * 作用：处理非渲染逻辑（如计时器）。
   * [] (第二个参数)：表示这个逻辑只在组件第一次显示在屏幕上时执行一次。
   */
  useEffect(() => {
    // 标记组件已挂载
    setMounted(true)

    //useEffect 里的代码不会在渲染过程中执行，而是在 浏览器完成画面绘制（Paint）之后 异步执行。这样可以确保副作用逻辑不会阻塞页面的渲染，让用户感觉更流畅。   
    // 定义一个内部函数，用来更新 currentTime 变量
    //动作：这行代码只是在内存里开辟了一块空间，告诉电脑：“我设计了一个名叫 updateTime 的动作，它的具体步骤是获取时间并更新状态。”
    //状态：此时，没有任何代码被运行。电脑只是记住了这个名字和它对应的逻辑。
    //类比：这就像是你写好了一份菜谱，或者写好了一个剧本。此时并没有人开始做菜，也没有人开始演戏。
    const updateTime = () => {
      const now = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // 工业系统通常使用 24 小时制
      })
      setCurrentTime(now)  // 调用这个函数后，页面会自动刷新显示新时间
    }

    // 关键逻辑：
    updateTime() // 1. 进来先运行一次，避免第一秒空白
    // 【原生 JS】：开启一个定时器，每 1000 毫秒（1秒）调用一次 updateTime
    const timer = setInterval(updateTime, 1000) // 2. 开启每秒一次的循环执行
    
    // 清理逻辑：如果用户离开了这个页面，必须关掉计时器，否则会消耗内存
    return () => clearInterval(timer) 
  }, [])

  // 关于return的时间线：1. 物理时间线（Timeline）
  // 第一步：初始化 (Initialization) React 运行你的 DashboardHeader 函数。此时 currentTime 的值是初始值 null。
  // 第二步：首次渲染 (First Render) React 执行 return 语句，生成一份虚拟的页面结构（DOM）。因为此时 currentTime 是 null，所以页面上显示的是 --:--:--。
  // 第三步：绘制 (Painting) 浏览器拿到这份结构，将其画在屏幕上。用户此时看到页面加载出来了，但时钟处显示的是 --:--:--。
  // 第四步：副作用执行 (Effect Execution) —— 这是关键！ 只有当浏览器把画面画好之后，React 才会回头执行 useEffect 里的代码。
  // 此时，updateTime() 被调用。
  // setCurrentTime(now) 被触发。
  // 第五步：重新渲染 (Re-render) 因为 state（状态）变了，React 重新运行一遍 DashboardHeader。
  // 这一次，currentTime 有值了（比如 "10:00:00"）。
  // 页面立刻更新，用户看到的横杠变成了真实时间。

  return (
    <header className="flex items-center justify-between border-b pb-4 border-border/50">
      {/* 左侧区域：Logo 和 标题 */}
      <div className="flex items-center gap-3">
        {/* 背景圆角矩形 Logo */}
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Activity className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">热电公司环保排放监控系统</h1>
          <p className="text-sm text-muted-foreground">工业排放实时数据</p>
        </div>
      </div>
      
      {/* 中间区域：建议指标容器 */}
      <div className="flex items-center gap-8 border-l-2 pl-8 ml-6 border-border/50">
        {/* 参数 1: NOx */}
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-bold text-muted-foreground leading-none mb-2">氮氧化物控制量建议</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-black text-emerald-600 tracking-tighter">
              {nox_advice.toFixed(2)}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground">m³/h</span>
          </div>
        </div>

        {/* 分隔线：加高加宽一点 */}
        <div className="h-10 w-[2px] bg-border/60" />

        {/* 参数 2: SO2 */}
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-bold text-muted-foreground leading-none mb-2">二氧化硫控制量建议</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-black text-emerald-600 tracking-tighter">
              {so2_advice.toFixed(2)}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground">m³/h</span>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-10 w-[2px] bg-border/60" />

        {/* 参数 3: Dust */}
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-bold text-muted-foreground leading-none mb-2">烟尘控制量建议</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-black text-emerald-600 tracking-tighter">
              {dust_advice.toFixed(2)}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground">m³/h</span>
          </div>
        </div>
      </div>

      {/* 右侧区域：系统时间与主题切换 */}
      <div className="flex items-center gap-4">
        {/* 实时时钟显示 */}
        <div className="flex flex-col items-end mr-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Time</span>
          <span className="text-lg font-mono font-bold text-foreground">
            {currentTime || "--:--:--"}
          </span>
        </div>

        {/* 主题切换按钮：只有挂载后才显示图标，防止 SSR 颜色闪烁 */}
        {/* 关键按钮逻辑 */}
        {mounted && (
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-10 h-10 shadow-sm border-border/80"
            onClick={() => {
              console.log("当前主题:", theme); // 调试：检查点击是否生效
              setTheme(theme === "dark" ? "light" : "dark");
            }}
          >
            {theme === "dark" ? (
              <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem] text-blue-600" />
            )}
            <span className="sr-only">切换护眼模式</span>
          </Button>
        )}
      </div>
    </header>
  )
}