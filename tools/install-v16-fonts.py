#!/usr/bin/env python3
"""Install the user-supplied V16 webfonts from local ZIP archives.

This script never downloads fonts. Put the licensed archives in the repository
root or in ./vendor-fonts/ and run either:

    python tools/install-v16-fonts.py

or, to keep proprietary binaries out of the source checkout and install them
only into a staged deployment directory:

    python tools/install-v16-fonts.py --dest-root .release/v16

Only the eleven WOFF2 files used by V16 are extracted, and every output is
verified by byte size and SHA-256 before it is written.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SEARCH_DIRS = [ROOT, ROOT / "vendor-fonts"]

FILES = {
    "RaviFaNum-Regular.woff2": ("Ravi-Pro.zip", "Pro/Ravi FaNum/Webfonts/fonts/woff2/RaviFaNum-Regular.woff2", 43204, "4585ddee90901e505dad17a6d446a2c9459cd4530d2da859fd1811b7cc1d3b02"),
    "RaviFaNum-Medium.woff2": ("Ravi-Pro.zip", "Pro/Ravi FaNum/Webfonts/fonts/woff2/RaviFaNum-Medium.woff2", 43520, "fa2df83e2838143b5387a6cfa95d0c9e189977179996069446d84559956dd01c"),
    "RaviFaNum-SemiBold.woff2": ("Ravi-Pro.zip", "Pro/Ravi FaNum/Webfonts/fonts/woff2/RaviFaNum-SemiBold.woff2", 43408, "2a0b49ae99ee6d1afd42c681b5ac54e8d326a6df4c836b2330a9b0b0682e88cf"),
    "RaviFaNum-Bold.woff2": ("Ravi-Pro.zip", "Pro/Ravi FaNum/Webfonts/fonts/woff2/RaviFaNum-Bold.woff2", 42720, "825cb536d958e3e5c6777c7002c27c3376842157300782c4e09765c6a6e60a32"),
    "RaviFaNum-ExtraBlack.woff2": ("Ravi-Pro.zip", "Pro/Ravi FaNum/Webfonts/fonts/woff2/RaviFaNum-ExtraBlack.woff2", 41964, "8eb8de363eaeba6c6f6bdcbc22175a0cb616f09ca4320359469b0c82f424cbef"),
    "Anjoman-Regular.woff2": ("Anjoman Pro.zip", "Anjoman_Pro/01 - Anjoman Font Family/05- Webfonts/02- Woff2/Anjoman-Regular.woff2", 37248, "ccf81f0363b368dc3593a544702e219781d0bee2f40ba00161dbe4e2facc7329"),
    "Anjoman-Bold.woff2": ("Anjoman Pro.zip", "Anjoman_Pro/01 - Anjoman Font Family/05- Webfonts/02- Woff2/Anjoman-Bold.woff2", 37184, "6a53d5d721c706e85fd475dc3020dfde2f1cc5b5f6e8dc85a2793d4e3631a479"),
    "Anjoman-ExtraBold.woff2": ("Anjoman Pro.zip", "Anjoman_Pro/01 - Anjoman Font Family/05- Webfonts/02- Woff2/Anjoman-ExtraBold.woff2", 37172, "82da9155187954225773b58b2d2799a337551abf18d8b195a8a5477380c6ce15"),
    "Anjoman-Heavy.woff2": ("Anjoman Pro.zip", "Anjoman_Pro/01 - Anjoman Font Family/05- Webfonts/02- Woff2/Anjoman-Heavy.woff2", 38928, "d21efeb9dee50b6c504635b431e11e8b3ebe80fe6a5037289b4ede4e387e9031"),
    "Pinar-VF-FD.woff2": ("Pinar-V3 [@FontiranIR].zip", "Pinar-V3 [@FontiranIR]/Variables/woff2/Pinar-VF-FD[DSTY,KSHD,wght].woff2", 92144, "44ae0dc43d4d7b0750af2914ceffd8a47792654dc44d2810f5891ea142d54146"),
    "Kahroba-VF-FD.woff2": ("Kahroba-Pro.zip", "180-Kahroba-v1.0-Pro/180-Kahroba-v1.0-Pro/Variable/woff2(web)/Kahroba-VF-FD[wght,wdth,CNTR].woff2", 334100, "7cc15af7f4bc8df6d0f62c191126f3e8da2d886acd18ab179071e07ecf1b186c"),
}


def find_archive(name: str) -> Path | None:
    for directory in SEARCH_DIRS:
        candidate = directory / name
        if candidate.is_file():
            return candidate
    return None


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dest-root",
        type=Path,
        default=ROOT,
        help="Root directory that should receive assets/fonts (default: repository root)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dest_root = args.dest_root.resolve()
    dest = dest_root / "assets" / "fonts"
    dest.mkdir(parents=True, exist_ok=True)

    archive_cache: dict[Path, zipfile.ZipFile] = {}
    failures: list[str] = []

    try:
        for out_name, (archive_name, member, expected_size, expected_sha) in FILES.items():
            archive_path = find_archive(archive_name)
            if archive_path is None:
                failures.append(f"missing archive: {archive_name}")
                continue
            zf = archive_cache.get(archive_path)
            if zf is None:
                zf = zipfile.ZipFile(archive_path)
                archive_cache[archive_path] = zf
            try:
                data = zf.read(member)
            except KeyError:
                failures.append(f"missing member in {archive_name}: {member}")
                continue

            actual_size = len(data)
            actual_sha = digest(data)
            if actual_size != expected_size or actual_sha != expected_sha:
                failures.append(
                    f"hash mismatch: {out_name} bytes={actual_size} sha256={actual_sha}"
                )
                continue

            target = dest / out_name
            target.write_bytes(data)
            try:
                shown = target.relative_to(dest_root)
            except ValueError:
                shown = target
            print(f"OK  {shown}")
    finally:
        for zf in archive_cache.values():
            zf.close()

    if failures:
        print("\nInstallation stopped:")
        for item in sorted(set(failures)):
            print("-", item)
        return 1

    print(f"\nAll V16 webfonts installed and verified under: {dest_root}")
    print(f"Next: python tools/verify-v16-assets.py --root {dest_root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
