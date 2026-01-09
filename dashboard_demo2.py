import tkinter as tk
from datetime import datetime
import random

class ModernQuotaDashboard:
    def __init__(self):
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        # 如果需要移动位置，请修改这里的坐标，例如 +1920+0 表示移动到右侧副屏
        self.root.geometry("1920x480+0+0") 
        self.root.configure(bg='#020617')

        self.root.bind('<Button-1>', self.start_move)
        self.root.bind('<B1-Motion>', self.do_move)
        self.root.bind('<Escape>', lambda e: self.root.destroy())

        self.devices = ["4号炉", "5号炉", "南1炉", "南2炉", "5号机"]
        self.limits = {"烟尘": 70, "SO2": 230, "NOx": 378}
        
        self.ui_elements = {}
        self.setup_ui()
        self.refresh_loop()
        self.root.mainloop()

    def setup_ui(self):
        """修复布局报错并优化视觉层级"""
        for i, dev in enumerate(self.devices):
            tower = tk.Frame(self.root, bg='#020617', highlightbackground="#1E293B", highlightthickness=1)
            tower.place(relx=i*0.2, rely=0, relwidth=0.2, relheight=1)
            
            # 头部：设备名
            header = tk.Frame(tower, bg='#1E293B')
            header.pack(fill='x')
            tk.Label(header, text=dev, bg='#1E293B', fg='#38BDF8', font=("微软雅黑", 18, "bold")).pack(pady=8)
            
            self.ui_elements[dev] = {}

            for m_name in ["烟尘", "SO2", "NOx"]:
                pod = tk.Frame(tower, bg='#020617', pady=5)
                pod.pack(fill='x', padx=10)
                
                # 1. 标题行 (指标名 + 趋势提示)
                title_line = tk.Frame(pod, bg='#020617')
                title_line.pack(fill='x')
                tk.Label(title_line, text=m_name, bg='#020617', fg='#94A3B8', font=("微软雅黑", 11)).pack(side='left')
                trend_lbl = tk.Label(title_line, text="--", bg='#020617', fg='#94A3B8', font=("微软雅黑", 10))
                trend_lbl.pack(side='right')

                # 2. 建议值核心区 (特大号字体)
                advice_frame = tk.Frame(pod, bg='#020617')
                advice_frame.pack(fill='x', pady=2)
                
                # 修复点：将 pb=5 改为 pady=5
                tk.Label(advice_frame, text="建议:", bg='#020617', fg='#475569', font=("微软雅黑", 10)).pack(side='left', anchor='s', pady=5)
                adv_val = tk.Label(advice_frame, text="0.0", bg='#020617', fg='#2DD4BF', font=("Impact", 42))
                adv_val.pack(side='left', padx=5)

                # 3. 进度条 (消耗进度)
                prog_container = tk.Frame(pod, bg='#1E293B', height=10)
                prog_container.pack(fill='x', pady=2)
                prog_bar = tk.Frame(prog_container, bg='#10B981', height=10)
                prog_bar.place(x=0, y=0, width=0)

                # 4. 底部明细
                detail_line = tk.Frame(pod, bg='#020617')
                detail_line.pack(fill='x')
                con_val = tk.Label(detail_line, text="已排: 0.0", bg='#020617', fg='#64748B', font=("微软雅黑", 9))
                con_val.pack(side='left')
                tk.Label(detail_line, text=f"额度:{self.limits[m_name]}", bg='#020617', fg='#475569', font=("微软雅黑", 9)).pack(side='right')

                self.ui_elements[dev][m_name] = {
                    "adv": adv_val,
                    "con": con_val,
                    "bar": prog_bar,
                    "trend": trend_lbl,
                    "history": []
                }

    def refresh_loop(self):
        now = datetime.now()
        hours_left = max(24 - now.hour, 1)
        
        for dev in self.devices:
            for m_name, widgets in self.ui_elements[dev].items():
                limit = self.limits[m_name]
                
                # 模拟逻辑（生产环境请替换为 DataFetcher 汇总数据）
                consumed = random.uniform(limit * 0.1, limit * 0.9)
                suggested = (limit - consumed) / hours_left
                
                # 趋势计算
                widgets["history"].append(suggested)
                if len(widgets["history"]) > 2:
                    diff = suggested - widgets["history"][-2]
                    if diff < -0.1: # 建议值下降，说明排放压力变大
                        widgets["trend"].config(text="▲ 压力增", fg="#EF4444")
                    elif diff > 0.1:
                        widgets["trend"].config(text="▼ 压力减", fg="#10B981")
                if len(widgets["history"]) > 5: widgets["history"].pop(0)

                # UI 更新
                widgets["adv"].config(text=f"{max(0, suggested):.1f}")
                widgets["con"].config(text=f"已排: {consumed:.1f}")
                
                # 进度条与变色逻辑
                ratio = min(consumed / limit, 1.0)
                widgets["bar"].place(relwidth=ratio)
                
                # 预警色
                if ratio > 0.85:
                    color = "#EF4444" # 告急红
                elif ratio > 0.65:
                    color = "#F59E0B" # 预警橙
                else:
                    color = "#2DD4BF" # 科技青
                
                widgets["adv"].config(fg=color)
                widgets["bar"].config(bg=color)

        self.root.after(5000, self.refresh_loop)

    def start_move(self, event):
        self.x = event.x
        self.y = event.y
    def do_move(self, event):
        x = self.root.winfo_x() + (event.x - self.x)
        y = self.root.winfo_y() + (event.y - self.y)
        self.root.geometry(f"+{x}+{y}")

if __name__ == "__main__":
    print("看板 V5.1 已启动，按 Esc 退出...")
    ModernQuotaDashboard()