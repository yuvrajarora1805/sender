#!/usr/bin/env python3
"""
WhatsApp Auto Sender — Web UI Edition
Flask backend with embedded stealth WhatsApp engine.
Upload a CSV (phone, message), preview it, then send messages via WhatsApp Web.
"""

import os
import sys
import hashlib
import subprocess
import requests
import io
import csv
import json
import math
import time
import signal
import random
import threading
import urllib.parse
from datetime import datetime

import winreg  # Used to detect Chrome version on Windows

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

import webbrowser

from flask import Flask, request, jsonify, render_template, Response

# ═══════════════════════════════════════════
#  PYINSTALLER RESOURCE HELPER
# ═══════════════════════════════════════════

def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller."""
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath(os.path.dirname(__file__)), relative_path)

# ═══════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════

# Update this to your Next.js admin dashboard URL
API_BASE_URL = "https://wa.voreva.in/api" 
SESSION_FILE = resource_path("session.json")

# Portability: Save profile in the user's home folder to avoid C:\temp permission/stability issues
PROFILE_DIR = os.path.join(os.path.expanduser("~"), "whatsapp_sender_profile")
LOG_DIR     = os.path.join(os.path.expanduser("~"), "whatsapp_sender_logs")

WAIT_TIMEOUT = 120

# Rate limiting
MAX_SENDS_PER_HOUR  = 5000
MIN_DELAY_BETWEEN   = 0.2
MAX_DELAY_BETWEEN   = 0.8
LONG_BREAK_EVERY    = 2000
LONG_BREAK_DURATION = (1 * 60, 3 * 60)

# ═══════════════════════════════════════════
#  FLASK APP
# ═══════════════════════════════════════════

app = Flask(__name__,
            template_folder=resource_path("templates"),
            static_folder=resource_path("static"))

# ── Shared state ──
_state = {
    "csv_data": [],          # list of {"phone": ..., "message": ...}
    "sending": False,
    "shutdown": False,
    "driver": None,
    "thread": None,
    "session": {
        "username": "",
        "status": "unauthorized", # unauthorized | active | expired | error
        "plan": "None",
        "daily_limit": 0,
        "sent_today": 0,
        "expires_at": "",
        "message": ""
    },
    "progress": {
        "current": 0,
        "total": 0,
        "success": 0,
        "failed": 0,
        "status": "idle",    # idle | qr_wait | sending | paused | done | error
        "logs": [],          # list of {"row": i, "phone": ..., "ok": bool, "msg": ...}
    }
}
_state_lock = threading.Lock()

# SSE subscribers
_sse_clients = []


def _push_event(data: dict):
    """Push a JSON event to all SSE subscribers."""
    msg = f"data: {json.dumps(data)}\n\n"
    dead = []
    for q in _sse_clients:
        try:
            q.append(msg)
        except:
            dead.append(q)
    for d in dead:
        _sse_clients.remove(d)


def _log(msg, row=None, phone=None, ok=None):
    """Log a message and push to SSE."""
    ts = datetime.now().strftime("%H:%M:%S")
    full = f"[{ts}] {msg}"
    print(full)
    with _state_lock:
        entry = {
            "time": ts,
            "text": msg,
            "row": row,
            "phone": phone,
            "ok": ok,
        }
        _state["progress"]["logs"].append(entry)
        # Keep last 500 log entries
        if len(_state["progress"]["logs"]) > 500:
            _state["progress"]["logs"] = _state["progress"]["logs"][-500:]

    _push_event({
        "type": "log",
        "entry": entry,
        "progress": _get_progress_snapshot(),
    })


def _get_progress_snapshot():
    with _state_lock:
        return dict(_state["progress"])


def _update_progress(**kwargs):
    with _state_lock:
        _state["progress"].update(kwargs)
    _push_event({
        "type": "progress",
        "progress": _get_progress_snapshot(),
    })

# ═══════════════════════════════════════════
#  LICENSING HELPERS
# ═══════════════════════════════════════════

def get_hwid():
    """Generate a unique fingerprint for this machine."""
    cmd = 'wmic csproduct get uuid'
    try:
        uuid = subprocess.check_output(cmd, shell=True).decode().split('\n')[1].strip()
        if not uuid or uuid == "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF": # Common generic UUID
             # Fallback to MAC address
             from getmac import get_mac_address
             uuid = get_mac_address()
    except:
        uuid = "UNKNOWN_HWID"
    return hashlib.sha256(uuid.encode()).hexdigest()

def validate_session():
    """Check active session with server."""
    session = _load_session()
    if not session or not session.get("username"):
        return {"status": "unauthorized", "message": "Login required"}

    hwid = get_hwid()
    try:
        resp = requests.post(f"{API_BASE_URL}/validate", json={
            "username": session["username"],
            "hwid": hwid
        }, timeout=10)
        data = resp.json()
        
        if data.get("status") == "success":
            data["last_validated_at"] = datetime.now().isoformat()
            with _state_lock:
                _state["session"].update({
                    "username": data["username"],
                    "status": "active",
                    "plan": data["plan"],
                    "daily_limit": data["daily_limit"],
                    "sent_today": data["sent_today"],
                    "expires_at": data["expires_at"],
                    "message": "",
                    "last_validated_at": data["last_validated_at"]
                })
            _save_session(_state["session"])
            return data
        else:
            with _state_lock:
                 _state["session"].update({
                     "status": data.get("status", "error"),
                     "message": data.get("message", "Session invalid")
                 })
            return data
    except Exception as e:
        # ── OFFLINE GRACE MODE ──
        # If server is down, check if we had a successful validation within last 24h
        last_val = session.get("last_validated_at")
        if last_val:
            try:
                last_dt = datetime.fromisoformat(last_val)
                hours_since = (datetime.now() - last_dt).total_seconds() / 3600
                if hours_since < 24:
                    with _state_lock:
                        _state["session"].update(session)
                        _state["session"]["status"] = "active"
                        _state["session"]["message"] = "Offline Mode (Server unreachable)"
                    return _state["session"]
            except: pass
            
        return {"status": "error", "message": f"Server connection failed: {e}"}

def login_user(username, password):
    """Authenticate with server and bind HWID."""
    hwid = get_hwid()
    try:
        resp = requests.post(f"{API_BASE_URL}/login", json={
            "username": username,
            "password": password,
            "hwid": hwid
        }, timeout=10)
        data = resp.json()
        
        if data.get("status") == "success":
            data["last_validated_at"] = datetime.now().isoformat()
            with _state_lock:
                _state["session"].update({
                    "username": username,
                    "status": "active",
                    "plan": data["plan"],
                    "daily_limit": data["daily_limit"],
                    "sent_today": data["sent_today"],
                    "expires_at": data["expires_at"],
                    "message": "",
                    "last_validated_at": data["last_validated_at"]
                })
            _save_session(_state["session"])
            return data
        else:
            return data
    except Exception as e:
        return {"status": "error", "message": f"Login failed: {e}"}

def report_usage(count=1):
    """Report sent messages to server."""
    with _state_lock:
        username = _state["session"]["username"]
    if not username: return

    try:
        requests.post(f"{API_BASE_URL}/log-usage", json={
            "username": username,
            "hwid": get_hwid(),
            "count": count
        }, timeout=5)
    except:
        pass 

def _save_session(data):
    try:
        with open(SESSION_FILE, "w") as f:
            json.dump(data, f)
    except: pass

def _load_session():
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r") as f:
                return json.load(f)
        except: return None
    return None


@app.route("/")
def index():
    # Force session check on visit
    validate_session()
    return render_template("index.html", session=_state["session"])


@app.route("/hwid", methods=["GET"])
def hwid():
    return jsonify({"hwid": get_hwid()})


@app.route("/login", methods=["POST"])
def login():
    username = request.json.get("username")
    password = request.json.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    res = login_user(username, password)
    return jsonify(res)



@app.route("/upload", methods=["POST"])
def upload_csv():
    """Accept a CSV file with 'phone' and 'message' columns."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    f = request.files["file"]
    if not f.filename.endswith(".csv"):
        return jsonify({"error": "Only CSV files are accepted"}), 400

    try:
        stream = io.StringIO(f.stream.read().decode("utf-8-sig"))
        reader = csv.DictReader(stream)

        # Normalize column names
        if reader.fieldnames is None:
            return jsonify({"error": "Empty CSV file"}), 400

        cols = [c.strip().lower() for c in reader.fieldnames]
        if "phone" not in cols or "message" not in cols:
            return jsonify({
                "error": f"CSV must have 'phone' and 'message' columns. Found: {reader.fieldnames}"
            }), 400

        rows = []
        for r in reader:
            # Normalize keys
            norm = {k.strip().lower(): v.strip() for k, v in r.items()}
            phone = norm.get("phone", "").strip()
            message = norm.get("message", "").strip()
            if phone and message:
                # Remove any non-digit except leading +
                clean_phone = phone.lstrip("+")
                clean_phone = "".join(c for c in clean_phone if c.isdigit())
                if phone.startswith("+"):
                    clean_phone = "+" + clean_phone
                rows.append({"phone": clean_phone, "message": message})

        if not rows:
            return jsonify({"error": "No valid rows found in CSV"}), 400

        with _state_lock:
            _state["csv_data"] = rows
            _state["progress"] = {
                "current": 0,
                "total": len(rows),
                "success": 0,
                "failed": 0,
                "status": "idle",
                "logs": [],
            }

        return jsonify({"rows": rows, "count": len(rows)})

    except Exception as e:
        return jsonify({"error": f"Failed to parse CSV: {str(e)}"}), 400


