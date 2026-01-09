import cv2
import numpy as np
from .image_tool import cv_imread_alpha

class CaptchaSolver:
    @staticmethod
    def get_gap_x(bg_path):
        """利用Alpha通道计算缺口横坐标"""
        img = cv_imread_alpha(bg_path)
        if img is None or img.shape[2] < 4:
            return None
        
        # 提取Alpha并二值化
        alpha = img[:, :, 3]
        _, thresh = cv2.threshold(alpha, 200, 255, cv2.THRESH_BINARY_INV)
        
        # 开运算降噪
        kernel = np.ones((3, 3), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        # 找轮廓并根据尺寸过滤
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if 40 < w < 75 and 40 < h < 75:
                return x
        return None