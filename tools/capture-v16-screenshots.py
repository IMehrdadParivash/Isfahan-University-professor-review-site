#!/usr/bin/env python3
"""Capture deterministic V16 QA screenshots from the direct file:// runtime."""
from __future__ import annotations

from pathlib import Path
import shutil
import sys
import time

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
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        time.sleep(3.4)  # let the story loader finish so the application itself is visible
        driver.save_screenshot(str(OUT / "v16-desktop.png"))

        # Mobile view.
        driver.set_window_size(390, 844)
        time.sleep(0.5)
        driver.save_screenshot(str(OUT / "v16-mobile.png"))

        # Reduced-motion mobile view.
        driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
        driver.refresh()
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        time.sleep(0.8)
        driver.save_screenshot(str(OUT / "v16-mobile-reduced-motion.png"))

        print(f"Saved V16 QA screenshots to {OUT}")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
