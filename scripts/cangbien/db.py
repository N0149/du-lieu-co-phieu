import sqlite3
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "maritime.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    path = db_path or DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db(db_path: Optional[Path] = None):
    """Initialize database tables using schema.sql"""
    conn = get_connection(db_path)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    with conn:
        conn.executescript(schema_sql)
    conn.close()
    print(f"[DB] Initialized database schema at: {db_path or DEFAULT_DB_PATH}")

def upsert_port_authority(conn: sqlite3.Connection, data: Dict[str, Any]):
    sql = """
    INSERT INTO port_authorities (id, name, short_code, region, lat, lon, calls_30d, dwt_30d, calls_all, dwt_all, latest_date, updated_at)
    VALUES (:id, :name, :short_code, :region, :lat, :lon, :calls_30d, :dwt_30d, :calls_all, :dwt_all, :latest_date, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        short_code=excluded.short_code,
        region=excluded.region,
        lat=excluded.lat,
        lon=excluded.lon,
        calls_30d=excluded.calls_30d,
        dwt_30d=excluded.dwt_30d,
        calls_all=excluded.calls_all,
        dwt_all=excluded.dwt_all,
        latest_date=excluded.latest_date,
        updated_at=CURRENT_TIMESTAMP;
    """
    conn.execute(sql, data)

def upsert_stock(conn: sqlite3.Connection, data: Dict[str, Any]):
    sql = """
    INSERT INTO stocks (ticker, name, region, category, pure_play, scope_note)
    VALUES (:ticker, :name, :region, :category, :pure_play, :scope_note)
    ON CONFLICT(ticker) DO UPDATE SET
        name=excluded.name,
        region=excluded.region,
        category=excluded.category,
        pure_play=excluded.pure_play,
        scope_note=excluded.scope_note;
    """
    conn.execute(sql, data)

def upsert_berth(conn: sqlite3.Connection, data: Dict[str, Any]):
    sql = """
    INSERT INTO berths (slug, name, authority_id, stock_ticker, is_deep_sea, kpi_year, kpi_dwt, kpi_arrivals, updated_at)
    VALUES (:slug, :name, :authority_id, :stock_ticker, :is_deep_sea, :kpi_year, :kpi_dwt, :kpi_arrivals, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
        name=excluded.name,
        authority_id=excluded.authority_id,
        stock_ticker=excluded.stock_ticker,
        is_deep_sea=excluded.is_deep_sea,
        kpi_year=excluded.kpi_year,
        kpi_dwt=excluded.kpi_dwt,
        kpi_arrivals=excluded.kpi_arrivals,
        updated_at=CURRENT_TIMESTAMP;
    """
    conn.execute(sql, data)

def upsert_vessel(conn: sqlite3.Connection, data: Dict[str, Any]):
    sql = """
    INSERT INTO vessels (vessel_id, canonical_name, norm_name, flag, vessel_type, dwt, gt, loa, draft, home_cangvu, first_seen, last_seen, n_calls)
    VALUES (:vessel_id, :canonical_name, :norm_name, :flag, :vessel_type, :dwt, :gt, :loa, :draft, :home_cangvu, :first_seen, :last_seen, :n_calls)
    ON CONFLICT(vessel_id) DO UPDATE SET
        canonical_name=excluded.canonical_name,
        norm_name=excluded.norm_name,
        flag=COALESCE(excluded.flag, vessels.flag),
        vessel_type=COALESCE(excluded.vessel_type, vessels.vessel_type),
        dwt=COALESCE(excluded.dwt, vessels.dwt),
        gt=COALESCE(excluded.gt, vessels.gt),
        loa=COALESCE(excluded.loa, vessels.loa),
        draft=COALESCE(excluded.draft, vessels.draft),
        home_cangvu=COALESCE(excluded.home_cangvu, vessels.home_cangvu),
        last_seen=excluded.last_seen,
        n_calls=vessels.n_calls + 1;
    """
    conn.execute(sql, data)

