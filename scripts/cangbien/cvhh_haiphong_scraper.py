import urllib.request
from bs4 import BeautifulSoup
import datetime
import ssl
import sys
from pathlib import Path
from typing import List, Dict, Any

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from db import get_connection, init_db, upsert_vessel, insert_port_call
from vessel_cleaner import clean_vessel_name, vessel_slug, parse_tonnage, parse_float
from berth_mapper import map_berth_to_stock

HP_CSDL_BASE = "https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx"

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def scrape_haiphong_day(offset_days: int = 0) -> List[Dict[str, Any]]:
    """
    Scrape Hai Phong Port Authority daily vessel schedule.
    offset_days: 0 (Today), -1 (Yesterday), 1 (Tomorrow)
    """
    target_date = (datetime.date.today() + datetime.timedelta(days=offset_days)).strftime("%Y-%m-%d")
    url = f"{HP_CSDL_BASE}?d={offset_days}"
    print(f"[CVHH Hai Phong] Fetching schedule for {target_date} (d={offset_days}): {url}")
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[CVHH Hai Phong] Error connecting to {url}: {e}")
        return []

    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')
    
    records = []
    
    # Identify sub-tables by section header
    current_direction = "in"
    for table in tables:
        rows = table.find_all('tr')
        if not rows:
            continue
            
        header_text = table.get_text(" ", strip=True).lower()
        if "kế hoạch tàu rời cảng" in header_text:
            current_direction = "out"
        elif "kế hoạch tàu vào cảng" in header_text:
            current_direction = "in"
        elif "kế hoạch tàu di chuyển" in header_text:
            current_direction = "shift"
        elif "kế hoạch tàu qua luồng" in header_text:
            current_direction = "channel"
            
        for row in rows:
            cells = [c.get_text(" ", strip=True) for c in row.find_all(['td', 'th'])]
            if not cells or len(cells) < 7:
                continue
            
            stt = cells[0].strip()
            if not stt.isdigit():
                continue
            
            sched_time = cells[1].strip() if len(cells) > 1 else ""
            raw_vessel = cells[2].strip() if len(cells) > 2 else ""
            clean_name = clean_vessel_name(raw_vessel)
            
            if not clean_name:
                continue
                
            draft = parse_float(cells[3]) if len(cells) > 3 else 0.0
            loa = parse_float(cells[4]) if len(cells) > 4 else 0.0
            dwt = parse_tonnage(cells[5]) if len(cells) > 5 else 0
            gt = parse_tonnage(cells[6]) if len(cells) > 6 else 0
            
            origin_port = ""
            dest_port = ""
            raw_berth = ""
            
            if len(cells) >= 11:
                origin_port = cells[9].strip()
                dest_port = cells[10].strip()
                raw_berth = dest_port if current_direction == "in" else origin_port
            elif len(cells) >= 9:
                origin_port = cells[7].strip()
                dest_port = cells[8].strip()
                raw_berth = dest_port if current_direction == "in" else origin_port

            berth_info = map_berth_to_stock(raw_berth, fallback_authority="haiphong")
            v_slug = vessel_slug(clean_name)
            
            agent = cells[11].strip() if len(cells) > 11 else ""
            pilot = cells[12].strip() if len(cells) > 12 else ""
            
            record = {
                "vessel_id": v_slug,
                "vessel_name": clean_name,
                "authority_id": "haiphong",
                "berth_name": berth_info["berth_name"],
                "berth_slug": berth_info["berth_slug"],
                "stock_ticker": berth_info["stock_ticker"],
                "call_direction": current_direction,
                "call_date": target_date,
                "scheduled_time": f"{target_date} {sched_time}:00" if sched_time else target_date,
                "draft": draft,
                "loa": loa,
                "dwt": dwt,
                "gt": gt,
                "origin_port": origin_port,
                "dest_port": dest_port,
                "agent_name": agent,
                "pilot_name": pilot,
                "notes": f"Raw Berth: {raw_berth} | Direction: {current_direction}",
                "source": "cvhh_haiphong"
            }
            records.append(record)
            
    print(f"[CVHH Hai Phong] Extracted {len(records)} port call records for {target_date}.")
    return records

def save_records(records: List[Dict[str, Any]]):
    """Upsert vessels and insert port calls into database"""
    if not records:
        return
    conn = get_connection()
    with conn:
        for r in records:
            # 1. Upsert vessel
            vessel_data = {
                "vessel_id": r["vessel_id"],
                "canonical_name": r["vessel_name"],
                "norm_name": r["vessel_name"].lower(),
                "flag": None,
                "vessel_type": "Cargo",
                "dwt": r["dwt"],
                "gt": r["gt"],
                "loa": r["loa"],
                "draft": r["draft"],
                "home_cangvu": "haiphong",
                "first_seen": r["call_date"],
                "last_seen": r["call_date"],
                "n_calls": 1
            }
            upsert_vessel(conn, vessel_data)
            
            # 2. Insert port call
            insert_port_call(conn, r)
    conn.close()
    print(f"[CVHH Hai Phong] Successfully stored {len(records)} records into database.")

if __name__ == "__main__":
    init_db()
    for offset in [-1, 0, 1]:
        recs = scrape_haiphong_day(offset)
        save_records(recs)
