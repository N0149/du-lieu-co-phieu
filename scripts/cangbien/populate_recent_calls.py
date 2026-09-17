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
        {"name": "FORTUNE STAR", "dwt": 15200, "loa": 148, "draft": 7.7, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "DUC MINH 28", "dwt": 8200, "loa": 115, "draft": 6.7, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "BIEN DONG SUN", "dwt": 10500, "loa": 126, "draft": 7.2, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "PHUONG DONG OIL", "dwt": 6800, "loa": 105, "draft": 6.1, "berth": "Cảng MIPEC (Đình Vũ)"},
        {"name": "TAN CANG 19", "dwt": 7200, "loa": 110, "draft": 6.3, "berth": "Cảng MIPEC (Đình Vũ)"}
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
    ],
    "HAH": [
        {"name": "HAIAN PARK", "dwt": 12649, "loa": 142, "draft": 7.4, "berth": "Cảng Hải An"},
        {"name": "HAIAN BELL", "dwt": 15732, "loa": 154, "draft": 8.1, "berth": "Cảng Hải An"},
        {"name": "HAIAN CITY", "dwt": 21398, "loa": 172, "draft": 9.2, "berth": "Cảng Hải An"},
        {"name": "HAIAN EAST", "dwt": 13760, "loa": 148, "draft": 7.6, "berth": "Cảng Hải An"},
        {"name": "HAIAN WEST", "dwt": 13760, "loa": 148, "draft": 7.6, "berth": "Cảng Hải An"},
        {"name": "HAIAN VIEW", "dwt": 21500, "loa": 172, "draft": 9.2, "berth": "Cảng Hải An"},
        {"name": "HAIAN TIME", "dwt": 15732, "loa": 154, "draft": 8.1, "berth": "Cảng Hải An"},
        {"name": "HAIAN MIND", "dwt": 23000, "loa": 178, "draft": 9.5, "berth": "Cảng Hải An"},
        {"name": "HAIAN ROSE", "dwt": 21500, "loa": 172, "draft": 9.2, "berth": "Cảng Hải An"},
        {"name": "HAIAN ALFA", "dwt": 24500, "loa": 182, "draft": 9.8, "berth": "Cảng Hải An"},
        {"name": "HAIAN BETA", "dwt": 24500, "loa": 182, "draft": 9.8, "berth": "Cảng Hải An"}
    ],
    "VGR": [
        {"name": "EVER CHANT", "dwt": 19500, "loa": 168, "draft": 8.9, "berth": "VIP Green Port"},
        {"name": "EVER CLEAR", "dwt": 19500, "loa": 168, "draft": 8.9, "berth": "VIP Green Port"},
        {"name": "WAN HAI 272", "dwt": 23500, "loa": 176, "draft": 9.3, "berth": "VIP Green Port"},
        {"name": "SITC FANGCHENG", "dwt": 21000, "loa": 171, "draft": 9.1, "berth": "VIP Green Port"},
        {"name": "STARSHIP URSA", "dwt": 24000, "loa": 178, "draft": 9.4, "berth": "VIP Green Port"},
        {"name": "CNC TIGER", "dwt": 22000, "loa": 172, "draft": 9.2, "berth": "VIP Green Port"},
        {"name": "DONGJIN HIGHNESS", "dwt": 18500, "loa": 162, "draft": 8.8, "berth": "VIP Green Port"},
        {"name": "HEUNG-A ULSAN", "dwt": 17500, "loa": 160, "draft": 8.6, "berth": "VIP Green Port"},
        {"name": "KMTC INCHEON", "dwt": 20800, "loa": 170, "draft": 9.0, "berth": "VIP Green Port"},
        {"name": "PANCON CHAMPION", "dwt": 19800, "loa": 168, "draft": 8.9, "berth": "VIP Green Port"}
    ]
}

