"""
Entrypoint chạy quét Nhóm 2: Từ mã 116 đến 184 (STT 116 -> 184, Batch 06 -> Batch 08, từ 23 - 29/10)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bctc_monitor_115 import run_scan

if __name__ == "__main__":
    run_scan(group='2')
