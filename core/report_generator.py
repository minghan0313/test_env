from utils.excel_tool import ExcelProcessor
import datetime

class ReportGenerator:
    """环保报表业务生成器：负责业务逻辑映射"""
    # 映射表格列：北厂4炉从N列开始, 北厂5炉从R列开始, 南厂1从V, 南厂2从Z
    # 每个炉子占4列：烟气量, 粉尘, SO2, NOx
    COLUMN_MAPPING = {
        "NORTH_4": ["N", "O", "P", "Q"],
        "NORTH_5": ["R", "S", "T", "U"],
        "SOUTH_1": ["V", "W", "X", "Y"],
        "SOUTH_2": ["Z", "AA", "AB", "AC"]
    }
    # 环保限值定义
    THRESHOLDS = {
        "dust": 10.0,  # 粉尘限值
        "so2": 35.0,   # SO2限值
        "nox": 50.0    # NOx限值
    }
    @classmethod
    def generate_daily_report(cls, template_path, output_path, all_data):
        """
        all_data 结构: { "00:00:00": {"NORTH_4": [烟气, 粉尘, SO2, NOx], ...}, ... }
        """
        # 直接使用 config 里的配置，脱离大模型也能一眼看懂
        from config import DEVICE_EXCEL_COLS, THRESHOLDS
        # 加载工作簿
        wb = ExcelProcessor.load_workbook(template_path)
        ws = wb.active
        print(f"开始处理报表，数据源共包含 {len(all_data)} 个时段...")
        # 1. 遍历表格的时间行（假设从第4行到27行对应00:00到23:00）
        for row_idx in range(4, 28):
            cell_value = ws[f"A{row_idx}"].value
            # 时间格式预处理：将 Excel 的 time 对象或字符串统一转为 "HH:MM:SS"
            time_key = None
            if isinstance(cell_value, datetime.time):
                time_key = cell_value.strftime("%H:%M:%S")
            elif isinstance(cell_value, datetime.datetime):
                time_key = cell_value.strftime("%H:%M:%S")
            elif isinstance(cell_value, str):
                time_key = cell_value.strip()
            
            # 如果没找到有效的时间 Key 或数据中没有该时段，则跳过
            if not time_key or time_key not in all_data:
                continue
            
            # 2. 匹配抓取到的该时段数据
            hour_payload = all_data[time_key]
            
            # 3. 遍历每个设备的数据映射
            for device_name, values in hour_payload.items():
                if device_name in cls.COLUMN_MAPPING:
                    cols = cls.COLUMN_MAPPING[device_name]
                    
                    # values 应包含 [烟气量, 粉尘, SO2, NOx]
                    for i, val in enumerate(values):
                        if val is None: continue # 保护：如果数据缺失则不写
                        
                        try:
                            num_val = float(val) # 确保是数字类型以供比较
                            is_alert = False
                            
                            # 逻辑预判：根据索引检查是否超标 (1:粉尘, 2:SO2, 3:NOx)
                            if i == 1 and num_val > cls.THRESHOLDS["dust"]: is_alert = True
                            if i == 2 and num_val > cls.THRESHOLDS["so2"]: is_alert = True
                            if i == 3 and num_val > cls.THRESHOLDS["nox"]: is_alert = True
                            
                            # 写入单元格
                            ExcelProcessor.set_cell_value(ws, f"{cols[i]}{row_idx}", num_val, is_alert)
                        except (ValueError, TypeError):
                            # 如果 val 不是数字（比如是 "-"），直接原样写入但不标红
                            ExcelProcessor.set_cell_value(ws, f"{cols[i]}{row_idx}", val, False)

        # 保存结果
        ExcelProcessor.save(wb, output_path)
        print(f"报表生成成功，超标数据已自动标红：{output_path}")