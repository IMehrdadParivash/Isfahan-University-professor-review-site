#!/usr/bin/env python3
"""Validate the embedded V17 professor database without starting a browser."""
from __future__ import annotations
import base64, datetime as dt, gzip, json, re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/"index.html"
MANIFEST=ROOT/"assets/data/dataset-manifest.json"
EXPECTED={"professors":743,"faculties":17,"department_units":64,"professors_with_any_public_evidence":418,"professors_with_structured_evidence":401,"professors_with_at_least_one_cautiously_rankable_course":30,"current_professor_course_pairs":1128,"cautiously_rankable_course_pairs":34}
AS_OF=dt.date(2026,8,23)

def fail(msg): raise AssertionError(msg)
def load_pack():
    html=INDEX.read_text(encoding="utf-8")
    scripts=re.findall(r'<script\s+src="(assets/js/data-[^"]+\.js)"',html)
    if not scripts: fail("index.html does not reference embedded data chunks")
    parts=[]
    for rel in scripts:
        text=(ROOT/rel).read_text(encoding="utf-8")
        matches=re.findall(r'["\']([A-Za-z0-9+/=]{100,})["\']',text)
        if len(matches)!=1: fail(f"{rel}: expected one base64 payload, found {len(matches)}")
        parts.append(matches[0])
    return json.loads(gzip.decompress(base64.b64decode("".join(parts))))
def in_scale(v): return v is None or isinstance(v,(int,float)) and 0<=v<=5

def main():
    manifest=json.loads(MANIFEST.read_text(encoding="utf-8")); pack=load_pack(); stats=pack.get("s",{})
    for k,e in EXPECTED.items():
        if stats.get(k)!=e: fail(f"stats.{k}={stats.get(k)!r}; expected {e}")
    meth=manifest.get("methodology",{})
    if manifest.get("canonical_professor_count")!=743: fail("manifest canonical_professor_count is not 743")
    if meth.get("normalized_scale")!="0–5": fail("normalized scale is not 0–5")
    if meth.get("global_professor_score") is not False: fail("global professor score must remain disabled")
    if meth.get("legacy_bayesian_score_used") is not False: fail("legacy Bayesian score must remain disabled")
    if meth.get("historical_or_unresolved_in_main_professor_list") is not False: fail("historical/unresolved identities entered the main roster")
    professors=pack.get("p",[])
    if len(professors)!=743: fail(f"embedded roster has {len(professors)} professors")
    ids=[p[0] for p in professors]
    if ids!=list(range(1,744)): fail("professor IDs are not exactly 1..743")
    if len(set(p[1] for p in professors))!=743: fail("canonical professor names are not unique")
    if len(set(p[3] for p in professors if p[3]))!=17: fail("embedded faculty count is not 17")
    pairs=rankable=any_ev=structured=prof_rankable=0
    for p in professors:
        cov,courses=p[6],p[7]; any_ev+=bool(cov[0]); structured+=cov[1]>0; prof_rankable+=cov[4]>0; pairs+=len(courses)
        for c in courses:
            n,overall,dims,latest,is_rankable=c[1],c[2],c[3],c[4],bool(c[5])
            if not in_scale(overall): fail(f"course mean outside 0–5 for id={p[0]} course={c[0]!r}: {overall}")
            for mean_and_n in dims:
                if not in_scale(mean_and_n[0]): fail(f"dimension mean outside 0–5 for id={p[0]} course={c[0]!r}: {mean_and_n[0]}")
                if mean_and_n[1]<0: fail("negative dimension sample size")
            if is_rankable:
                rankable+=1
                if n<3: fail(f"rankable pair has n={n}, expected >=3")
                if not latest: fail("rankable pair has no latest evidence date")
                age=(AS_OF-dt.date.fromisoformat(latest)).days
                if age>1095: fail(f"rankable pair is stale by {age} days")
    recomputed={"current_professor_course_pairs":pairs,"cautiously_rankable_course_pairs":rankable,"professors_with_any_public_evidence":any_ev,"professors_with_structured_evidence":structured,"professors_with_at_least_one_cautiously_rankable_course":prof_rankable}
    for k,a in recomputed.items():
        if a!=EXPECTED[k]: fail(f"recomputed {k}={a}; expected {EXPECTED[k]}")
    print("V17 embedded data integrity checks passed: 743 canonical professors, 0–5 scale, 1128 current pairs, 34 guardrail-eligible pairs.")
    return 0
if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as exc:
        print(f"V17 data integrity check failed: {exc}",file=sys.stderr); raise
