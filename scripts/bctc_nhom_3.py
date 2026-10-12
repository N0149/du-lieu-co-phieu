"""
Entrypoint chạy quét Nhóm 3: Những mã còn lại (STT 185 -> 278, Batch 09 -> Batch 12, từ 29 - 30/10)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bctc_monitor_115 import run_scan

if __name__ == "__main__":
    run_scan(group='3')
