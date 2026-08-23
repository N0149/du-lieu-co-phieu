# ─────────────────────────────────────────────────────────────────────────────
# crawler.py — Cào danh sách bài viết và tải file thống kê XNK từ web TCHQ
#
# Hướng dẫn:
#   - Cấu hình nguồn (index_url, từ khóa, phần mở rộng file...) nằm ở CRAWL_CONFIG
#     bên dưới. Nếu website đổi cấu trúc HTML, chỉ cần chỉnh các selector/keywords.
#   - Khi không thể tự cào (web chặn / đổi layout), người dùng có thể tải tay
#     các file .xlsx/.xls/.pdf vào `data_raw/YYYY_MM_KY1/` rồi chạy parse-and-load.
#
# Cơ chế chống chặn IP:
#   - Xoay vòng User-Agent ngẫu nhiên
#   - Retry theo hàm mũ (exponential backoff)
#   - Rate-limiting: delay ngẫu nhiên giữa các request (min_delay..max_delay)
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("customs_etl.crawler")

# ── Cấu hình mặc định (chỉnh sửa tại đây khi website đổi cấu trúc) ───────────
DEFAULT_CONFIG: dict[str, Any] = {
    "sources": [
        {
            "name": "TCHQ - Thống kê Hải quan",
            "index_url": "https://www.customs.gov.vn/index.jsp?pageId=1660",
            # Pattern href chứa link chi tiết bài viết (thường có pageId + id bài)
            "article_href_hints": ["index.jsp", "pageId", "news", "view"],
            "file_extensions": [".xlsx", ".xls", ".pdf"],
        },
        {
            "name": "TCHQ - tongcuchaiquan.gov.vn",
            "index_url": "https://tongcuchaiquan.gov.vn/",
            "article_href_hints": ["index.jsp", "pageId", "news", "view", "chi-tiet"],
            "file_extensions": [".xlsx", ".xls", ".pdf"],
        },
    ],
    # Từ khóa nhận diện bài viết công bố số liệu XNK định kỳ
    "keywords": [
        "xuất khẩu",
        "nhập khẩu",
        "xuat khau",
        "nhap khau",
        "thống kê",
        "thong ke",
        "sơ bộ",
        "so bo",
        "kỳ",
        "ky",
        "tháng",
        "thang",
        "tình hình xuất nhập khẩu",
    ],
    "user_agents": [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    ],
    "request_timeout": 30,
    "min_delay": 2.0,   # giây — delay tối thiểu giữa 2 request
    "max_delay": 5.0,   # giây — delay tối đa
    "max_retries": 3,
    "backoff_base": 2,  # backoff = backoff_base ^ attempt
    "max_articles_per_source": 200,  # giới hạn bài viết quét mỗi nguồn
}

# Định dạng tên thư mục lưu file: data_raw/{year}_{month:02d}_{ky}
#   ky = 'KY1' | 'KY2' | 'THANG'
OUTPUT_SUBDIR_FORMAT = "{year}_{month:02d}_{ky}"


# ── Dữ liệu trung gian ────────────────────────────────────────────────────────
@dataclass
class Article:
    title: str
    url: str
    year: int | None = None

    @property
    def is_relevant(self) -> bool:
        """Bài viết có khả năng chứa số liệu XNK định kỳ hay không."""
        return any(kw.lower() in self.title.lower() for kw in DEFAULT_CONFIG["keywords"])


@dataclass
class FileInfo:
    url: str
    filename: str
    source_url: str
    size_bytes: int | None = None


