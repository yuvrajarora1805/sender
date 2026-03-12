import os
import time
import requests
import zipfile
import undetected_chromedriver as uc

CHROME_V145_DIR = os.path.join(os.path.expanduser("~"), "whatsapp_sender_chrome")
CHROME_V145_EXE = os.path.join(CHROME_V145_DIR, "chrome-win64", "chrome.exe")
PROFILE_DIR = os.path.join(os.path.expanduser("~"), "whatsapp_sender_profile")

def _download_chrome_v145():
    if os.path.exists(CHROME_V145_EXE):
        print("✅ Chrome v145 already installed")
        return CHROME_V145_EXE

    print("📥 Downloading Chrome v145 (~180MB)...")
    os.makedirs(CHROME_V145_DIR, exist_ok=True)
    zip_path = os.path.join(CHROME_V145_DIR, "chrome-v145.zip")

    try:
        dl_url = "https://storage.googleapis.com/chrome-for-testing-public/145.0.7723.0/win64/chrome-win64.zip"
        
        resp = requests.get(dl_url, stream=True, timeout=300)
        resp.raise_for_status()
        total = int(resp.headers.get('content-length', 0))
        downloaded = 0
        
        with open(zip_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = int(downloaded / total * 100)
                    if pct % 20 == 0:
                        print(f"📥 Download: {pct}%")

        print("📦 Extracting Chrome v145...")
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(CHROME_V145_DIR)
        
        os.remove(zip_path)
        return CHROME_V145_EXE
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return None

print("==========================================")
print("   CHROME DRIVER STANDALONE TEST SCRIPT")
print("==========================================")

_download_chrome_v145()

if not os.path.exists(CHROME_V145_EXE):
    print("\n❌ Chrome v145 binary not found!")
    exit(1)

print("✅ Chrome binary found.")
print("\n🚀 Instantiating ChromeOptions...")

opts = uc.ChromeOptions()
opts.add_argument(f"--user-data-dir={PROFILE_DIR}")
opts.add_argument("--start-maximized")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--no-first-run")
opts.add_argument("--no-default-browser-check")

print("🚀 Launching UC Driver (version_main=145)...")
try:
    driver = uc.Chrome(
        options=opts, 
        version_main=145, 
        browser_executable_path=CHROME_V145_EXE
    )
    print("\n✅ SUCCESS! Driver successfully launched and connected to Chrome v145.")
    
    print("\n🌍 Opening Google to verify navigation...")
    driver.get("https://www.google.com")
    time.sleep(3)
    
    print("👋 Test complete. Closing browser.")
    driver.quit()
    print("✅ Clean shutdown.")
    
except Exception as e:
    print(f"\n❌ FAILED to launch or connect to Chrome:")
    print(f"   {e}")