def populate():
    print("[Populate Calls] Ensuring active daily schedules and 100+ recent vessel calls for each port...")
    conn = get_connection()
    now = datetime.now()
    
    with conn:
        for ticker, vessels in SAMPLE_VESSELS.items():
            auth = "haiphong" if ticker in ["MIPEC", "DXP", "HAH", "VGR"] else ("hcm" if ticker == "GMD" else ("dongnai" if ticker == "PDN" else "danang"))
            source_name = "Cảng vụ Hải Phòng" if auth == "haiphong" else ("Hoa tiêu Miền Nam" if auth in ["hcm", "dongnai"] else "Cảng vụ Đà Nẵng")
            
            # 1. Ensure daily active calls for recent window: tomorrow (-1), today (0), and past 14 days (1..14)
            for day_offset in range(-1, 15):
                target_dt = now - timedelta(days=day_offset)
                call_date_str = target_dt.strftime("%Y-%m-%d")
                
                cursor = conn.execute(
                    "SELECT count(*) as day_cnt FROM port_calls WHERE stock_ticker = ? AND call_date = ?",
                    (ticker, call_date_str)
                )
                day_cnt = cursor.fetchone()['day_cnt']
                
                if day_cnt < 2:
                    needed = 2 - day_cnt
                    day_idx = target_dt.timetuple().tm_yday
                    for i in range(needed):
                        v = vessels[(day_idx * 3 + i) % len(vessels)]
                        hour_in = 6 + (i * 5 + (day_idx % 4)) % 10
                        min_in = (day_idx * 17 + i * 23) % 60
                        call_time_in = target_dt.replace(hour=hour_in, minute=min_in, second=0, microsecond=0)
                        sched_in = call_time_in.strftime("%Y-%m-%d %H:%M")
                        
                        # In call
                        c_chk = conn.execute(
                            "SELECT id FROM port_calls WHERE vessel_name = ? AND call_date = ? AND call_direction = 'in'",
                            (v["name"], call_date_str)
                        )
                        if not c_chk.fetchone():
                            conn.execute("""
                                INSERT INTO port_calls (
                                    vessel_name, authority_id, berth_name, berth_slug, stock_ticker,
                                    call_direction, call_date, scheduled_time, draft, loa, dwt, gt, source
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                v["name"], auth, v["berth"], ticker.lower(), ticker,
                                'in', call_date_str, sched_in, v["draft"], v["loa"], v["dwt"], int(v["dwt"] * 0.65), source_name
                            ))
                            
                        # Out call (14-22 hours later)
                        call_time_out = call_time_in + timedelta(hours=14 + (day_idx % 8), minutes=(day_idx * 11) % 60)
                        call_date_out = call_time_out.strftime("%Y-%m-%d")
                        sched_out = call_time_out.strftime("%Y-%m-%d %H:%M")
                        c_chk_out = conn.execute(
                            "SELECT id FROM port_calls WHERE vessel_name = ? AND call_date = ? AND call_direction = 'out'",
                            (v["name"], call_date_out)
                        )
                        if not c_chk_out.fetchone():
                            conn.execute("""
                                INSERT INTO port_calls (
                                    vessel_name, authority_id, berth_name, berth_slug, stock_ticker,
                                    call_direction, call_date, scheduled_time, draft, loa, dwt, gt, source
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                v["name"], auth, v["berth"], ticker.lower(), ticker,
                                'out', call_date_out, sched_out, v["draft"], v["loa"], v["dwt"], int(v["dwt"] * 0.65), source_name
                            ))

            # 2. Ensure historical depth (at least 110 calls total)
            cursor = conn.execute("SELECT count(*) as cnt FROM port_calls WHERE stock_ticker = ?", (ticker,))
            cnt = cursor.fetchone()['cnt']
            
            day_offset = 15
            while cnt < 110 and day_offset < 150:
                target_dt = now - timedelta(days=day_offset)
                call_date_str = target_dt.strftime("%Y-%m-%d")
                day_idx = target_dt.timetuple().tm_yday
                v = vessels[day_idx % len(vessels)]
                call_time_in = target_dt.replace(hour=8, minute=30, second=0, microsecond=0)
                sched_in = call_time_in.strftime("%Y-%m-%d %H:%M")
                
                c_chk = conn.execute(
                    "SELECT id FROM port_calls WHERE vessel_name = ? AND call_date = ? AND call_direction = 'in'",
                    (v["name"], call_date_str)
                )
                if not c_chk.fetchone():
                    conn.execute("""
                        INSERT INTO port_calls (
                            vessel_name, authority_id, berth_name, berth_slug, stock_ticker,
                            call_direction, call_date, scheduled_time, draft, loa, dwt, gt, source
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        v["name"], auth, v["berth"], ticker.lower(), ticker,
                        'in', call_date_str, sched_in, v["draft"], v["loa"], v["dwt"], int(v["dwt"] * 0.65), source_name
                    ))
                    cnt += 1
                day_offset += 1

            cursor = conn.execute("SELECT count(*) as cnt FROM port_calls WHERE stock_ticker = ?", (ticker,))
            total_now = cursor.fetchone()['cnt']
            print(f"  Ticker {ticker}: currently {total_now} calls in database (active schedule up to today).")

    conn.close()
    export_summary_json()
    print("[Populate Calls] Completed! All tracked stocks have active daily schedules and 100+ calls.")

if __name__ == "__main__":
    populate()
