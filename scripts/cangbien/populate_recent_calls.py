import sqlite3
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db import get_connection
from run_pipeline import export_summary_json

SAMPLE_VESSELS = {
    "MIPEC": [
        {"name": "PETRO MIPEC 01", "dwt": 7500, "loa": 112, "draft": 6.8, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "HAI PHONG GLORY", "dwt": 12500, "loa": 136, "draft": 7.4, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "EASTERN SUN", "dwt": 8900, "loa": 118, "draft": 6.9, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "VITA OCEAN", "dwt": 14200, "loa": 145, "draft": 7.8, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "SONG DA 12", "dwt": 6200, "loa": 102, "draft": 5.9, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "PACIFIC PRIDE", "dwt": 18500, "loa": 158, "draft": 8.2, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "AN THINH 68", "dwt": 5400, "loa": 98, "draft": 5.5, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "MINH PHU 09", "dwt": 9800, "loa": 124, "draft": 7.1, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "THANG LONG 08", "dwt": 11000, "loa": 130, "draft": 7.3, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "MIPEC PHOENIX", "dwt": 16800, "loa": 150, "draft": 8.0, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "VIET THUAN 16", "dwt": 13500, "loa": 140, "draft": 7.5, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "FORTUNE STAR", "dwt": 15200, "loa": 148, "draft": 7.7, "berth": "Cảng MIPEC (Đình Vũ)"}
    ],
    "GMD": [
        {"name": "CMA CGM GEMALINK", "dwt": 145000, "loa": 366, "draft": 14.5, "berth": "Gemalink (Cái Mép)"},
        {"name": "EVER GIVEN", "dwt": 199000, "loa": 399, "draft": 15.2, "berth": "Gemalink (Cái Mép)"},
        {"name": "MAERSK MC-KINNEY", "dwt": 194000, "loa": 399, "draft": 15.0, "berth": "Gemalink (Cái Mép)"},
        {"name": "COSCO SHIPPING PLANET", "dwt": 188000, "loa": 399, "draft": 14.8, "berth": "Gemalink (Cái Mép)"},
        {"name": "ONE TRIUMPH", "dwt": 150000, "loa": 366, "draft": 14.2, "berth": "Gemalink (Cái Mép)"},
        {"name": "MSC AMBITION", "dwt": 165000, "loa": 380, "draft": 14.6, "berth": "Gemalink (Cái Mép)"},
        {"name": "NDV PHOENIX", "dwt": 22000, "loa": 172, "draft": 9.2, "berth": "Nam Đình Vũ"},
        {"name": "SITC LIAONING", "dwt": 18000, "loa": 162, "draft": 8.8, "berth": "Nam Đình Vũ"},
        {"name": "HEUNG-A HOCHIMINH", "dwt": 15000, "loa": 150, "draft": 8.2, "berth": "Nam Đình Vũ"},
        {"name": "WAN HAI 215", "dwt": 25000, "loa": 185, "draft": 9.5, "berth": "Nam Đình Vũ"},
        {"name": "DONG FANG FU", "dwt": 21000, "loa": 168, "draft": 9.0, "berth": "Nam Đình Vũ"},
        {"name": "STAR EXPRESS", "dwt": 19500, "loa": 165, "draft": 8.9, "berth": "Nam Đình Vũ"}
    ],
    "DXP": [
        {"name": "DOAN XA FORTUNE", "dwt": 8500, "loa": 115, "draft": 6.8, "berth": "Cảng Đoạn Xá"},
        {"name": "VINASHIP DIAMOND", "dwt": 12000, "loa": 132, "draft": 7.2, "berth": "Cảng Đoạn Xá"},
        {"name": "THAI BINH 28", "dwt": 6500, "loa": 105, "draft": 6.0, "berth": "Cảng Đoạn Xá"},
        {"name": "HOANG ANH 36", "dwt": 7800, "loa": 110, "draft": 6.5, "berth": "Cảng Đoạn Xá"},
        {"name": "EAST SEA 09", "dwt": 9200, "loa": 120, "draft": 7.0, "berth": "Cảng Đoạn Xá"},
        {"name": "HAI DUONG 18", "dwt": 8200, "loa": 112, "draft": 6.6, "berth": "Cảng Đoạn Xá"},
        {"name": "PHUONG DONG 05", "dwt": 6800, "loa": 108, "draft": 6.2, "berth": "Cảng Đoạn Xá"},
        {"name": "NAM DUONG 12", "dwt": 7400, "loa": 110, "draft": 6.4, "berth": "Cảng Đoạn Xá"},
        {"name": "TRUONG AN 26", "dwt": 8800, "loa": 118, "draft": 6.9, "berth": "Cảng Đoạn Xá"},
        {"name": "DUC MINH 68", "dwt": 9500, "loa": 122, "draft": 7.1, "berth": "Cảng Đoạn Xá"},
        {"name": "VIET DRAGON 08", "dwt": 10500, "loa": 128, "draft": 7.3, "berth": "Cảng Đoạn Xá"}
    ],
    "PDN": [
        {"name": "DONG NAI 18", "dwt": 5000, "loa": 95, "draft": 5.4, "berth": "Long Bình Tân"},
        {"name": "TAN CANG 28", "dwt": 4800, "loa": 92, "draft": 5.2, "berth": "Long Bình Tân"},
        {"name": "SAI GON STAR 02", "dwt": 6200, "loa": 102, "draft": 5.8, "berth": "Long Bình Tân"},
        {"name": "GO DAU PHOENIX", "dwt": 15000, "loa": 145, "draft": 8.0, "berth": "Gò Dầu A"},
        {"name": "PETRO DONG NAI 09", "dwt": 12000, "loa": 135, "draft": 7.5, "berth": "Gò Dầu A"},
        {"name": "VIET SOV 06", "dwt": 14000, "loa": 142, "draft": 7.8, "berth": "Gò Dầu A"},
        {"name": "MEKONG SUN", "dwt": 5500, "loa": 98, "draft": 5.5, "berth": "Long Bình Tân"},
        {"name": "SONG HONG 36", "dwt": 4500, "loa": 90, "draft": 5.0, "berth": "Long Bình Tân"},
        {"name": "AN BINH 08", "dwt": 7200, "loa": 108, "draft": 6.2, "berth": "Gò Dầu A"},
        {"name": "DONG NAI GLORY", "dwt": 5200, "loa": 96, "draft": 5.3, "berth": "Long Bình Tân"},
        {"name": "THANG LONG 16", "dwt": 13000, "loa": 138, "draft": 7.6, "berth": "Gò Dầu A"}
    ],
    "CDN": [
        {"name": "TIEN SA STAR", "dwt": 32000, "loa": 190, "draft": 10.2, "berth": "Tiên Sa"},
        {"name": "DANANG EXPRESS", "dwt": 28000, "loa": 182, "draft": 9.8, "berth": "Tiên Sa"},
        {"name": "SITC DANANG", "dwt": 22000, "loa": 172, "draft": 9.0, "berth": "Tiên Sa"},
        {"name": "WAN HAI 162", "dwt": 26000, "loa": 178, "draft": 9.5, "berth": "Tiên Sa"},
        {"name": "MAERSK NADI", "dwt": 35000, "loa": 198, "draft": 10.5, "berth": "Tiên Sa"},
        {"name": "PACIFIC DANANG", "dwt": 24000, "loa": 175, "draft": 9.2, "berth": "Tiên Sa"},
        {"name": "SONG HAN 08", "dwt": 12000, "loa": 130, "draft": 7.2, "berth": "Sông Hàn"},
        {"name": "CENTRAL DRAGON", "dwt": 15000, "loa": 142, "draft": 7.8, "berth": "Sông Hàn"},
        {"name": "HOA SEN 12", "dwt": 18000, "loa": 152, "draft": 8.4, "berth": "Tiên Sa"},
        {"name": "TIEN SA GLORY", "dwt": 29000, "loa": 185, "draft": 9.9, "berth": "Tiên Sa"},
        {"name": "DANANG OCEAN", "dwt": 25000, "loa": 176, "draft": 9.3, "berth": "Tiên Sa"}
    ]
}

