-- ─────────────────────────────────────────────────────────────────────────────
-- database/schema.sql — Khởi tạo schema Supabase / PostgreSQL (Fact-Dim)
-- Lược đồ Kimball đơn giản cho dữ liệu thống kê Xuất nhập khẩu của TCHQ.
--
-- Yêu cầu: PostgreSQL 15+ (Supabase hiện tại dùng PG15/16/17) vì dùng
-- `UNIQUE NULLS NOT DISTINCT` để UPSERT hoạt động với cột dim có thể NULL
-- (một dòng chỉ là theo mặt hàng HOẶC theo thị trường, không đồng thời cả hai).
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================
-- DIMENSION: Mặt hàng
-- ============================================================
CREATE TABLE IF NOT EXISTS dim_commodities (
    id         BIGSERIAL PRIMARY KEY,
    code       TEXT UNIQUE,              -- mã mặt hàng (nếu có, ví dụ HS nhóm)
    name       TEXT NOT NULL UNIQUE,     -- tên mặt hàng chuẩn hóa
    category   TEXT,                     -- nhóm ngành hàng
    unit       TEXT,                     -- đơn vị tính (Tấn, Chiếc, USD...)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dim_commodities IS 'Chiều mặt hàng - tên chuẩn hóa từ mappings/commodities.json';

-- ============================================================
-- DIMENSION: Quốc gia / Thị trường
-- ============================================================
CREATE TABLE IF NOT EXISTS dim_countries (
    id         BIGSERIAL PRIMARY KEY,
    iso_code   TEXT UNIQUE,              -- mã ISO 3166-1 alpha-3
    name       TEXT NOT NULL UNIQUE,     -- tên quốc gia chuẩn hóa
    continent  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dim_countries IS 'Chiều quốc gia/thị trường - tên chuẩn hóa từ mappings/countries.json';

-- ============================================================
-- FACT: Số liệu xuất nhập khẩu (theo kỳ)
-- ============================================================
CREATE TABLE IF NOT EXISTS fact_customs_trade (
    id                BIGSERIAL PRIMARY KEY,
    period_type       TEXT NOT NULL CHECK (period_type IN ('KY_1', 'KY_2', 'THANG', 'QUY')),
    period_date       DATE NOT NULL,                       -- ngày đầu kỳ (period_type quyết định kỳ 1/2, tháng hay quý)
    commodity_id      BIGINT REFERENCES dim_commodities (id),  -- NULL nếu dòng theo thị trường
    country_id        BIGINT REFERENCES dim_countries (id),   -- NULL nếu dòng theo mặt hàng
    trade_type        TEXT NOT NULL CHECK (trade_type IN ('EXPORT', 'IMPORT')),
    status            TEXT NOT NULL DEFAULT 'SO_BO' CHECK (status IN ('SO_BO', 'CHINH_THUC')),
    dim_kind          TEXT NOT NULL DEFAULT 'commodity'
                      CHECK (dim_kind IN ('commodity', 'country', 'matrix', 'province', 'transport')),
    dataset_category  TEXT NOT NULL DEFAULT 'main'
                      CHECK (dataset_category IN ('main', 'fdi', 'matrix', 'province', 'transport')),
    quantity          NUMERIC(24, 6),                     -- Lượng (đơn vị tính theo dim)
    value_usd         NUMERIC(24, 2),                     -- Trị giá (USD)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE fact_customs_trade
    IS 'Số liệu thống kê XNK theo kỳ: 1 dòng = (kỳ, chiều dữ liệu, loại hình XK/NK, trạng thái, phân loại tập dữ liệu). dataset_category: main=facing hàng chính, fdi=khối FDI, matrix=MH×TT, province=theo tỉnh, transport=phương thức vận tải';

-- Khóa duy nhất hỗ trợ UPSERT (ON CONFLICT DO UPDATE).
-- NULLS NOT DISTINCT: coi NULL (dim không áp dụng) là bằng nhau để tránh trùng lặp.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fact_customs_trade
    ON fact_customs_trade (period_type, period_date, commodity_id, country_id,
                           trade_type, status, dim_kind, dataset_category)
    NULLS NOT DISTINCT;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fact_period      ON fact_customs_trade (period_date);
CREATE INDEX IF NOT EXISTS idx_fact_commodity   ON fact_customs_trade (commodity_id);
CREATE INDEX IF NOT EXISTS idx_fact_country     ON fact_customs_trade (country_id);
CREATE INDEX IF NOT EXISTS idx_fact_trade_type  ON fact_customs_trade (trade_type);
CREATE INDEX IF NOT EXISTS idx_fact_status      ON fact_customs_trade (status);

-- ============================================================
-- (TÙY CHỌN) Nếu dùng PostgreSQL < 15 (không hỗ trợ NULLS NOT DISTINCT),
-- thay khối UNIQUE INDEX ở trên bằng 2 partial unique index sau:
--   CREATE UNIQUE INDEX uq_fact_by_commodity ON fact_customs_trade
--       (period_type, period_date, commodity_id, trade_type, status)
--       WHERE country_id IS NULL;
--   CREATE UNIQUE INDEX uq_fact_by_country ON fact_customs_trade
--       (period_type, period_date, country_id, trade_type, status)
--       WHERE commodity_id IS NULL;
-- ============================================================
