"use client" // 告知 Next.js：这个文件包含浏览器交互（如计时器、状态更新），不能只在服务器上运行

import { useEffect, useState } from "react"   //【React 语法】：引入 React 的核心“钩子”函数。
import { Activity } from "lucide-react" // 【库引入】：引入一个心电图图标。

/**
 * 【TS 语法：Interface 接口】
 * 作用：它是组件的“说明书”。
 * 规定了父组件（page.tsx）给这个组件传数据时，必须遵守的格式。
 */
interface DashboardHeaderProps {
  advice?: number   // 表示 advice 这个参数是可选的（?），且必须是数字类型（number）。
}

/**
 * 【TS 语法：解构赋值与默认值】
 * { advice = 0 }: 表示从传入的参数中提取 advice，如果父组件没传，它就默认是 0。
 */
export function DashboardHeader({ advice = 0 }: DashboardHeaderProps) {
  /**
   * 【React 语法：useState 状态】
   * 语法：const [变量名, 设置变量的函数] = useState<类型>(初始值)
   * 作用：currentTime 用来存储当前的时间字符串。
   * <string | null>: 这是 TS 语法，表示这个变量要么是字符串，要么是空的（null）。
   */
  const [currentTime, setCurrentTime] = useState<string | null>(null)
  // 你可以把这行代码想象成你和 React 签了一个“契约”：
  // currentTime：是 React 帮你保管的一个数据副本（状态）。
  // setCurrentTime：是 React 专门配给你的这块数据的唯一修改权工具（Setter 函数）。
  /**
   * 【React 语法：useEffect 副作用】
   * 作用：处理非渲染逻辑（如计时器）。
   * [] (第二个参数)：表示这个逻辑只在组件第一次显示在屏幕上时执行一次。
   */
  useEffect(() => {
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
    <header className="flex items-center justify-between">
      {/* 左侧区域：Logo 和 标题 */}
      <div className="flex items-center gap-3">
        {/* 背景圆角矩形 Logo */}
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Activity className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Emission Monitoring System</h1>
          <p className="text-sm text-muted-foreground">Real-time industrial environmental data</p>
        </div>
      </div>
      
      {/* 右侧区域：建议指标 和 系统状态 */}
      <div className="flex items-center gap-6">
        {/* 调度建议：只在宽屏幕(lg)显示，避免手机端拥挤 */}
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">
            Recommended Hourly Limit
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-orange-600">
              {/* .toFixed(2) 确保数字始终显示两位小数，如 10.00 */}
              {advice.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">kg/h</span>
          </div>
        </div>

        {/* 系统在线状态 和 实时时钟 */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* animate-pulse 是 Tailwind 提供的动画，让绿点产生呼吸灯效果，表示“系统活着” */}
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">System Online</span>
          </div>
          
          {/* 关键点：{currentTime || "--:--:--"} 
            这叫短路表达式。如果 currentTime 还没获取到（比如加载第0.1秒），就显示横杠。
            这解决了之前你遇到的“水合报错”问题。
          */}
          <time className="font-mono text-sm text-muted-foreground min-w-[80px] text-right">
            {currentTime || "--:--:--"}
          </time>
        </div>
      </div>
    </header>
  )
}