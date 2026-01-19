"use client" // 涉及动态样式计算，需要客户端运行
//这个组件的作用是：展示一个长条形的进度条，直观反映全厂今日排放配额的消耗进度。

// 1. 定义接口，接收百分比和总量限制
interface TotalQuotaBarProps {
  percent?: number;
  limit?: number;
}



export function TotalQuotaBar({ 
  percent = 0, 
  limit = 500 
}: TotalQuotaBarProps) {
  /**
   * 【业务逻辑：颜色动态计算】
   * 相比于仪表盘的三元运算符，这里我们使用一个专门的函数来处理更复杂的逻辑。
   * 这种写法可读性更高，方便以后增加更多的颜色档位。
   */

  /**
   * 【核心逻辑：强制封顶】
   * 定义一个内部变量 displayPercent，将其限制在 0-100 之间。
   * 无论后端传过来的是 120 还是 -5，界面上统一只处理 0-100 的范围。
   */
  const displayPercent = Math.min(Math.max(percent, 0), 100);

  /**
   * 【颜色动态计算】
   * 使用处理后的 displayPercent 来判断颜色档位，逻辑更统一。
   */
  const getProgressColor = () => {
    if (displayPercent >= 90) return "linear-gradient(90deg, #ef4444, #b91c1c)";   // 红色危险
    if (displayPercent >= 80) return "linear-gradient(90deg, #f59e0b, #d97706)";   // 橙色预警
    return "linear-gradient(90deg, #5c9eff, #47d4b4)";                       // 蓝绿色安全
  };

  return (
    <div className="bg-secondary/30 rounded-lg p-4">
      {/* 顶部文字说明栏 */}
      <div className="flex items-center justify-between mb-2">
        {/* <span className="text-sm text-muted-foreground">Total Daily Quota Usage</span> */}
        <span className="text-sm text-muted-foreground">日排放总配额消耗</span>
        
        <span className="text-sm font-medium text-foreground">
          {/* 这里直接显示父组件传下来的 limit */}
          {/* Target: <span className="text-primary">{limit} kg</span> */}
          今日目标值： <span className="text-primary">{limit} m³</span>
        </span>
      </div>
      {/* 进度条槽（外壳） */}
      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
        {/**
         * 【核心知识点：Style 样式绑定】
         * 在 React 中，动态改变宽度不能靠 class，而要靠 style 属性。
         * style 接收一个对象 {{ 属性: 值 }}
         */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{
            // 使用封顶后的百分比设置宽度
            width: `${displayPercent}%`, 
            background: getProgressColor(),
            // 阴影效果也根据 displayPercent 判断
            boxShadow: displayPercent >= 90 ? "0 0 12px #ef444450" : "0 0 12px #5c9eff50",
          }}
        />
      </div>
      {/* 底部百分比刻度 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">0%</span>
        {/** * 【核心修复】：数字显示也改用 displayPercent
         * 这样当实际数值超过 100 时，这里也会诚实地显示 100.0%
         */}
        <span className={`text-lg font-bold ${displayPercent >= 90 ? 'text-red-500' : 'text-foreground'}`}>
          {displayPercent.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">100%</span>
      </div>
    </div>
  )
}