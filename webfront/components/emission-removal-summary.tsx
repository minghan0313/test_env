"use client"
// 本组件有两个作用：
//1、聚合计算：把分散的锅炉排放量加在一起。
//2、贡献度分析：计算每台锅炉占全厂总排放的比例。

// 1. 定义从后端传来的锅炉数据结构
// Interface (接口) 的作用：定义“形状”
// 它不产生任何实际的代码运行。它的唯一作用是描述：
// 长什么样：描述一个对象应该有哪些属性，属性是什么类型。
// 约束：它像是一份“合同”。如果一个对象宣称自己符合某个接口，那它必须拥有接口里规定的所有东西。
// 目的：为了安全。防止你访问一个不存在的属性，或者把数字当成字符串传。
interface BoilerData {
  boiler_name: string
  total_nox: number
  total_so2: number
  total_dust: number
}

interface EmissionRemovalSummaryProps {
  boilers?: BoilerData[]  // 接收一个由多台锅炉对象组成的数组
}
/**
 * 【TS 进阶语法：PollutantSectionProps】
 * 这个接口定义了“零件”组件需要的所有物料：标签、单位、总值、颜色、以及明细数据数组。
 */

interface PollutantSectionProps {
  label: string
  unit: string
  total: number
  color: string
  bgColor: string
  data: { id: string; value: number }[]
}

