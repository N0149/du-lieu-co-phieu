#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# generate_mappings.py — Trích xuất tên mặt hàng gốc CHƯA map từ dữ liệu thực tế
# và mở rộng mappings/commodities.json (Master Mapping backfill).
#
# Cách chạy:
#   python generate_mappings.py
#
# Logic:
#   - Parse toàn bộ data_raw (parser có sẵn bộ lọc tổng/Trong đó).
#   - Gom các tên mặt hàng mà parser phải dùng tên gốc (chưa có mapping) theo
#     key chuẩn hóa (bỏ dấu, hạ thường, gộp khoảng trắng).
#   - Thêm mục mới vào commodities.json: canonical = tên sạch nhất (bỏ dấu "-" đầu),
#     aliases = mọi biến thể tên gốc gặp được, unit = đơn vị phổ biến nhất.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import json
import logging
import re
import sys
from collections import defaultdict
from pathlib import Path

logging.basicConfig(level=logging.WARNING)
logging.getLogger("pdfminer").setLevel(logging.CRITICAL)
logging.getLogger("customs_etl").setLevel(logging.ERROR)

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import parser as P  # noqa: E402

MAPPING_PATH = ROOT / "mappings" / "commodities.json"


def clean_canonical(name: str) -> str:
    """Làm sạch tên để dùng làm canonical: bỏ gạch đầu dòng '-/•', gộp khoảng trắng."""
    s = re.sub(r"^[\s\-–—•·]+", "", name).strip()
    return re.sub(r"\s+", " ", s)


def main() -> None:
    commodity_map, _country_map = P.load_all_mappings()
    rows, _totals = P.parse_directory(ROOT / "data_raw", commodity_map, _country_map)

    # Gom các tên chưa map (name == raw_name = fallback) theo key chuẩn hóa
    groups: dict[str, dict] = defaultdict(
        lambda: {"count": 0, "names": set(), "units": defaultdict(int)}
    )
    for r in rows:
        if r.dim_kind != "commodity":
            continue
        if r.name != r.raw_name:
            continue  # đã có mapping
        key = P.normalize_key(r.raw_name)
        g = groups[key]
        g["count"] += 1
        g["names"].add(r.raw_name)
        if r.unit:
            g["units"][r.unit] += 1

    if not groups:
        print("Không có tên mặt hàng nào chưa map — commodities.json đã đầy đủ.")
        return

    data = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    commodities = data["commodities"]
    existing = {P.normalize_key(c["canonical_name"]) for c in commodities}
    # cộng cả alias đã có để tránh thêm trùng
    for c in commodities:
        existing.update(P.normalize_key(a) for a in c.get("aliases", []))

    added = 0
    for key in sorted(groups):
        if key in existing:
            continue
        g = groups[key]
        canonical = clean_canonical(min(g["names"], key=len))
        unit = max(g["units"], key=g["units"].get) if g["units"] else None
        aliases = sorted({n for n in g["names"]}, key=len)
        if canonical not in aliases:
            aliases.insert(0, canonical)
        commodities.append(
            {
                "code": None,  # chưa có mã HS — bổ sung sau nếu cần
                "canonical_name": canonical,
                "category": None,
                "unit": unit,
                "aliases": aliases,
            }
        )
        existing.add(key)
        existing.add(P.normalize_key(canonical))
        added += 1

    MAPPING_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Đã thêm {added} mặt hàng mới → {MAPPING_PATH.name} (tổng {len(commodities)} mục).")


if __name__ == "__main__":
    main()
