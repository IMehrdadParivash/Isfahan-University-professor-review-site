#!/usr/bin/env python3
"""Headless smoke test for the static/offline V17 data-integrity site."""
from __future__ import annotations
from pathlib import Path
import json, shutil, sys, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait

ROOT=Path(__file__).resolve().parents[1]; INDEX=ROOT/"index.html"
FONT_PATHS=["assets/fonts/RaviFaNum-Regular.woff2","assets/fonts/RaviFaNum-Medium.woff2","assets/fonts/RaviFaNum-SemiBold.woff2","assets/fonts/RaviFaNum-Bold.woff2","assets/fonts/RaviFaNum-ExtraBlack.woff2","assets/fonts/Anjoman-Regular.woff2","assets/fonts/Anjoman-Bold.woff2","assets/fonts/Anjoman-ExtraBold.woff2","assets/fonts/Anjoman-Heavy.woff2","assets/fonts/Pinar-VF-FD.woff2","assets/fonts/Kahroba-VF-FD.woff2"]
FA_DIGITS=str.maketrans("۰۱۲۳۴۵۶۷۸۹٬","0123456789,")
def require(c,m):
    if not c: raise AssertionError(m)
def int_from_fa(t): return int(t.translate(FA_DIGITS).replace(",","").strip())

def main():
    chrome=shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome: print("Chrome/Chromium executable not found on runner.",file=sys.stderr); return 2
    o=webdriver.ChromeOptions(); o.binary_location=chrome
    for a in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files","--window-size=1440,1200"): o.add_argument(a)
    d=webdriver.Chrome(options=o); w=WebDriverWait(d,25)
    try:
        d.get(INDEX.as_uri()); w.until(lambda x: len(x.find_elements(By.CSS_SELECTOR,"#cards .card"))>0); w.until(lambda x:x.find_element(By.ID,"mProfessors").text.strip() not in ("","—"))
        metric=int_from_fa(d.find_element(By.ID,"mProfessors").text); require(metric==743,f"live professor metric is {metric}, expected 743"); require("۷۴۳" in d.find_element(By.ID,"resultCount").text,"result count does not state canonical 743")
        cards=d.find_elements(By.CSS_SELECTOR,"#cards .card"); first=cards[0].find_element(By.CSS_SELECTOR,".name").text.strip(); require(first,"first professor card has no name")
        q=d.find_element(By.ID,"q"); q.clear(); q.send_keys(first); w.until(lambda x:len(x.find_elements(By.CSS_SELECTOR,"#cards .card"))>=1); require(first in [e.text.strip() for e in d.find_elements(By.CSS_SELECTOR,"#cards .card .name")],"exact professor search failed"); q.clear(); q.send_keys(" "); q.clear(); w.until(lambda x:len(x.find_elements(By.CSS_SELECTOR,"#cards .card"))>1)
        for fid in ("faculty","department","course"):
            s=Select(d.find_element(By.ID,fid))
            if len(s.options)>1: s.select_by_index(1); time.sleep(.25); require(d.find_element(By.ID,"resultCount").text.strip(),f"{fid} filter produced no result count"); s.select_by_index(0)
        sort=Select(d.find_element(By.ID,"sort"))
        for value in ("reviews","rankable","name"): sort.select_by_value(value); time.sleep(.15); require(len(d.find_elements(By.CSS_SELECTOR,"#cards .card"))>0,f"sort={value} removed all cards")
        opener=d.find_element(By.CSS_SELECTOR,"#cards [data-open-id]"); d.execute_script("arguments[0].click()",opener); drawer=d.find_element(By.ID,"drawer"); w.until(lambda x:"open" in drawer.get_attribute("class").split() or drawer.get_attribute("aria-hidden")=="false"); w.until(lambda x:x.find_element(By.ID,"dName").text.strip()!=""); require("امتیاز کلی استاد نمایش داده نمی‌شود" in d.find_element(By.ID,"drawerBody").text,"drawer does not expose no-global-score policy"); d.execute_script("arguments[0].click()",d.find_element(By.ID,"drawerClose"))
        save=d.find_element(By.CSS_SELECTOR,"#cards [data-save-id]"); sid=int(save.get_attribute("data-save-id")); d.execute_script("arguments[0].click()",save); time.sleep(.15); d.refresh(); w.until(lambda x:len(x.find_elements(By.CSS_SELECTOR,"#cards .card"))>0); persisted=d.execute_script("return localStorage.getItem('ui_saved_professor_ids') || '[]'"); require(sid in json.loads(persisted),"saved professor ID did not persist")
        compares=d.find_elements(By.CSS_SELECTOR,"#cards [data-compare-id]")
        if len(compares)>=2:
            d.execute_script("arguments[0].click()",compares[0]); compares=d.find_elements(By.CSS_SELECTOR,"#cards [data-compare-id]"); d.execute_script("arguments[0].click()",compares[1]); go=d.find_element(By.ID,"compareGo"); w.until(lambda x:go.is_enabled()); d.execute_script("arguments[0].click()",go); modal=d.find_element(By.ID,"compareModal"); w.until(lambda x:any(k in modal.get_attribute("class").split() for k in ("show","open"))); require(d.find_element(By.ID,"compareBody").text.strip(),"comparison modal is empty"); d.execute_script("arguments[0].click()",d.find_element(By.ID,"compareClose"))
        before=d.find_element(By.TAG_NAME,"html").get_attribute("data-theme"); d.execute_script("arguments[0].click()",d.find_element(By.ID,"themeBtn")); after=d.find_element(By.TAG_NAME,"html").get_attribute("data-theme"); require(before!=after,"theme toggle failed")
        time.sleep(3.4); require(not d.find_elements(By.ID,"professorScoutMascot"),"persistent Professor Scout exists outside loading screen"); loader=d.find_element(By.ID,"storyLoader"); st=d.execute_script("return {display:getComputedStyle(arguments[0]).display,opacity:getComputedStyle(arguments[0]).opacity,visibility:getComputedStyle(arguments[0]).visibility}",loader); require(st["display"]=="none" or st["visibility"]=="hidden" or float(st["opacity"])==0.0,f"story loader did not exit: {st}")
        if all((ROOT/r).is_file() for r in FONT_PATHS):
            loaded=d.execute_async_script("const done=arguments[0];const f=['RaviV16','AnjomanV16','PinarV16','KahrobaV16'];Promise.all(f.map(x=>document.fonts.load(`16px \\\"${x}\\\"`,'استاد ۱۲۳').then(v=>[x,v.length]))).then(done).catch(e=>done([['ERROR',String(e)]]));"); fs={n:c for n,c in loaded}; require(all(fs.get(n,0)>0 for n in ("RaviV16","AnjomanV16","PinarV16","KahrobaV16")),f"local webfonts did not load: {fs}")
        d.set_window_size(390,844); time.sleep(.3); require(len(d.find_elements(By.CSS_SELECTOR,"#cards .card"))>0,"mobile viewport lost cards"); overflow=d.execute_script("return document.documentElement.scrollWidth-document.documentElement.clientWidth"); require(overflow<=4,f"mobile horizontal overflow: {overflow}px")
        print("V17 browser smoke test passed via file://"); return 0
    finally: d.quit()
if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e: print(f"V17 browser smoke test failed: {e}",file=sys.stderr); raise
