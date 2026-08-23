#!/usr/bin/env python3
"""Verify the files actually loaded by the V17 static site and staged releases."""
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
    "assets/fonts/RaviFaNum-Regular.woff2": (43204, "4585ddee90901e505dad17a6d446a2c9459cd4530d2da859fd1811b7cc1d3b02"),
    "assets/fonts/RaviFaNum-Medium.woff2": (43520, "fa2df83e2838143b5387a6cfa95d0c9e189977179996069446d84559956dd01c"),
    "assets/fonts/RaviFaNum-SemiBold.woff2": (43408, "2a0b49ae99ee6d1afd42c681b5ac54e8d326a6df4c836b2330a9b0b0682e88cf"),
    "assets/fonts/RaviFaNum-Bold.woff2": (42720, "825cb536d958e3e5c6777c7002c27c3376842157300782c4e09765c6a6e60a32"),
    "assets/fonts/RaviFaNum-ExtraBlack.woff2": (41964, "8eb8de363eaeba6c6f6bdcbc22175a0cb616f09ca4320359469b0c82f424cbef"),
    "assets/fonts/Anjoman-Regular.woff2": (37248, "ccf81f0363b368dc3593a544702e219781d0bee2f40ba00161dbe4e2facc7329"),
    "assets/fonts/Anjoman-Bold.woff2": (37184, "6a53d5d721c706e85fd475dc3020dfde2f1cc5b5f6e8dc85a2793d4e3631a479"),
    "assets/fonts/Anjoman-ExtraBold.woff2": (37172, "82da9155187954225773b58b2d2799a337551abf18d8b195a8a5477380c6ce15"),
    "assets/fonts/Anjoman-Heavy.woff2": (38928, "d21efeb9dee50b6c504635b431e11e8b3ebe80fe6a5037289b4ede4e387e9031"),
    "assets/fonts/Pinar-VF-FD.woff2": (92144, "44ae0dc43d4d7b0750af2914ceffd8a47792654dc44d2810f5891ea142d54146"),
    "assets/fonts/Kahroba-VF-FD.woff2": (334100, "7cc15af7f4bc8df6d0f62c191126f3e8da2d886acd18ab179071e07ecf1b186c"),
}

REQUIRED_FILES = [
    "index.html",
    "assets/data/dataset-manifest.json",
    "assets/fonts/Vazirmatn-Regular.woff2",
    "assets/fonts/Vazirmatn-Bold.woff2",
    "assets/fonts/OFL.txt",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=REPO_ROOT, help="Release root to verify")
    parser.add_argument(
        "--allow-missing-fonts",
        action="store_true",
        help="Compatibility flag: proprietary fonts are optional by default",
    )
    parser.add_argument(
        "--require-licensed-fonts",
        action="store_true",
        help="Require all proprietary font binaries for an explicitly licensed private release",
    )
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
    referenced_chunks = re.findall(r'<script\b[^>]*\bsrc=["\'](assets/js/data-[^"\']+\.js)["\']', html, flags=re.I)
    if not set(referenced_chunks).issubset(chunk_hashes):
        print("FAIL    manifest chunk list does not cover every index.html data script")
        failures += 1

    for rel, expected in chunk_hashes.items():
        path = root / rel
        if not path.exists() and rel not in referenced_chunks:
            # Staged runtime intentionally excludes sanitized backward-compatibility aliases.
            continue
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
    args = parse_args()
    root = args.root.resolve()
    failures = 0
    missing_fonts = 0
    print(f"V17 verification root: {root}")
    if not (root / "index.html").is_file():
        print("FAIL    missing index.html")
        return 1
    print("\nV17 actual runtime files")
    for rel in local_html_references(root):
        p = root / rel
        ok = p.is_file() and not p.is_symlink() and p.stat().st_size > 0
        print(f"{'OK' if ok else 'MISSING':7} {rel}")
        failures += 0 if ok else 1

    print("\nV17 optional licensed local fonts")
    for rel, (expected_size, expected_hash) in FONT_FILES.items():
        p = root / rel
        if not p.is_file():
            missing_fonts += 1
            label = "MISSING" if args.require_licensed_fonts else "SKIP"
            print(f"{label:7} {rel}")
            if args.require_licensed_fonts:
                failures += 1
            continue
        size = p.stat().st_size
        digest = sha256(p)
        ok = size == expected_size and digest == expected_hash
        print(f"{'OK' if ok else 'FAIL':7} {rel}  bytes={size}  sha256={digest}")
        failures += 0 if ok else 1

    if missing_fonts and not args.require_licensed_fonts:
        print(f"\nLicense-safe mode: {missing_fonts} optional proprietary font file(s) absent; system-font fallback is valid.")

    print("\nV17 public dataset cryptographic integrity")
    failures += verify_public_hashes(root)

    if failures:
        print(f"\nV17 verification failed: {failures} item(s) need attention.")
        return 1
    print("\nV17 verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
