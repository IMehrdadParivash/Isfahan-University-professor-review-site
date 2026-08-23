#!/usr/bin/env python3
"""Real-Chrome, direct-file acceptance checks for the public V18 professor-level site."""
from __future__ import annotations

import json
from pathlib import Path
import shutil
import sys

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٬", "0123456789,")


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
        style["display"] != "none" and style["visibility"] != "hidden" and style["opacity"] > 0
        and style["width"] > 0 and style["height"] > 0 and style["right"] > 0
        and style["left"] < style["viewportWidth"] and style["bottom"] > 0 and style["top"] < style["viewportHeight"]
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


def click(driver: webdriver.Chrome, element) -> None:
    driver.execute_script("arguments[0].click()", element)


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
        result_status = driver.find_element(By.ID, "resultCount")
        require(result_status.get_attribute("aria-live") in ("polite", "assertive") or result_status.get_attribute("role") == "status", "result updates are not announced accessibly")

        require(not driver.find_elements(By.ID, "course"), "course filter returned to simplified public UI")
        require(not driver.find_elements(By.ID, "compareModal"), "professor-by-course comparison returned to simplified public UI")
        require(not driver.find_elements(By.ID, "precisionFilters"), "advanced evidence filters returned to simplified public UI")

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
            set_input(driver, search, f"{words[-1]} {words[0]}")
            require(count_results(driver) >= 1, "multi-word Persian search failed regardless of word order")

        click(driver, driver.find_element(By.ID, "clear"))
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
        require(1 < selected_departments < all_departments, "faculty selection did not narrow departments")
        if selected_departments > 1:
            Select(driver.find_element(By.ID, "department")).select_by_index(1)
            require(0 <= count_results(driver) < 743, "department filter produced invalid result count")
        click(driver, driver.find_element(By.ID, "clear"))

        rank = Select(driver.find_element(By.ID, "rank"))
        require(len(rank.options) >= 4, "academic rank selector was not populated")
        rank.select_by_index(1)
        require(0 < count_results(driver) < 743, "academic rank filter did not narrow results")
        click(driver, driver.find_element(By.ID, "clear"))

        for value in ("rating", "reviews", "name"):
            Select(driver.find_element(By.ID, "sort")).select_by_value(value)
            require(count_results(driver) == 743, f"sort={value} incorrectly filtered professors")

        rated_chip = driver.find_element(By.CSS_SELECTOR, '.chip[data-status="rated"]')
        click(driver, rated_chip)
        rated_count = count_results(driver)
        require(0 < rated_count < 743, f"rated-only filter returned implausible count: {rated_count}")
        none_chip = driver.find_element(By.CSS_SELECTOR, '.chip[data-status="none"]')
        click(driver, none_chip)
        require(count_results(driver) == 743 - rated_count, "rated and unrated filters do not partition the official roster")
        click(driver, driver.find_element(By.CSS_SELECTOR, '.chip[data-status="all"]'))

        opener = driver.find_element(By.CSS_SELECTOR, "#cards [data-open-id]")
        click(driver, opener)
        drawer = driver.find_element(By.ID, "drawer")
        wait.until(lambda browser: really_visible(browser, drawer))
        require(drawer.get_attribute("aria-modal") == "true", "professor drawer is not aria-modal")
        wait.until(lambda browser: browser.find_element(By.ID, "drawerBody").text.strip())
        drawer_text = driver.find_element(By.ID, "drawerBody").text
        require("امتیاز کلی" in drawer_text or "بدون امتیاز" in drawer_text, "drawer does not present professor-level score state")
        require("دادهٔ استاد × درس" not in drawer_text, "course-grain UI leaked back into professor drawer")
        backdrop = driver.find_element(By.ID, "drawerBackdrop")
        wait.until(lambda browser: really_visible(browser, backdrop))
        require(visible_style(driver, backdrop)["pointerEvents"] != "none", "professor backdrop is not interactive")
        click(driver, driver.find_element(By.ID, "drawerClose"))

        # The qualitative module must integrate with at least one known current professor without raw chat exposure.
        set_input(driver, search, "محمد ربانی خوراسگانی")
        if count_results(driver) >= 1:
            opener = driver.find_element(By.CSS_SELECTOR, "#cards [data-open-id]")
            click(driver, opener)
            wait.until(lambda browser: really_visible(browser, browser.find_element(By.ID, "drawer")))
            wait.until(lambda browser: "خلاصهٔ تجربه‌های دانشجویی" in browser.find_element(By.ID, "drawerBody").text)
            qualitative = driver.find_element(By.ID, "drawerBody").text
            require("روی امتیاز عددی استاد اثر نمی‌گذارد" in qualitative, "qualitative summary does not state score separation")
            require("in reply to" not in qualitative, "raw chat reply marker leaked into profile")
            click(driver, driver.find_element(By.ID, "drawerClose"))
        click(driver, driver.find_element(By.ID, "clear"))

        save = driver.find_element(By.CSS_SELECTOR, "#cards [data-save-id]")
        saved_id = int(save.get_attribute("data-save-id"))
        click(driver, save)
        saved_filter = driver.find_element(By.ID, "savedCheck")
        click(driver, saved_filter)
        require(count_results(driver) >= 1, "saved-only filter hid saved professor")
        click(driver, driver.find_element(By.ID, "clear"))
        require(not driver.find_element(By.ID, "savedCheck").is_selected(), "clear did not reset saved-only filter")
        driver.refresh()
        wait.until(lambda browser: browser.execute_script("return document.documentElement.dataset.appReady === 'true'"))
        wait.until(lambda browser: not really_visible(browser, browser.find_element(By.ID, "storyLoader")))
        persisted = driver.execute_script("return localStorage.getItem('ui_saved_professor_ids') || '[]'")
        require(saved_id in json.loads(persisted), "saved professor did not persist across reload")

        before = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
        click(driver, driver.find_element(By.ID, "themeBtn"))
        require(before != driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme"), "theme toggle failed")
        loaded = driver.execute_async_script(
            "const done=arguments[0];Promise.all([document.fonts.load('400 16px \\\"Vazirmatn Local\\\"','استاد ۱۲۳'),"
            "document.fonts.load('700 16px \\\"Vazirmatn Local\\\"','استاد ۱۲۳')]).then(v=>done(v.map(x=>x.length))).catch(e=>done({error:String(e)}));"
        )
        require(isinstance(loaded, list) and all(number > 0 for number in loaded), f"local OFL Vazirmatn fonts did not load: {loaded}")

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

        print("V18 real Chrome acceptance passed: professor-level scoring, Persian search, simple filters, qualitative notes, drawer, fonts, storage, mobile and reduced motion.")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"V18 browser smoke test failed: {exc}", file=sys.stderr)
        raise
