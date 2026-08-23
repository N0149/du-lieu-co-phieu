# ─────────────────────────────────────────────────────────────────────────────
# loader.py — Nạp dữ liệu sạch (list[ParsedRow]) vào PostgreSQL / Supabase.
#
# Kết nối DB:
#   - Đọc `.env` / `.env.local` ở THƯ MỤC GỐC dự án (scripts/customs_etl → ../../)
#   - Ưu tiên `DATABASE_URL` (chuỗi postgresql:// hoặc postgres://)
#   - Hoặc các biến PG* / SUPABASE_* (PGHOST, PGUSER, PGPASSWORD, PGPORT, PGDATABASE)
#
# Cơ chế:
#   - Tự động map ID từ dim_commodities / dim_countries (chưa có → tự INSERT mới)
#   - Bulk insert bằng psycopg2.extras.execute_values + ON CONFLICT DO UPDATE (idempotent)
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Iterable

try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:  # pragma: no cover
    load_dotenv = None
    HAS_DOTENV = False

try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:  # pragma: no cover
    psycopg2 = None  # type: ignore[assignment]
    execute_values = None  # type: ignore[assignment]
    HAS_PSYCOPG2 = False

from parser import ParsedRow  # noqa: F401  (re-export type cho main.py)

logger = logging.getLogger("customs_etl.loader")

# scripts/customs_etl → thư mục gốc dự án
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = Path(__file__).resolve().parent / "database" / "schema.sql"

# Kích thước lô khi bulk insert (tránh query quá lớn)
BATCH_SIZE = 5000


# ── Cấu hình kết nối ─────────────────────────────────────────────────────────
def load_env(root: str | Path = PROJECT_ROOT) -> None:
    """Nạp .env.local rồi .env từ thư mục gốc dự án (không ghi đè biến đã có)."""
    root = Path(root)
    if not HAS_DOTENV:
        logger.warning(
            "python-dotenv chưa được cài — bỏ qua .env/.env.local. "
            "Hãy đặt biến env trực tiếp hoặc chạy: pip install -r requirements.txt"
        )
        return
    for env_file in (root / ".env.local", root / ".env"):
        if env_file.exists():
            load_dotenv(env_file, override=False)
            logger.debug("Đã nạp env từ %s", env_file)


def build_dsn() -> str:
    """Dựng chuỗi kết nối từ biến môi trường. Raise RuntimeError nếu thiếu cấu hình."""
    url = (os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "").strip()
    if url:
        return url

    host = os.getenv("PGHOST") or os.getenv("SUPABASE_HOST")
    if not host:
        raise RuntimeError(
            "Thiếu cấu hình Database. Đặt DATABASE_URL (hoặc PGHOST/PGUSER/PGPASSWORD) "
            "trong file .env / .env.local ở thư mục gốc dự án."
        )
    user = os.getenv("PGUSER") or os.getenv("SUPABASE_USER") or "postgres"
    password = os.getenv("PGPASSWORD") or os.getenv("SUPABASE_PASSWORD") or ""
    port = os.getenv("PGPORT") or "5432"
    dbname = os.getenv("PGDATABASE") or "postgres"

    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


def connect() -> psycopg2.extensions.connection:  # type: ignore[name-defined]
    """Mở kết nối psycopg2 (autocommit=False)."""
    if not HAS_PSYCOPG2:
        raise RuntimeError(
            "Thiếu psycopg2-binary. Hãy cài dependencies: pip install -r requirements.txt"
        )
    load_env()
    dsn = build_dsn()
    logger.info("Kết nối Database...")
    conn = psycopg2.connect(dsn, connect_timeout=15)
    conn.autocommit = False
    logger.info("Đã kết nối: %s", conn.get_dsn_parameters().get("dbname", ""))
    return conn


# ── Khởi tạo schema ──────────────────────────────────────────────────────────
def apply_schema(conn: psycopg2.extensions.connection, schema_path: str | Path = SCHEMA_PATH) -> None:
    """Chạy database/schema.sql (tách theo ';', bỏ comment dòng)."""
    schema_path = Path(schema_path)
    if not schema_path.exists():
        raise FileNotFoundError(f"Không tìm thấy schema: {schema_path}")

    raw = schema_path.read_text(encoding="utf-8")
    # Bỏ comment dòng '--' để dễ tách câu lệnh
    lines = [ln for ln in raw.splitlines() if not ln.strip().startswith("--")]
    script = "\n".join(lines)
    statements = [s.strip() for s in script.split(";") if s.strip()]

    with conn.cursor() as cur:
        for stmt in statements:
            if stmt.lower().startswith("create "):
                cur.execute(stmt)
                logger.info("Schema: %s ...", " ".join(stmt.split())[:60])
    conn.commit()
    logger.info("Đã áp dụng schema thành công.")


