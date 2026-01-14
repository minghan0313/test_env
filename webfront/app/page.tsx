"use client" // 告诉 Next.js：这个页面需要交互（如点击、自动刷新），必须在浏览器端运行

import { useEffect, useState } from "react"
import axios from "axios"  // 用于向后端发起网络请求的工具

// 导入所有适配好的组件
import { DashboardHeader } from "@/components/dashboard-header"
import { EmissionGauges } from "@/components/emission-gauges"
import { TotalQuotaBar } from "@/components/total-quota-bar"
import { TrendChart } from "@/components/trend-chart"
import { AlarmPanel } from "@/components/alarm-panel"
import { EmissionRemovalSummary } from "@/components/emission-removal-summary"
import { TargetDialog } from "@/components/target-dialog"
import { FloatingActionButton } from "@/components/floating-action-button"

export default function EmissionDashboard() {
  /**
   * --- 1. 定义状态 (State) ---
   * 状态是 React 的灵魂。状态一变，页面对应的组件就自动“重画”。
   */
  
  // 汇总数据：存储今日已用量、限制量等
  const [summary, setSummary] = useState({
    nox_used: 0,
    nox_limit: 500,
    percent: 0,
    advice_hourly_limit: 0,
    unit: "kg"
  })
  
  // 实时锅炉列表状态
  const [boilers, setBoilers] = useState([])
  
  // 24小时趋势图状态
  const [trendData, setTrendData] = useState([])
  
  // 控制“修改目标”弹窗的显示状态
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // --- 2. 定义获取数据的函数 ---
  
  // 【核心功能】：去后端拿数据
  const fetchData = async () => {
    try {
      // 同时获取汇总和实时机组状态
      /**
       * Promise.all 的妙用：
       * 就像去餐厅点菜，同时点“汤、菜、饭”，而不是等汤上完了再点菜。
       * 这样三路数据同时获取，速度最快。
       */
      const [resSum, resBoilers, resTrend] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/v1/dashboard/summary"),
        axios.get("http://127.0.0.1:8000/api/v1/boilers/realtime"),
        axios.get("http://127.0.0.1:8000/api/v1/analytics/trend?hours=24")
      ])
      // 数据回来后，分发给各自的状态变量
      setSummary(resSum.data)
      setBoilers(resBoilers.data)
      setTrendData(resTrend.data.data) // 对应后端接口返回的 { data: [...] }
    } catch (error) {
      console.error("数据拉取失败:", error)
    }
  }

  // --- 3. 定义提交修改的函数 ---
  // 【核心功能】：修改数据库里的限值
  const handleUpdateLimit = async (newLimit: number) => {
    try {
      // 向后端发送 POST 请求，修改数据库
      await axios.post("http://127.0.0.1:8000/api/v1/config/limit", {
        key: "nox_limit_daily",
        value: newLimit
      })
      // 【关键动作】：修改完数据库后，立即重新拉取一次数据，保证页面显示的数字是最新的
      fetchData()
    } catch (error) {
      alert("限值更新失败，请检查后端连接或数据库状态")
    }
  }
  /**
  * --- 生命周期 (Lifecycle) ---
  * useEffect 就像是页面的“自动开关”。
  */
  useEffect(() => {
    fetchData() // 1. 页面一打开，先拿一次数据
    // 2. 开启定时器，每 30 秒自动拿一次，实现“伪实时”刷新
    const timer = setInterval(fetchData, 30000)
    // 3. 当用户关掉这个页面时，记得把闹钟（定时器）停了，节省系统资源
    return () => clearInterval(timer)
  }, [])

  /**
   * --- 4. 组装渲染 (Layout) ---
   */
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* 顶部标题栏：传入实时计算的建议小时限额 */}
      <DashboardHeader advice={summary.advice_hourly_limit} />

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* 左侧区域（宽 62%）：核心统计数据 */}
        <div className="flex-1 lg:w-[62%] flex flex-col gap-6">
          
          {/* 进度汇总区域 */}
          {/* 这里体现了布局逻辑：把 Gauge 和 Bar 组合在一个 section 里 */}
          <section className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Today&apos;s Emission &amp; Quota Overview
            </h2>
            <EmissionGauges 
              percent={summary.percent} 
              used={summary.nox_used} 
              limit={summary.nox_limit} 
            />
            <TotalQuotaBar percent={summary.percent} limit={summary.nox_limit} />
          </section>

          {/* 机组排放贡献度对比（柱状图列表） */}
          <section className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Boiler Contribution Summary
            </h2>
            <EmissionRemovalSummary boilers={boilers} />
          </section>

          {/* 底部：24小时全厂排放趋势图 */}
          <section className="bg-card rounded-lg border border-border p-5 shadow-sm flex-1 min-h-[300px]">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Last 24 Hours Emission Trend
            </h2>
            <TrendChart data={trendData} />
          </section>
        </div>
        {/* 右侧区域（宽 38%）：实时报警面板 */}
        {/* 右侧：实时监控报警卡片面板 */}
        <aside className="lg:w-[38%]">
          <AlarmPanel boilers={boilers} />
        </aside>
      </div>
      {/* 隐形组件：对话框（只有 isDialogOpen 为真才显示） */}
      {/* 控制弹窗：修改日总量目标 */}
      <TargetDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        currentTarget={summary.nox_limit}
        onTargetChange={handleUpdateLimit}
      />
      {/* 交互组件：悬浮按钮 */}
      {/* 右下角悬浮按钮：点击打开弹窗 */}
      <FloatingActionButton onClick={() => setIsDialogOpen(true)} />
    </div>
  )
}