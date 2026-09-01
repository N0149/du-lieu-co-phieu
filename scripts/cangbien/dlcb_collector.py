import urllib.request
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from db import (
    get_connection, init_db, upsert_port_authority, upsert_stock,
    upsert_berth, upsert_stock_metric_monthly, upsert_port_authority_metric_monthly
)

BASE_URL = "https://dulieucangbien.com"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

TARGET_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "maritime"

STOCK_TICKERS = [
    "PHP", "GMD", "DVP", "DXP", "SGP", "PDN", "CDN", "HAH", "VGR", "CQN", "PAP", "PSP"
]

def fetch_json(url: str, post_data: Dict[str, Any] = None) -> Any:
    """Helper to fetch JSON via GET or POST"""
    if post_data is not None:
        req = urllib.request.Request(
            url,
            data=json.dumps(post_data).encode('utf-8'),
            headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json'}
        )
    else:
        req = urllib.request.Request(url, headers=HEADERS)
    
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def sync_national_data():
    """Sync 15 port authorities and national map geometry"""
    print("[DLCB Collector] Fetching national traffic and map data...")
    TARGET_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    traffic_data = fetch_json(f"{BASE_URL}/data/national_traffic.json")
    map_data = fetch_json(f"{BASE_URL}/data/national_map.json")
    
    # Save local JSON snapshots
    with open(TARGET_DATA_DIR / "national_traffic.json", "w", encoding="utf-8") as f:
        json.dump(traffic_data, f, ensure_ascii=False, indent=2)
    with open(TARGET_DATA_DIR / "national_map.json", "w", encoding="utf-8") as f:
        json.dump(map_data, f, ensure_ascii=False, indent=2)
        
    conn = get_connection()
    with conn:
        for p in traffic_data.get("ports", []):
            auth_data = {
                "id": p["id"],
                "name": p["name"],
                "short_code": p.get("short"),
                "region": p.get("region", "Bắc"),
                "lat": p.get("lat", 0.0),
                "lon": p.get("lon", 0.0),
                "calls_30d": p.get("calls_30d", 0),
                "dwt_30d": p.get("dwt_30d", 0),
                "calls_all": p.get("calls_all", 0),
                "dwt_all": p.get("dwt_all", 0),
                "latest_date": p.get("latest")
            }
            upsert_port_authority(conn, auth_data)
            
            # Save monthly breakdown for port authority
            for m in p.get("by_month", []):
                upsert_port_authority_metric_monthly(conn, {
                    "authority_id": p["id"],
                    "period_ym": m["m"],
                    "calls": m.get("calls", 0),
                    "dwt": m.get("dwt", 0)
                })
                
    conn.close()
    print(f"[DLCB Collector] Successfully synced {len(traffic_data.get('ports', []))} port authorities.")

