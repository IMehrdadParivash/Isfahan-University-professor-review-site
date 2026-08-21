#!/usr/bin/env python3
"""Verify V16 local release assets without requiring a build step."""
from __future__ import annotations

import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

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

AVATAR_FILES = [
    "assets/avatar/loader-avatar.webp",
    "assets/avatar/pose-idle.webp",
    "assets/avatar/pose-think.webp",
    "assets/avatar/pose-work.webp",
    "assets/avatar/pose-walk.webp",
    "assets/avatar/pose-search.webp",
    "assets/avatar/pose-success.webp",
    "assets/avatar/pose-compare.webp",
    "assets/avatar/pose-empty.webp",
    "assets/avatar/avatar-motion.js",
]

REQUIRED_FILES = [
    "index.html",
    "assets/css/fonts.css",
    "assets/js/app.js",
    *AVATAR_FILES,
]

for i in range(1, 9):
    REQUIRED_FILES.append(f"assets/js/data-{i:02d}.js")
for i in range(9, 14):
    for part in range(1, 4):
        REQUIRED_FILES.append(f"assets/js/data-{i:02d}-{part}.js")
for part in range(1, 3):
    REQUIRED_FILES.append(f"assets/js/data-14-{part}.js")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    failures = 0
    print("V16 required static files")
    for rel in REQUIRED_FILES:
        p = ROOT / rel
        ok = p.is_file() and p.stat().st_size > 0
        print(f"{'OK' if ok else 'MISSING':7} {rel}")
        failures += 0 if ok else 1

    print("\nV16 licensed local fonts")
    for rel, (expected_size, expected_hash) in FONT_FILES.items():
        p = ROOT / rel
        if not p.is_file():
            print(f"MISSING {rel}")
            failures += 1
            continue
        size = p.stat().st_size
        digest = sha256(p)
        ok = size == expected_size and digest == expected_hash
        print(f"{'OK' if ok else 'FAIL':7} {rel}  bytes={size}  sha256={digest}")
        failures += 0 if ok else 1

    if failures:
        print(f"\nV16 verification failed: {failures} item(s) need attention.")
        return 1
    print("\nV16 verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
