"""
Script kiểm tra & gửi thông báo mẫu BCTC Quý 3 qua Discord Webhook
Chạy: python scripts/test_discord.py "URL_WEBHOOK_CUA_ANH"
"""

import os
import sys
import json
import datetime
import urllib.request

BASE_DIR = r"d:\hoc\lap trinh\du-lieu-co-phieu"
CONFIG_FILE = os.path.join(BASE_DIR, "data", "discord_config.json")

def save_webhook(url):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump({"webhook_url": url}, f, indent=2)
    print(f"-> Đã lưu Discord Webhook vào: {CONFIG_FILE}")

def get_webhook():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                d = json.load(f)
                return d.get("webhook_url")
        except:
            pass
    return None

def send_test_alert(webhook_url):
    payload = {
        "username": "Radar BCTC Quý 3 (dulieudautu.com)",
        "avatar_url": "https://dulieudautu.com/icon.svg",
        "embeds": [
            {
                "title": "🚨 PHÁT HIỆN BCTC QUÝ 3/2026 MỚI: RTB",
                "description": "🏢 **Công ty Cổ phần Cao su Tân Biên** (`UPCOM`)\n📄 *Báo cáo tài chính riêng Quý 3/2026*",
                "color": 0x22C55E,  # Màu xanh lá tăng trưởng mạnh
                "fields": [
                    {
                        "name": "💰 LNST Quý 3/2026",
                        "value": "**120,71 tỷ** (Cùng kỳ: 18,51 tỷ)",
                        "inline": True
                    },
                    {
                        "name": "📈 Tăng Trưởng YoY",
                        "value": "**+552.18% 🚀**",
                        "inline": True
                    },
                    {
                        "name": "⏰ Giờ Công Bố",
                        "value": "`12/10/2026 14:38`",
                        "inline": True
                    },
                    {
                        "name": "💡 Điểm Nhấn BCTC",
                        "value": "Doanh thu hoạt động tài chính tăng vọt đạt **107,9 tỷ** (cùng kỳ 6,1 tỷ) và Doanh thu thuần tăng 12.7% đạt **184,3 tỷ**.",
                        "inline": False
                    },
                    {
                        "name": "📥 Tải & Xem BCTC Gốc",
                        "value": "[👉 Bấm vào đây để mở trực tiếp file PDF BCTC](https://file.fpts.com.vn/FileStore2/File/EzIR/UploadFile/News/2026/10/12/File_1_7445_VI_BaoCaoTaiChinh_Q3_2026_(Cty).pdf)",
                        "inline": False
                    }
                ],
                "footer": {
                    "text": "Hệ thống giám sát BCTC Quý 3 • dulieudautu.com"
                },
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        ]
    }
    
    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status in [200, 204]:
                print("✅ GỬI THÀNH CÔNG! Vui lòng kiểm tra ứng dụng Discord trên điện thoại hoặc máy tính của anh!")
                return True
            else:
                print(f"⚠️ Discord phản hồi mã: {resp.status}")
                return False
    except Exception as e:
        print(f"❌ Lỗi gửi Webhook: {e}")
        return False

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else get_webhook()
    if not url:
        print("Vui lòng cung cấp Discord Webhook URL.")
        print("Cách chạy: python scripts/test_discord.py \"https://discord.com/api/webhooks/...\"")
        sys.exit(1)
        
    save_webhook(url)
    print("Đang gửi tin nhắn thông báo mẫu qua Discord...")
    send_test_alert(url)
