import os
import sys
import json
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Add current dir to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from db import init_db, get_connection
from dlcb_collector import sync_national_data, sync_stock_data
from cvhh_haiphong_scraper import scrape_haiphong_day, save_records as save_hp_records
from pilot_south_scraper import scrape_pilot_south, save_records as save_south_records

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "maritime"

def export_summary_json():
    """Export unified database state into fast JSON files for Next.js UI"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    
    # 1. Port authorities summary
    cursor = conn.execute("""
        SELECT id, name, short_code, region, lat, lon, calls_30d, dwt_30d, calls_all, dwt_all, latest_date
        FROM port_authorities
        ORDER BY dwt_30d DESC
    """)
    ports = [dict(row) for row in cursor.fetchall()]
    
    # 2. Stocks summary
    cursor = conn.execute("""
        SELECT s.ticker, s.name, s.region, s.category, s.pure_play, s.scope_note,
               COALESCE(SUM(m.calls_in + m.calls_out), 0) as total_calls,
               COALESCE(SUM(m.dwt_in + m.dwt_out), 0) as total_dwt
        FROM stocks s
        LEFT JOIN stock_metrics_monthly m ON s.ticker = m.ticker
        GROUP BY s.ticker
        ORDER BY total_calls DESC
    """)
    stocks = [dict(row) for row in cursor.fetchall()]
    
    # 3. Recent live port calls (today's schedule)
    cursor = conn.execute("""
        SELECT id, vessel_name, authority_id, berth_name, stock_ticker, call_direction,
               call_date, scheduled_time, draft, loa, dwt, gt, origin_port, dest_port, source
        FROM port_calls
        ORDER BY id DESC
        LIMIT 1000
    """)
    recent_calls = [dict(row) for row in cursor.fetchall()]
    
    # 4. Total KPIs
    total_calls_30d = sum(p.get("calls_30d", 0) for p in ports)
    total_dwt_30d = sum(p.get("dwt_30d", 0) for p in ports)
    
    summary = {
        "status": "success",
        "generated_at": "2026-08-29T13:10:00",
        "kpis": {
            "total_port_authorities": len(ports),
            "total_calls_30d": total_calls_30d,
            "total_dwt_30d": total_dwt_30d,
            "tracked_stocks_count": len(stocks),
            "live_port_calls_count": len(recent_calls)
        },
        "port_authorities": ports,
        "stocks": stocks,
        "recent_port_calls": recent_calls
    }
    
    summary_path = DATA_DIR / "dashboard_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        
    conn.close()
    print(f"[Pipeline] Exported dashboard summary JSON to: {summary_path}")

def run_all():
    print("=" * 60)
    print("STARTING MARITIME DATA PIPELINE")
    print("=" * 60)
    
    # Step 1: Init Database
    print("\n>>> Step 1: Initializing SQLite Database...")
    init_db()
    
    # Step 2: DLCB Sync
    print("\n>>> Step 2: Collecting Master Data & Benchmarks...")
    sync_national_data()
    sync_stock_data()
    
    # Step 3: Scrape Hai Phong Live Schedules
    print("\n>>> Step 3: Scraping Hai Phong Port Authority...")
    for offset in [-1, 0, 1]:
        recs = scrape_haiphong_day(offset)
        save_hp_records(recs)
        
    # Step 4: Scrape Southern Pilot Live Schedules
    print("\n>>> Step 4: Scraping Southern Maritime Pilot Portals...")
    south_recs = scrape_pilot_south()
    save_south_records(south_recs)
    
    # Step 5: Export JSON for Next.js
    print("\n>>> Step 5: Exporting Unified JSON Snapshot...")
    export_summary_json()
    
    print("\n" + "=" * 60)
    print("MARITIME DATA PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_all()
