import os
import sys
import json
import time
import socket
import datetime
import subprocess
from pathlib import Path

# Force UTF-8 stdout and stderr
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data" / "maritime"
LOGS_DIR = ROOT_DIR / "logs"
LOG_FILE = LOGS_DIR / "maritime_daily_sync.log"
STATE_FILE = DATA_DIR / ".last_cangbien_daily_sync.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

def log(msg: str):
    """Log to both stdout and rotating daily log file"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def wait_for_internet(timeout_seconds: int = 90) -> bool:
    """Wait for network connectivity when Windows turns on"""
    log("Đang kiểm tra kết nối Internet...")
    start_time = time.time()
    
    test_hosts = [
        ("8.8.8.8", 53),
        ("1.1.1.1", 53),
        ("github.com", 443),
        ("google.com", 80)
    ]
    
    while time.time() - start_time < timeout_seconds:
        for host, port in test_hosts:
            try:
                sock = socket.create_connection((host, port), timeout=3)
                sock.close()
                log(f"-> Kết nối Internet đã sẵn sàng (đáp ứng từ {host}:{port}).")
                return True
            except OSError:
                continue
        time.sleep(3)
        
    log("⚠️ Không thể kết nối Internet sau 90 giây. Sẽ thử lại ở lần khởi động sau.")
    return False

def should_run_today(force: bool = False) -> bool:
    """Ensure it runs ONLY ONCE A DAY unless forced"""
    if force:
        log("Cờ --force được kích hoạt: Bỏ qua kiểm tra thời gian và chạy ngay.")
        return True
        
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                state = json.load(f)
            last_date = state.get("last_date")
            last_run_at = state.get("last_run_at", "")
            if last_date == today_str and state.get("status") == "success":
                log(f"ℹ️ Dữ liệu cảng biển hôm nay ({today_str}) đã được cập nhật thành công lúc {last_run_at}.")
                log("👉 Quy tắc 1 ngày 1 lần: Bỏ qua lượt chạy này. Nếu muốn chạy lại hãy dùng --force.")
                return False
        except Exception as e:
            log(f"Chú ý khi đọc state file: {e}")
            
    return True

def record_success_state():
    """Save completion timestamp into state file"""
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    now_iso = datetime.datetime.now().isoformat()
    state = {
        "last_date": today_str,
        "last_run_at": now_iso,
        "status": "success",
        "updated_by": "maritime_daily_startup_worker"
    }
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Lỗi khi lưu state file: {e}")

def git_pull_rebase():
    """Sync latest commits from GitHub to prevent merge conflicts"""
    log("Đồng bộ mã nguồn từ GitHub (git pull --autostash --rebase origin main)...")
    try:
        res = subprocess.run(
            ["git", "pull", "--autostash", "--rebase", "origin", "main"],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=45
        )
        if res.returncode == 0:
            log("-> git pull thành công.")
        else:
            log(f"⚠️ git pull warning: {res.stderr.strip() or res.stdout.strip()}")
    except Exception as e:
        log(f"⚠️ Ngoại lệ khi git pull: {e}")

def git_commit_and_push():
    """Stage maritime data files, commit and push to GitHub for auto Vercel deployment"""
    log("Kiểm tra và đẩy dữ liệu cảng biển mới lên GitHub Repository...")
    maritime_targets = [
        "data/maritime/",
        "data/maritime.db",
        "scripts/cangbien/"
    ]
    
    try:
        # Stage target maritime files
        for target in maritime_targets:
            target_path = ROOT_DIR / target
            if target_path.exists():
                subprocess.run(["git", "add", "-f", target], cwd=str(ROOT_DIR), check=False)
                
        # Check if anything is staged
        diff_check = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=str(ROOT_DIR)
        )
        
        if diff_check.returncode == 0:
            log("ℹ️ Dữ liệu cảng biển không có thay đổi mới nào so với commit trước.")
            return
            
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        commit_msg = f"chore(cangbien): tu dong cap nhat du lieu cang bien ngay {today_str} [skip ci]"
        
        commit_res = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True
        )
        if commit_res.returncode != 0:
            log(f"⚠️ Lỗi commit git: {commit_res.stderr.strip()}")
            return
            
        log(f"✅ Đã commit dữ liệu: {commit_msg}")
        
        # Push to remote main
        push_res = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=60
        )
        if push_res.returncode == 0:
            log("🚀 ĐÃ PUSH THÀNH CÔNG DỮ LIỆU CẢNG BIỂN LÊN GITHUB (Vercel sẽ tự động build/revalidate)!")
        else:
            log(f"⚠️ git push kết thúc với thông báo: {push_res.stderr.strip() or push_res.stdout.strip()}")
    except Exception as e:
        log(f"⚠️ Lỗi khi commit/push git: {e}")

def main():
    force = "--force" in sys.argv
    skip_git = "--skip-git" in sys.argv
    
    log("=" * 60)
    log("BẮT ĐẦU TIẾN TRÌNH TỰ ĐỘNG CẬP NHẬT DỮ LIỆU CẢNG BIỂN HÀNG NGÀY")
    log("=" * 60)
    
    # 1. Kiểm tra quy tắc 1 lần 1 ngày
    if not should_run_today(force=force):
        sys.exit(0)
        
    # 2. Đợi kết nối mạng khi máy tính vừa bật
    if not wait_for_internet(timeout_seconds=90):
        log("Hủy tiến trình hôm nay do không có mạng.")
        sys.exit(1)
        
    # 3. Pull code mới nhất từ GitHub
    if not skip_git:
        git_pull_rebase()
        
    # 4. Kích hoạt pipeline cảng biển
    log("Đang thực thi Maritime Data Pipeline (run_pipeline.py)...")
    try:
        # Import and execute run_all
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from run_pipeline import run_all
        run_all()
        log("✅ Maritime Data Pipeline hoàn tất xuất sắc!")
    except Exception as e:
        log(f"❌ Lỗi khi thực thi pipeline cảng biển: {e}")
        sys.exit(1)
        
    # 5. Lưu trạng thái thành công của ngày hôm nay
    record_success_state()
    
    # 6. Commit và Push lên GitHub
    if not skip_git:
        git_commit_and_push()
        
    log("=" * 60)
    log("HOÀN TẤT ĐỒNG BỘ DỮ LIỆU CẢNG BIỂN CHO NGÀY HÔM NAY!")
    log("=" * 60)

if __name__ == "__main__":
    main()