@app.route("/start", methods=["POST"])
def start_sending():
    """Start sending messages in a background thread."""
    with _state_lock:
        if _state["sending"]:
            return jsonify({"error": "Already sending"}), 400
        if not _state["csv_data"]:
            return jsonify({"error": "No CSV data loaded"}), 400
        _state["sending"] = True
        _state["shutdown"] = False

    with _state_lock:
        if _state["session"]["status"] != "active":
            return jsonify({"error": f"Login required: {_state['session'].get('message', 'Inactive')}"}), 403
        if _state["session"]["sent_today"] >= _state["session"]["daily_limit"]:
            return jsonify({"error": "Daily limit reached. Please upgrade your plan."}), 403

    t = threading.Thread(target=_send_worker, daemon=True)
    with _state_lock:
        _state["thread"] = t
    t.start()

    return jsonify({"status": "started"})


@app.route("/stop", methods=["POST"])
def stop_sending():
    """Gracefully stop the sending loop."""
    with _state_lock:
        _state["shutdown"] = True
    _log("⏹ Stop requested by user")
    return jsonify({"status": "stopping"})


@app.route("/status")
def status_stream():
    """Server-Sent Events stream for real-time updates."""
    def stream():
        q = []
        _sse_clients.append(q)

        # Send initial state
        init = f"data: {json.dumps({'type': 'init', 'progress': _get_progress_snapshot()})}\n\n"
        yield init

        try:
            while True:
                while q:
                    yield q.pop(0)
                time.sleep(0.2)
        except GeneratorExit:
            if q in _sse_clients:
                _sse_clients.remove(q)

    return Response(stream(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ═══════════════════════════════════════════
#  WHATSAPP ENGINE (STEALTH)
# ═══════════════════════════════════════════

def _send_worker():
    """Background thread that drives the WhatsApp sending loop."""
    driver = None
    try:
        _update_progress(status="launching")
        _log("🚀 Launching stealth Chrome browser...")
        driver = _create_driver()

        with _state_lock:
            _state["driver"] = driver

        driver.get("https://web.whatsapp.com/")
        _update_progress(status="qr_wait")
        _log("📱 Waiting for WhatsApp Web to load (scan QR if needed)...")

        _wait_for_whatsapp(driver)
        _log("✅ WhatsApp Web is ready!")

        rows = _state["csv_data"]
        total = len(rows)
        _update_progress(status="sending", total=total, current=0)

        sends_this_hour = 0
        hour_start = time.time()
        sends_since_break = 0

        for i, row in enumerate(rows):
            if _state["shutdown"]:
                _log("⏹ Sending stopped by user.")
                break

            # ── Rate limiting ──
            if time.time() - hour_start >= 3600:
                sends_this_hour = 0
                hour_start = time.time()
                _log("🔄 Hourly counter reset")

            if sends_this_hour >= MAX_SENDS_PER_HOUR:
                wait_secs = 3600 - (time.time() - hour_start)
                _log(f"⏳ Hourly cap hit. Sleeping {wait_secs/60:.1f} min...")
                _update_progress(status="paused")
                _interruptible_sleep(wait_secs)
                sends_this_hour = 0
                hour_start = time.time()
                _update_progress(status="sending")

            if sends_since_break >= LONG_BREAK_EVERY:
                dur = random.randint(*LONG_BREAK_DURATION)
                _log(f"☕ Long break: {dur//60}m {dur%60}s")
                _update_progress(status="paused")
                _interruptible_sleep(dur)
                sends_since_break = 0
                _update_progress(status="sending")

            phone   = row["phone"]
            message = row["message"]
            _log(f"📤 [{i+1}/{total}] Sending to {phone}...", row=i+1, phone=phone)

            ok = _send_message(driver, phone, message)

            if ok:
                sends_this_hour += 1
                sends_since_break += 1
                with _state_lock:
                    _state["progress"]["success"] += 1
                    _state["session"]["sent_today"] += 1
                
                # Report to server
                report_usage(1)

                _log(f"✅ [{i+1}/{total}] Sent to {phone}", row=i+1, phone=phone, ok=True)
                
                # Check limit again
                with _state_lock:
                    if _state["session"]["sent_today"] >= _state["session"]["daily_limit"]:
                         _log("🛑 Daily limit reached! Stopping...")
                         _state["shutdown"] = True
            else:
                with _state_lock:
                    _state["progress"]["failed"] += 1
                _log(f"❌ [{i+1}/{total}] Failed for {phone}", row=i+1, phone=phone, ok=False)

            _update_progress(current=i+1)

            # ── Human-like delay ──
            if i < total - 1 and not _state["shutdown"]:
                delay = random.uniform(MIN_DELAY_BETWEEN, MAX_DELAY_BETWEEN)
                _simulate_idle(driver, duration=min(delay * 0.3, 3))
                _interruptible_sleep(delay - min(delay * 0.3, 3))
                _keep_session_alive(driver)

        status = "done" if not _state["shutdown"] else "stopped"
        _update_progress(status=status)
        _log(f"🏁 Finished. Success: {_state['progress']['success']}, Failed: {_state['progress']['failed']}")

    except Exception as e:
        _log(f"💥 Critical error: {e}")
        _update_progress(status="error")
    finally:
        with _state_lock:
            _state["sending"] = False
            _state["shutdown"] = False
        if driver:
            try:
                driver.quit()
            except:
                pass
            with _state_lock:
                _state["driver"] = None


import zipfile
import shutil

# Chrome for Testing v145 — always use this version for guaranteed compatibility
CHROME_V145_DIR = os.path.join(os.path.expanduser("~"), "whatsapp_sender_chrome")
CHROME_V145_EXE = os.path.join(CHROME_V145_DIR, "chrome-win64", "chrome.exe")

def _download_chrome_v145():
    """Download Chrome for Testing v145 if not already present."""
    if os.path.exists(CHROME_V145_EXE):
        _log(f"✅ Chrome v145 already installed")
        return CHROME_V145_EXE

    _log("📥 Downloading Chrome v145 (first-time setup, ~180MB)...")
    _log("⏳ This only happens once. Please wait...")

    os.makedirs(CHROME_V145_DIR, exist_ok=True)
    zip_path = os.path.join(CHROME_V145_DIR, "chrome-v145.zip")

    # Get the latest v145 URL from Chrome for Testing API
    try:
        api_url = "https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json"
        resp = requests.get(api_url, timeout=30)
        data = resp.json()
        milestone = data["milestones"]["145"]
        
        # Find win64 chrome download
        dl_url = None
        for d in milestone["downloads"]["chrome"]:
            if d["platform"] == "win64":
                dl_url = d["url"]
                break
        
        if not dl_url:
            raise Exception("No win64 download found for v145")
        
        _log(f"📥 Downloading from: {dl_url[:80]}...")
    except Exception as e:
        _log(f"⚠️ API lookup failed: {e}")
        # Fallback to a known-good v145 URL
        dl_url = "https://storage.googleapis.com/chrome-for-testing-public/145.0.7723.0/win64/chrome-win64.zip"
        _log(f"📥 Using fallback URL...")

    # Download the zip
    try:
        resp = requests.get(dl_url, stream=True, timeout=300)
        resp.raise_for_status()
        total = int(resp.headers.get('content-length', 0))
        downloaded = 0
        
        with open(zip_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = int(downloaded / total * 100)
                    if pct % 20 == 0:
                        _log(f"📥 Download: {pct}% ({downloaded // (1024*1024)}MB / {total // (1024*1024)}MB)")

        _log("📦 Extracting Chrome v145...")
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(CHROME_V145_DIR)
        
        # Clean up zip
        os.remove(zip_path)
        
        if os.path.exists(CHROME_V145_EXE):
            _log("✅ Chrome v145 installed successfully!")
            return CHROME_V145_EXE
        else:
            raise Exception(f"chrome.exe not found at {CHROME_V145_EXE}")
    except Exception as e:
        _log(f"❌ Download failed: {e}")
        # Clean up partial download
        if os.path.exists(zip_path):
            try: os.remove(zip_path)
            except: pass
        return None


def _cleanup_locks():
    """Remove Chrome lock files, clear uc cache, and kill zombie portable Chrome instances."""
    lock_file = os.path.join(PROFILE_DIR, "SingletonLock")
    if os.path.exists(lock_file):
        try:
            os.remove(lock_file)
            _log("🧹 Cleaned up stale browser lock file.")
        except:
            pass
            
    # Clear undetected_chromedriver cache to prevent corrupted driver issues
    uc_cache = os.path.join(os.environ.get('APPDATA', ''), 'undetected_chromedriver')
    if os.path.exists(uc_cache):
        try:
            shutil.rmtree(uc_cache, ignore_errors=True)
            _log("🧹 Cleaned up corrupted undetected_chromedriver cache.")
        except:
            pass
            
    # Kill any dangling chrome.exe from our portable folder
    try:
        subprocess.run(
            ['powershell', '-Command', 
             "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*whatsapp_sender_chrome*' } | Stop-Process -Force"],
            creationflags=subprocess.CREATE_NO_WINDOW,
            timeout=5
        )
    except:
        pass

# ── Driver creation ──

def _create_driver():
    _cleanup_locks()
    
    # Always download and use Chrome v145
    chrome_path = _download_chrome_v145()
    
    if not chrome_path:
        _log("⚠️ Chrome v145 download failed, trying system Chrome...")
        chrome_path = None
    
    # Try v145 first, then fallback
    versions_to_try = [145]
    if not chrome_path:
        versions_to_try.extend([146, None])
    versions_to_try.append(None)

    driver = None
    for v in versions_to_try:
        try:
            v_desc = f"v{v}" if v else "auto"
            _log(f"🚀 Launching driver with version {v_desc}...")
            
            # Options MUST be created fresh for every launch attempt
            opts = uc.ChromeOptions()
            opts.add_argument(f"--user-data-dir={PROFILE_DIR}")
            opts.add_argument("--start-maximized")
            opts.add_argument("--lang=en-US")
            
            # Hide "Chrome is being controlled by automated test software" & "Chrome for Testing..."
            opts.add_argument("--disable-infobars")
            
            # Additional stability flags
            opts.add_argument("--no-sandbox")
            opts.add_argument("--disable-dev-shm-usage")
            opts.add_argument("--disable-gpu")
            opts.add_argument("--disable-renderer-backgrounding")
            opts.add_argument("--disable-backgrounding-occluded-windows")
            opts.add_argument("--no-first-run")
            opts.add_argument("--no-default-browser-check")
            
            if v:
                driver = uc.Chrome(options=opts, version_main=v, browser_executable_path=chrome_path)
            else:
                driver = uc.Chrome(options=opts, browser_executable_path=chrome_path)
            
            _log(f"✅ Success with {v_desc}!")
            # Store the version that worked
            with _state_lock:
                _state["chrome_version"] = v or 145
            break
        except Exception as e:
            _log(f"⚠️ Failed with {v_desc}: {str(e)[:100]}...")
            if driver:
                try: driver.quit()
                except: pass
            _cleanup_locks() # Clean up any zombies from the failed attempt
            time.sleep(1)
            continue

    if not driver:
        # Self-healing: Delete potentially corrupted Chrome binaries so it redownloads next time
        if os.path.exists(CHROME_V145_DIR):
            _log("♻️ Launch failed completely. Deleting potentially corrupted Chrome v145 directory...")
            try:
                shutil.rmtree(CHROME_V145_DIR, ignore_errors=True)
            except:
                pass
        raise Exception("Chrome launch failed. Please check your internet connection and try again to download a fresh copy.")

    stealth_js = """
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US','en'] });
        const origQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (p) => (
            p.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : origQuery(p)
        );
        window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
    """
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": stealth_js})
    except Exception as e:
        _log(f"⚠️ CDP stealth injection failed: {e}")

    return driver


# ── Wait for WhatsApp ──

def _wait_for_whatsapp(driver):
    """Wait for WhatsApp Web to fully initialize by checking for key UI elements."""
    _log("⏳ Watching for WhatsApp UI to become ready...")
    
    start_time = time.time()
    last_log_time = start_time
    
    def _is_ready(d):
        nonlocal last_log_time
        now = time.time()
        
        # Log status every 10 seconds to keep user informed
        if now - last_log_time > 10:
            elapsed = int(now - start_time)
            _log(f"🕒 Still waiting... ({elapsed}s elapsed)")
            last_log_time = now
            
        try:
            # Check for the usual suspects
            indicators = [
                (By.XPATH, "//div[@contenteditable='true'][@data-tab='3']"),      # Search box
                (By.XPATH, "//header[@data-testid='chatlist-header']"),           # Side panel header
                (By.XPATH, "//canvas[@aria-label='Scan me!']"),                  # QR Code
                (By.XPATH, "//div[@id='pane-side']"),                            # Chat list pane
                (By.XPATH, "//div[@id='app']//div[contains(@class, 'two')]"),     # Main app structure
                (By.XPATH, "//div[@data-testid='intro-text']"),                  # Intro screen
                (By.XPATH, "//progress")                                          # Loading progress
            ]
            
            for by, path in indicators:
                if d.find_elements(by, path):
                    # If we found a progress bar, we're loading but not 'ready' per se
                    if path == "//progress":
                        return False
                    return True
            return False
        except:
            return False

    try:
        WebDriverWait(driver, WAIT_TIMEOUT).until(_is_ready)
        _log("✅ WhatsApp UI detected!")
        time.sleep(2.0)
    except TimeoutException:
        _log("❌ Timeout waiting for WhatsApp UI. The page might be blank or blocked.")
        raise Exception("WhatsApp UI detection timed out. Please check if the browser window is showing WhatsApp correctly.")


def _send_message(driver, phone, message):
    """
    Click 'New Chat' button → type phone number → Enter to open chat →
    type message → Enter to send.
    Full stealth: Bezier mouse movement, human typing, random pauses.
    """
    try:
        wait = WebDriverWait(driver, WAIT_TIMEOUT)

        # ── Step 1: Click the "New Chat" button ──
        _log(f"💬 Opening new chat for {phone}...")
        try:
            new_chat_btn = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//span[@data-icon='new-chat-outline']")
                )
            )
        except TimeoutException:
            _log(f"⚠️ New Chat button not found")
            return False

        # Move visual cursor to button
        _init_visual_cursor(driver)
        _move_visual_cursor(driver, new_chat_btn)
        time.sleep(0.3)
        _pulse_visual_cursor(driver)

        # Just use DOM click
        new_chat_btn.click()
        time.sleep(random.uniform(0.2, 0.5))

        # ── Step 2: Find the search box (v145 contenteditable div) ──
        _log(f"🔍 Typing number {phone}...")
        search_box = None
        for xpath in [
            "//div[@contenteditable='true'][@data-tab='3']",
            "//div[@contenteditable='true'][@role='textbox']",
        ]:
            try:
                search_box = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, xpath))
                )
                if search_box:
                    break
            except:
                continue

        if not search_box:
            _log(f"⚠️ Search box not found")
            return False

        # Move visual cursor to search box
        _move_visual_cursor(driver, search_box)
        time.sleep(0.2)
        _pulse_visual_cursor(driver)

        # Just use DOM click
        search_box.click()
        time.sleep(random.uniform(0.1, 0.3))

        search_box.send_keys(Keys.CONTROL + "a")
        search_box.send_keys(Keys.BACKSPACE)
        time.sleep(random.uniform(0.1, 0.3))

        _human_type(search_box, phone)
        time.sleep(random.uniform(0.1, 0.3))

        search_box.send_keys(Keys.ENTER)
        _log(f"⏎ Pressed Enter to open chat for {phone}")
        time.sleep(random.uniform(0.4, 0.8))

        # ── Step 3: Wait for the message input box ──
        msg_box = None
        for xpath in [
            "//div[@contenteditable='true'][@data-tab='10']",
            "//footer//div[@contenteditable='true']",
            "//div[@contenteditable='true'][@role='textbox']",
        ]:
            try:
                msg_box = WebDriverWait(driver, 15).until(
                    EC.element_to_be_clickable((By.XPATH, xpath))
                )
                if msg_box:
                    break
            except TimeoutException:
                continue

        if not msg_box:
            _log(f"⚠️ Message input not found for {phone} — chat may not have opened")
            time.sleep(0.5)
            return False

        # Move visual cursor to message box
        _move_visual_cursor(driver, msg_box)
        time.sleep(0.2)
        _pulse_visual_cursor(driver)

        # DOM click
        msg_box.click()
        time.sleep(random.uniform(0.2, 0.4))

        msg_box.send_keys(Keys.CONTROL + "a")
        msg_box.send_keys(Keys.BACKSPACE)
        time.sleep(random.uniform(0.1, 0.2))

        _human_type(msg_box, message)
        _log(f"⌨️ Typed message for {phone}")
        time.sleep(random.uniform(0.1, 0.3))

        # ── Step 5: Press Enter to send ──
        _pulse_visual_cursor(driver)
        msg_box.send_keys(Keys.ENTER)
        _log(f"⏎ Sent message to {phone}")
        
        # Hide cursor after send
        _move_visual_cursor(driver, None)
        time.sleep(random.uniform(0.3, 1.0))

        return True

    except Exception as e:
        _log(f"⚠️ Error sending to {phone}: {e}")
        return False


