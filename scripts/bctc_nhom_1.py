"""
Entrypoint chạy quét Nhóm 1: 115 mã đầu tiên (STT 1 -> 115, Batch 01 -> Batch 05, từ 15 - 23/10)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bctc_monitor_115 import run_scan

if __name__ == "__main__":
    run_scan(group='1')