// 子组件：负责渲染单种污染物（如 NOx）的柱状图和列表
// 在你的代码里，NOx、SO₂、Dust 的显示结构几乎一模一样。
// 不用函数：你需要复制粘贴三次 HTML 代码。如果你要修改样式（比如把字体调大），你要改三个地方。
// 使用函数：你只需要写一个 PollutantSection。它就像一个模具，你把不同的“原料”（NOx 的数据或 SO₂ 的数据）塞进去，它就吐出对应的 HTML。
function PollutantSection({ label, unit, total, color, bgColor, data }: PollutantSectionProps) {
  return (
    <div className="flex-1 min-w-[200px]">
      {/* 标题与数值显示 */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-lg font-semibold text-foreground">
          {total.toFixed(1)} <span className="text-xs text-muted-foreground">{unit}</span>
        </span>
      </div>

      {/* 【堆叠进度条逻辑】：所有机组的占比拼成一根完整的长条 */}
      <div className={`h-6 rounded-md ${bgColor} flex overflow-hidden mb-2`}>
        {data.map((item) => {
          // 局部计算：单台炉子占该种污染物的百分比
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div
              key={item.id}
              // 【TS/JS 语法】：模板字符串动态绑定类名
              // border-r 是为了给不同机组的色块之间加一条细微的分隔线
              className={`${color} border-r border-background/30 last:border-r-0 transition-all hover:opacity-80`}
              style={{ width: `${percentage}%` }}
              // title 属性：鼠标悬停时显示的提示文字（原生 Tooltip）
              title={`${item.id}: ${item.value} ${unit} (${percentage.toFixed(1)}%)`}
            />
          )
        })}
      </div>

      {/* 机组明细列表：逻辑同前，但更紧凑 */}
      <div className="space-y-1">
        {data.map((item) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground w-14 truncate">{item.id}</span>
              <div className={`flex-1 h-2 ${bgColor} rounded-sm overflow-hidden`}>
                <div className={`h-full ${color} rounded-sm`} style={{ width: `${percentage}%` }} />
              </div>
              <span className="font-mono text-foreground w-12 text-right">{item.value.toFixed(1)}</span>
              <span className="text-muted-foreground w-10 text-right">{percentage.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 主组件：EmissionRemovalSummary (组装车间)
// export 唯一对外接口
export function EmissionRemovalSummary({ boilers = [] }: EmissionRemovalSummaryProps) {

  // 【关键修复】：将对象转为 [锅炉名, 数据] 组成的数组
  // 如果 boilers 已经是数组，则直接使用；如果是对象，则转换
  // 如果是数组而不是map的话，后面的reduce方法会报错
  const boilerArray = Array.isArray(boilers) 
    ? boilers 
    : Object.entries(boilers).map(([name, data]: [string, any]) => ({
        boiler_name: name,
        total_nox: data.nox,
        total_so2: data.so2,
        total_dust: data.dust
      }));

  // 2. 聚合计算：一次性计算出三种污染物的全厂总和
  const totals = {
    nox: boilerArray.reduce((sum, b) => sum + (b.total_nox || 0), 0),
    so2: boilerArray.reduce((sum, b) => sum + (b.total_so2 || 0), 0),
    dust: boilerArray.reduce((sum, b) => sum + (b.total_dust || 0), 0),
  }

  /**
   * 【TS 进阶语法：类型收窄与映射】
   * getPollutantData 函数的作用：
   * 从复杂的锅炉对象数组中，精准提取出某一种污染物的数据，并转换成子组件需要的格式。
   * b[type]：这是 JS 的“方括号取值法”，通过变量名来访问对象的属性。
   */
  const getPollutantData = (type: 'total_nox' | 'total_so2' | 'total_dust') => 
  boilerArray.map(b => ({ id: b.boiler_name, value: b[type] || 0 }))

  return (
    // lg:flex-row 表示在大屏幕下横向排列（NOx, SO2, Dust 并排）
    <div className="flex flex-col lg:flex-row gap-8">
      {/* 当你写下 <PollutantSection ... /> 时，你本质上是在调用这个函数，并命令它返回其 return 语句中的 HTML 描述。 */}
      {/* PollutantSection 接收的永远是单一对象。 */}
      {/* 假设的“非 JSX”写法，非常啰嗦
      <PollutantSection props={{ label: "NOx", total: 100 }} />
      现在的 JSX 声明式写法 让我们直接在标签上写属性，React 帮我们做“打包”工作；而函数定义处的 {} 帮我们做“拆包”工作。 */}
      <PollutantSection
        label="氮氧化物"
        unit="m³"
        total={totals.nox}
        color="bg-blue-500"
        bgColor="bg-blue-500/15"
        data={getPollutantData('total_nox')}
      />
      {/* SO2 和 Dust 的结构完全一样，实现了高度复用 */}
      <PollutantSection
        label="二氧化硫"
        unit="m³"
        total={totals.so2}
        color="bg-yellow-500"
        bgColor="bg-yellow-500/15"
        data={getPollutantData('total_so2')}
      />
      <PollutantSection
        label="烟尘"
        unit="m³"
        total={totals.dust}
        color="bg-orange-500"
        bgColor="bg-orange-500/15"
        data={getPollutantData('total_dust')}
      />
    </div>
  )
}


// 这个组件之所以不需要 useEffect，是因为它是一个**“纯数据驱动的同步组件”**。
// 1. 数据的“源头”在哪里？
// 我们要看 useEffect 的本质：它是用来处理**“副作用”**的（比如：去服务器拿数据、开启定时器、手动修改 DOM）。
// page.tsx 需要 useEffect：因为它要主动发起网络请求（副作用），把数据从后端“拉”过来。
// EmissionRemovalSummary 不需要：因为它像是一个**“被动”的加工厂**。它不主动去外面拿东西，它只等上级把数据（boilers）通过 Props 喂到嘴里。

//那么为什么dashboard需要useEffect？
// DashboardHeader 之所以必须使用 useEffect，是因为它涉及到了一个**“不属于 React 管辖”**的外部系统：时间（浏览器的时钟）。
// EmissionRemovalSummary 的动力源是“内部”的：它的数据（锅炉数值）是从上级传下来的。只要父组件重新渲染，它就跟着动。这叫被动响应。
// DashboardHeader 的动力源是“外部”的：它需要页面即便在后端数据没变的情况下，右上角的秒针也要每秒钟跳动一次。React 本身并不知道什么时候该跳秒，必须借助浏览器的 setInterval。