#!/usr/bin/env python3
"""Headless browser smoke test for the static/offline V16 site.

The page is opened through a file:// URL on purpose: this verifies the project's
no-server execution path. Selenium/Chrome are test-only CI dependencies and are
not part of the site's runtime.
"""
from __future__ import annotations

from pathlib import Path
import shutil
import sys
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        print("Chrome/Chromium executable not found on runner.", file=sys.stderr)
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

        # App/data boot.
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        cards = driver.find_elements(By.CSS_SELECTOR, "#cards .card")
        require(len(cards) > 0, "professor cards did not render")

        metric = driver.find_element(By.ID, "mProfessors").text.strip()
        require(metric and metric != "—", "professor metric did not initialize")

        # Search: use a real rendered professor name so the assertion is stable.
        first_name = cards[0].find_element(By.CSS_SELECTOR, ".name").text.strip()
        require(bool(first_name), "first professor card has no name")
        q = driver.find_element(By.ID, "q")
        q.clear()
        q.send_keys(first_name)
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) >= 1)
        searched_names = [e.text.strip() for e in driver.find_elements(By.CSS_SELECTOR, "#cards .card .name")]
        require(first_name in searched_names, "exact professor search did not return the selected professor")
        q.clear()
        q.send_keys(" ")
        q.clear()
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) > 1)

        # Faculty filter.
        faculty = Select(driver.find_element(By.ID, "faculty"))
        if len(faculty.options) > 1:
            faculty.select_by_index(1)
            time.sleep(0.35)
            require(driver.find_element(By.ID, "resultCount").text.strip(), "faculty filter produced no result-count state")
            faculty.select_by_index(0)

        # Sort controls.
        sort = Select(driver.find_element(By.ID, "sort"))
        for value in ("rating", "name", "reviews"):
            sort.select_by_value(value)
            time.sleep(0.2)
            require(len(driver.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0, f"sort={value} removed all rendered cards unexpectedly")

        # Drawer/detail interaction.
        first_open = driver.find_element(By.CSS_SELECTOR, "#cards [data-open]")
        driver.execute_script("arguments[0].click()", first_open)
        drawer = driver.find_element(By.ID, "drawer")
        wait.until(lambda d: "open" in drawer.get_attribute("class").split() or drawer.get_attribute("aria-hidden") == "false")
        require(driver.find_element(By.ID, "dName").text.strip(), "drawer opened without professor title")
        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "drawerClose"))

        # Saved state persists through localStorage/reload when supported by browser.
        save = driver.find_element(By.CSS_SELECTOR, "#cards [data-save]")
        saved_name = save.get_attribute("data-save")
        driver.execute_script("arguments[0].click()", save)
        time.sleep(0.2)
        driver.refresh()
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        persisted = driver.execute_script("return localStorage.getItem('ui_saved_professors') || '[]'")
        require(saved_name in persisted, "saved professor did not persist in localStorage")

        # Compare two professors and verify compare CTA becomes enabled.
        compares = driver.find_elements(By.CSS_SELECTOR, "#cards [data-compare]")
        if len(compares) >= 2:
            driver.execute_script("arguments[0].click()", compares[0])
            compares = driver.find_elements(By.CSS_SELECTOR, "#cards [data-compare]")
            driver.execute_script("arguments[0].click()", compares[1])
            compare_go = driver.find_element(By.ID, "compareGo")
            wait.until(lambda d: compare_go.is_enabled())
            require("show" in driver.find_element(By.ID, "compareBar").get_attribute("class").split(), "compare bar did not become visible")

        # Theme toggle.
        before = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "themeBtn"))
        after = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
        require(before != after, "theme toggle did not change data-theme")

        # Avatar assets/state machine exist in the live DOM.
        wait.until(EC.presence_of_element_located((By.ID, "professorScoutMascot")))
        mascot_img = driver.find_element(By.CSS_SELECTOR, "#professorScoutMascot img").get_attribute("src")
        require("assets/avatar/pose-" in mascot_img or "assets/avatar/loader-avatar" in mascot_img, "Professor Scout is not using local avatar assets")

        print("V16 browser smoke test passed via file://")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"V16 browser smoke test failed: {exc}", file=sys.stderr)
        raise