# ── Đảm bảo dimension ────────────────────────────────────────────────────────
def ensure_commodity(
    conn: psycopg2.extensions.connection,
    name: str,
    code: str | None,
    category: str | None,
    unit: str | None,
) -> int:
    """Đảm bảo tồn tại dim_commodities theo tên chuẩn → trả về id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO dim_commodities (code, name, category, unit)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE
              SET code     = COALESCE(EXCLUDED.code, dim_commodities.code),
                  category = COALESCE(EXCLUDED.category, dim_commodities.category),
                  unit     = COALESCE(EXCLUDED.unit, dim_commodities.unit)
            RETURNING id
            """,
            (code, name, category, unit),
        )
        return int(cur.fetchone()[0])


def ensure_country(
    conn: psycopg2.extensions.connection,
    name: str,
    iso_code: str | None,
    continent: str | None,
) -> int:
    """Đảm bảo tồn tại dim_countries theo tên chuẩn → trả về id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO dim_countries (iso_code, name, continent)
            VALUES (%s, %s, %s)
            ON CONFLICT (name) DO UPDATE
              SET iso_code  = COALESCE(EXCLUDED.iso_code, dim_countries.iso_code),
                  continent = COALESCE(EXCLUDED.continent, dim_countries.continent)
            RETURNING id
            """,
            (iso_code, name, continent),
        )
        return int(cur.fetchone()[0])


# ── Upsert facts ──────────────────────────────────────────────────────────────
UPSERT_FACT_SQL = """
    INSERT INTO fact_customs_trade
        (period_type, period_date, commodity_id, country_id,
         trade_type, status, quantity, value_usd)
    VALUES %s
    ON CONFLICT (period_type, period_date, commodity_id, country_id, trade_type, status)
    DO UPDATE SET
        quantity   = EXCLUDED.quantity,
        value_usd  = EXCLUDED.value_usd,
        updated_at = now()
"""


def upsert_facts(conn: psycopg2.extensions.connection, rows: Iterable[ParsedRow]) -> dict[str, int]:
    """Nạp hàng loạt ParsedRow vào fact_customs_trade. Trả về thống kê số dòng."""
    rows = list(rows)
    if not rows:
        logger.warning("Không có dòng dữ liệu để nạp.")
        return {"inserted": 0, "commodity_dim": 0, "country_dim": 0}

    commodity_cache: dict[str, int] = {}
    country_cache: dict[str, int] = {}

    # Đảm bảo dimension + chuẩn bị tuple cho execute_values
    facts: list[tuple[Any, ...]] = []
    for r in rows:
        if r.dim_kind == "commodity":
            dim_id = commodity_cache.get(r.name)
            if dim_id is None:
                dim_id = ensure_commodity(conn, r.name, r.code, r.category, r.unit)
                commodity_cache[r.name] = dim_id
            commodity_id, country_id = dim_id, None
        elif r.dim_kind == "country":
            dim_id = country_cache.get(r.name)
            if dim_id is None:
                dim_id = ensure_country(conn, r.name, r.iso_code, r.continent)
                country_cache[r.name] = dim_id
            commodity_id, country_id = None, dim_id
        else:
            logger.warning("Bỏ qua dòng dim_kind không hợp lệ: %r", r.dim_kind)
            continue

        facts.append(
            (
                r.period_type,
                r.period_date,
                commodity_id,
                country_id,
                r.trade_type,
                r.status,
                r.quantity,
                r.value_usd,
            )
        )

    # Bulk theo lô (execute_values tự render 8 cột = 8 %s)
    total = 0
    with conn.cursor() as cur:
        for start in range(0, len(facts), BATCH_SIZE):
            chunk = facts[start : start + BATCH_SIZE]
            execute_values(cur, UPSERT_FACT_SQL, chunk, page_size=2000)
            total += len(chunk)
            logger.info("Đã upsert lô %d–%d (%d dòng).", start + 1, start + len(chunk), len(chunk))
    conn.commit()

    logger.info(
        "Hoàn tất nạp %d dòng | dim commodity: %d | dim country: %d.",
        total, len(commodity_cache), len(country_cache),
    )
    return {"inserted": total, "commodity_dim": len(commodity_cache), "country_dim": len(country_cache)}
