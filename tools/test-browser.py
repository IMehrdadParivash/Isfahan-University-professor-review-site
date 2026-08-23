#!/usr/bin/env python3
"""Real-Chrome, direct-file acceptance checks for the public V17 static site."""
from __future__ import annotations

import json
from pathlib import Path
import shutil
import sys

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select, WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٬", "0123456789,")
ADVANCED = ("rank", "minReports", "freshness", "minRating", "dimension", "minDimension")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def visible_style(driver: webdriver.Chrome, element) -> dict:
    return driver.execute_script(
        "const e=arguments[0],s=getComputedStyle(e),r=e.getBoundingClientRect();"
        "return {display:s.display,visibility:s.visibility,opacity:Number(s.opacity),"
        "pointerEvents:s.pointerEvents,width:r.width,height:r.height,left:r.left,right:r.right,"
        "top:r.top,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight};",
        element,
    )


def really_visible(driver: webdriver.Chrome, element) -> bool:
    style = visible_style(driver, element)
    return (
        style["display"] != "none"
        and style["visibility"] != "hidden"
        and style["opacity"] > 0
        and style["width"] > 0
        and style["height"] > 0
        and style["right"] > 0
        and style["left"] < style["viewportWidth"]
        and style["bottom"] > 0
        and style["top"] < style["viewportHeight"]
    )


def count_results(driver: webdriver.Chrome) -> int:
    text = driver.find_element(By.ID, "resultCount").text.translate(FA_DIGITS)
    return int(text.split()[0].replace(",", ""))


def set_input(driver: webdriver.Chrome, element, value: str) -> None:
    driver.execute_script(
        "arguments[0].value=arguments[1];arguments[0].dispatchEvent(new Event('input',{bubbles:true}));",
        element,
        value,
    )


