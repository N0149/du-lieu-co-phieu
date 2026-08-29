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

PILOT_SOUTH_URL = "https://www.pilotcosouth.vn/ke-hoach-dieu-dong-tau"

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def scrape_pilot_south() -> List[Dict[str, Any]]:
    """
    Scrape Southern Vietnam Maritime Pilot schedule (HCM, Cái Mép, Cát Lái, Đồng Nai).
    """
    target_date = datetime.date.today().strftime("%Y-%m-%d")
    print(f"[Pilot South] Fetching schedule from {PILOT_SOUTH_URL}...")
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(PILOT_SOUTH_URL, headers=headers)
    
    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[Pilot South] Error connecting to {PILOT_SOUTH_URL}: {e}")
        return []

    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')
    
    records = []
    
    for i, table in enumerate(tables):
        rows = table.find_all('tr')
        if not rows:
            continue
            
        header_row = [th.get_text(" ", strip=True).lower() for th in rows[0].find_all(['th', 'td'])]
        header_text = " ".join(header_row)
        
        current_direction = "in"
        if "rời cảng" in header_text or "rời" in header_text:
            current_direction = "out"
        elif "vào cảng" in header_text or "vào" in header_text:
            current_direction = "in"
        elif "dời" in header_text or "di chuyển" in header_text:
            current_direction = "shift"
            
        for row in rows[1:]:
            cells = [c.get_text(" ", strip=True) for c in row.find_all(['td', 'th'])]
            if not cells or len(cells) < 6:
                continue
                
            stt = cells[0].strip()
            if not stt.isdigit():
                continue
                
            pilot_name = cells[1].strip() if len(cells) > 1 else ""
            raw_vessel = cells[2].strip() if len(cells) > 2 else ""
            clean_name = clean_vessel_name(raw_vessel)
            
            if not clean_name:
                continue
                
            draft = parse_float(cells[3]) if len(cells) > 3 else 0.0
            loa = parse_float(cells[4]) if len(cells) > 4 else 0.0
            grt = parse_tonnage(cells[5]) if len(cells) > 5 else 0
            
            raw_berth = cells[6].strip() if len(cells) > 6 else ""
            sched_time = ""
            notes = ""
            
            if len(cells) >= 10:
                sched_time = cells[8].strip()
                notes = cells[9].strip()
            elif len(cells) >= 8:
                sched_time = cells[7].strip()
                notes = cells[8].strip() if len(cells) > 8 else ""

            berth_info = map_berth_to_stock(raw_berth, fallback_authority="hcm")
            v_slug = vessel_slug(clean_name)
            
            approx_dwt = int(grt * 1.4) if grt > 0 else 0
            
            record = {
                "vessel_id": v_slug,
                "vessel_name": clean_name,
                "authority_id": berth_info["authority_id"],
                "berth_name": berth_info["berth_name"],
                "berth_slug": berth_info["berth_slug"],
                "stock_ticker": berth_info["stock_ticker"],
                "call_direction": current_direction,
                "call_date": target_date,
                "scheduled_time": f"{target_date} {sched_time}:00" if sched_time and ":" in sched_time else target_date,
                "draft": draft,
                "loa": loa,
                "dwt": approx_dwt,
                "gt": grt,
                "origin_port": "Biển Đông" if current_direction == "in" else raw_berth,
                "dest_port": raw_berth if current_direction == "in" else "Biển Đông",
                "agent_name": "",
                "pilot_name": pilot_name,
                "notes": f"Raw Berth: {raw_berth} | {notes}".strip(" | "),
                "source": "pilot_south"
            }
            records.append(record)
            
    print(f"[Pilot South] Extracted {len(records)} port call records.")
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
                "vessel_type": "Cargo / Container",
                "dwt": r["dwt"],
                "gt": r["gt"],
                "loa": r["loa"],
                "draft": r["draft"],
                "home_cangvu": r["authority_id"],
                "first_seen": r["call_date"],
                "last_seen": r["call_date"],
                "n_calls": 1
            }
            upsert_vessel(conn, vessel_data)
            
            # 2. Insert port call
            insert_port_call(conn, r)
    conn.close()
    print(f"[Pilot South] Successfully stored {len(records)} records into database.")

if __name__ == "__main__":
    init_db()
    recs = scrape_pilot_south()
    save_records(recs)