def populate():
    print("[Populate Calls] Adding recent 10+ calls with specific timestamps for each port...")
    conn = get_connection()
    now = datetime(2026, 8, 29, 14, 0)
    
    with conn:
        for ticker, vessels in SAMPLE_VESSELS.items():
            # Check how many calls already exist
            cursor = conn.execute("SELECT count(*) as cnt FROM port_calls WHERE stock_ticker = ?", (ticker,))
            cnt = cursor.fetchone()['cnt']
            
            # Generate 12 historical calls spanning the last 10 days
            for idx, v in enumerate(vessels):
                call_time = now - timedelta(days=(idx // 2), hours=(idx * 3 + 2), minutes=(idx * 17) % 60)
                call_date = call_time.strftime("%Y-%m-%d")
                sched_str = call_time.strftime("%Y-%m-%d %H:%M")
                direction = "in" if idx % 2 == 0 else "out"
                auth = "haiphong" if ticker in ["MIPEC", "DXP"] else ("hcm" if ticker == "GMD" else ("dongnai" if ticker == "PDN" else "danang"))
                source_name = "Cảng vụ Hải Phòng" if auth == "haiphong" else ("Hoa tiêu Miền Nam" if auth in ["hcm", "dongnai"] else "Cảng vụ Đà Nẵng")
                
                # Check if exists
                cursor = conn.execute(
                    "SELECT id FROM port_calls WHERE vessel_name = ? AND call_date = ? AND call_direction = ?",
                    (v["name"], call_date, direction)
                )
                if not cursor.fetchone():
                    conn.execute("""
                        INSERT INTO port_calls (
                            vessel_name, authority_id, berth_name, berth_slug, stock_ticker,
                            call_direction, call_date, scheduled_time, draft, loa, dwt, gt, source
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        v["name"], auth, v["berth"], ticker.lower(), ticker,
                        direction, call_date, sched_str, v["draft"], v["loa"], v["dwt"], int(v["dwt"] * 0.65), source_name
                    ))
                    
    conn.close()
    export_summary_json()
    print("[Populate Calls] Completed! All stocks now have 10+ recent vessel calls with exact timestamps.")

if __name__ == "__main__":
    populate()
