# ─────────────────────────────────────────────────────────────────────────────
# parser.py — Đọc & làm sạch dữ liệu thống kê XNK từ Excel/PDF thành DataFrame
#             chuẩn, áp dụng Master Mapping (mappings/*.json).
#
# Đầu vào : file .xlsx / .xls / .pdf trong data_raw/<period>/...
# Đầu ra  : list[ParsedRow] — các dòng sạch, sẵn sàng cho loader.py.
#
# Xử lý:
#   - Bỏ header dư thừa, dòng tổng cộng / dòng con.
#   - Nhận diện cột: STT, Tên mặt hàng/Thị trường, Đơn vị tính,
#     Lượng kỳ báo cáo, Trị giá kỳ báo cáo (USD), Lượng lũy kế, Trị giá lũy kế.
#   - Xử lý merged cell (forward-fill cột tên), lỗi encoding tiếng Việt,
#     format số dấu chấm/phẩy (1.234,56 / 1,234.56 / 1.234).
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

logger = logging.getLogger("customs_etl.parser")

# ── Hằng số ──────────────────────────────────────────────────────────────────
MAPPINGS_DIR = Path(__file__).resolve().parent / "mappings"
VALID_EXTENSIONS = {".xlsx", ".xls", ".pdf"}

# ── Phân loại tập dữ liệu từ tên file ──────────────────────────────────────
# Mỗi file báo cáo TCHQ thuộc 1 trong các "dataset category":
#   'main'      : bảng CHÍNH theo nhóm mặt hàng (vd 2026-t5-xuatkhau.pdf) → dùng cho
#                 cả Bảng dữ liệu lẫn Cán cân thương mại (cùng file 'cuafdi').
#   'fdi'       : chứa 'cuafdi' — khối doanh nghiệp có vốn FDI → Cán cân khối FDI.
#   'matrix'    : chứa 'chitiet' / 'nuochang' / 'nuocngoai' — ma trận Mặt hàng × Thị
#                 trường (mỗi ô tên 'NƯỚC\\nMặt hàng') → CHỈ vào Bảng dữ liệu.
#   'province'  : chứa 'theotinh' / 'xnktheotinh' — số liệu theo TỈNH/THÀNH PHỐ,
#                 file xnktheotinh bóc tách CẢ 2 chiều Xuất + Nhập → CHỈ vào Bảng.
#   'transport' : chứa 'theophuongthucvantai' — theo phương thức vận tải (Q1...) → CHỈ vào Bảng.
#
# ⚠️ CHỈ category 'main' + 'fdi' tham gia tính Cán cân thương mại (tránh ghi đè/trùng tổng).
CATEGORY_LABELS = {
    "main": "Tổng thể (theo mặt hàng)",
    "fdi": "Khối FDI",
    "matrix": "Chi tiết (Mặt hàng × Thị trường)",
    "province": "Theo Tỉnh/Thành",
    "transport": "Phương thức vận tải",
}


def detect_dataset_category(filename: str) -> str:
    """Phân loại tập dữ liệu từ tên file (xem CATEGORY_LABELS)."""
    n = filename.lower()
    if "theophuongthucvantai" in n:
        return "transport"
    if "theotinh" in n:
        return "province"
    if "cuafdi" in n:
        return "fdi"
    if any(k in n for k in ("chitiet", "nuochang", "nuocngoai")):
        return "matrix"
    return "main"


def is_fdi_file(filename: str) -> bool:
    """File khối FDI (dataset_category == 'fdi', tên chứa 'cuafdi')."""
    return detect_dataset_category(filename) == "fdi"


# Quy ước tên cột chuẩn sau khi map (canonical field name)
F_STT = "stt"
F_NAME = "name"
F_UNIT = "unit"
F_QTY_KY = "qty_ky"
F_VAL_KY = "val_ky"
F_QTY_ACC = "qty_acc"
F_VAL_ACC = "val_acc"

# Từ khóa nhận diện dòng tổng cộng (bỏ qua)
TOTAL_KEYWORDS = ["tong", "tong so", "tong cong", "cong", "grand total", "total", "tổng"]

# Cờ heuristic cho số "12.345" → 12345: chuẩn file VN dùng DẤU CHẤM = nghìn,
# DẤU PHẨY = thập phân. Nếu một file nào đó dùng chấm làm thập phân (kiểu Anh)
# và gặp sai lệch, đặt DOT_AS_THOUSAND = False.
DOT_AS_THOUSAND = True

# Năm mặc định khi tên file KHÔNG có năm (vd nhapkhautheophuongthucvantai-Q1.pdf)
# — trước tiên thử đọc năm từ nội dung file, fallback cuối cùng là năm này.
DEFAULT_YEAR = 2026

# Giá trị tối đa chấp nhận cho 1 ô số (USD / Lượng). Lớn hơn ngưỡng này coi là
# nhiễu do bóc cột sai (vd file ma trận từng cho trị giá 2e33 USD) → None.
MAX_PLAUSIBLE_VALUE = 1e15


