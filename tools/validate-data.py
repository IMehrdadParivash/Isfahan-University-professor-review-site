#!/usr/bin/env python3
"""Fail closed on privacy, provenance and integrity errors in public V17 data."""
from __future__ import annotations

import base64
import datetime as dt
import gzip
import hashlib
import json
import math
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MANIFEST = ROOT / "assets/data/dataset-manifest.json"
EXPECTED = {
    "professors": 743, "faculties": 17, "department_units": 64,
    "unique_department_labels": 61, "professors_with_any_public_evidence": 418,
    "professors_with_structured_evidence": 401,
    "professors_with_at_least_one_cautiously_rankable_course": 30,
    "current_professor_course_pairs": 1128, "cautiously_rankable_course_pairs": 34,
}
AS_OF = dt.date(2026, 8, 23)
DIMENSIONS = ("coherence", "knowledge", "teaching", "management", "responsiveness", "behavior")
DATA_SCRIPT = re.compile(r'<script\b[^>]*\bsrc=["\'](assets/data/professors(?:-\d{2})?\.js)["\']', re.I)
SCRIPT = re.compile(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']', re.I)
PAYLOAD = re.compile(r'["\']([A-Za-z0-9+/=]{100,})["\']')
EMAIL = re.compile(r"[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
IRAN_MOBILE = re.compile(r"(?<!\d)(?:\+98|0098|0)?9\d{9}(?!\d)")


def fail(message: str) -> None:
    raise AssertionError(message)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def script_references() -> list[str]:
    scripts = DATA_SCRIPT.findall(INDEX.read_text(encoding="utf-8"))
    if not scripts or len(scripts) != len(set(scripts)):
        fail("index.html has missing or duplicate public data chunk references")
    return scripts


def extract_chunk(path: Path) -> str:
    if not path.is_file() or path.is_symlink():
        fail(f"missing or unsafe data chunk: {path.relative_to(ROOT)}")
    matches = PAYLOAD.findall(path.read_text(encoding="utf-8"))
    if len(matches) != 1:
        fail(f"{path.relative_to(ROOT)}: expected one public data payload, found {len(matches)}")
    return matches[0]


def load_public_data(scripts: list[str] | None = None) -> tuple[dict, bytes, bytes]:
    references = scripts if scripts is not None else script_references()
    try:
        compressed = base64.b64decode("".join(extract_chunk(ROOT / rel) for rel in references), validate=True)
        raw = gzip.decompress(compressed)
        pack = json.loads(raw)
    except (ValueError, OSError, UnicodeError) as exc:
        fail(f"cannot decode embedded public dataset: {exc}")
    if not isinstance(pack, dict):
        fail("embedded dataset must be a JSON object")
    return pack, raw, compressed


def load_pack() -> dict:
    return load_public_data()[0]


def roster_digest(pack: dict) -> str:
    return sha256(canonical_bytes([professor[:6] for professor in pack["p"]]))


def evidence_digest(pack: dict) -> str:
    return sha256(canonical_bytes([[professor[0], professor[6], professor[7]] for professor in pack["p"]]))


def runtime_references() -> list[str]:
    references = SCRIPT.findall(INDEX.read_text(encoding="utf-8"))
    data_scripts = set(script_references())
    return [path for path in references if path.startswith("assets/") and path not in data_scripts]


def public_chunk_files(scripts: list[str]) -> list[str]:
    return sorted(scripts)


def validate_public_payloads(scripts: list[str]) -> None:
    allowed = set(public_chunk_files(scripts))
    candidates = list((ROOT / "assets/data").glob("*.js"))
    candidates.extend((ROOT / "assets/js").glob("data*.js"))
    for path in candidates:
        relative = path.relative_to(ROOT).as_posix()
        if path.is_symlink():
            fail(f"unsafe symbolic-link public data file: {relative}")
        if relative not in allowed and PAYLOAD.search(path.read_text(encoding="utf-8")):
            fail(f"untracked public data payload may expose unsanitized evidence: {relative}")


def validate_hashes(pack: dict, raw: bytes, compressed: bytes, scripts: list[str], manifest: dict) -> None:
    hashes = manifest.get("sha256")
    if not isinstance(hashes, dict):
        fail("manifest.sha256 is missing")
    expected = {
        "canonical_roster": roster_digest(pack), "safe_evidence": evidence_digest(pack),
        "site_database": sha256(raw), "public_compressed_dataset": sha256(compressed),
    }
    for key, actual in expected.items():
        if hashes.get(key) != actual:
            fail(f"manifest sha256.{key} does not match actual public bytes")
    for key, paths in (("public_data_chunks", public_chunk_files(scripts)),
                       ("public_runtime_files", runtime_references())):
        entries = hashes.get(key)
        if not isinstance(entries, dict) or set(entries) != set(paths):
            fail(f"manifest sha256.{key} does not cover exactly the current public files")
        for relative, digest in entries.items():
            candidate = ROOT / relative
            if not candidate.is_file() or candidate.is_symlink() or sha256(candidate.read_bytes()) != digest:
                fail(f"manifest sha256 mismatch for executable/data file: {relative}")


def in_scale(value: object) -> bool:
    return value is None or (isinstance(value, (int, float)) and not isinstance(value, bool)
                             and math.isfinite(value) and 0 <= value <= 5)


def safe_profile_url(value: object, professor_id: int) -> None:
    if value is None:
        return
    if not isinstance(value, str):
        fail(f"official profile URL is not a string for id={professor_id}")
    try:
        parsed = urlsplit(value)
        host, port = parsed.hostname, parsed.port
    except ValueError as exc:
        fail(f"invalid official profile URL for id={professor_id}: {exc}")
    if (parsed.scheme != "https" or not host or not (host == "ui.ac.ir" or host.endswith(".ui.ac.ir"))
            or parsed.username is not None or parsed.password is not None or port not in (None, 443)):
        fail(f"official profile URL outside trusted HTTPS ui.ac.ir boundary for id={professor_id}")


def safe_text(value: object, context: str) -> None:
    if value is None:
        return
    if not isinstance(value, str) or EMAIL.search(value) or IRAN_MOBILE.search(value):
        fail(f"invalid text or possible personal identifier in public {context}")


def main() -> int:
    scripts = script_references()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    pack, raw, compressed = load_public_data(scripts)
    validate_public_payloads(scripts)
    validate_hashes(pack, raw, compressed, scripts, manifest)

    if set(pack) != {"v", "dims", "s", "f", "d", "c", "p"}:
        fail("unexpected public top-level field may expose raw student or identifying data")
    for key in ("f", "d", "c"):
        if not isinstance(pack.get(key), list):
            fail(f"public {key} options must be an array")
        for value in pack[key]:
            safe_text(value, f"{key} filter option")

    for key, expected in EXPECTED.items():
        if pack.get("s", {}).get(key) != expected or manifest.get("statistics", {}).get(key) != expected:
            fail(f"embedded and manifest statistics must both contain {key}={expected}")
    if tuple(pack.get("dims", ())) != DIMENSIONS:
        fail("public schema does not contain exactly the six documented teaching dimensions")
    methodology = manifest.get("methodology", {})
    if (manifest.get("canonical_professor_count") != 743 or methodology.get("normalized_scale") != "0–5"
            or methodology.get("numeric_display_minimum_reports") != 2):
        fail("official roster count, score scale, or minimum privacy threshold changed")
    for key in ("global_professor_score", "legacy_bayesian_score_used",
                "historical_or_unresolved_in_main_professor_list"):
        if methodology.get(key) is not False:
            fail(f"methodology.{key} must remain disabled")
    privacy = manifest.get("privacy", {})
    for key in ("student_personal_identifiers_in_frontend", "raw_chat_text_in_frontend"):
        if privacy.get(key) is not False:
            fail(f"privacy.{key} must remain false")
    for key in ("singleton_scores_removed_before_publication", "singleton_exact_dates_removed_before_publication"):
        if privacy.get(key) is not True:
            fail(f"privacy.{key} must be true")

    professors = pack.get("p", [])
    if len(professors) != 743 or any(not isinstance(p, list) or len(p) != 8 for p in professors):
        fail("official professor count or privacy-safe record schema changed")
    if [p[0] for p in professors] != list(range(1, 744)) or len({p[1] for p in professors}) != 743:
        fail("official professor identifiers or unique canonical names changed")
    faculties = {p[3] for p in professors if p[3]}
    labels = {p[4] for p in professors if p[4]}
    units = {(p[3], p[4]) for p in professors if p[3] and p[4]}
    if len(faculties) != 17 or len(units) != 64 or len(labels) != 61:
        fail("official hierarchy must contain exactly 17 faculties, 64 units, and 61 labels")
    if set(pack.get("f", ())) != faculties or set(pack.get("d", ())) != labels:
        fail("faculty or department filter options do not match the official roster")

    pairs = rankable = any_evidence = structured = professors_rankable = 0
    hidden_overall = hidden_dimensions = hidden_dates = 0
    for professor in professors:
        professor_id = professor[0]
        for offset, label in ((1, "professor name"), (2, "academic rank"), (3, "faculty"), (4, "department")):
            safe_text(professor[offset], f"{label} for id={professor_id}")
        safe_profile_url(professor[5], professor_id)
        coverage, courses = professor[6], professor[7]
        if not isinstance(coverage, list) or len(coverage) != 5 or not isinstance(courses, list):
            fail(f"unexpected public evidence schema for id={professor_id}")
        any_evidence += bool(coverage[0])
        structured += coverage[1] > 0
        professors_rankable += coverage[4] > 0
        pairs += len(courses)

        for course in courses:
            if not isinstance(course, list) or len(course) != 6:
                fail(f"unexpected public course schema may expose raw student data for id={professor_id}")
            name, count, overall, dimensions, latest, eligible = course
            safe_text(name, f"course name for id={professor_id}")
            if not isinstance(count, int) or isinstance(count, bool) or count < 0 or not in_scale(overall):
                fail(f"invalid course sample count or 0–5 mean for id={professor_id}")
            if count < 2:
                if overall is not None or latest is not None:
                    fail(f"private singleton course score or exact evidence date leaked for id={professor_id}")
                hidden_overall += 1
                hidden_dates += 1
            if not isinstance(dimensions, list) or len(dimensions) != len(DIMENSIONS):
                fail(f"unexpected public teaching dimensions for id={professor_id}")
            for dimension in dimensions:
                if not isinstance(dimension, list) or len(dimension) != 2:
                    fail(f"unexpected public dimension schema for id={professor_id}")
                mean, sample_size = dimension
                if (not isinstance(sample_size, int) or isinstance(sample_size, bool)
                        or sample_size < 0 or sample_size > count or not in_scale(mean)):
                    fail(f"invalid public dimension score/sample count for id={professor_id}")
                if sample_size < 2:
                    if mean is not None:
                        fail(f"private singleton teaching-dimension score leaked for id={professor_id}")
                    hidden_dimensions += 1

            evidence_date = None
            if latest is not None:
                if not isinstance(latest, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", latest):
                    fail(f"invalid public evidence date syntax for id={professor_id}")
                try:
                    evidence_date = dt.date.fromisoformat(latest)
                except ValueError:
                    fail(f"invalid public evidence calendar date for id={professor_id}")
                if evidence_date > AS_OF:
                    fail(f"future public evidence date for id={professor_id}")
            if not isinstance(eligible, (bool, int)) or eligible not in (0, 1):
                fail(f"invalid course comparison eligibility flag for id={professor_id}")
            if eligible:
                rankable += 1
                if count < 3 or overall is None or evidence_date is None:
                    fail(f"comparison-eligible course lacks validated evidence for id={professor_id}")
                if (AS_OF - evidence_date).days > 1095:
                    fail(f"comparison-eligible course evidence is stale for id={professor_id}")

    recomputed = {
        "current_professor_course_pairs": pairs, "cautiously_rankable_course_pairs": rankable,
        "professors_with_any_public_evidence": any_evidence,
        "professors_with_structured_evidence": structured,
        "professors_with_at_least_one_cautiously_rankable_course": professors_rankable,
    }
    for key, actual in recomputed.items():
        if actual != EXPECTED[key]:
            fail(f"recomputed {key}={actual}; expected {EXPECTED[key]}")
    print(
        "V17 public privacy and integrity checks passed: "
        f"743 professors, 17 faculties, 64 units, 61 labels, {pairs} course pairs, {rankable} comparable pairs; "
        f"{hidden_overall} singleton overall scores, {hidden_dimensions} under-threshold dimension scores, "
        f"and {hidden_dates} singleton dates withheld; "
        f"{len(public_chunk_files(scripts))} chunks and {len(runtime_references())} executable scripts hash-verified."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"V17 public data integrity check failed: {exc}", file=sys.stderr)
        raise