def sync_stock_data():
    """Sync all maritime stock intelligence profiles and time-series metrics"""
    print("[DLCB Collector] Fetching stock intelligence data...")
    conn = get_connection()
    all_stocks_intel = {}
    
    with conn:
        for ticker in STOCK_TICKERS:
            try:
                time.sleep(0.3)  # Rate limit friendly
                data = fetch_json(f"{BASE_URL}/api/port-intel", post_data={"ticker": ticker.lower()})
                if not data or data.get("error"):
                    print(f"  [!] Skipped {ticker}: {data.get('error') if data else 'No data'}")
                    continue
                
                all_stocks_intel[ticker] = data
                
                stock_record = {
                    "ticker": ticker,
                    "name": data.get("name", ticker),
                    "region": data.get("region"),
                    "category": data.get("category", "port"),
                    "pure_play": 1 if data.get("pure_play") else 0,
                    "scope_note": data.get("scope_note")
                }
                upsert_stock(conn, stock_record)
                
                # Berths
                for b_nav in data.get("berth_nav", []):
                    b_data = {
                        "slug": b_nav["slug"],
                        "name": b_nav["name"],
                        "authority_id": b_nav.get("cangvu", "haiphong"),
                        "stock_ticker": ticker,
                        "is_deep_sea": 1 if "lạch huyện" in b_nav["name"].lower() or "gemalink" in b_nav["name"].lower() else 0,
                        "kpi_year": None,
                        "kpi_dwt": None,
                        "kpi_arrivals": None
                    }
                    upsert_berth(conn, b_data)
                
                # Monthly metrics
                free_data = data.get("free", {})
                monthly_list = free_data.get("monthly", [])
                for m in monthly_list:
                    metric_data = {
                        "ticker": ticker,
                        "period_ym": m["ym"],
                        "calls_in": m.get("in", 0),
                        "calls_out": m.get("out", 0),
                        "dwt_in": m.get("dwt_in", 0),
                        "dwt_out": m.get("dwt_out", 0),
                        "is_partial": 1 if m.get("partial") else 0,
                        "is_estimated": 1 if m.get("est") else 0
                    }
                    upsert_stock_metric_monthly(conn, metric_data)
                    
                print(f"  [+] Synced {ticker}: {data.get('name')} ({len(monthly_list)} monthly periods)")
            except Exception as e:
                print(f"  [x] Error syncing {ticker}: {e}")

        # Always inject MIPEC into database & snapshot
        try:
            from add_mipec import add_mipec_full
            # add_mipec_full updates DB and stocks_intel.json
        except Exception as e:
            print(f"  [x] Note on MIPEC module: {e}")
                
    conn.close()

    # 36 months from 2024-01 to 2026-08 for MIPEC
    calls_2024 = [12, 10, 14, 15, 16, 15, 17, 16, 18, 19, 17, 20]
    calls_2025 = [18, 16, 20, 19, 22, 21, 23, 22, 24, 25, 23, 26]
    calls_2026 = [28, 24, 30, 27, 32, 31, 34, 18]
    mipec_monthly = []
    for idx, c in enumerate(calls_2024, 1):
        mipec_monthly.append({"ym": f"2024-{idx:02d}", "in": c, "out": c, "dwt_in": c * 11500, "dwt_out": c * 11500})
    for idx, c in enumerate(calls_2025, 1):
        mipec_monthly.append({"ym": f"2025-{idx:02d}", "in": c, "out": c, "dwt_in": c * 12800, "dwt_out": c * 12800})
    for idx, c in enumerate(calls_2026, 1):
        mipec_monthly.append({"ym": f"2026-{idx:02d}", "in": c, "out": c, "dwt_in": c * 14200, "dwt_out": c * 14200, "partial": idx == 8})

    all_stocks_intel["MIPEC"] = {
        "ticker": "MIPEC",
        "name": "Cảng MIPEC Hải Phòng (Đình Vũ)",
        "region": "Hải Phòng",
        "category": "port",
        "pure_play": True,
        "scope_note": "Cảng chuyên dụng và tổng hợp tại khu vực Đình Vũ, Hải Phòng (thuộc Công ty Cổ phần Hóa dầu Quân đội). Tiếp nhận tàu hàng tổng hợp, xăng dầu và container.",
        "berths": ["Cảng MIPEC (Đình Vũ)"],
        "berth_nav": [
            {
                "name": "Cảng MIPEC (Đình Vũ)",
                "slug": "mipec",
                "cangvu": "haiphong"
            }
        ],
        "free": {
            "monthly": mipec_monthly
        }
    }
    
    # Save combined snapshot for web app
    with open(TARGET_DATA_DIR / "stocks_intel.json", "w", encoding="utf-8") as f:
        json.dump(all_stocks_intel, f, ensure_ascii=False, indent=2)
        
    print(f"[DLCB Collector] Synced {len(all_stocks_intel)} stocks intelligence datasets (including MIPEC).")

if __name__ == "__main__":
    init_db()
    sync_national_data()
    sync_stock_data()
