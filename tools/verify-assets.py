#!/usr/bin/env python3
"""Verify the complete local runtime, public hashes and redistributable fonts."""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

REPO_ROOT = Path(__file__).resolve().parents[1]

FONT_FILES = {
    "assets/fonts/Vazirmatn-Regular.woff2": (
        50684,
        "e382101336c6eb32cfb31381c027d02d2e0354bad08f6a395d4088beb3db3d91",
    ),
    "assets/fonts/Vazirmatn-Bold.woff2": (
        51020,
        "836fae7d42d83faa249bc00e0099592be98a1fa260d22d82f269b6091e585627",
    ),
}

REQUIRED_FILES = [
    "index.html",
    "assets/data/dataset-manifest.json",
    *FONT_FILES,
    "assets/fonts/OFL.txt",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=REPO_ROOT, help="Static website root to verify")
    return parser.parse_args()


def local_html_references(root: Path) -> list[str]:
    html = (root / "index.html").read_text(encoding="utf-8")
    references = set(REQUIRED_FILES)
    for ref in re.findall(r"(?:src|href)=[\"']([^\"']+)[\"']", html, flags=re.I):
        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc or ref.startswith(("#", "data:")):
            continue
        rel = parsed.path.lstrip("/")
        if rel:
            references.add(rel)
    return sorted(references)


def verify_public_hashes(root: Path) -> int:
    manifest_path = root / "assets/data/dataset-manifest.json"
    if not manifest_path.is_file():
        return 1
    hashes = json.loads(manifest_path.read_text(encoding="utf-8")).get("sha256", {})
    chunk_hashes = hashes.get("public_data_chunks", {})
    if not isinstance(chunk_hashes, dict) or not chunk_hashes:
        print("FAIL    manifest.sha256.public_data_chunks must contain real executable hashes")
        return 1

    failures = 0
    parts: list[str] = []
    html = (root / "index.html").read_text(encoding="utf-8")
    referenced_chunks = re.findall(
        r'<script\b[^>]*\bsrc=["\'](assets/data/professors(?:-\d{2})?\.js)["\']',
        html,
        flags=re.I,
    )
    if set(referenced_chunks) != set(chunk_hashes):
        print("FAIL    manifest data files do not exactly match index.html dataset scripts")
        failures += 1

    for rel, expected in chunk_hashes.items():
        path = root / rel
        if not path.is_file() or path.is_symlink():
            print(f"FAIL    missing/unsafe manifest data chunk: {rel}")
            failures += 1
            continue
        digest = sha256(path)
        if digest != expected:
            print(f"FAIL    manifest SHA-256 mismatch: {rel}")
            failures += 1
        if rel not in referenced_chunks:
            continue
        matches = re.findall(r'["\']([A-Za-z0-9+/=]{100,})["\']', path.read_text(encoding="utf-8"))
        if len(matches) != 1:
            print(f"FAIL    expected exactly one base64 payload: {rel}")
            failures += 1
            continue
    for rel in referenced_chunks:
        path = root / rel
        if path.is_file():
            matches = re.findall(r'["\']([A-Za-z0-9+/=]{100,})["\']', path.read_text(encoding="utf-8"))
            if len(matches) == 1:
                parts.append(matches[0])

    runtime_hashes = hashes.get("public_runtime_files", {})
    actual_runtime = set(re.findall(r'<script\b[^>]*\bsrc=["\'](assets/[^"\']+\.js)["\']', html, flags=re.I)) - set(referenced_chunks)
    if set(runtime_hashes) != actual_runtime:
        print("FAIL    manifest executable list does not exactly match index.html runtime scripts")
        failures += 1
    for rel, expected in runtime_hashes.items():
        path = root / rel
        if not path.is_file() or path.is_symlink() or sha256(path) != expected:
            print(f"FAIL    manifest SHA-256 mismatch: executable {rel}")
            failures += 1

    if failures:
        return failures
    try:
        compressed = base64.b64decode("".join(parts), validate=True)
        database = gzip.decompress(compressed)
    except (ValueError, OSError) as exc:
        print(f"FAIL    invalid compressed public dataset: {exc}")
        return 1

    checks = {
        "public_compressed_dataset": hashlib.sha256(compressed).hexdigest(),
        "site_database": hashlib.sha256(database).hexdigest(),
    }
    for name, actual in checks.items():
        if hashes.get(name) != actual:
            print(f"FAIL    manifest SHA-256 mismatch: {name}")
            failures += 1
        else:
            print(f"OK      manifest SHA-256 {name}")
    return failures


def main() -> int:
    root = parse_args().root.resolve()
    failures = 0
    print(f"Website verification root: {root}")
    if not (root / "index.html").is_file():
        print("FAIL    missing index.html")
        return 1
    print("\nActual local runtime files")
    for rel in local_html_references(root):
        p = root / rel
        ok = p.is_file() and not p.is_symlink() and p.stat().st_size > 0
        print(f"{'OK' if ok else 'MISSING':7} {rel}")
        failures += 0 if ok else 1

    print("\nOfficial, redistributable Vazirmatn fonts")
    actual_fonts = {
        path.relative_to(root).as_posix()
        for path in (root / "assets/fonts").glob("*.woff2")
    }
    if actual_fonts != set(FONT_FILES):
        print(f"FAIL    unexpected or missing public font files: {sorted(actual_fonts ^ set(FONT_FILES))}")
        failures += 1
    for rel, (expected_size, expected_hash) in FONT_FILES.items():
        p = root / rel
        if not p.is_file() or p.is_symlink():
            print(f"FAIL    missing or unsafe redistributable font: {rel}")
            failures += 1
            continue
        size = p.stat().st_size
        digest = sha256(p)
        ok = size == expected_size and digest == expected_hash
        print(f"{'OK' if ok else 'FAIL':7} {rel}  bytes={size}  sha256={digest}")
        failures += 0 if ok else 1

    license_path = root / "assets/fonts/OFL.txt"
    if not license_path.is_file() or "SIL OPEN FONT LICENSE" not in license_path.read_text(encoding="utf-8"):
        print("FAIL    complete SIL Open Font License is missing")
        failures += 1

    print("\nPublic dataset cryptographic integrity")
    failures += verify_public_hashes(root)

    if failures:
        print(f"\nWebsite verification failed: {failures} item(s) need attention.")
        return 1
    print("\nWebsite verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
