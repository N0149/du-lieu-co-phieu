import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r"data\maritime.db")
conn.row_factory = sqlite3.Row

print("=== DATABASE VERIFICATION REPORT ===")

# 1. Port Authorities
cursor = conn.execute("SELECT count(*) as cnt, sum(calls_30d) as total_calls, sum(dwt_30d) as total_dwt FROM port_authorities;")
r = cursor.fetchone()
print(f"1. Port Authorities: {r['cnt']} cảng vụ | Lượt tàu 30 ngày: {r['total_calls']:,} | DWT 30 ngày: {r['total_dwt']:,}")

# 2. Stocks
cursor = conn.execute("SELECT count(*) as cnt FROM stocks;")
print(f"2. Tracked Stocks: {cursor.fetchone()['cnt']} mã cổ phiếu niêm yết")

# 3. Berths
cursor = conn.execute("SELECT count(*) as cnt FROM berths;")
print(f"3. Berths mapped: {cursor.fetchone()['cnt']} cầu bến")

# 4. Vessels
cursor = conn.execute("SELECT count(*) as cnt FROM vessels;")
print(f"4. Vessels profiles: {cursor.fetchone()['cnt']} tàu")

# 5. Port Calls (Real Live Scraped)
cursor = conn.execute("SELECT source, count(*) as cnt, count(DISTINCT stock_ticker) as mapped_stocks FROM port_calls GROUP BY source;")
print("5. Live Port Calls by Source:")
for row in cursor.fetchall():
    print(f"   - Source '{row['source']}': {row['cnt']} lượt cập cảng (mapped vào {row['mapped_stocks']} mã CP)")

# 6. Sample Live Port Calls Mapped to Stocks
cursor = conn.execute("""
    SELECT vessel_name, authority_id, berth_name, stock_ticker, call_direction, scheduled_time, dwt, source
    FROM port_calls
    WHERE stock_ticker IS NOT NULL
    LIMIT 10;
""")
print("\n6. Sample Live Calls Mapped to Tickers:")
for row in cursor.fetchall():
    print(f"   [Ticker {row['stock_ticker']}] Tàu: {row['vessel_name']:<20} | Bến: {row['berth_name']:<20} | Hướng: {row['call_direction']:<5} | DWT: {row['dwt']:,} | Nguồn: {row['source']}")

conn.close()