# ── Trình cào ────────────────────────────────────────────────────────────────
class CustomsCrawler:
    """Cào danh sách bài viết + tải file đính kèm thống kê XNK về data_raw/."""

    def __init__(self, config: dict[str, Any] | None = None, data_dir: str | Path = "data_raw") -> None:
        self.config: dict[str, Any] = {**DEFAULT_CONFIG, **(config or {})}
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({"Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"})

    # ── Tiện ích request ───────────────────────────────────────────────────
    def _random_headers(self) -> dict[str, str]:
        return {"User-Agent": random.choice(self.config["user_agents"])}

    def _delay(self) -> None:
        time.sleep(random.uniform(self.config["min_delay"], self.config["max_delay"]))

    def _get(self, url: str, *, retries: int | None = None) -> requests.Response:
        """GET với retry (backoff mũ) + xoay UA + delay. Trả response hoặc raise."""
        retries = self.config["max_retries"] if retries is None else retries
        last_err: Exception | None = None

        for attempt in range(1, retries + 1):
            try:
                self._delay()
                resp = self.session.get(
                    url,
                    headers=self._random_headers(),
                    timeout=self.config["request_timeout"],
                )
                resp.raise_for_status()
                return resp
            except requests.RequestException as exc:  # noqa: PERF203
                last_err = exc
                wait = (self.config["backoff_base"] ** attempt) + random.uniform(0, 0.5)
                logger.warning(
                    "Request thất bại %s (lần %d/%d): %s — thử lại sau %.1fs",
                    url, attempt, retries, exc, wait,
                )
                time.sleep(wait)

        raise requests.RequestException(f"Không tải được {url} sau {retries} lần: {last_err}")

    # ── Phát hiện link ─────────────────────────────────────────────────────
    @staticmethod
    def _abs_url(base: str, href: str) -> str | None:
        url = urljoin(base, href)
        if url.startswith(("http://", "https://")):
            return url
        return None

    @staticmethod
    def _href_has_extension(url: str, extensions: Iterable[str]) -> bool:
        path = urlparse(url).path.lower()
        return any(path.endswith(ext) for ext in extensions)

    def discover_articles(self, source: dict[str, Any], year: int) -> list[Article]:
        """Quét trang chỉ mục nguồn, trả về các bài viết liên quan thống kê XNK."""
        index_url = source["index_url"]
        hints = source.get("article_href_hints", [])
        articles: list[Article] = []

        try:
            resp = self._get(index_url)
        except requests.RequestException:
            logger.error("Bỏ qua nguồn %s (không truy cập được).", source["name"])
            return articles

        soup = BeautifulSoup(resp.text, "html.parser")

        for a in soup.find_all("a", href=True):
            href = a["href"]
            text = (a.get_text(strip=True) or "").strip()
            if not text:
                continue
            url = self._abs_url(index_url, href)
            if not url:
                continue
            is_article = any(h in url for h in hints) and not self._href_has_extension(
                url, source.get("file_extensions", [])
            )
            if not is_article:
                continue

            title = re.sub(r"\s+", " ", text)
            art = Article(title=title, url=url, year=_detect_year(title))
            # Chỉ giữ bài có khả năng liên quan + đúng năm cần backfill
            if art.is_relevant and art.year == year:
                articles.append(art)

        # Khử trùng lặp theo URL
        seen: set[str] = set()
        unique: list[Article] = []
        for a in articles:
            if a.url in seen:
                continue
            seen.add(a.url)
            unique.append(a)
        return unique[: self.config["max_articles_per_source"]]

    def discover_files(self, article: Article, extensions: list[str]) -> list[FileInfo]:
        """Từ trang chi tiết bài viết, lấy danh sách file đính kèm (.xlsx/.xls/.pdf)."""
        files: list[FileInfo] = []
        try:
            resp = self._get(article.url)
        except requests.RequestException:
            return files

        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            url = self._abs_url(article.url, href)
            if not url or not self._href_has_extension(url, extensions):
                continue
            filename = Path(urlparse(url).path).name or f"file_{len(files)}"
            if not _has_safe_extension(filename):
                continue
            files.append(FileInfo(url=url, filename=filename, source_url=article.url))
        return files

    # ── Tải file ───────────────────────────────────────────────────────────
    def download_file(self, file_info: FileInfo, dest_dir: Path) -> Path | None:
        """Tải file về dest_dir với retry. Trả đường dẫn nếu thành công, None nếu thất bại."""
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / _safe_filename(file_info.filename)

        if dest.exists() and dest.stat().st_size > 0:
            logger.info("Đã có file, bỏ qua: %s", dest.name)
            return dest

        try:
            resp = self._get(file_info.url)
            content = resp.content
            dest.write_bytes(content)
            file_info.size_bytes = len(content)
            logger.info("Đã tải: %s (%d bytes)", dest.name, len(content))
            return dest
        except requests.RequestException as exc:
            logger.error("Tải thất bại %s: %s", file_info.url, exc)
            return None

    # ── Pipeline chính ─────────────────────────────────────────────────────
    def crawl(self, from_year: int, to_year: int) -> list[FileInfo]:
        """Cào + tải file thống kê cho các năm từ from_year..to_year."""
        logger.info("Bắt đầu crawl %d → %d (%d nguồn)", from_year, to_year, len(self.config["sources"]))
        downloaded: list[FileInfo] = []
        extensions = sorted({e for s in self.config["sources"] for e in s.get("file_extensions", [])})

        for year in range(from_year, to_year + 1):
            logger.info("── Năm %d ──", year)
            for source in self.config["sources"]:
                articles = self.discover_articles(source, year)
                if not articles:
                    logger.info("  [%s] Không tìm thấy bài viết cho năm %d.", source["name"], year)
                    continue
                logger.info("  [%s] Tìm thấy %d bài viết năm %d.", source["name"], len(articles), year)

                for article in articles:
                    files = self.discover_files(article, extensions)
                    if not files:
                        continue
                    # Xác định kỳ/tháng từ tiêu đề bài viết để chọn thư mục đích
                    ky = _detect_ky(article.title)
                    subdir = self.data_dir / OUTPUT_SUBDIR_FORMAT.format(year=year, month=_detect_month(article.title, year), ky=ky)
                    logger.info("  Bài '%s' → %d file, lưu vào %s", article.title[:60], len(files), subdir.name)
                    for f in files:
                        if self.download_file(f, subdir):
                            downloaded.append(f)

        logger.info("Hoàn tất crawl: %d file đã tải.", len(downloaded))
        return downloaded