# ═══════════════════════════════════════════
#  STEALTH HELPERS
# ═══════════════════════════════════════════

# ═══════════════════════════════════════════
#  VISUAL STEALTH HELPERS (DOM CURSOR)
# ═══════════════════════════════════════════

def _init_visual_cursor(driver):
    """Injects a fake glowing cursor and a hyper-randomized movement engine."""
    script = """
    if (!document.getElementById('anti-cursor')) {
        const cursor = document.createElement('div');
        cursor.id = 'anti-cursor';
        cursor.style.cssText = `
            position: fixed;
            width: 18px;
            height: 18px;
            background: rgba(0, 255, 255, 0.35);
            border: 2px solid rgba(0, 255, 255, 0.8);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transition: opacity 0.3s ease, border-color 0.2s ease;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            opacity: 0;
            left: 0px;
            top: 0px;
        `;
        document.body.appendChild(cursor);
        window.antiCursorPos = { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight };
    }

    window.moveAntiCursor = function(targetX, targetY) {
        const cursor = document.getElementById('anti-cursor');
        if (!cursor) return;

        const startX = window.antiCursorPos.x;
        const startY = window.antiCursorPos.y;
        
        // Multi-point jitter control
        const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 400;
        const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 400;
        
        // Secondary "pull" point for extra curvature
        const midX2 = (midX + targetX) / 2 + (Math.random() - 0.5) * 200;
        const midY2 = (midY + targetY) / 2 + (Math.random() - 0.5) * 200;

        const duration = 500 + Math.random() * 400;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const rawT = Math.min(elapsed / duration, 1);
            
            // Human Easing: Non-linear, slightly "hesitant" speeds
            const t = rawT < 0.5 ? 2 * rawT * rawT : -1 + (4 - 2 * rawT) * rawT;
            
            // Cubic Bezier calculation
            const x = Math.pow(1 - t, 3) * startX + 
                      3 * Math.pow(1 - t, 2) * t * midX + 
                      3 * (1 - t) * Math.pow(t, 2) * midX2 + 
                      Math.pow(t, 3) * targetX;
                      
            const y = Math.pow(1 - t, 3) * startY + 
                      3 * Math.pow(1 - t, 2) * t * midY + 
                      3 * (1 - t) * Math.pow(t, 2) * midY2 + 
                      Math.pow(t, 3) * targetY;

            // Add "Micro-Jitter" (Hand tremor)
            const jitterX = (Math.random() - 0.5) * 2 * (1 - t);
            const jitterY = (Math.random() - 0.5) * 2 * (1 - t);

            cursor.style.left = (x + jitterX) + 'px';
            cursor.style.top = (y + jitterY) + 'px';
            cursor.style.opacity = '1';
            
            window.antiCursorPos = { x, y };

            if (rawT < 1) {
                requestAnimationFrame(animate);
            } else {
                // Landing wobble/settle
                cursor.style.transform = 'translate(-50%, -50%) scale(1.1)';
                setTimeout(() => {
                    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                }, 150);
            }
        }
        requestAnimationFrame(animate);
    };
    """
    try:
        driver.execute_script(script)
    except: pass

