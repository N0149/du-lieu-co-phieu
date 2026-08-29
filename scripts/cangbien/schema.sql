-- Maritime Port & Stock Intelligence Database Schema
-- Compatible with SQLite and PostgreSQL

CREATE TABLE IF NOT EXISTS port_authorities (
    id TEXT PRIMARY KEY,               -- e.g. 'haiphong', 'quangninh', 'hcm', 'dongnai', 'danang'
    name TEXT NOT NULL,                -- e.g. 'Hải Phòng', 'Quảng Ninh'
    short_code TEXT,                   -- e.g. 'HP', 'QN'
    region TEXT NOT NULL,              -- 'Bắc', 'Bắc Trung Bộ', 'Trung', 'Nam'
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    calls_30d INTEGER DEFAULT 0,
    dwt_30d INTEGER DEFAULT 0,
    calls_all INTEGER DEFAULT 0,
    dwt_all INTEGER DEFAULT 0,
    latest_date TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stocks (
    ticker TEXT PRIMARY KEY,           -- e.g. 'PHP', 'GMD', 'DVP', 'DXP', 'SGP', 'PDN', 'CDN', 'HAH', 'VGR', 'CQN'
    name TEXT NOT NULL,                -- e.g. 'Cảng Hải Phòng'
    region TEXT,                       -- e.g. 'Hải Phòng', 'Đa cảng'
    category TEXT,                     -- 'port' (cảng thuần), 'multi' (đa cảng), 'fleet' (đội tàu)
    pure_play INTEGER DEFAULT 1,       -- 1 if pure play port, 0 otherwise
    scope_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS berths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,         -- e.g. 'tan-vu', 'chua-ve', 'dinh-vu', 'gemalink'
    name TEXT NOT NULL,                -- e.g. 'Tân Vũ', 'Chùa Vẽ'
    authority_id TEXT,                 -- authority ID
    stock_ticker TEXT,                 -- stock ticker, nullable
    is_deep_sea INTEGER DEFAULT 0,
    kpi_year INTEGER,
    kpi_dwt INTEGER,
    kpi_arrivals INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vessels (
    vessel_id TEXT PRIMARY KEY,        -- slug / hash identifier
    canonical_name TEXT NOT NULL,      -- Cleaned standardized name
    norm_name TEXT NOT NULL,           -- Lowercase alphanumeric
    flag TEXT,                         -- Country flag
    vessel_type TEXT,                  -- 'Container', 'Bulk Carrier', 'Tanker', etc.
    dwt INTEGER,                       -- Deadweight tonnage
    gt INTEGER,                        -- Gross tonnage
    loa REAL,                          -- Length overall (meters)
    draft REAL,                        -- Draft (meters)
    home_cangvu TEXT,
    first_seen TEXT,
    last_seen TEXT,
    n_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS port_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vessel_id TEXT,
    vessel_name TEXT NOT NULL,
    authority_id TEXT,
    berth_name TEXT,
    berth_slug TEXT,
    stock_ticker TEXT,
    call_direction TEXT NOT NULL,      -- 'in' (vào), 'out' (ra), 'shift' (dời), 'channel' (qua luồng)
    call_date TEXT NOT NULL,           -- YYYY-MM-DD
    scheduled_time TEXT,               -- HH:MM or ISO timestamp
    draft REAL,
    loa REAL,
    dwt INTEGER,
    gt INTEGER,
    origin_port TEXT,
    dest_port TEXT,
    agent_name TEXT,
    pilot_name TEXT,
    notes TEXT,
    source TEXT NOT NULL,              -- 'cvhh_haiphong', 'pilot_south', 'dlcb_backfill'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_metrics_monthly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    period_ym TEXT NOT NULL,           -- 'YYYY-MM'
    calls_in INTEGER DEFAULT 0,
    calls_out INTEGER DEFAULT 0,
    dwt_in INTEGER DEFAULT 0,
    dwt_out INTEGER DEFAULT 0,
    is_partial INTEGER DEFAULT 0,
    is_estimated INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, period_ym)
);

CREATE TABLE IF NOT EXISTS port_authority_metrics_monthly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    authority_id TEXT NOT NULL,
    period_ym TEXT NOT NULL,           -- 'YYYY-MM'
    calls INTEGER DEFAULT 0,
    dwt INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(authority_id, period_ym)
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_port_calls_ticker ON port_calls(stock_ticker);
CREATE INDEX IF NOT EXISTS idx_port_calls_date ON port_calls(call_date);
CREATE INDEX IF NOT EXISTS idx_port_calls_vessel ON port_calls(vessel_name);
CREATE INDEX IF NOT EXISTS idx_port_calls_auth ON port_calls(authority_id);
CREATE INDEX IF NOT EXISTS idx_stock_metrics_ym ON stock_metrics_monthly(period_ym);
