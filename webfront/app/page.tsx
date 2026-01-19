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
import { EmissionLimitConfig } from "@/components/emission-limit-config"
import { AIAssistantPanel } from "@/components/ai-assistant-panel"

export default function EmissionDashboard() {
  /**
   * --- 1. 定义状态 (State) ---
   * 状态是 React 的灵魂。状态一变，页面对应的组件就自动“重画”。
   */

  // 汇总数据：存储今日已用量、限制量等
  // const [summary, setSummary] = useState({
  //   nox_used: 0,
  //   nox_limit: 500,
  //   percent: 0,
  //   advice_hourly_limit: 0,
  //   unit: "kg"
  // })

  // "nox_flowed": 50.97,
  // "so2_flowed": 112.23,
  // "dust_flowed": 52.78,
  // "nox_flow_limit": 478,
  // "so2_flow_limit": 230,
  // "dust_flow_limit": 70,
  // "nox_percent": 10.66,
  // "so2_percent": 48.79,
  // "dust_percent": 75.4,
  // "advice_nox_hourly_limit": 28.47,
  // "advice_so2_hourly_limit": 7.85,
  // "advice_dust_hourly_limit": 1.15,
  // "unit": "m³",
  // "update_time": "2026-01-15 09:54:00"
  const [summary, setSummary] = useState({
    nox_flowed: 0,
    so2_flowed: 0,
    dust_flowed: 0,
    nox_flow_limit: 0,
    so2_flow_limit: 0,
    dust_flow_limit: 0,
    total_flow_limit: 0,
    nox_percent: 0,
    so2_percent: 0,
    dust_percent: 0,
    total_percent: 0,
    advice_nox_hourly_limit: 0,
    advice_so2_hourly_limit: 0,
    advice_dust_hourly_limit: 0,
    total_flow_advice_limit: 0,
    unit: "kg",
    update_time: "2026-01-15 09:54:00"
  })




  // 当天锅炉排放列表
  const [boilersFlowed, setBoilersFlowed] = useState([])

  // 24小时趋势图状态
  const [trendData, setTrendData] = useState([])

  // 控制“修改目标”弹窗的显示状态
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 新增：当前选中的机组 ID 和参数类型
  const [selectedBoiler, setSelectedBoiler] = useState("NORTH_1")
  const [selectedParam, setSelectedParam] = useState<"nox" | "so2" | "dust">("nox")

  // 锅炉实时排放列表
  const [boilersParam, setBoilersParam] = useState([])


  // page.tsx 内部逻辑
  const [detailHistory, setDetailHistory] = useState([]); // 存储 8 小时详情

  const handleFetchDetail = async (boilerId: string, param: string) => {
    // 1. 设置当前选中的目标，方便弹窗标题显示
    setSelectedBoiler(boilerId)
    setSelectedParam(param as "nox" | "so2" | "dust")

    try {
      // 2. 获取 8 小时历史详情
      const res = await axios.get(`http://127.0.0.1:8000/api/v1/boilers/history-detail?boiler=${boilerId}&param=${param.toLowerCase()}`);
      setDetailHistory(res.data);

      // 3. 数据拿到后，打开弹窗
      setIsDialogOpen(true)
    } catch (error) {
      console.error("获取详情失败", error);
    }
  }

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
      const [resSum, resBoilersFlowed, resTrend, resBoilersParam] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/v1/dashboard/summary"),
        axios.get("http://127.0.0.1:8000/api/v1/boilers/singleflowed"),
        axios.get("http://127.0.0.1:8000/api/v1/analytics/trend?hours=24"),
        axios.get("http://127.0.0.1:8000/api/v1/boilers/realtime")
      ])
      // 数据回来后，分发给各自的状态变量
      setSummary(resSum.data)
      setBoilersFlowed(resBoilersFlowed.data)
      setTrendData(resTrend.data.data) // 对应后端接口返回的 { data: [...] }
      setBoilersParam(resBoilersParam.data)
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
      <DashboardHeader nox_advice={summary.advice_nox_hourly_limit}
        so2_advice={summary.advice_so2_hourly_limit}
        dust_advice={summary.advice_dust_hourly_limit} />

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* 左侧区域（宽 62%）：核心统计数据 */}
        <div className="flex-1 lg:w-[62%] flex flex-col gap-6">

          {/* 进度汇总区域 */}
          {/* 这里体现了布局逻辑：把 Gauge 和 Bar 组合在一个 section 里 */}
          <section className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              {/* Today&apos;s Emission &amp; Quota Overview */}
              当日排放与配额概览
            </h2>
            <EmissionGauges
              nox_percent={summary.nox_percent}
              nox_flowed={summary.nox_flowed}
              nox_flow_limit={summary.nox_flow_limit}
              so2_percent={summary.so2_percent}
              so2_flowed={summary.so2_flowed}
              so2_flow_limit={summary.so2_flow_limit}
              dust_percent={summary.dust_percent}
              dust_flowed={summary.dust_flowed}
              dust_flow_limit={summary.dust_flow_limit}
            />
            <TotalQuotaBar percent={summary.total_percent} limit={summary.total_flow_limit} />
          </section>

          {/* 机组排放贡献度对比（柱状图列表） */}
          <section className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              各锅炉排放占比
            </h2>
            <EmissionRemovalSummary boilers={boilersFlowed} />
          </section>

          {/* 底部：24小时全厂排放趋势图
          <section className="bg-card rounded-lg border border-border p-5 shadow-sm flex-1 min-h-[300px]">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Last 24 Hours Emission Trend
            </h2>
            <TrendChart data={trendData} />
          </section> */}
        </div>
        {/* 右侧：Alarm Panel 机组实时折算监控+ Limit Config (占 38%) */}

        <div className="xl:w-[50%] xl:flex-1">
          <AlarmPanel boilers={boilersParam} onDetailClick={handleFetchDetail} />
          <AIAssistantPanel />
        </div>


        {/* Right Column: Emission Limit Configuration (compact auxiliary panel) */}
        <div className="xl:w-[15%] xl:min-w-[180px]">
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm h-fit">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              排放限值设置
            </h2>
            <EmissionLimitConfig />
          </div>
        </div>


      </div>



      {/* 第二层：趋势图 (独立行，自动占据全宽) */}
      {/* <section className="bg-card rounded-lg border border-border p-5 shadow-sm min-h-[300px]">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
          24小时全厂排放趋势分析 (Last 24 Hours Trend)
        </h2>
        <TrendChart data={trendData} />
      </section> */}




      {/* 隐形组件：对话框（只有 isDialogOpen 为真才显示） */}
      {/* 控制弹窗：修改日总量目标 */}
      <TargetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        boilerId={selectedBoiler}       // 传入当前锅炉名
        paramType={selectedParam}       // 传入参数类型
        historyData={detailHistory}     // 传入刚刚获取的 24 个点
      // currentTarget={summary.nox_flow_limit} // 修正属性名：使用 nox_flow_limit
      // onTargetChange={handleUpdateLimit}
      />
      {/* <TargetDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        currentTarget={summary.nox_limit}
        onTargetChange={handleUpdateLimit}
      /> */}
      {/* 交互组件：悬浮按钮 */}
      {/* 右下角悬浮按钮：点击打开弹窗 */}
      <FloatingActionButton onClick={() => setIsDialogOpen(true)} />
    </div>
  )
}