def main() -> int:
    chrome = next((shutil.which(name) for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if shutil.which(name)), None)
    if not chrome:
        print("Chrome/Chromium executable not found on runner.", file=sys.stderr)
        return 2

    options = webdriver.ChromeOptions()
    options.binary_location = chrome
    for argument in ("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files", "--window-size=1440,1200"):
        options.add_argument(argument)
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 20)

    try:
        driver.get(INDEX.as_uri())
        wait.until(lambda browser: browser.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        wait.until(lambda browser: len(browser.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        wait.until(lambda browser: not really_visible(browser, browser.find_element(By.ID, "storyLoader")))
        metric = int(driver.find_element(By.ID, "mProfessors").text.translate(FA_DIGITS).replace(",", ""))
        require(metric == 743, f"live professor metric is {metric}, expected 743")
        require(count_results(driver) == 743, "initial result count is not 743")
        count = driver.find_element(By.ID, "resultCount")
        require(count.get_attribute("aria-live") in ("polite", "assertive") or count.get_attribute("role") == "status", "result updates are not announced accessibly")

        first = driver.find_element(By.CSS_SELECTOR, "#cards .card .name").text.strip()
        require(first, "first professor card has no name")
        search = driver.find_element(By.ID, "q")
        set_input(driver, search, first)
        wait.until(lambda browser: count_results(browser) >= 1)
        require(first in [node.text.strip() for node in driver.find_elements(By.CSS_SELECTOR, "#cards .card .name")], "exact Persian professor search failed")

        arabic_variant = first.replace("ی", "ي").replace("ک", "ك")
        if arabic_variant != first:
            set_input(driver, search, arabic_variant)
            require(count_results(driver) >= 1, "Arabic/Persian ي/ی or ك/ک normalization failed")
        words = first.split()
        if len(words) >= 2:
            set_input(driver, search, f"{words[0]} ... {words[-1]}")
            require(count_results(driver) >= 1, "multi-word Persian search with punctuation failed")

        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "clear"))
        require(count_results(driver) == 743, "clear did not restore all 743 professors")
        require(driver.find_element(By.ID, "q").get_attribute("value") == "", "primary search was not cleared")
        require(driver.find_element(By.ID, "heroQ").get_attribute("value") == "", "hero search was not cleared")

        faculty = Select(driver.find_element(By.ID, "faculty"))
        department = Select(driver.find_element(By.ID, "department"))
        require(len(faculty.options) == 18, f"faculty selector does not contain 17 official faculties: {len(faculty.options) - 1}")
        all_departments = len(department.options)
        faculty.select_by_index(1)
        wait.until(lambda browser: count_results(browser) < 743)
        selected_departments = len(Select(driver.find_element(By.ID, "department")).options)
        require(selected_departments < all_departments, "faculty selection did not narrow departments")
        if selected_departments > 1:
            Select(driver.find_element(By.ID, "department")).select_by_index(1)
            course_options = Select(driver.find_element(By.ID, "course")).options
            require(all(option.get_attribute("value").strip() not in (".", "..") for option in course_options), "invalid dot-only course is selectable")
        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "clear"))

        driver.execute_script("document.getElementById('precisionFilters').open=true")
        for identifier in ADVANCED:
            element = driver.find_element(By.ID, identifier)
            options = Select(element).options
            require(len(options) >= 2, f"advanced filter {identifier} was not populated")
            Select(element).select_by_index(1)
            require(0 <= count_results(driver) <= 743, f"advanced filter {identifier} produced invalid result count")
            driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "clear"))
        for identifier in ("minRating", "minDimension"):
            values = [float(option.get_attribute("value")) for option in Select(driver.find_element(By.ID, identifier)).options if option.get_attribute("value")]
            require(all(0 <= value <= 5 for value in values), f"{identifier} contains legacy out-of-range 0–10 thresholds")

        for value in ("reviews", "rankable", "name"):
            Select(driver.find_element(By.ID, "sort")).select_by_value(value)
            require(count_results(driver) == 743, f"sort={value} incorrectly filtered professors")

        opener = driver.find_element(By.CSS_SELECTOR, "#cards [data-open-id]")
        driver.execute_script("arguments[0].click()", opener)
        drawer = driver.find_element(By.ID, "drawer")
        wait.until(lambda browser: really_visible(browser, drawer))
        require(drawer.get_attribute("aria-modal") == "true", "professor drawer is not aria-modal")
        wait.until(lambda browser: browser.find_element(By.ID, "drawerBody").text.strip())
        require(driver.find_element(By.ID, "drawerBody").text.strip(), "professor drawer opened without visible content")
        backdrop = driver.find_element(By.ID, "drawerBackdrop")
        wait.until(lambda browser: really_visible(browser, backdrop))
        require(visible_style(driver, backdrop)["pointerEvents"] != "none", "professor backdrop is not interactive")
        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "drawerClose"))

        save = driver.find_element(By.CSS_SELECTOR, "#cards [data-save-id]")
        saved_id = int(save.get_attribute("data-save-id"))
        driver.execute_script("arguments[0].click()", save)
        saved_filter = driver.find_element(By.ID, "savedCheck")
        driver.execute_script("arguments[0].click()", saved_filter)
        require(count_results(driver) >= 1, "saved-only filter hid saved professor")
        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "clear"))
        require(not driver.find_element(By.ID, "savedCheck").is_selected(), "clear did not reset saved-only filter")
        driver.refresh()
        wait.until(lambda browser: browser.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        wait.until(lambda browser: not really_visible(browser, browser.find_element(By.ID, "storyLoader")))
        persisted = driver.execute_script("return localStorage.getItem('ui_saved_professor_ids') || '[]'")
        require(saved_id in json.loads(persisted), "saved professor did not persist across reload")

        compares = driver.find_elements(By.CSS_SELECTOR, "#cards [data-compare-id]")
        require(len(compares) >= 2, "fewer than two comparison controls are available")
        driver.execute_script("arguments[0].click()", compares[0])
        compares = driver.find_elements(By.CSS_SELECTOR, "#cards [data-compare-id]")
        driver.execute_script("arguments[0].click()", compares[1])
        compare_go = driver.find_element(By.ID, "compareGo")
        wait.until(lambda browser: compare_go.is_enabled())
        driver.execute_script("arguments[0].click()", compare_go)
        modal = driver.find_element(By.ID, "compareModal")
        wait.until(lambda browser: really_visible(browser, modal))
        require(driver.find_element(By.CSS_SELECTOR, "#compareModal .modal").get_attribute("aria-modal") == "true", "comparison dialog is not aria-modal")
        require(driver.find_element(By.ID, "compareBody").text.strip(), "comparison modal is empty")
        modal_style = visible_style(driver, modal)
        require(modal_style["display"] != "none" and modal_style["opacity"] > 0, f"comparison modal class changed without visible rendering: {modal_style}")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        wait.until(lambda browser: not really_visible(browser, modal))

        before = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
        driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "themeBtn"))
        require(before != driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme"), "theme toggle failed")
        loaded = driver.execute_async_script(
            "const done=arguments[0];Promise.all([document.fonts.load('400 16px \\\"Vazirmatn Local\\\"','استاد ۱۲۳'),"
            "document.fonts.load('700 16px \\\"Vazirmatn Local\\\"','استاد ۱۲۳')]).then(v=>done(v.map(x=>x.length))).catch(e=>done({error:String(e)}));"
        )
        require(isinstance(loaded, list) and all(number > 0 for number in loaded), f"local OFL Vazirmatn fonts did not load: {loaded}")

        loader = driver.find_element(By.ID, "storyLoader")
        wait.until(lambda browser: not really_visible(browser, loader))
        require(not driver.find_elements(By.ID, "professorScoutMascot"), "persistent avatar exists outside loading screen")
        require(not driver.find_elements(By.CSS_SELECTOR, "body > img[src*='avatar'], main img[src*='avatar'], footer img[src*='avatar']"), "avatar leaked into the application interface")

        driver.set_window_size(390, 844)
        wait.until(lambda browser: len(browser.find_elements(By.CSS_SELECTOR, "#cards .card")) > 0)
        overflow = driver.execute_script("return document.documentElement.scrollWidth-document.documentElement.clientWidth")
        require(overflow <= 4, f"mobile horizontal overflow: {overflow}px")

        driver.execute_script("localStorage.setItem('ui_saved_professor_ids','{invalid-json')")
        driver.refresh()
        wait.until(lambda browser: browser.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        require(count_results(driver) == 743, "corrupt localStorage prevented safe application startup")

        driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
        driver.refresh()
        wait.until(lambda browser: browser.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        wait.until(lambda browser: not really_visible(browser, browser.find_element(By.ID, "storyLoader")))
        require(driver.execute_script("return matchMedia('(prefers-reduced-motion: reduce)').matches"), "reduced-motion preference was not applied")

        print("V17 real Chrome acceptance passed: roster, Persian search, cascades, advanced filters, visible dialogs, fonts, localStorage, mobile and reduced motion.")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"V17 browser smoke test failed: {exc}", file=sys.stderr)
        raise
