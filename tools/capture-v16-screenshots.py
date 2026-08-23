#!/usr/bin/env python3
"""Capture V17 QA screenshots when the real direct-file loader becomes hidden."""
from __future__ import annotations

from pathlib import Path
import shutil
import sys

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OUT = ROOT / "artifacts"


def main() -> int:
    chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        print("Chrome/Chromium executable not found on runner.", file=sys.stderr)
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    options = webdriver.ChromeOptions()
    options.binary_location = chrome
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--allow-file-access-from-files")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 25)
    try:
        # Desktop release-candidate view.
        driver.set_window_size(1440, 1100)
        driver.get(INDEX.as_uri())
        wait.until(lambda d: d.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        wait.until(lambda d: d.execute_script(
            "const e=document.getElementById('storyLoader'),s=getComputedStyle(e);"
            "return s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0;"
        ))
        driver.save_screenshot(str(OUT / "v17-desktop.png"))

        # Mobile view.
        driver.set_window_size(390, 844)
        wait.until(lambda d: d.execute_script("return innerWidth") <= 390)
        driver.save_screenshot(str(OUT / "v17-mobile.png"))

        # Reduced-motion mobile view.
        driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
        driver.refresh()
        wait.until(lambda d: d.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        wait.until(lambda d: d.execute_script(
            "const e=document.getElementById('storyLoader'),s=getComputedStyle(e);"
            "return s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0;"
        ))
        driver.save_screenshot(str(OUT / "v17-mobile-reduced-motion.png"))

        print(f"Saved V17 QA screenshots to {OUT}")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
