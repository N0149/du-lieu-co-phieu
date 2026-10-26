"""
Module chống chặn IP & Anti-Scraping WAF đa tầng cho Stock Radar Bot
Bảo vệ IP trước Vietstock, FPTS EzIR, và Website các doanh nghiệp:
- Xoay tua User-Agent hiện đại (Chrome 131, Edge 131, Firefox 133, Safari 18)
- Header giả lập trình duyệt máy tính đầy đủ (Sec-Ch-Ua, Accept-Language, Sec-Fetch-*)
- Circuit Breaker (Cầu dao tự ngắt): Nếu 1 nguồn bị lỗi/timeout 3 lần liên tiếp, tự động ngắt kết nối nguồn đó trong 20 phút để tránh bị Firewall chặn IP vĩnh viễn
- Rate Limiter & Jitter: Giãn cách và ngẫu nhiên hóa thời gian gửi request giữa các luồng
- Giải nén tự động gzip/deflate
"""

import os
import sys
import time
import random
import gzip
import io
import threading
import urllib.request
import urllib.parse
import urllib.error

USER_AGENTS = [
    # Chrome 131 Win11
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    # Chrome 130 Win10
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    # Edge 131 Win11
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    # Firefox 133 Win11
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    # Safari 18 macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
]

def get_browser_headers(referer=None, is_api=False, custom_headers=None):
    """Tạo bộ HTTP Headers chuẩn xác giống 100% trình duyệt Chrome / Edge thật trên máy tính"""
    ua = random.choice(USER_AGENTS)
    headers = {
        'User-Agent': ua,
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
    }

    if is_api:
        headers['Accept'] = 'application/json, text/plain, */*'
        headers['Sec-Fetch-Dest'] = 'empty'
        headers['Sec-Fetch-Mode'] = 'cors'
        headers['Sec-Fetch-Site'] = 'same-site'
    else:
        headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        headers['Sec-Fetch-Dest'] = 'document'
        headers['Sec-Fetch-Mode'] = 'navigate'
        headers['Sec-Fetch-Site'] = 'none'
        headers['Sec-Fetch-User'] = '?1'
        headers['Upgrade-Insecure-Requests'] = '1'

    if referer:
        headers['Referer'] = referer

    if custom_headers:
        headers.update(custom_headers)

    return headers

class RateLimiter:
    """Điều phối giãn cách giữa các requests (Throttling / Jitter) để không tạo xung đột đột biến traffic (bursts)"""
    def __init__(self, min_interval=0.35, max_jitter=0.3):
        self.min_interval = min_interval
        self.max_jitter = max_jitter
        self.last_call_time = 0.0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_call_time
            delay = self.min_interval + random.uniform(0.0, self.max_jitter)
            if elapsed < delay:
                time.sleep(delay - elapsed)
            self.last_call_time = time.time()

class CircuitBreaker:
    """
    Cầu dao tự ngắt bảo vệ IP (Circuit Breaker):
    - Đếm số lần lỗi liên tiếp (timeout, 403, 429, connection refused).
    - Khi đạt ngưỡng (mặc định 3 lần): Tự động 'sập cầu dao' (trạng thái OPEN).
    - Khi OPEN: Mọi request tiếp theo đến nguồn này đều BỎ QUA NGAY LẬP TỨC trong khoảng thời gian cooldown (ví dụ 20 phút),
      không gửi thêm bất kỳ gói tin nào tới server để bảo vệ IP không bị đưa vào danh sách đen (Blacklist).
    - Hết thời gian cooldown: Cho phép 1 request thăm dò (HALF_OPEN). Nếu thành công -> hồi phục hoàn toàn (CLOSED).
    """
    def __init__(self, name="Source", max_consecutive_failures=3, cooldown_seconds=1200):
        self.name = name
        self.max_failures = max_consecutive_failures
        self.cooldown = cooldown_seconds
        self.failures = 0
        self.state = "CLOSED" # "CLOSED", "OPEN", "HALF_OPEN"
        self.tripped_time = 0.0
        self.lock = threading.Lock()

    def can_request(self):
        with self.lock:
            now = time.time()
            if self.state == "OPEN":
                if now - self.tripped_time >= self.cooldown:
                    self.state = "HALF_OPEN"
                    return True
                return False
            return True

    def record_success(self):
        with self.lock:
            self.failures = 0
            self.state = "CLOSED"

    def record_failure(self, err=""):
        with self.lock:
            self.failures += 1
            if self.failures >= self.max_failures:
                self.state = "OPEN"
                self.tripped_time = time.time()
                cooldown_min = self.cooldown // 60
                print(
                    f"\n[CIRCUIT-BREAKER] ⚠️ [{self.name}] đã gặp {self.failures} lỗi liên tiếp ({err}). "
                    f"KÍCH HOẠT CHẾ ĐỘ BẢO VỆ IP: Tạm dừng gửi request tới {self.name} trong {cooldown_min} phút "
                    f"để phòng tránh bị Firewall/WAF chặn IP vĩnh viễn!\n",
                    flush=True
                )

    def get_status_str(self):
        with self.lock:
            if self.state == "CLOSED":
                return "🟢 Khỏe mạnh"
            elif self.state == "HALF_OPEN":
                return "🟡 Đang thử kết nối lại..."
            else:
                remaining_sec = max(0, int(self.cooldown - (time.time() - self.tripped_time)))
                rem_m = remaining_sec // 60
                rem_s = remaining_sec % 60
                return f"🔴 Tạm ngắt bảo vệ IP (còn {rem_m}m{rem_s}s)"

# Khởi tạo các bộ điều khiển chuyên biệt cho từng nguồn dữ liệu
FPTS_BREAKER = CircuitBreaker("FPTS EzIR", max_consecutive_failures=3, cooldown_seconds=1200)
VIETSTOCK_BREAKER = CircuitBreaker("Vietstock", max_consecutive_failures=4, cooldown_seconds=600)

FPTS_LIMITER = RateLimiter(min_interval=0.4, max_jitter=0.3)      # 0.4s - 0.7s giữa các request FPTS
VIETSTOCK_LIMITER = RateLimiter(min_interval=0.2, max_jitter=0.25) # 0.2s - 0.45s giữa các request Vietstock

def safe_read_response(resp):
    """Đọc dữ liệu phản hồi và tự động giải nén gzip/deflate nếu có"""
    data = resp.read()
    encoding = resp.headers.get('Content-Encoding', '').lower()
    if 'gzip' in encoding:
        try:
            return gzip.decompress(data)
        except:
            return data
    elif 'deflate' in encoding:
        try:
            import zlib
            return zlib.decompress(data)
        except:
            return data
    return data