# ── Cấu trúc dữ liệu ─────────────────────────────────────────────────────────
@dataclass
class ParsedRow:
    """Một dòng dữ liệu sạch sẵn sàng đưa vào DB."""

    period_type: str          # 'KY_1' | 'KY_2' | 'THANG'
    period_date: date         # ngày đầu kỳ
    trade_type: str           # 'EXPORT' | 'IMPORT'
    status: str               # 'SO_BO' | 'CHINH_THUC'
    dim_kind: str             # 'commodity' | 'country'
    name: str                 # tên đã chuẩn hóa (canonical)
    raw_name: str             # tên gốc trong file
    unit: str | None = None
    quantity: float | None = None        # Lượng kỳ báo cáo
    value_usd: float | None = None       # Trị giá kỳ báo cáo (USD)
    quantity_acc: float | None = None    # Lượng lũy kế
    value_acc: float | None = None       # Trị giá lũy kế (USD)
    code: str | None = None              # mã mặt hàng (commodity)
    category: str | None = None          # nhóm ngành (commodity)
    iso_code: str | None = None          # ISO 3166-1 alpha-3 (country)
    continent: str | None = None         # châu lục (country)
    source_file: str = ""
    dataset_category: str = "main"       # 'main' | 'fdi' | 'matrix' | 'province' | 'transport'

    def as_fact_tuple(self) -> dict[str, Any]:
        """Chuyển thành dict cho loader (chỉ chứa trường fact + key dim)."""
        return {
            "period_type": self.period_type,
            "period_date": self.period_date,
            "trade_type": self.trade_type,
            "status": self.status,
            "dim_kind": self.dim_kind,
            "name": self.name,
            "unit": self.unit,
            "quantity": self.quantity,
            "value_usd": self.value_usd,
            "quantity_acc": self.quantity_acc,
            "value_acc": self.value_acc,
            "code": self.code,
            "category": self.category,
            "iso_code": self.iso_code,
            "continent": self.continent,
            "dataset_category": self.dataset_category,
        }

    def to_dict(self) -> dict[str, Any]:
        """Serialize thành dict thuần (JSON-safe, period_date → chuỗi ISO) để xuất snapshot."""
        d = self.as_fact_tuple()
        d["period_date"] = self.period_date.isoformat()
        return d


@dataclass
class MappingEntry:
    canonical_name: str
    aliases: list[str] = field(default_factory=list)
    code: str | None = None
    category: str | None = None
    unit: str | None = None
    iso_code: str | None = None
    continent: str | None = None


