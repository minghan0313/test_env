"use client"  // 依然是客户端组件，因为我们要处理动态的样式计算

import { CircularGauge } from "./circular-gauge"    //引入“原子组件”：单个圆形仪表盘
// 这个组件的作用是：接收全厂的排放数据，并把它们分发到三个圆形的仪表盘（Gauge）中。

/**
 * 【TS 语法：Interface 接口】
 * 定义了父组件 page.tsx 必须传下来的三个核心指标。
 * 这里的 percent, used, limit 都是从后端的 dashboard/summary 接口拿到的。
 */
interface EmissionGaugesProps {
  percent?: number;
  used?: number;
  limit?: number;
}

export function EmissionGauges({ 
  percent = 0, 
  used = 0, 
  limit = 500 
}: EmissionGaugesProps) {
  
  // 2. 构造显示数据。目前核心展示 NOx，SO2 和 Dust 可以暂时保留占位或根据需要关闭
  /**
   * 【业务逻辑：数据驱动配置 (Data-Driven Configuration)】
   * 重点理解：我们把“要显示什么”写成了一个数组对象。
   * 这样做的好处是：逻辑与展示分离。
   */
  const emissionData = [
    {
      id: "nox",
      label: "NOx",
      value: percent,        // 使用实时的百分比
      emission: used,       // 使用实时的已排放量
      unit: "kg",           // 统一单位为 kg
      /**
       * 【JS 语法：三元运算符】 (条件 ? 结果A : 结果B)
       * 逻辑：如果百分比大于 90，颜色变量变成红色(#ef4444)，否则是蓝色(#3b82f6)。
       */
      color: percent > 90 ? "#ef4444" : "#3b82f6", // 超过90%变红
    },
    {
      id: "so2",
      label: "SO₂",
      value: 0,              // // 暂时写死，以后对接了 SO2 接口直接换掉这个 0 即可
      emission: 0,
      unit: "kg",
      color: "#f5b942",
    },
    {
      id: "dust",
      label: "Dust",
      value: 0,
      emission: 0,
      unit: "kg",
      color: "#f59342",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      
      {/* 【JS 语法：Array.map 循环】
      这是 React 的灵魂工具。它遍历上面的数组，每看到一个对象，就产出一个 <CircularGauge />。
      就像工厂里的模具，数据进，组件出。 */}
      
      {emissionData.map((item) => (
        <CircularGauge
         /* 【React 核心要求：key】
             在循环中，React 必须给每个“亲兄弟”发一张身份证。
             如果数据变了，React 靠这个 key 快速精准地更新对应的那个仪表盘。
          */
          key={item.id}
          label={item.label}
          percentage={item.value}
          emission={item.emission}
          unit={item.unit}
          color={item.color}
        />
      ))}
    </div>
  )
}