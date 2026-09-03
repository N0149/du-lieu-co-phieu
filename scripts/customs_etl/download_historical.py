"""
download_historical.py — Tự động tải dữ liệu thống kê Hải quan lịch sử (2020 - 2024).

Nguồn: API chính thức Cổng thông tin Tổng cục Hải quan (customs.gov.vn).
Dữ liệu lưu vào: scripts/customs_etl/data_raw
Chuẩn hóa tên file theo đúng quy ước của parser.py:
  - {year}-t{month}-{flow}.pdf                 (bảng chính tháng)
  - {year}-t{month}k{ky}-{flow}.pdf            (bảng kỳ 15 ngày)
  - {year}-t{month}-{flow}cuafdi.pdf           (khối FDI)
  - {year}-t{month}-{flow}chitiet.pdf          (chi tiết thị trường x mặt hàng)
  - {year}-t{month}-xnktheotinh.pdf            (theo tỉnh/thành)
  - {flow}theophuongthucvantai-Q{q}-{year}.pdf (theo phương thức vận tải)
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import ssl
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("customs_etl.downloader")


API_URL = "https://www.customs.gov.vn/bridge?url=/customs/api/tkhq/LayDanhSachMoiCongBoServlet&pageSize=1000&language=TIENG_VIET"
DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "data_raw"


def get_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_publication_catalog() -> list[dict]:
    """Lấy danh mục 1000 kỳ công bố mới nhất từ API Hải quan."""
    logger.info("Đang truy vấn danh mục công bố từ cổng Tổng cục Hải quan...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    req = urllib.request.Request(API_URL, headers=headers, method="GET")
    with urllib.request.urlopen(req, context=get_ssl_context(), timeout=20) as resp:
        content = resp.read().decode("utf-8")
        data = json.loads(content)
        items = data.get("data", [])
        logger.info("Lấy thành công %d bản ghi công bố.", len(items))
        return items


def title_to_canonical_filename(item: dict) -> tuple[str | None, int | None, str]:
    """
    Ánh xạ tiêu đề bài công bố TCHQ sang tên file chuẩn hóa cho parser.py.
    Trả về (filename, year, category).
    """
    title = item.get("tieuDe", "").strip()
    url = item.get("fileSoBo") or item.get("fileChinhThuc") or item.get("fileDieuChinh") or ""
    if not url:
        return None, None, "no_url"

    # 1. Vận tải (theo quý)
    m_vt = re.search(r"(xuất khẩu|nhập khẩu).*vận tải.*quý\s*([1-4])[/ -]*(\d{4})", title, re.IGNORECASE)
    if m_vt:
        flow = "xuatkhau" if "xuất" in m_vt.group(1).lower() else "nhapkhau"
        q = m_vt.group(2)
        y = int(m_vt.group(3))
        return f"{flow}theophuongthucvantai-Q{q}-{y}.pdf", y, "transport"

    # 2. Bỏ qua bài tái xuất thuần
    if "tái xuất" in title.lower():
        return None, None, "reexport"

    # 3. Dò năm, tháng, kỳ bán nguyệt
    # Dạng kỳ: "từ ngày 01/MM/YYYY đến hết ngày 15/MM/YYYY" -> K1; 16 -> K2
    m_range = re.search(r"từ ngày\s*(\d{1,2})/(\d{1,2})/(\d{4})", title, re.IGNORECASE)
    is_k1 = False
    is_k2 = False
    year = None
    month = None

    if m_range:
        day = int(m_range.group(1))
        month = int(m_range.group(2))
        year = int(m_range.group(3))
        if day <= 5:
            is_k1 = True
        else:
            is_k2 = True
    else:
        m_month = re.search(r"tháng\s*(\d{1,2})[/\s\-năm]+(\d{4})", title, re.IGNORECASE)
        if m_month:
            month = int(m_month.group(1))
            year = int(m_month.group(2))
        else:
            d_str = item.get("ngaySoBo") or item.get("ngayChinhThuc") or ""
            if "/" in d_str:
                parts = d_str.split("/")
                year = int(parts[-1])
                month = int(parts[-2])

    if not year or not month:
        return None, None, "unknown_date"

    low_title = title.lower()
    is_export = "xuất khẩu" in low_title
    flow_str = "xuatkhau" if is_export else "nhapkhau"

    if "tỉnh" in low_title or "thành phố" in low_title or "thànhphố" in low_title:
        return f"{year}-t{month}-xnktheotinh.pdf", year, "province"
    if "fdi" in low_title or ("nước ngoài" in low_title and "đầu tư" in low_title):
        return f"{year}-t{month}-{flow_str}cuafdi.pdf", year, "fdi"
    if "nước" in low_title or "lãnh thổ" in low_title or "thị trường" in low_title:
        return f"{year}-t{month}-{flow_str}chitiet.pdf", year, "matrix"
    if is_k1:
        return f"{year}-t{month}k1-{flow_str}.pdf", year, "ky_1"
    if is_k2:
        return f"{year}-t{month}k2-{flow_str}.pdf", year, "ky_2"

    return f"{year}-t{month}-{flow_str}.pdf", year, "main"


def get_best_file_url(item: dict) -> str | None:
    """Chọn URL file hợp lệ nhất, ưu tiên link công khai trên files.customs.gov.vn."""
    for key in ["fileSoBo", "fileChinhThuc", "fileDieuChinh"]:
        u = item.get(key)
        if u and "files.customs.gov.vn" in u and "CTTDT" not in u and "10.224.128.185" not in u:
            return u
    for key in ["fileSoBo", "fileChinhThuc", "fileDieuChinh"]:
        u = item.get(key)
        if u and not u.startswith("http://10.") and "CTTDT" not in u:
            return u
    return None


def download_file(url: str, dest_path: Path, max_retries: int = 3) -> bool:
    """Tải một file với retry và User-Agent an toàn."""
    if dest_path.exists() and dest_path.stat().st_size > 1024:
        return True  # Đã có file hợp lệ

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }
    # URL encode khoảng trắng nếu có (vd 'q4 nk.pdf' -> 'q4%20nk.pdf')
    url = url.replace(" ", "%20")

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=get_ssl_context(), timeout=25) as resp:
                data = resp.read()
                if len(data) < 100:
                    raise ValueError(f"File quá nhỏ ({len(data)} bytes), có thể là trang lỗi")
                dest_path.write_bytes(data)
                return True
        except Exception as err:
            if attempt == max_retries:
                logger.error("  [LỖI] Tải thất bại %s sau %d lần: %s", dest_path.name, max_retries, err)
                return False
            time.sleep(1.0 * attempt)
    return False


def run_download(
    from_year: int = 2020,
    to_year: int = 2024,
    dest_dir: Path = DEFAULT_DATA_DIR,
    dry_run: bool = False,
    delay: float = 0.3,
) -> tuple[int, int, int]:
    """
    Chạy quá trình tải dữ liệu lịch sử theo khoảng năm.
    Trả về (tổng_file_cần, đã_tải_thành_công, đã_bỏ_qua_vì_có_sẵn).
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    items = fetch_publication_catalog()

    # Lọc các file thuộc khoảng năm cần tải
    targets: list[tuple[str, str, int, str]] = []  # (url, filename, year, category)
    seen_files = set()

    for it in items:
        fname, y, cat = title_to_canonical_filename(it)
        if not fname or y is None:
            continue
        if from_year <= y <= to_year:
            url = get_best_file_url(it)
            if url and fname not in seen_files:
                seen_files.add(fname)
                targets.append((url, fname, y, cat))


    logger.info("Tìm thấy %d file thuộc giai đoạn %d - %d.", len(targets), from_year, to_year)

    if dry_run:
        print(f"\n[DRY RUN] Danh sách {len(targets)} file sẽ tải:")
        for url, fn, y, cat in targets:
            exists = (dest_dir / fn).exists()
            status = "ĐÃ CÓ SẴN" if exists else "SẼ TẢI"
            print(f"  [{status:11}] {fn:38} ({cat}) <- {url}")
        return len(targets), 0, 0

    downloaded = 0
    skipped = 0
    failed = 0

    print(f"\nBắt đầu tải {len(targets)} file về {dest_dir} (Năm {from_year} -> {to_year}):\n")

    for i, (url, fn, y, cat) in enumerate(targets, start=1):
        target_path = dest_dir / fn
        if target_path.exists() and target_path.stat().st_size > 1024:
            skipped += 1
            print(f"[{i:03d}/{len(targets):03d}] (Đã có) {fn}")
            continue

        print(f"[{i:03d}/{len(targets):03d}] Đang tải {fn} ...", end="", flush=True)
        ok = download_file(url, target_path)
        if ok:
            downloaded += 1
            print(f" XONG ({target_path.stat().st_size // 1024} KB)")
        else:
            failed += 1
            print(" THẤT BẠI")

        if delay > 0:
            time.sleep(delay)

    print(f"\n{'=' * 60}")
    print(f"TỔNG KẾT: Cần tải: {len(targets)} | Thành công mới: {downloaded} | Đã có sẵn: {skipped} | Thất bại: {failed}")
    print(f"Thư mục lưu trữ: {dest_dir}")
    print(f"{'=' * 60}\n")

    return len(targets), downloaded, skipped


def main():
    p = argparse.ArgumentParser(description="Tự động tải dữ liệu thống kê Hải quan lịch sử (2020 - 2024).")
    p.add_argument("--from-year", type=int, default=2020, help="Năm bắt đầu tải (mặc định 2020)")
    p.add_argument("--to-year", type=int, default=2024, help="Năm kết thúc tải (mặc định 2024)")
    p.add_argument("--dest-dir", type=str, default=str(DEFAULT_DATA_DIR), help="Thư mục lưu file")
    p.add_argument("--dry-run", action="store_true", help="Chỉ hiển thị danh sách file sẽ tải, không tải thật")
    p.add_argument("--delay", type=float, default=0.2, help="Độ trễ giữa các lượt tải (giây)")
    p.add_argument("-v", "--verbose", action="store_true", help="In log chi tiết")

    args = p.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    run_download(
        from_year=args.from_year,
        to_year=args.to_year,
        dest_dir=Path(args.dest_dir),
        dry_run=args.dry_run,
        delay=args.delay,
    )


if __name__ == "__main__":
    main()
