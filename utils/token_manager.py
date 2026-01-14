import os
import json

class TokenManager:
    """
    工业级 Token 持久化工具
    自动处理跨平台路径，确保 Token 存储在项目根目录下
    """
# --- 路径逻辑开始 ---
    # 1. 获取当前文件 (token_manager.py) 的绝对路径
    _current_file_path = os.path.abspath(__file__)
    # 2. 获取当前文件所在的文件夹路径 (即 utils/ 文件夹)
    _utils_dir = os.path.dirname(_current_file_path)
    # 3. 拼接最终的 Token 缓存文件路径
    # 如果想放在同级目录，直接使用 _utils_dir
    TOKEN_FILE = os.path.join(_utils_dir, "token_cache.json")
    # --- 路径逻辑结束 ---
    
    @classmethod
    def get_token(cls):
        """
        从硬盘读取缓存的 Token
        """
        if not os.path.exists(cls.TOKEN_FILE):
            return None
        
        try:
            with open(cls.TOKEN_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                token = data.get("access_token")
                if token:
                    print(f"已从本地缓存读取 Token: {cls.TOKEN_FILE}")
                    return token
        except Exception as e:
            print(f"读取 Token 文件时出错: {e}")
        return None
    @classmethod
    def save_token(cls, token_string):
        """
        将 Token 字符串持久化到硬盘
        """
        if not token_string:
            return
            
        payload = {
            "access_token": token_string,
            "description": "环保平台访问令牌",
            "last_updated": os.path.getmtime(cls.TOKEN_FILE) if os.path.exists(cls.TOKEN_FILE) else "Just Now"
        }
        
        try:
            with open(cls.TOKEN_FILE, 'w', encoding='utf-8') as f:
                json.dump(payload, f, indent=4, ensure_ascii=False)
            print(f"[持久化成功] Token 已保存在: {cls.TOKEN_FILE}")
        except Exception as e:
            print(f"保存 Token 失败: {e}")
    @classmethod
    def clear_token(cls):
        """
        手动清除 Token (通常在发现 Token 彻底失效时调用)
        """
        if os.path.exists(cls.TOKEN_FILE):
            os.remove(cls.TOKEN_FILE)
            print("本地 Token 已清除")