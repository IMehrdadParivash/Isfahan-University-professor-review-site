#!/usr/bin/env python3
"""Regression checks for the V17 static UI."""
from pathlib import Path
import shutil, sys, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT=Path(__file__).resolve().parents[1]; INDEX=ROOT/"index.html"
def require(c,m):
    if not c: raise AssertionError(m)
def main():
    chrome=shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome: print("Chrome/Chromium executable not found",file=sys.stderr); return 2
    o=webdriver.ChromeOptions(); o.binary_location=chrome
    for a in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files","--window-size=1440,1200"): o.add_argument(a)
    d=webdriver.Chrome(options=o); w=WebDriverWait(d,25)
    try:
        d.get(INDEX.as_uri()); w.until(lambda x:len(x.find_elements(By.CSS_SELECTOR,"#cards .card"))>0)
        pos=d.execute_script("return getComputedStyle(document.querySelector('.filters-wrap')).position"); require(pos!="sticky",f"filter panel is still sticky: {pos}")
        d.execute_script("document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('#cards .card')[10].scrollIntoView({block:'start'});"); time.sleep(.1); r=d.execute_script("const r=document.querySelector('.filters-wrap').getBoundingClientRect();return {top:r.top,bottom:r.bottom};"); require(r["bottom"]<0,f"filter panel still obstructs scrolled content: {r}")
        theme=d.find_element(By.TAG_NAME,"html").get_attribute("data-theme")
        if theme!="light": d.execute_script("arguments[0].click()",d.find_element(By.ID,"themeBtn")); time.sleep(.15)
        for sel in (".topbar",".filters",".metrics"):
            blur=d.execute_script("return getComputedStyle(document.querySelector(arguments[0])).backdropFilter||getComputedStyle(document.querySelector(arguments[0])).webkitBackdropFilter",sel); require(blur in ("none",""),f"light-mode blur still active on {sel}: {blur}")
        d.execute_script("window.scrollTo(0,0)"); opener=d.find_element(By.CSS_SELECTOR,"#cards [data-open-id]"); d.execute_script("arguments[0].click()",opener); drawer=d.find_element(By.ID,"drawer"); w.until(lambda x:"open" in drawer.get_attribute("class").split() or drawer.get_attribute("aria-hidden")=="false"); require(d.find_element(By.ID,"drawerBody").text.strip(),"drawer opened without content"); require(not d.find_elements(By.ID,"professorScoutMascot"),"persistent mascot exists while drawer is open")
        d.set_window_size(390,844); time.sleep(.25); rect=d.execute_script("const r=arguments[0].getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight};",drawer); require(rect["left"]>=-1 and rect["right"]<=rect["w"]+1,f"mobile drawer outside viewport: {rect}"); overflow=d.execute_script("return document.documentElement.scrollWidth-document.documentElement.clientWidth"); require(overflow<=4,f"mobile page overflow with drawer open: {overflow}px")
        print("V17 UI regression checks passed"); return 0
    finally: d.quit()
if __name__=="__main__": raise SystemExit(main())