def insert_port_call(conn: sqlite3.Connection, data: Dict[str, Any]):
    """Insert or update port call with deduplication on vessel_name + call_date + direction + scheduled_time"""
    v_name = data.get("vessel_name", "").strip()
    c_date = data.get("call_date", "").strip()
    c_dir = data.get("call_direction", "").strip()
    s_time = (data.get("scheduled_time") or "").strip()
    b_name = (data.get("berth_name") or "").strip()

    # Check if record already exists
    cursor = conn.execute("""
        SELECT id FROM port_calls
        WHERE vessel_name = ? AND call_date = ? AND call_direction = ? AND (scheduled_time = ? OR (scheduled_time IS NULL AND ? = ''))
    """, (v_name, c_date, c_dir, s_time, s_time))
    existing = cursor.fetchone()

    if existing:
        # Update existing record with newer data
        conn.execute("""
            UPDATE port_calls SET
                berth_name = COALESCE(:berth_name, berth_name),
                berth_slug = COALESCE(:berth_slug, berth_slug),
                stock_ticker = COALESCE(:stock_ticker, stock_ticker),
                draft = CASE WHEN :draft > 0 THEN :draft ELSE draft END,
                loa = CASE WHEN :loa > 0 THEN :loa ELSE loa END,
                dwt = CASE WHEN :dwt > 0 THEN :dwt ELSE dwt END,
                gt = CASE WHEN :gt > 0 THEN :gt ELSE gt END,
                origin_port = COALESCE(:origin_port, origin_port),
                dest_port = COALESCE(:dest_port, dest_port),
                agent_name = COALESCE(:agent_name, agent_name),
                pilot_name = COALESCE(:pilot_name, pilot_name),
                source = :source
            WHERE id = :id
        """, {**data, "id": existing["id"]})
    else:
        sql = """
        INSERT INTO port_calls (
            vessel_id, vessel_name, authority_id, berth_name, berth_slug,
            stock_ticker, call_direction, call_date, scheduled_time,
            draft, loa, dwt, gt, origin_port, dest_port, agent_name, pilot_name, notes, source
        ) VALUES (
            :vessel_id, :vessel_name, :authority_id, :berth_name, :berth_slug,
            :stock_ticker, :call_direction, :call_date, :scheduled_time,
            :draft, :loa, :dwt, :gt, :origin_port, :dest_port, :agent_name, :pilot_name, :notes, :source
        );
        """
        conn.execute(sql, data)

def dedupe_port_calls(conn: sqlite3.Connection):
    """Delete duplicate rows from port_calls table keeping the lowest id"""
    conn.execute("""
        DELETE FROM port_calls
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM port_calls
            GROUP BY vessel_name, call_date, call_direction, COALESCE(scheduled_time, '')
        );
    """)

def upsert_stock_metric_monthly(conn: sqlite3.Connection, data: Dict[str, Any]):
    sql = """
    INSERT INTO stock_metrics_monthly (ticker, period_ym, calls_in, calls_out, dwt_in, dwt_out, is_partial, is_estimated)
    VALUES (:ticker, :period_ym, :calls_in, :calls_out, :dwt_in, :dwt_out, :is_partial, :is_estimated)
    ON CONFLICT(ticker, period_ym) DO UPDATE SET
        calls_in=excluded.calls_in,
        calls_out=excluded.calls_out,
        dwt_in=excluded.dwt_in,
        dwt_out=excluded.dwt_out,
        is_partial=excluded.is_partial,
        is_estimated=excluded.is_estimated;
    """
    conn.execute(sql, data)

def upsert_port_authority_metric_monthly(conn: sqlite3.Connection, data: Dict[str, Any]):
    sql = """
    INSERT INTO port_authority_metrics_monthly (authority_id, period_ym, calls, dwt)
    VALUES (:authority_id, :period_ym, :calls, :dwt)
    ON CONFLICT(authority_id, period_ym) DO UPDATE SET
        calls=excluded.calls,
        dwt=excluded.dwt;
    """
    conn.execute(sql, data)
