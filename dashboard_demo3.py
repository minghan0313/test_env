import tkinter as tk
from datetime import datetime
import random

class CyberCommandDashboard:
    def __init__(self):
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.geometry("1920x480+0+0") 
        self.root.configure(bg='#020617') # 极暗背景

        self.root.bind('<Button-1>', self.start_move)
        self.root.bind('<B1-Motion>', self.do_move)
        self.root.bind('<Escape>', lambda e: self.root.destroy())

        self.devices = ["4#炉", "5#炉", "南1", "南2", "机5"]
        self.metrics = {
            "烟尘": {"limit": 70, "color": "#22D3EE"}, # 电光蓝
            "SO2": {"limit": 230, "color": "#A855F7"}, # 霓虹紫
            "NOx": {"limit": 378, "color": "#F472B6"}  # 玫红
        }
        
        self.ui_elements = {}
        self.setup_ui()
        self.refresh_loop()
        self.root.mainloop()

    def setup_ui(self):
        """左侧总览 + 右侧设备流布局"""
        
        # --- 1. 左侧：全厂排放进度 (占据 20% 宽度) ---
        overview_frame = tk.Frame(self.root, bg='#0F172A', bd=0)
        overview_frame.place(x=0, y=0, relwidth=0.18, relheight=1)
        
        tk.Label(overview_frame, text="FACTORY STATUS", bg='#0F172A', fg='#475569', font=("Impact", 14)).pack(pady=10)
        
        # 汇总统计
        for name, info in self.metrics.items():
            f = tk.Frame(overview_frame, bg='#0F172A', pady=15)
            f.pack(fill='x', padx=20)
            tk.Label(f, text=name, bg='#0F172A', fg=info["color"], font=("微软雅黑", 12, "bold")).pack(anchor='w')
            v = tk.Label(f, text="--%", bg='#0F172A', fg='white', font=("Impact", 28))
            v.pack(anchor='w')
            self.ui_elements[f"total_{name}"] = v

        # --- 2. 右侧：设备详细矩阵 ---
        detail_container = tk.Frame(self.root, bg='#020617')
        detail_container.place(relx=0.18, y=0, relwidth=0.82, relheight=1)

        for i, dev in enumerate(self.devices):
            dev_frame = tk.Frame(detail_container, bg='#020617', highlightbackground="#1E293B", highlightthickness=1)
            dev_frame.place(relx=i*0.2, rely=0, relwidth=0.195, relheight=1)
            
            # 设备名称 (竖排或倾斜感)
            tk.Label(dev_frame, text=dev, bg='#1E293B', fg='#F8FAFC', font=("微软雅黑", 18, "bold")).pack(fill='x', pady=5)

            self.ui_elements[dev] = {}

            for m_name, m_info in self.metrics.items():
                m_box = tk.Frame(dev_frame, bg='#020617', pady=5)
                m_box.pack(fill='x', padx=10)
                
                # 标题行
                h = tk.Frame(m_box, bg='#020617')
                h.pack(fill='x')
                tk.Label(h, text=m_name, bg='#020617', fg='#64748B', font=("微软雅黑", 10)).pack(side='left')
                
                # 核心建议值 (使用呼吸感字体色)
                adv_lbl = tk.Label(m_box, text="0.0", bg='#020617', fg=m_info["color"], font=("Impact", 36))
                adv_lbl.pack(anchor='e')
                
                # 余额进度条 (细长条)
                bar_bg = tk.Frame(m_box, bg='#1E293B', height=4)
                bar_bg.pack(fill='x', pady=5)
                bar = tk.Frame(bar_bg, bg=m_info["color"], height=4)
                bar.place(x=0, y=0, width=0)
                
                # 小字说明
                detail_lbl = tk.Label(m_box, text="已排: 0.0", bg='#020617', fg='#334155', font=("微软雅黑", 9))
                detail_lbl.pack(anchor='e')

                self.ui_elements[dev][m_name] = {
                    "adv": adv_lbl,
                    "bar": bar,
                    "detail": detail_lbl,
                    "limit": m_info["limit"]
                }

    def refresh_loop(self):
        now = datetime.now()
        hours_left = max(24 - now.hour, 1)
        
        totals = {m: 0 for m in self.metrics}
        
        for dev in self.devices:
            for m_name, widgets in self.ui_elements[dev].items():
                limit = widgets["limit"]
                consumed = random.uniform(limit * 0.1, limit * 0.9)
                suggested = (limit - consumed) / hours_left
                
                totals[m_name] += (consumed / limit) / len(self.devices)
                
                # 更新 UI
                widgets["adv"].config(text=f"{max(0, suggested):.1f}")
                widgets["detail"].config(text=f"已排: {consumed:.1f} / {limit}")
                
                ratio = min(consumed / limit, 1.0)
                widgets["bar"].place(relwidth=ratio)
                
                # 颜色呼吸效果模拟
                if suggested < (limit / 48):
                    widgets["adv"].config(fg="#FF0000") # 极其危险变红
                else:
                    widgets["adv"].config(fg=self.metrics[m_name]["color"])

        # 更新左侧汇总
        for m_name, total_ratio in totals.items():
            self.ui_elements[f"total_{m_name}"].config(text=f"{total_ratio*100:.0f}%")

        self.root.after(4000, self.refresh_loop)

    def start_move(self, event):
        self.x = event.x
        self.y = event.y
    def do_move(self, event):
        x = self.root.winfo_x() + (event.x - self.x)
        y = self.root.winfo_y() + (event.y - self.y)
        self.root.geometry(f"+{x}+{y}")

if __name__ == "__main__":
    print("看板 V6.0 赛博工业版启动...")
    CyberCommandDashboard()