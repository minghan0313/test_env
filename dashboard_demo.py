import tkinter as tk
from datetime import datetime
import random

class QuotaDashboardV4_2:
    def __init__(self):
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        
        # 初始坐标，如果需要移动到副屏，请运行后手动拖拽或修改下方坐标
        self.root.geometry("1920x480+0+0") 
        self.root.configure(bg='#020617')

        self.root.bind('<Button-1>', self.start_move)
        self.root.bind('<B1-Motion>', self.do_move)
        self.root.bind('<Escape>', lambda e: self.root.destroy())

        # 设备名简称，节省横向空间
        self.devices = ["4#炉", "5#炉", "南1#", "南2#", "5#机"]
        self.limits = {"烟尘": 70, "SO2": 230, "NOx": 378}
        
        self.ui_elements = {}
        self.setup_ui()
        self.refresh_loop()
        self.root.mainloop()

    def setup_ui(self):
        for i, dev in enumerate(self.devices):
            # 设备大卡片
            card = tk.Frame(self.root, bg='#0F172A', highlightbackground="#1E293B", highlightthickness=1)
            card.place(relx=i*0.2, rely=0, relwidth=0.2, relheight=1)
            
            # 顶部设备名
            tk.Label(card, text=dev, bg='#1E293B', fg='#38BDF8', font=("微软雅黑", 24, "bold")).pack(fill='x', pady=2)
            
            self.ui_elements[dev] = {}

            for m_name in ["烟尘", "SO2", "NOx"]:
                # 每个指标的独立容器
                m_frame = tk.Frame(card, bg='#0F172A', pady=2)
                m_frame.pack(fill='x', padx=8)
                
                # --- 第一行：指标名 ---
                tk.Label(m_frame, text=f"■ {m_name}", bg='#0F172A', fg='#94A3B8', font=("微软雅黑", 12, "bold")).pack(anchor='w')
                
                # --- 第二行：数据展示区 ---
                data_box = tk.Frame(m_frame, bg='#0F172A')
                data_box.pack(fill='x')

                # 左侧：已排放总量
                left_part = tk.Frame(data_box, bg='#0F172A')
                left_part.pack(side='left')
                
                con_val = tk.Label(left_part, text="0.0", bg='#0F172A', fg='#F8FAFC', font=("Impact", 32))
                con_val.pack(anchor='w')
                tk.Label(left_part, text=f"已排(限额:{self.limits[m_name]})", bg='#0F172A', fg='#475569', font=("微软雅黑", 9)).pack(anchor='w')

                # 右侧：建议控制值
                right_part = tk.Frame(data_box, bg='#0F172A')
                right_part.pack(side='right')
                
                adv_val = tk.Label(right_part, text="0.0", bg='#0F172A', fg='#2DD4BF', font=("Impact", 38, "bold"))
                adv_val.pack(anchor='e')
                tk.Label(right_part, text="建议时控均值", bg='#0F172A', fg='#475569', font=("微软雅黑", 9)).pack(anchor='e')

                # --- 第三行：进度条 ---
                prog_bg = tk.Frame(m_frame, bg='#1E293B', height=6)
                prog_bg.pack(fill='x', pady=4)
                prog_bar = tk.Frame(prog_bg, bg='#10B981', height=6)
                prog_bar.place(x=0, y=0, width=0)

                self.ui_elements[dev][m_name] = {
                    "con": con_val,
                    "adv": adv_val,
                    "bar": prog_bar
                }

    def refresh_loop(self):
        now = datetime.now()
        hours_left = max(24 - now.hour, 1) # 计算今日剩余小时
        
        for dev in self.devices:
            for m_name, widgets in self.ui_elements[dev].items():
                limit = self.limits[m_name]
                
                # 模拟已消耗总量（实际对接时此处求和0点至今的小时报表）
                consumed = random.uniform(limit * 0.4, limit * 0.8) 
                remaining = limit - consumed
                suggested = remaining / hours_left
                
                # 更新数值
                widgets["con"].config(text=f"{consumed:.1f}")
                widgets["adv"].config(text=f"{suggested:.1f}")
                
                # 进度与变色逻辑
                ratio = min(consumed / limit, 1.0)
                widgets["bar"].place(relwidth=ratio)
                
                # 针对“建议均值”的颜色预警：如果建议值被迫压得很低，说明情况紧急
                # 比如 NOx 限额剩余很少，建议每小时只能排 5mg，则变红
                safe_suggested = limit / 24 # 理论上的平均安全时控值
                
                if suggested < safe_suggested * 0.5: # 余额严重不足
                    color = "#EF4444" # 警告红
                elif suggested < safe_suggested * 0.8: 
                    color = "#F59E0B" # 预警橙
                else:
                    color = "#2DD4BF" # 荧光青（安全）
                
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
    print("看板已启动，当前逻辑：总量配额时控建议...")
    QuotaDashboardV4_2()