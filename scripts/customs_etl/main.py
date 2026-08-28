# ─────────────────────────────────────────────────────────────────────────────
# main.py — CLI điều khiển pipeline Backend ETL (Backfill dữ liệu lịch sử TCHQ)
#
# Cách chạy (từ thư mục scripts/customs_etl):
#   python main.py --crawl --from-year 2020 --to-year 2026
#   python main.py --parse-and-load
#   python main.py --all --from-year 2018 --to-year 2026 --init-db
#   python main.py --parse-only                  # chỉ parse, in thống kê
#   python main.py --list-files                  # liệt kê file dữ liệu đã có
#
# Yêu cầu cấu hình DB (trước khi --parse-and-load / --all):
#   Đặt DATABASE_URL (hoặc PGHOST/PGUSER/PGPASSWORD/PGPORT/PGDATABASE)
#   trong .env / .env.local ở thư mục gốc dự án.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

# ── Bootstrap: đảm bảo import được các module cùng thư mục ──────────────────
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Các module nặng (crawler/parser/loader) được import TRỄ bên trong hàm hành động
# để `--help` / `--list-files` chạy được ngay cả khi chưa cài dependencies.
DEFAULT_DATA_DIR = ROOT / "data_raw"

# ── Logging ──────────────────────────────────────────────────────────────────
def ensure_utf8_output() -> None:
    """Ép stdout/stderr dùng UTF-8 (Windows console mặc định cp1252 không in tiếng Việt)."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
        except (AttributeError, ValueError):
            pass


def setup_logging(verbose: bool = False) -> None:
    ensure_utf8_output()
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    logging.basicConfig(level=level, format=fmt, stream=sys.stdout)
    # Giảm ồn từ các thư viện bên ngoài
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("pdfminer").setLevel(logging.WARNING)


# ── Tiện ích ─────────────────────────────────────────────────────────────────
def default_year_range() -> tuple[int, int]:
    return 2018, date.today().year


def print_summary(rows: list, matrix_rows: list | None = None) -> None:
    """In tóm tắt số bản ghi bóc tách được theo nhóm kỳ + loại hình + phân loại."""
    from collections import Counter

    by_period: Counter = Counter()
    by_type: Counter = Counter()
    by_cat: Counter = Counter()
    for r in rows:
        by_period[(r.period_type, r.period_date.isoformat()[:7])] += 1
        by_type[r.trade_type] += 1
        by_cat[r.dataset_category] += 1

    rank = {"KY_1": 0, "KY_2": 1, "THANG": 2, "QUY": 3}
    print("\n" + "═" * 64)
    print("TÓM TẮT BẢN GHI BÓC TÁCH (theo kỳ báo cáo)")
    print("═" * 64)
    for (pt, ym), n in sorted(by_period.items(), key=lambda kv: (kv[0][1], rank.get(kv[0][0], 9))):
        year, month = ym.split("-")
        print(f"  {pt:<6} {month}/{year} : {n:>5} dòng")
    print("─" * 64)
    if by_type:
        print("  Loại hình : " + ", ".join(f"{k}={v}" for k, v in by_type.most_common()))
    if by_cat:
        labels = {
            "main": "Tổng thể (mặt hàng)",
            "fdi": "Khối FDI",
            "matrix": "Chi tiết (MH×TT)",
            "province": "Theo Tỉnh/Thành",
            "transport": "Phương thức vận tải",
        }
        print("  Phân loại : " + ", ".join(f"{labels.get(k, k)}={v}" for k, v in by_cat.most_common()))
    if matrix_rows:
        print(f"  Ma trận (Mặt hàng × Thị trường) : {len(matrix_rows)} dòng (để riêng trong snapshot)")
    print("═" * 64 + "\n")


def list_data_files(data_dir: Path) -> None:
    files = sorted(
        p for p in data_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in {".xlsx", ".xls", ".pdf"}
    )
    if not files:
        print("Chưa có file dữ liệu nào trong data_raw/.")
        return
    print(f"Tìm thấy {len(files)} file trong {data_dir}:\n")
    for p in files:
        size_kb = p.stat().st_size / 1024
        print(f"  - {p.relative_to(data_dir)} ({size_kb:,.1f} KB)")


# ── Hành động ────────────────────────────────────────────────────────────────
def do_crawl(args: argparse.Namespace) -> None:
    import crawler  # noqa: PLC0415 (import trễ)

    logging.getLogger("customs_etl.main").info(
        "Crawl file thống kê XNK %d → %d vào %s",
        args.from_year, args.to_year, args.data_dir,
    )
    crawler.run_crawl(args.from_year, args.to_year, data_dir=args.data_dir)


def do_parse_and_load(args: argparse.Namespace) -> None:
    import loader  # noqa: PLC0415 (import trễ)
    import parser as parser_mod  # noqa: PLC0415

    log = logging.getLogger("customs_etl.main")
    data_dir = Path(args.data_dir)
    log.info("Load mappings...")
    commodity_map, country_map = parser_mod.load_all_mappings()

    log.info("Parse dữ liệu từ %s ...", data_dir)
    rows, _totals_by_file = parser_mod.parse_directory(data_dir, commodity_map, country_map)

    if args.limit:
        rows = rows[: args.limit]
        log.info("Giới hạn %d dòng (--limit).", args.limit)

    log.info("Tổng cộng %d dòng sẵn sàng nạp.", len(rows))

    if args.init_db:
        log.info("Khởi tạo schema (--init-db)...")
        conn = loader.connect()
        loader.apply_schema(conn)
        conn.close()

    conn = loader.connect()
    try:
        stats = loader.upsert_facts(conn, rows)
        log.info("Kết quả: %s", stats)
    finally:
        conn.close()


def do_parse_only(args: argparse.Namespace) -> None:
    import parser as parser_mod  # noqa: PLC0415 (import trễ)

    log = logging.getLogger("customs_etl.main")
    commodity_map, country_map = parser_mod.load_all_mappings()
    rows, _totals_by_file = parser_mod.parse_directory(args.data_dir, commodity_map, country_map)
    if args.limit:
        rows = rows[: args.limit]

    log.info("Parse-only: %d dòng. Mẫu 5 dòng đầu:", len(rows))
    for r in rows[:5]:
        print(r)
    print_summary(rows)


def do_export_json(args: argparse.Namespace) -> None:
    """Parse data_raw rồi xuất snapshot JSON (rows + matrix_rows + trade_balance)."""
    import json
    import analysis  # noqa: PLC0415 (import trễ)
    import parser as parser_mod  # noqa: PLC0415

    log = logging.getLogger("customs_etl.main")
    commodity_map, country_map = parser_mod.load_all_mappings()
    all_rows, totals_by_file = parser_mod.parse_directory(
        args.data_dir, commodity_map, country_map, include_matrix=True
    )
    # Tách ma trận (Mặt hàng × Thị trường) ra khỏi bảng chính để web không phình to
    rows = [r for r in all_rows if r.dataset_category != "matrix"]
    matrix_rows = [r for r in all_rows if r.dataset_category == "matrix"]

    # Điền khuyết các dòng THANG cho từng mặt hàng từ KY_1 + KY_2 (nếu thiếu file tháng)
    thang_keys = {(r.period_date.isoformat(), r.trade_type, r.dataset_category, r.name) for r in rows if r.period_type == "THANG"}
    k1_rows = {(r.period_date.isoformat(), r.trade_type, r.dataset_category, r.name): r for r in rows if r.period_type == "KY_1"}
    k2_rows = {(r.period_date.isoformat(), r.trade_type, r.dataset_category, r.name): r for r in rows if r.period_type == "KY_2"}

    synthesized_thang: list[parser_mod.ParsedRow] = []
    all_k_keys = set(k1_rows.keys()) | set(k2_rows.keys())
    for key in all_k_keys:
        if key not in thang_keys:
            k1 = k1_rows.get(key)
            k2 = k2_rows.get(key)
            base = k2 or k1
            if not base:
                continue
            qty_sum = None
            if (k1 and k1.quantity is not None) or (k2 and k2.quantity is not None):
                qty_sum = (k1.quantity if k1 and k1.quantity else 0.0) + (k2.quantity if k2 and k2.quantity else 0.0)
            val_sum = None
            if (k1 and k1.value_usd is not None) or (k2 and k2.value_usd is not None):
                val_sum = (k1.value_usd if k1 and k1.value_usd else 0.0) + (k2.value_usd if k2 and k2.value_usd else 0.0)

            synth_row = parser_mod.ParsedRow(
                period_type="THANG",
                period_date=base.period_date,
                trade_type=base.trade_type,
                status=base.status,
                dim_kind=base.dim_kind,
                name=base.name,
                raw_name=base.raw_name,
                unit=base.unit,
                quantity=qty_sum,
                value_usd=val_sum,
                quantity_acc=k2.quantity_acc if k2 else (k1.quantity_acc if k1 else None),
                value_acc=k2.value_acc if k2 else (k1.value_acc if k1 else None),
                code=base.code,
                category=base.category,
                iso_code=base.iso_code,
                continent=base.continent,
                source_file=base.source_file,
                dataset_category=base.dataset_category,
            )
            synthesized_thang.append(synth_row)

    if synthesized_thang:
        log.info("Đã bổ sung %d dòng THANG từ KY_1 + KY_2.", len(synthesized_thang))
        rows.extend(synthesized_thang)

    if args.limit:
        rows = rows[: args.limit]
        matrix_rows = matrix_rows[: args.limit]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rows": [r.to_dict() for r in rows],
        "matrix_rows": [r.to_dict() for r in matrix_rows],
        "trade_balance": analysis.build_trade_balance(totals_by_file),
    }
    out_path = Path(args.out_json)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info(
        "Đã xuất %d dòng + %d ma trận + %d kỳ cán cân → %s",
        len(payload["rows"]), len(payload["matrix_rows"]),
        len(payload["trade_balance"]), out_path,
    )
    print_summary(rows, matrix_rows)


# ── CLI ──────────────────────────────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="customs_etl",
        description="Backend ETL thống kê Xuất nhập khẩu TCHQ (crawl → parse → load).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    actions = p.add_argument_group("hành động")
    actions.add_argument("--crawl", action="store_true", help="Cào + tải file thống kê từ web TCHQ")
    actions.add_argument("--parse-and-load", action="store_true", help="Parse data_raw và nạp vào DB")
    actions.add_argument("--all", action="store_true", help="Chạy toàn bộ: crawl → parse → load")
    actions.add_argument("--parse-only", action="store_true", help="Chỉ parse, in thống kê (không nạp DB)")
    actions.add_argument("--list-files", action="store_true", help="Liệt kê file dữ liệu đã tải")
    actions.add_argument("--export-json", action="store_true", help="Parse và xuất snapshot JSON (không nạp DB)")

    opts = p.add_argument_group("tùy chọn")
    opts.add_argument("--from-year", type=int, default=None, help="Năm bắt đầu backfill (mặc định 2018)")
    opts.add_argument("--to-year", type=int, default=None, help="Năm kết thúc backfill (mặc định năm hiện tại)")
    opts.add_argument("--data-dir", type=str, default=str(DEFAULT_DATA_DIR), help="Thư mục dữ liệu gốc")
    opts.add_argument("--init-db", action="store_true", help="Áp dụng database/schema.sql trước khi nạp")
    opts.add_argument("--limit", type=int, default=None, help="Giới hạn số dòng nạp (debug)")
    opts.add_argument(
        "--out-json",
        type=str,
        default=str(ROOT.parent.parent / "data" / "customs_trade_snapshot.json"),
        help="Đường dẫn file snapshot JSON xuất ra (mặc định data/customs_trade_snapshot.json)",
    )
    opts.add_argument("-v", "--verbose", action="store_true", help="Log chi tiết (DEBUG)")

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    setup_logging(args.verbose)
    log = logging.getLogger("customs_etl.main")

    # Xử lý năm mặc định
    fy, ty = default_year_range()
    args.from_year = args.from_year if args.from_year is not None else fy
    args.to_year = args.to_year if args.to_year is not None else ty
    if args.from_year > args.to_year:
        log.error("--from-year (%d) lớn hơn --to-year (%d).", args.from_year, args.to_year)
        return 2

    # Hiển thị cảnh báo khi chạy không có hành động nào
    no_action = not (
        args.crawl or args.parse_and_load or args.all
        or args.parse_only or args.list_files or args.export_json
    )
    if no_action:
        args.list_files = True

    if args.list_files:
        list_data_files(Path(args.data_dir))

    if args.crawl or args.all:
        do_crawl(args)

    if args.parse_and_load or args.all:
        do_parse_and_load(args)

    if args.parse_only:
        do_parse_only(args)

    if args.export_json:
        do_export_json(args)

    log.info("Pipeline hoàn tất.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
