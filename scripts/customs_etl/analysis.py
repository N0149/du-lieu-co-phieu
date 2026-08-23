#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# analysis.py — Tính chuỗi Cán cân thương mại theo kỳ báo cáo.
#
# Nguồn: tổng trị giá (dòng "TỔNG TRỊ GIÁ") của từng file trong data_raw:
#   - File thường (tên không chứa 'cuafdi') → Xuất/Nhập khẩu TỔNG THỂ.
#   - File 'cuafdi'                         → Xuất/Nhập khẩu khối FDI.
#   - Khối Trong nước = Tổng thể - FDI.
# Mỗi kỳ báo cáo: KY_1 / KY_2 (15 ngày) hoặc THANG (cả tháng).
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from parser import detect_dataset_category, detect_trade_type, parse_period  # noqa: E402

# Thứ tự hiển thị các loại kỳ trong một tháng: Kỳ 1 → Kỳ 2 → Tháng → Quý (lũy kế)
PERIOD_RANK = {"KY_1": 0, "KY_2": 1, "THANG": 2, "QUY": 3}
PERIOD_LABEL = {"KY_1": "Kỳ 1", "KY_2": "Kỳ 2", "THANG": "Tháng", "QUY": "Quý"}


def is_fdi_file(filename: str) -> bool:
    """File khối FDI (dataset_category == 'fdi', tên chứa 'cuafdi')."""
    return detect_dataset_category(filename) == "fdi"


def _period_label(period_type: str, period_date: str) -> str:
    year, month, _ = period_date.split("-")
    if period_type == "QUY":
        q = (int(month) - 1) // 3 + 1
        return f"Quý {q}/{year}"
    return f"{PERIOD_LABEL.get(period_type, period_type)} {int(month):02d}/{year}"


def build_trade_balance(
    totals_by_file: dict[str, dict[str, float | None]],
) -> list[dict[str, Any]]:
    """Tính chuỗi cán cân theo từng kỳ từ tổng trị giá (dòng TỔNG TRỊ GIÁ) mỗi file.

    Trả về danh sách (đã sort theo thời gian) mỗi phần tử:
      { period_type, period_date, label,
        export, import, balance,
        export_fdi, import_fdi, balance_fdi,
        export_domestic, import_domestic, balance_domestic }
    (đơn vị USD).
    """
    periods: dict[tuple[str, str], dict[str, Any]] = {}

    for fname, totals in totals_by_file.items():
        # CHỈ file bảng CHÍNH + FDI tham gia Cán cân thương mại (ma trận/tỉnh/vận tải
        # là bảng phân tổ phụ, tổng của chúng sẽ trùng/ghi đè tổng thật).
        if detect_dataset_category(fname) not in ("main", "fdi"):
            continue
        try:
            period_type, period_date = parse_period(fname)
        except ValueError:
            continue
        trade_type = detect_trade_type(fname)
        val = totals.get("val_ky")
        if val is None:
            continue

        key = (period_type, period_date.isoformat())
        rec = periods.setdefault(
            key,
            {
                "period_type": period_type,
                "period_date": period_date.isoformat(),
                "export": 0.0,
                "import": 0.0,
                "export_fdi": 0.0,
                "import_fdi": 0.0,
            },
        )

        if is_fdi_file(fname):
            if trade_type == "EXPORT":
                rec["export_fdi"] = val
            else:
                rec["import_fdi"] = val
        else:
            if trade_type == "EXPORT":
                rec["export"] = val
            else:
                rec["import"] = val

    series: list[dict[str, Any]] = []
    for key in sorted(periods, key=lambda k: (k[1], PERIOD_RANK.get(k[0], 99))):
        rec = periods[key]
        export = rec["export"]
        import_ = rec["import"]
        export_fdi = rec["export_fdi"]
        import_fdi = rec["import_fdi"]
        balance = export - import_
        balance_fdi = export_fdi - import_fdi

        series.append(
            {
                "period_type": rec["period_type"],
                "period_date": rec["period_date"],
                "label": _period_label(rec["period_type"], rec["period_date"]),
                "export": round(export, 2),
                "import": round(import_, 2),
                "balance": round(balance, 2),
                "export_fdi": round(export_fdi, 2),
                "import_fdi": round(import_fdi, 2),
                "balance_fdi": round(balance_fdi, 2),
                "export_domestic": round(export - export_fdi, 2),
                "import_domestic": round(import_ - import_fdi, 2),
                "balance_domestic": round(balance - balance_fdi, 2),
            }
        )
    return series