def _move_visual_cursor(driver, element=None):
    """Moves the visual cursor along a Bezier path to an element."""
    if element:
        try:
            # Get center coordinates in Python
            rect = element.rect
            target_x = rect['x'] + rect['width'] / 2
            target_y = rect['y'] + rect['height'] / 2
            
            # Call our JS engine
            driver.execute_script(f"window.moveAntiCursor({target_x}, {target_y});")
        except: pass
    else:
        try:
            driver.execute_script("document.getElementById('anti-cursor').style.opacity = '0';")
        except: pass

def _pulse_visual_cursor(driver):
    """Triggers a pulsing effect (for clicks/typing)."""
    script = """
    const cursor = document.getElementById('anti-cursor');
    if (cursor) {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
        cursor.style.background = 'rgba(0, 255, 255, 0.8)';
        setTimeout(() => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursor.style.background = 'rgba(0, 255, 255, 0.4)';
        }, 200);
    }
    """
    try:
        driver.execute_script(script)
    except: pass


# Removed _bezier_point and _human_move_to


def _human_type(element, text):
    driver = element.parent
    for ch in text:
        element.send_keys(ch)
        _pulse_visual_cursor(driver)
        delay = random.uniform(0.005, 0.02)
        if ch == ' ' and random.random() < 0.05:
            delay += random.uniform(0.02, 0.05)
        time.sleep(delay)


def _simulate_idle(driver, duration=None):
    if duration is None:
        duration = random.uniform(2, 8)
    end = time.time() + duration
    while time.time() < end and not _state["shutdown"]:
        time.sleep(random.uniform(0.5, 2.0))


def _keep_session_alive(driver):
    try:
        sidebar = driver.find_elements(By.XPATH, "//div[@id='pane-side']")
        if sidebar:
            driver.execute_script("arguments[0].scrollTop += 5;", sidebar[0])
            time.sleep(0.3)
            driver.execute_script("arguments[0].scrollTop -= 5;", sidebar[0])
    except:
        pass


def _interruptible_sleep(seconds):
    end = time.time() + seconds
    while time.time() < end and not _state["shutdown"]:
        time.sleep(min(1.0, end - time.time()))

# ═══════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("  WhatsApp Auto Sender — Web UI")
    print("  Opening http://localhost:5000 in your browser...")
    print("=" * 50)
    # Auto-open browser after a short delay
    threading.Timer(1.5, lambda: webbrowser.open("http://localhost:5000")).start()
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