# ── Chuẩn hóa chuỗi / số ─────────────────────────────────────────────────────
def normalize_key(text: str | None) -> str:
    """Chuẩn hóa chuỗi để so khớp: hạ thường, bỏ dấu tiếng Việt, gộp khoảng trắng."""
    if text is None:
        return ""
    s = unicodedata.normalize("NFD", str(text).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def clean_str(value: Any) -> str:
    """Chuyển ô dữ liệu về chuỗi sạch (None/NaN → ''), bỏ khoảng trắng thừa."""
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    s = str(value)
    # Xử lý encoding lỗi tiếng Việt dạng mojibake thường gặp ('Ã´' thay cho 'ô',...)
    s = _repair_mojibake(s)
    return re.sub(r"\s+", " ", s).strip()


def _repair_mojibake(text: str) -> str:
    """Sửa lỗi encoding tiếng Việt dạng UTF-8 bị đọc nhầm thành Latin-1."""
    # Chỉ áp dụng khi thấy dấu hiệu mojibake (các ký tự Ã, Â, Ä,...)
    if not re.search(r"[ÃÂÄÅÃ¡Ã¨Ã¬Ã²Ã¹]", text):
        return text
    try:
        fixed = text.encode("latin-1").decode("utf-8", errors="ignore")
        return fixed
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def parse_number(value: Any) -> float | None:
    """
    Chuyển ô dữ liệu số về float, hỗ trợ nhiều format:
      "1.234,56" → 1234.56 | "1,234.56" → 1234.56 | "12.345" → 12345
      "1234" → 1234 | "12.5" → 12.5 | "-" / "—" / "" → None
    Quy tắc dấu chấm: đúng 3 chữ số sau dấu chấm cuối → coi là phân tách nghìn
    (chuẩn file VN: "12.345" = mười hai nghìn ba trăm bốn lăm).
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = clean_str(value)
    if not s or s in {"-", "—", "–", "…", "..", ".", "n/a", "na", "null", "none", "không", "khong"}:
        return None

    # Chỉ giữ số, dấu phẩy, chấm, dấu trừ
    s = re.sub(r"[^\d.,\-]", "", s)
    if not s or s in {"-", ".", ","}:
        return None

    negative = s.startswith("-")
    s = s.lstrip("-")

    if "," in s and "." in s:
        # cả hai dấu → dấu xuất hiện sau cùng là dấu thập phân
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        parts = s.split(",")
        # 1 dấu phẩy + ≤2 chữ số sau + phần nguyên ngắn → dấu thập phân kiểu châu Âu
        if len(parts) == 2 and len(parts[1]) <= 2 and len(parts[0]) <= 3:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    else:
        parts = s.split(".")
        if len(parts) > 2:
            # nhiều dấu chấm → phân tách nghìn: 1.234.567 → 1234567
            s = s.replace(".", "")
        elif len(parts) == 2 and DOT_AS_THOUSAND:
            int_part, frac = parts
            # đúng 3 chữ số sau dấu chấm cuối → phân tách nghìn: 12.345 → 12345
            if len(frac) == 3 and len(int_part) > 0:
                s = int_part + frac

    try:
        v = float(s)
        return -v if negative else v
    except ValueError:
        return None


# ── Đọc mapping ──────────────────────────────────────────────────────────────
def load_mapping(filename: str) -> dict[str, MappingEntry]:
    """
    Đọc mappings/<filename>.json → dict[normalized_alias -> MappingEntry].
    Key đã normalize_key (bỏ dấu, hạ thường, gộp khoảng trắng) để so khớp nhanh.
    """
    path = MAPPINGS_DIR / filename
    if not path.exists():
        logger.warning("Không tìm thấy mapping %s — trả về mapping rỗng.", path)
        return {}

    data = json.loads(path.read_text(encoding="utf-8"))
    lookup: dict[str, MappingEntry] = {}
    key_field = "commodities" if "commodities" in data else "countries"

    for item in data.get(key_field, []):
        entry = MappingEntry(
            canonical_name=item["canonical_name"],
            aliases=[normalize_key(a) for a in item.get("aliases", [])],
            code=item.get("code"),
            category=item.get("category"),
            unit=item.get("unit"),
            iso_code=item.get("iso_code"),
            continent=item.get("continent"),
        )
        # Map cả tên chuẩn + tất cả alias
        keys = {normalize_key(entry.canonical_name), *entry.aliases}
        for k in keys:
            if k:
                lookup[k] = entry

    logger.info("Mapping %s: %d key.", filename, len(lookup))
    return lookup


def lookup_entity(normalized_name: str, mapping: dict[str, MappingEntry]) -> MappingEntry | None:
    """Tìm MappingEntry theo tên đã normalize; None nếu chưa có trong từ điển."""
    return mapping.get(normalized_name)


# ── Đọc file → các bảng thô ──────────────────────────────────────────────────
def read_excel_tables(path: Path) -> list[tuple[str, pd.DataFrame]]:
    """Đọc tất cả sheet trong file Excel (header=None để tự nhận diện)."""
    xl = pd.ExcelFile(path, engine="openpyxl")
    tables: list[tuple[str, pd.DataFrame]] = []
    for sheet in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet, header=None, dtype=object)
        tables.append((sheet, df))
    return tables


def read_pdf_tables(path: Path) -> list[tuple[str, pd.DataFrame]]:
    """Đọc bảng từ PDF bằng pdfplumber (từng trang)."""
    import pdfplumber  # import trễ để file không crash khi thiếu pdfplumber

    tables: list[tuple[str, pd.DataFrame]] = []
    with pdfplumber.open(path) as pdf:  # type: ignore[attr-defined]
        for page_no, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                rows = []
                for row in table:
                    # Mỗi ô PDF là list các dòng text → nối lại bằng space
                    cleaned = []
                    for cell in row:
                        if cell is None:
                            cleaned.append(None)
                        elif isinstance(cell, list):
                            cleaned.append(" ".join(str(x) for x in cell if x))
                        else:
                            cleaned.append(str(cell))
                    rows.append(cleaned)
                if rows:
                    tables.append((f"page{page_no}", pd.DataFrame(rows, dtype=object)))
    return tables


def load_tables(path: Path) -> list[tuple[str, pd.DataFrame]]:
    """Nạp bảng theo đuôi file. Raise ValueError nếu không hỗ trợ."""
    ext = path.suffix.lower()
    if ext in {".xlsx", ".xls"}:
        return read_excel_tables(path)
    if ext == ".pdf":
        return read_pdf_tables(path)
    raise ValueError(f"Không hỗ trợ định dạng {ext} — chỉ chấp nhận .xlsx/.xls/.pdf")


# ── Nhận diện header & cột ───────────────────────────────────────────────────
HEADER_HINT_KEYWORDS = [
    "stt", "so tt", "so thu tu",
    "mat hang", "hang hoa", "thi truong", "nuoc", "quoc gia", "ten",
    "don vi", "dvt",
    "luong", "tri gia", "gia tri", "usd", "luy ke", "cong don", "ky bao cao",
]

# Từ khóa nhận diện cột TÊN (mặt hàng / thị trường) — ưu tiên cao nhất
NAME_HINT_KEYWORDS = ["mat hang", "hang hoa", "thi truong", "quoc gia", "nuoc", "ten", "nhom"]


def _score_header_row(row: Iterable[Any]) -> int:
    """Chấm điểm mức độ 'là header chính' của 1 dòng.

    Ưu tiên dòng chứa cột TÊN (+3) rồi STT (+2), ĐVT (+2), các từ khóa khác (+1).
    Tránh chọn nhầm dòng header phụ (Lượng/Trị giá) vốn nhiều ô khớp từ khóa nhưng
    không có cột tên.
    """
    cells = [normalize_key(clean_str(c)) for c in row if clean_str(c)]
    score = 0
    for c in cells:
        if any(k in c for k in NAME_HINT_KEYWORDS):
            score += 3
        elif c == "stt" or "so tt" in c or "so thu tu" in c:
            score += 2
        elif "don vi" in c or c == "dvt":
            score += 2
        elif any(k in c for k in HEADER_HINT_KEYWORDS):
            score += 1
    return score


def find_header_row(df: pd.DataFrame, max_scan: int = 15) -> int:
    """Tìm dòng header chính (chứa cột tên + STT). Trả -1 nếu không tìm thấy."""
    best_idx, best_score = -1, 0
    limit = min(len(df), max_scan)
    for i in range(limit):
        score = _score_header_row(df.iloc[i])
        if score > best_score:
            best_score, best_idx = score, i
    return best_idx if best_score >= 2 else -1


def build_combined_header(df: pd.DataFrame, header_idx: int) -> tuple[list[str], list[str], int]:
    """Gộp header 2 tầng (nhóm + cột con do merged cell) thành 1 header phẳng.

    Ví dụ TCHQ:
      dòng 0: STT | Nhóm/Mặt hàng | ĐVT | Số trong tháng báo cáo | | Cộng dồn ... | |
      dòng 1:     |               |     | Lượng                | Trị giá (USD) | ...
    → gộp thành: STT | Nhóm/Mặt hàng | ĐVT | Số trong tháng báo cáo Lượng | ...

    Trả về (combined_header, group_filled, chỉ số dòng dữ liệu đầu tiên).
    group_filled = header nhóm đã forward-fill (giả lập merged cell trong Excel).
    """
    group = [clean_str(c) for c in df.iloc[header_idx].tolist()]

    # Forward-fill header nhóm khi merged cell (Excel/PdfPlumber chỉ điền vào ô đầu
    # của vùng gộp, các ô sau trống) — giúp cột con giữ được ngữ cảnh nhóm.
    group_filled = list(group)
    fill = ""
    for i, g in enumerate(group_filled):
        if g:
            fill = g
        else:
            group_filled[i] = fill

    if header_idx + 1 < len(df):
        sub = [clean_str(c) for c in df.iloc[header_idx + 1].tolist()]
        has_sub = any(
            classify_column(c) in (F_QTY_KY, F_VAL_KY, F_QTY_ACC, F_VAL_ACC)
            for c in sub
            if c
        )
        if has_sub:
            combined = [
                f"{g} {s}".strip() if (g and s) else (g or s)
                for g, s in zip(group_filled, sub)
            ]
            return combined, group_filled, header_idx + 2

    return group_filled, group_filled, header_idx + 1


def classify_column(header_text: str) -> str | None:
    """Phân loại 1 header cột → canonical field (F_STT/F_NAME/...). None nếu không rõ."""
    nt = normalize_key(header_text)
    if not nt:
        return None

    has_acc = any(k in nt for k in ["luy ke", "cong don", "luyke", "congdon"])
    if has_acc:
        if any(k in nt for k in ["luong", "san luong", "so luong"]):
            return F_QTY_ACC
        if any(k in nt for k in ["tri gia", "gia tri", "usd"]):
            return F_VAL_ACC
        return None
    if any(k in nt for k in ["luong ky", "luong", "san luong", "so luong"]):
        return F_QTY_KY
    if any(k in nt for k in ["tri gia", "gia tri", "usd"]):
        return F_VAL_KY
    if any(k in nt for k in ["so tt", "so thu tu", "stt"]) or nt in {"stt", "no"}:
        return F_STT
    if any(k in nt for k in ["don vi", "dvt"]):
        return F_UNIT
    if any(k in nt for k in ["mat hang", "hang hoa", "thi truong", "quoc gia", "nuoc", "ten", "nhom"]):
        return F_NAME
    return None


def map_columns(header_row: Iterable[Any]) -> dict[str, int]:
    """Map cột index → canonical field dựa trên nội dung header (mapper chung)."""
    col_map: dict[str, int] = {}
    for idx, raw in enumerate(header_row):
        field = classify_column(str(raw))
        if field and field not in col_map:
            col_map[field] = idx
    return col_map


def map_columns_tchq(combined: list[str], group_filled: list[str]) -> dict[str, int]:
    """Map cột theo chuẩn bảng TCHQ: số liệu luôn thành cặp (Lượng, Trị giá USD)
    đặt ngay sau cột ĐVT; nhóm (đã forward-fill) quyết định cặp đó thuộc kỳ hay
    lũy kế. Các cặp "so với tháng trước / cùng kỳ" (chứa % thay đổi) bị bỏ qua.
    """
    col_map: dict[str, int] = {}
    for idx, h in enumerate(combined):
        field = classify_column(h)
        if field in (F_STT, F_NAME, F_UNIT) and field not in col_map:
            col_map[field] = idx

    unit = col_map.get(F_UNIT)
    if unit is None:
        return col_map

    i = unit + 1
    while i + 1 < len(combined):
        g = normalize_key(group_filled[i] if i < len(group_filled) else "")
        if "cong don" in g or "luy ke" in g:
            col_map.setdefault(F_QTY_ACC, i)
            col_map.setdefault(F_VAL_ACC, i + 1)
        elif "bao cao" in g or "so trong" in g or "trong thang" in g or g == "ky":
            col_map.setdefault(F_QTY_KY, i)
            col_map.setdefault(F_VAL_KY, i + 1)
        # ngược lại: cặp "so với tháng trước / cùng kỳ" (% thay đổi) → bỏ qua
        i += 2
    return col_map


def _plausible(v: float | None) -> float | None:
    """Trả None nếu giá trị vượt ngưỡng hợp lý (nhiễu do bóc cột sai)."""
    if v is None:
        return None
    return v if abs(v) <= MAX_PLAUSIBLE_VALUE else None


# ── Lọc / làm sạch bảng ──────────────────────────────────────────────────────
def _is_total_row(name: str) -> bool:
    nt = normalize_key(name)
    return any(nt == kw or nt.startswith(kw) for kw in TOTAL_KEYWORDS)


def _is_sub_total_row(name: str) -> bool:
    """Dòng con 'Trong đó: ...' (vd 'Trong đó: Doanh nghiệp có vốn đầu tư trực tiếp
    nước ngoài') — là phần tách nhỏ của tổng, gây trùng lặp với file FDI riêng → bỏ qua."""
    return normalize_key(name).startswith("trong do")


def extract_rows(
    df: pd.DataFrame,
    first_data_row: int,
    col_map: dict[str, int],
) -> tuple[list[dict[str, Any]], dict[str, float | None]]:
    """Bóc các dòng dữ liệu sạch từ bảng (bỏ header, dòng con, dòng rỗng).

    Trả về (rows, totals):
      - rows  : các dòng mặt hàng/thị trường
      - totals: số liệu của dòng 'TỔNG TRỊ GIÁ' (qty_ky, val_ky, qty_acc, val_acc)
                dùng để tính cán cân thương mại theo kỳ (không đưa vào rows để
                tránh trùng lặp trong fact table).
    """
    rows: list[dict[str, Any]] = []
    totals: dict[str, float | None] = {
        "qty_ky": None, "val_ky": None, "qty_acc": None, "val_acc": None,
    }
    prev_name = ""

    def cell(row: pd.Series, field: str) -> Any:
        col = col_map.get(field)
        if col is None or col >= len(row):
            return None
        return row.iloc[col]

    for i in range(first_data_row, len(df)):
        row = df.iloc[i]
        raw_name = clean_str(cell(row, F_NAME))

        # Forward-fill tên cho merged cell (dòng con không lặp tên)
        if not raw_name:
            raw_name = prev_name
        else:
            prev_name = raw_name

        if not raw_name:
            continue
        if _is_total_row(raw_name):
            # Dòng TỔNG TRỊ GIÁ → chỉ giữ số liệu tổng (lấy trị tuyệt đối lớn nhất)
            for field in totals:
                v = _plausible(parse_number(cell(row, field)))
                if v is not None and (totals[field] is None or abs(v) > abs(totals[field])):
                    totals[field] = v
            continue
        if _is_sub_total_row(raw_name):
            continue

        rows.append(
            {
                "raw_name": raw_name,
                "unit": clean_str(cell(row, F_UNIT)) or None,
                "qty_ky": _plausible(parse_number(cell(row, F_QTY_KY))),
                "val_ky": _plausible(parse_number(cell(row, F_VAL_KY))),
                "qty_acc": _plausible(parse_number(cell(row, F_QTY_ACC))),
                "val_acc": _plausible(parse_number(cell(row, F_VAL_ACC))),
            }
        )
    return rows, totals


# ── Nhận diện loại báo cáo & kỳ ──────────────────────────────────────────────
def detect_report_type(name_header: str, sample_rows: Iterable[str]) -> str:
    """'commodity' nếu báo cáo theo mặt hàng, 'country' nếu theo thị trường."""
    text = " ".join(sample_rows[:5])
    n_header = normalize_key(name_header)
    if any(k in n_header for k in ["thi truong", "quoc gia", "nuoc", "bang thi truong"]):
        return "country"
    if any(k in text.lower() for k in ["thị trường", "thi truong", "quoc gia", "nuoc"]):
        return "country"
    return "commodity"


def detect_trade_type(*texts: str) -> str:
    """Nhận diện EXPORT/IMPORT từ tên file / sheet / nội dung.

    - Chứa 'xuatkhau' / 'xuat khau' / 'export' → EXPORT
    - Chứa 'nhapkhau' / 'nhap khau' / 'import' → IMPORT
    - Token riêng 'xk' / 'nk' (vd '2026-t5-xk.pdf') → EXPORT / IMPORT
      (chỉ khớp token đứng riêng, tránh nhầm 'xnktheotinh' chứa 'nk').
    """
    for t in texts:
        nt = normalize_key(t)
        if "xuat khau" in nt or "xuatkhau" in nt or "export" in nt:
            return "EXPORT"
        if "nhap khau" in nt or "nhapkhau" in nt or "import" in nt:
            return "IMPORT"
    tokens = set()
    for t in texts:
        tokens.update(normalize_key(t).split())
    if "xk" in tokens:
        return "EXPORT"
    if "nk" in tokens:
        return "IMPORT"
    logger.warning("Không nhận diện được loại hình XK/NK — mặc định EXPORT.")
    return "EXPORT"


def detect_status(*texts: str) -> str:
    """'CHINH_THUC' nếu có từ khóa chính thức, ngược lại 'SO_BO'."""
    for t in texts:
        nt = normalize_key(t)
        if "chinh thuc" in nt or "chính thức" in t:
            return "CHINH_THUC"
    return "SO_BO"


# ── Parse kỳ từ đường dẫn / tên file ─────────────────────────────────────────
# Hỗ trợ nhiều quy ước tên file (cấu trúc phẳng hoặc thư mục):
#   data_raw/2024_06_KY1/file.xlsx        → ('KY_1', 2024-06-01)
#   data_raw/2024_06_THANG/...            → ('THANG', 2024-06-01)
#   data_raw/2024_06/...                  → ('THANG', 2024-06-01)
#   2026-t7-nhapkhau.pdf                  → ('THANG', 2026-07-01)
#   2026-t5k1-nhapkhau.pdf                → ('KY_1', 2026-05-01)
#   2026-T8K1-xuatkhau.pdf                → ('KY_1', 2026-08-01)
#   nhapkhautheophuongthucvantai-Q1.pdf   → ('QUY', 2026-01-01) [năm lấy từ nội dung]
PERIOD_RE = re.compile(
    r"""(?:(?P<year>20\d{2})[\s\-_.]*)?
        (?:
            (?:t(?:h(?:ang|áng)?)?[\s\-_.]*)?
            (?P<month>\d{1,2})
            (?:[\s\-_.]*(?:k(?:y|ỳ)?[\s\-_.]*)?(?P<ky>[12]))?
            |
            q(?P<qtr>[1-4])
        )
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _year_from_content(path: str | Path) -> int | None:
    """Đọc năm (20xx) từ nội dung file khi tên file không có năm.

    PDF: scan text của 3 trang đầu (năm thường nằm ở tiêu đề ngoài bảng,
    vd 'QÚY I-NĂM 2026'); Excel: scan các ô bảng đầu tiên.
    """
    try:
        p = Path(path)
        if p.suffix.lower() == ".pdf":
            import pdfplumber  # import trễ

            with pdfplumber.open(p) as pdf:  # type: ignore[attr-defined]
                for page in pdf.pages[:3]:
                    m = re.search(r"20\d{2}", page.extract_text() or "")
                    if m:
                        return int(m.group(0))
        else:
            for _table_name, df in load_tables(p):
                for row in df.values.tolist()[:25]:
                    for cell in row:
                        m = re.search(r"20\d{2}", str(cell))
                        if m:
                            return int(m.group(0))
    except Exception:  # noqa: BLE001 — fallback không được chặn pipeline
        pass
    return None


def parse_period(path: str | Path) -> tuple[str, date]:
    """
    Từ đường dẫn thư mục/file trích ra (period_type, period_date).
    period_type ∈ {'KY_1', 'KY_2', 'THANG', 'QUY'}.
      data_raw/2024_06_KY1/file.xlsx  → ('KY_1', 2024-06-01)
      data_raw/2024_06_THANG/...      → ('THANG', 2024-06-01)
      data_raw/2024_06/...            → ('THANG', 2024-06-01)
      2026-t7-nhapkhau.pdf            → ('THANG', 2026-07-01)
      2026-t7k2-xuatkhau.pdf          → ('KY_2', 2026-07-01)
      nhapkhautheophuongthucvantai-Q1.pdf → ('QUY', 2026-01-01)
    """
    text = str(path)
    m = PERIOD_RE.search(text)
    if not m:
        raise ValueError(
            f"Không trích được kỳ/năm từ đường dẫn: {path}. "
            "Đặt file trong thư mục dạng data_raw/YYYY_MM_KY1/ hoặc tên "
            "dạng YYYY-t<tháng>[k<kỳ>] (vd 2026-t7k2-nhapkhau.pdf) / ...-Q<quý>."
        )

    # Năm: ưu tiên trong tên file, fallback đọc từ nội dung, cuối cùng DEFAULT_YEAR.
    if m.group("year"):
        year = int(m.group("year"))
    else:
        content_year = _year_from_content(path)
        if content_year is not None:
            year = content_year
        else:
            year = DEFAULT_YEAR
            logger.warning("Không tìm thấy năm trong tên/nội dung %s — dùng mặc định %d.",
                           path, year)

    if m.group("qtr"):
        q = int(m.group("qtr"))
        period_type = "QUY"
        period_date = date(year, q * 3 - 2, 1)  # Q1→01-01, Q2→04-01, Q3→07-01, Q4→10-01
        return period_type, period_date

    month = min(12, max(1, int(m.group("month"))))
    ky = (m.group("ky") or "").lower()

    if ky in {"1", "i"}:
        period_type = "KY_1"
    elif ky in {"2", "ii"}:
        period_type = "KY_2"
    else:
        period_type = "THANG"

    return period_type, date(year, month, 1)


# ── Parse 1 file → các ParsedRow ─────────────────────────────────────────────
def parse_province_rows(
    df: pd.DataFrame,
    period_type: str,
    period_date: date,
    status: str,
    source_file: str,
) -> list[ParsedRow]:
    """Bảng 'TỈNH/THÀNH PHỐ | XK tháng | XK lũy kế | NK tháng | NK lũy kế' (xnktheotinh).

    Header chiếm 2 dòng đầu, dữ liệu bắt đầu dòng 2. Mỗi tỉnh → 2 dòng:
    một EXPORT (lấy cột XK) và một IMPORT (lấy cột NK). Không tham gia Cán cân.
    """
    out: list[ParsedRow] = []
    data_start = 0
    for i in range(min(4, len(df))):
        joined = normalize_key(" ".join(clean_str(c) for c in df.iloc[i].tolist()))
        if any(k in joined for k in ("tinh thanh", "xuat khau", "nhap khau", "thang")):
            data_start = i + 1
        else:
            break

    prev_name = ""
    for i in range(data_start, len(df)):
        row = df.iloc[i]
        raw = clean_str(row.iloc[0])
        if not raw:
            raw = prev_name
        else:
            prev_name = raw
        if not raw or _is_total_row(raw) or _is_sub_total_row(raw):
            continue
        vals = [_plausible(parse_number(row.iloc[j])) for j in range(1, min(5, len(row)))]
        xk_ky = vals[0] if len(vals) > 0 else None
        xk_acc = vals[1] if len(vals) > 1 else None
        nk_ky = vals[2] if len(vals) > 2 else None
        nk_acc = vals[3] if len(vals) > 3 else None
        if xk_ky is None and xk_acc is None and nk_ky is None and nk_acc is None:
            continue

        base = dict(
            period_type=period_type,
            period_date=period_date,
            status=status,
            dim_kind="province",
            raw_name=raw,
            source_file=source_file,
            dataset_category="province",
        )
        out.append(ParsedRow(trade_type="EXPORT", name=raw, quantity=xk_ky, value_usd=xk_ky,
                             quantity_acc=xk_acc, value_acc=xk_acc, **base))
        out.append(ParsedRow(trade_type="IMPORT", name=raw, quantity=nk_ky, value_usd=nk_ky,
                             quantity_acc=nk_acc, value_acc=nk_acc, **base))
    return out


def _cell_lines(cell: Any) -> list[str]:
    """Tách ô PDF thành các dòng text (bỏ dòng rỗng), xử lý list và chuỗi có \\n."""
    if cell is None:
        return []
    if isinstance(cell, list):
        out: list[str] = []
        for x in cell:
            if x:
                for ln in str(x).split("\n"):
                    s = " ".join(ln.split())
                    if s:
                        out.append(s)
        return out
    return [s for s in (" ".join(ln.split()) for ln in str(cell).split("\n")) if s]


def parse_matrix_file(
    path: Path,
    period_type: str,
    period_date: date,
    trade_type: str,
    status: str,
    commodity_map: dict[str, MappingEntry],
    country_map: dict[str, MappingEntry],
) -> list[ParsedRow]:
    """Bóc ma trận 'Mặt hàng × Thị trường' (file *chitiet*).

    Mỗi ô tên có dạng 'NƯỚC\\nMặt hàng 1\\nMặt hàng 2...' và ô trị giá có dạng
    'v1\\nv2...' (1 giá trị / mặt hàng, căn theo dòng). Phát 1 ParsedRow per
    (nước, mặt hàng) với dim_kind='matrix', dataset_category='matrix'.
    Dòng chỉ có tên nước (không có mặt hàng) → 1 dòng tổng theo nước.
    """
    import pdfplumber  # import trễ

    out: list[ParsedRow] = []
    with pdfplumber.open(path) as pdf:  # type: ignore[attr-defined]
        for page in pdf.pages:
            for table in page.extract_tables():
                for raw in table:
                    name_lines = _cell_lines(raw[0] if raw else None)
                    if not name_lines:
                        continue
                    head = normalize_key(" ".join(name_lines))
                    if any(k in head for k in ("mat hang", "luong", "tri gia", "don vi")):
                        continue  # dòng header

                    country_raw = name_lines[0]
                    commodities = name_lines[1:]
                    country_entry = None
                    if country_raw:
                        country_entry = country_map.get(normalize_key(country_raw))

                    # Cột: 0=Nước/MH, 1=ĐVT, 2=Lượng tháng, 3=Trị giá tháng, 4=Lượng lũy kế, 5=Trị giá lũy kế
                    val_ky_lines = _cell_lines(raw[3]) if len(raw) > 3 else []
                    val_acc_lines = _cell_lines(raw[5]) if len(raw) > 5 else []
                    qty_ky_lines = _cell_lines(raw[2]) if len(raw) > 2 else []

                    def align(lines: list[str], vals: list[str]) -> list[tuple[str, str | None]]:
                        """Căn mặt hàng ↔ giá trị (số dòng có thể lệch 0/1 do subtotal nước)."""
                        if not lines:
                            return []
                        if len(vals) == len(lines):
                            return list(zip(lines, vals))
                        if len(vals) == len(lines) + 1:
                            return list(zip(lines, vals[1:]))
                        if len(vals) == len(lines) - 1:
                            return list(zip(lines[1:], vals))
                        if len(vals) == 1:
                            return [(lines[0], vals[0])]
                        return list(zip(lines, vals))

                    # Trường hợp chỉ có tên nước (tổng theo nước) — 1 dòng
                    if not commodities:
                        val = _plausible(parse_number(val_ky_lines[0] if val_ky_lines else None))
                        out.append(
                            ParsedRow(
                                period_type=period_type, period_date=period_date,
                                trade_type=trade_type, status=status,
                                dim_kind="matrix", name=country_raw, raw_name=country_raw,
                                value_usd=val,
                                value_acc=_plausible(parse_number(val_acc_lines[0] if val_acc_lines else None)),
                                iso_code=country_entry.iso_code if country_entry else None,
                                continent=country_entry.continent if country_entry else None,
                                source_file=path.name, dataset_category="matrix",
                            )
                        )
                        continue

                    pairs = align(commodities, val_ky_lines)
                    acc_pairs = dict(align(commodities, val_acc_lines))
                    for comm, val_str in pairs:
                        if not comm:
                            continue
                        ckey = normalize_key(comm)
                        centry = lookup_entity(ckey, commodity_map)
                        name = centry.canonical_name if centry else comm
                        out.append(
                            ParsedRow(
                                period_type=period_type, period_date=period_date,
                                trade_type=trade_type, status=status,
                                dim_kind="matrix", name=name, raw_name=f"{country_raw} - {comm}",
                                unit=centry.unit if centry else None,
                                value_usd=_plausible(parse_number(val_str)),
                                value_acc=_plausible(parse_number(acc_pairs.get(comm))),
                                code=centry.code if centry else None,
                                category=centry.category if centry else None,
                                iso_code=country_entry.iso_code if country_entry else None,
                                continent=country_entry.continent if country_entry else None,
                                source_file=path.name, dataset_category="matrix",
                            )
                        )
    return out


def parse_file(
    path: str | Path,
    commodity_map: dict[str, MappingEntry] | None = None,
    country_map: dict[str, MappingEntry] | None = None,
    *,
    trade_type_override: str | None = None,
    status_override: str | None = None,
    include_matrix: bool = False,
) -> tuple[list[ParsedRow], dict[str, float | None]]:
    """Parse toàn bộ file Excel/PDF → (các dòng chuẩn hóa, tổng trị giá của file).

    - File 'province' (xnktheotinh) → parse_province_rows (tách XK + NK), không totals.
    - File 'matrix' (chitiet/nuochang) → tách 'NƯỚC Mặt hàng' (dim_kind='matrix').
    - File 'transport' → dim_kind='transport'.
    - File 'main'/'fdi' → bảng mặt hàng chuẩn, giữ totals cho Cán cân thương mại.
    """
    path = Path(path)
    if commodity_map is None:
        commodity_map = load_mapping("commodities.json")
    if country_map is None:
        country_map = load_mapping("countries.json")

    period_type, period_date = parse_period(path)
    category = detect_dataset_category(path.name)
    # File 'province' (xnktheotinh) tự gán XK/NK cho từng dòng → không cần detect.
    if category == "province":
        trade_type = trade_type_override or "EXPORT"
    else:
        trade_type = trade_type_override or detect_trade_type(path.name)
    status = status_override or detect_status(path.name)

    out: list[ParsedRow] = []
    file_totals: dict[str, float | None] = {
        "qty_ky": None, "val_ky": None, "qty_acc": None, "val_acc": None,
    }
    # Chỉ file bảng CHÍNH + FDI tham gia tổng trị giá (Cán cân thương mại)
    keep_totals = category in ("main", "fdi")

    # File ma trận (chitiet): cấu trúc ô 'NƯỚC\nMặt hàng...' — dùng parser riêng
    # (giữ cấu trúc dòng), KHÔNG đi qua col_map thông thường.
    if category == "matrix" and path.suffix.lower() == ".pdf":
        if include_matrix:
            out = parse_matrix_file(path, period_type, period_date, trade_type, status,
                                    commodity_map, country_map)
        logger.info("File %s → %d dòng ma trận.", path.name, len(out))
        return out, file_totals

    tables = load_tables(path)

    for table_name, df in tables:
        # File theo tỉnh: cấu trúc 5 cột đặc biệt (XK + NK) — xử lý riêng.
        if category == "province":
            out.extend(parse_province_rows(df, period_type, period_date, status, path.name))
            continue

        header_idx = find_header_row(df)
        if header_idx < 0:
            logger.debug("  %s [%s]: không tìm thấy header — bỏ qua.", path.name, table_name)
            continue

        # Gộp header 2 tầng (nhóm + cột con) → header phẳng + group forward-fill
        combined_header, group_filled, first_data_row = build_combined_header(df, header_idx)
        col_map = map_columns_tchq(combined_header, group_filled)
        if F_NAME not in col_map:
            # Fallback: mapper chung (hỗ trợ file không theo chuẩn TCHQ)
            col_map = map_columns(combined_header)
        if F_NAME not in col_map:
            logger.debug("  %s [%s]: thiếu cột tên — bỏ qua.", path.name, table_name)
            continue

        name_header = clean_str(combined_header[col_map[F_NAME]])
        sample = [
            clean_str(df.iloc[i, col_map[F_NAME]])
            for i in range(first_data_row, min(len(df), first_data_row + 5))
        ]

        if category == "matrix":
            dim_kind = "matrix"
            mapping: dict[str, MappingEntry] | None = commodity_map
        elif category == "transport":
            dim_kind = "transport"
            mapping = commodity_map
        else:
            dim_kind = detect_report_type(name_header, sample)
            mapping = commodity_map if dim_kind == "commodity" else country_map

        raw_rows, table_totals = extract_rows(df, first_data_row, col_map)
        if keep_totals:
            for field in file_totals:
                if table_totals[field] is not None and (
                    file_totals[field] is None or abs(table_totals[field]) > abs(file_totals[field])
                ):
                    file_totals[field] = table_totals[field]
        logger.info("  %s [%s]: %d dòng (loại %s/%s).",
                    path.name, table_name, len(raw_rows), dim_kind, category)

        for r in raw_rows:
            key = normalize_key(r["raw_name"])
            entry = lookup_entity(key, mapping)
            if entry is None:
                logger.warning("  Chưa có mapping: %s (%s) — dùng tên gốc làm canonical.",
                               r["raw_name"], dim_kind)

            out.append(
                ParsedRow(
                    period_type=period_type,
                    period_date=period_date,
                    trade_type=trade_type,
                    status=status,
                    dim_kind=dim_kind,
                    name=entry.canonical_name if entry else r["raw_name"],
                    raw_name=r["raw_name"],
                    unit=r["unit"] or (entry.unit if entry else None),
                    quantity=r["qty_ky"],
                    value_usd=r["val_ky"],
                    quantity_acc=r["qty_acc"],
                    value_acc=r["val_acc"],
                    code=entry.code if entry else None,
                    category=entry.category if entry else None,
                    iso_code=entry.iso_code if entry else None,
                    continent=entry.continent if entry else None,
                    source_file=path.name,
                    dataset_category=category,
                )
            )

    logger.info("File %s → %d dòng (tổng %s, category=%s).",
                path.name, len(out), file_totals.get("val_ky"), category)
    return out, file_totals


# ── Parse toàn bộ thư mục ────────────────────────────────────────────────────
def parse_directory(
    data_dir: str | Path,
    commodity_map: dict[str, MappingEntry] | None = None,
    country_map: dict[str, MappingEntry] | None = None,
    *,
    include_matrix: bool = False,
) -> tuple[list[ParsedRow], dict[str, dict[str, float | None]]]:
    """Duyệt data_raw, parse mọi file .xlsx/.xls/.pdf.

    Trả về (all_rows, totals_by_file) với totals_by_file[filename] = {qty_ky, val_ky, ...}
    của dòng TỔNG TRỊ GIÁ (dùng để tính cán cân thương mại). File ma trận (chitiet)
    chỉ đưa vào all_rows khi include_matrix=True (mặc định tách riêng khỏi bảng chính).
    """
    data_dir = Path(data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(f"Thư mục dữ liệu không tồn tại: {data_dir}")

    if commodity_map is None:
        commodity_map = load_mapping("commodities.json")
    if country_map is None:
        country_map = load_mapping("countries.json")

    all_rows: list[ParsedRow] = []
    totals_by_file: dict[str, dict[str, float | None]] = {}
    files = [p for p in data_dir.rglob("*") if p.is_file() and p.suffix.lower() in VALID_EXTENSIONS]
    if not files:
        logger.warning("Không có file .xlsx/.xls/.pdf trong %s.", data_dir)
        return all_rows, totals_by_file

    for path in sorted(files):
        try:
            rows, totals = parse_file(path, commodity_map, country_map, include_matrix=include_matrix)
            all_rows.extend(rows)
            totals_by_file[path.name] = totals
        except Exception as exc:  # noqa: BLE001 — một file lỗi không chặn toàn pipeline
            logger.error("Lỗi parse %s: %s", path, exc)

    logger.info("Tổng cộng %d dòng từ %d file.", len(all_rows), len(files))
    return all_rows, totals_by_file


# ── Tiện ích CLI ─────────────────────────────────────────────────────────────
def load_all_mappings() -> tuple[dict[str, MappingEntry], dict[str, MappingEntry]]:
    return load_mapping("commodities.json"), load_mapping("countries.json")
