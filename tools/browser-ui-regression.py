#!/usr/bin/env python3
"""Visible-overlay, keyboard, theme and mobile regressions for the V17 UI."""
from pathlib import Path
import shutil
import sys

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def display_info(driver, element):
    return driver.execute_script(
        "const e=arguments[0],s=getComputedStyle(e),r=e.getBoundingClientRect();"
        "return {display:s.display,visibility:s.visibility,opacity:+s.opacity,"
        "pointer:s.pointerEvents,left:r.left,right:r.right,top:r.top,bottom:r.bottom,"
        "width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};",
        element,
    )


def visibly_open(driver, element):
    state = display_info(driver, element)
    return (
        state["display"] != "none"
        and state["visibility"] != "hidden"
        and state["opacity"] > 0
        and state["width"] > 0
        and state["height"] > 0
        and state["right"] > 0
        and state["left"] < state["viewportWidth"]
        and state["bottom"] > 0
        and state["top"] < state["viewportHeight"]
    )


def main():
    chrome = next((shutil.which(name) for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if shutil.which(name)), None)
    if not chrome:
        print("Chrome/Chromium executable not found", file=sys.stderr)
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
        wait.until(lambda browser: len(browser.find_elements(By.CSS_SELECTOR, "#cards .card")) > 10)
        wait.until(lambda browser: not visibly_open(browser, browser.find_element(By.ID, "storyLoader")))
        require(driver.find_element(By.TAG_NAME, "html").get_attribute("lang") == "fa", "document language is not Persian")
        require(driver.find_element(By.TAG_NAME, "html").get_attribute("dir") == "rtl", "document direction is not RTL")

        position = driver.execute_script("return getComputedStyle(document.querySelector('.filters-wrap')).position")
        require(position != "sticky", f"filter panel is still sticky: {position}")
        driver.execute_script("document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('#cards .card')[10].scrollIntoView({block:'start'});")
        wait.until(lambda browser: browser.execute_script("return document.querySelector('.filters-wrap').getBoundingClientRect().bottom") < 0)

        if driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme") != "light":
            driver.execute_script("arguments[0].click()", driver.find_element(By.ID, "themeBtn"))
        for selector in (".topbar", ".filters", ".metrics"):
            blur = driver.execute_script("const s=getComputedStyle(document.querySelector(arguments[0]));return s.backdropFilter||s.webkitBackdropFilter", selector)
            require(blur in ("none", ""), f"light-mode blur remains active on {selector}: {blur}")

        driver.execute_script("window.scrollTo(0,0)")
        opener = driver.find_element(By.CSS_SELECTOR, "#cards [data-open-id]")
        driver.execute_script("arguments[0].focus();arguments[0].click()", opener)
        drawer = driver.find_element(By.ID, "drawer")
        backdrop = driver.find_element(By.ID, "drawerBackdrop")
        wait.until(lambda browser: visibly_open(browser, drawer) and visibly_open(browser, backdrop))
        wait.until(lambda browser: browser.find_element(By.ID, "drawerBody").text.strip())
        require(drawer.get_attribute("role") == "dialog" and drawer.get_attribute("aria-modal") == "true", "drawer lacks accessible dialog semantics")
        require(driver.execute_script("return document.activeElement.id") == "drawerClose", "drawer did not receive managed focus")
        require(display_info(driver, backdrop)["pointer"] != "none", "drawer backdrop is not clickable")
        require(not driver.find_elements(By.ID, "professorScoutMascot"), "persistent mascot exists while drawer is open")

        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        wait.until(lambda browser: drawer.get_attribute("aria-hidden") == "true")
        require(driver.execute_script("return document.activeElement === arguments[0]", opener), "drawer Escape did not restore opener focus")

        driver.execute_script("arguments[0].click()", opener)
        wait.until(lambda browser: visibly_open(browser, backdrop))
        driver.execute_script("arguments[0].click()", backdrop)
        wait.until(lambda browser: drawer.get_attribute("aria-hidden") == "true")

        compare_buttons = driver.find_elements(By.CSS_SELECTOR, "#cards [data-compare-id]")
        driver.execute_script("arguments[0].click()", compare_buttons[0])
        compare_buttons = driver.find_elements(By.CSS_SELECTOR, "#cards [data-compare-id]")
        driver.execute_script("arguments[0].click()", compare_buttons[1])
        compare_button = driver.find_element(By.ID, "compareGo")
        wait.until(lambda browser: compare_button.is_enabled())
        driver.execute_script("arguments[0].focus();arguments[0].click()", compare_button)
        modal = driver.find_element(By.ID, "compareModal")
        wait.until(lambda browser: visibly_open(browser, modal))
        dialog = driver.find_element(By.CSS_SELECTOR, "#compareModal .modal")
        require(dialog.get_attribute("role") == "dialog" and dialog.get_attribute("aria-modal") == "true", "comparison lacks accessible dialog semantics")
        require(driver.execute_script("return document.activeElement.id") == "compareClose", "comparison did not receive managed focus")
        style = display_info(driver, modal)
        require(style["display"] in ("grid", "flex", "block") and style["opacity"] > 0, f"comparison overlay is not visibly rendered: {style}")

        driver.set_window_size(390, 844)
        wait.until(lambda browser: browser.execute_script("return innerWidth") <= 390)
        rect = display_info(driver, dialog)
        require(rect["left"] >= -1 and rect["right"] <= rect["viewportWidth"] + 1, f"mobile comparison extends beyond viewport: {rect}")
        overflow = driver.execute_script("return document.documentElement.scrollWidth-document.documentElement.clientWidth")
        require(overflow <= 4, f"mobile horizontal overflow with comparison open: {overflow}px")
        driver.execute_script("arguments[0].dispatchEvent(new MouseEvent('click',{bubbles:true}))", modal)
        wait.until(lambda browser: modal.get_attribute("aria-hidden") == "true")

        opener = driver.find_element(By.CSS_SELECTOR, "#cards [data-open-id]")
        driver.execute_script("arguments[0].click()", opener)
        wait.until(lambda browser: visibly_open(browser, drawer))
        wait.until(lambda browser: (
            lambda state: state["left"] >= -1
            and state["right"] <= state["viewportWidth"] + 1
            and state["width"] <= state["viewportWidth"] + 1
        )(display_info(browser, drawer)))
        rect = display_info(driver, drawer)
        require(rect["left"] >= -1 and rect["right"] <= rect["viewportWidth"] + 1, f"mobile professor drawer extends beyond viewport: {rect}")
        overflow = driver.execute_script("return document.documentElement.scrollWidth-document.documentElement.clientWidth")
        require(overflow <= 4, f"mobile horizontal overflow with professor drawer open: {overflow}px")

        print("V17 visible UI regressions passed: RTL, themes, computed overlay rendering, Escape/outside-click, focus and mobile dialogs.")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())
