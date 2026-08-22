#!/usr/bin/env python3
"""Regression checks for the August 2026 UI hotfix."""
from pathlib import Path
import shutil
import sys
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        print("Chrome/Chromium executable not found", file=sys.stderr)
        return 2

    options = webdriver.ChromeOptions()
    options.binary_location = chrome
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--allow-file-access-from-files")
    options.add_argument("--window-size=1440,1200")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 25)
    try:
        driver.get(INDEX.as_uri())
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        wait.until(lambda d: d.find_elements(By.ID, "professorScoutMascot"))

        # Full filter panel must not stay pinned over the results while scrolling.
        filter_position = driver.execute_script("return getComputedStyle(document.querySelector('.filters-wrap')).position")
        require(filter_position != "sticky", f"filter panel is still sticky: {filter_position}")
        driver.execute_script("document.documentElement.style.scrollBehavior='auto'; document.querySelectorAll('#cards .card')[10].scrollIntoView({block:'start'});")
        time.sleep(0.1)
        filter_rect = driver.execute_script("const r=document.querySelector('.filters-wrap').getBoundingClientRect(); return {top:r.top,bottom:r.bottom};")
        require(filter_rect["bottom"] < 0, f"filter panel still obstructs scrolled content: {filter_rect}")

        # Light mode should use opaque surfaces instead of blurred translucent layers.
        html_theme = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
        if html_theme != "light":
            driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "themeBtn"))
            time.sleep(0.15)
        for selector in (".topbar", ".filters", ".metrics"):
            blur = driver.execute_script("return getComputedStyle(document.querySelector(arguments[0])).backdropFilter || getComputedStyle(document.querySelector(arguments[0])).webkitBackdropFilter", selector)
            require(blur in ("none", ""), f"light-mode blur/compositing still active on {selector}: {blur}")

        # Open a professor profile: Scout should dock to the opposite side, not disappear behind the drawer.
        driver.execute_script("window.scrollTo(0,0)")
        first_open = driver.find_element(By.CSS_SELECTOR, "#cards [data-open]")
        driver.execute_script("arguments[0].click()", first_open)
        drawer = driver.find_element(By.ID, "drawer")
        wait.until(lambda d: "open" in drawer.get_attribute("class").split() or drawer.get_attribute("aria-hidden") == "false")
        time.sleep(0.25)
        mascot = driver.find_element(By.ID, "professorScoutMascot")
        classes = mascot.get_attribute("class").split()
        require("is-hidden" not in classes, f"Scout is hidden while drawer is open: {classes}")
        require("with-drawer" in classes, f"Scout did not enter drawer docking state: {classes}")
        rect = driver.execute_script("const r=arguments[0].getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight};", mascot)
        require(rect["left"] >= 0 and rect["right"] <= rect["w"] + 1 and rect["top"] >= 0 and rect["bottom"] <= rect["h"] + 1, f"Scout is outside viewport with drawer open: {rect}")

        # Same visibility guarantee on a narrow phone viewport.
        driver.set_window_size(390, 844)
        time.sleep(0.25)
        rect = driver.execute_script("const r=arguments[0].getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight};", mascot)
        classes = mascot.get_attribute("class").split()
        require("is-hidden" not in classes and "with-drawer" in classes, f"mobile drawer hides Scout: {classes}")
        require(rect["left"] >= 0 and rect["right"] <= rect["w"] + 1 and rect["bottom"] <= rect["h"] + 1, f"mobile Scout is outside viewport: {rect}")

        print("UI regression checks passed")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
