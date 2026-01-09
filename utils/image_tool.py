import cv2
import numpy as np
import base64
import os

def cv_imread_alpha(file_path):
    """支持中文路径并读取 4 通道 (RGBA)"""
    if not os.path.exists(file_path):
        return None
    return cv2.imdecode(np.fromfile(file_path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)

def save_base64_img(img_src, filename):
    """解码 Base64 并保存"""
    if not img_src or "base64," not in img_src:
        return False
    try:
        data = img_src.split("base64,")[1]
        img_data = base64.b64decode(data)
        with open(filename, "wb") as f:
            f.write(img_data)
        return True
    except Exception as e:
        print(f"图片保存失败: {e}")
        return False