# ── Hàm phụ trợ (chuẩn hóa tên file, dò năm/tháng/kỳ) ────────────────────────
def _safe_filename(name: str) -> str:
    name = Path(name).name
    name = re.sub(r'[\\/:*?"<>|]+', "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name or "unknown_file"


def _has_safe_extension(name: str) -> bool:
    return Path(name).suffix.lower() in {".xlsx", ".xls", ".pdf"}


def _detect_year(text: str) -> int | None:
    """Tìm năm 4 chữ số trong đoạn text (vd '2024', '2023')."""
    for m in re.finditer(r"(?<!\d)(20\d{2})(?!\d)", text):
        y = int(m.group(1))
        if 2000 <= y <= 2100:
            return y
    return None


def _detect_month(text: str, fallback_year: int) -> int:
    """Tìm tháng 1-12 trong text (kèm từ khóa tháng/kỳ), fallback 1."""
    m = re.search(r"(?:tháng|thang|ky|kỳ|t)\s*(\d{1,2})\b", text, re.IGNORECASE)
    if m:
        month = int(m.group(1))
        if 1 <= month <= 12:
            return month
    return 1


def _detect_ky(text: str) -> str:
    """Nhận diện kỳ báo cáo từ tiêu đề: KY1 / KY2 / THANG."""
    low = text.lower()
    if re.search(r"\b(ky|kỳ)\s*1\b|ky1", low):
        return "KY1"
    if re.search(r"\b(ky|kỳ)\s*2\b|ky2", low):
        return "KY2"
    return "THANG"


# ── Entry point cho CLI ───────────────────────────────────────────────────────
def run_crawl(from_year: int, to_year: int, data_dir: str | Path = "data_raw") -> list[FileInfo]:
    crawler = CustomsCrawler(data_dir=data_dir)
    return crawler.crawl(from_year=from_year, to_year=to_year)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    run_crawl(from_year=2024, to_year=2024)
