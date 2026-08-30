#!/usr/bin/env python3
"""Build a guarded PHP/MySQL release for a low-cost shared host."""
from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / ".release"
OUTPUT = RELEASE / "parspack-site"
STATIC_BUILDER = ROOT / "tools" / "build-release.py"

SERVER_FILES = (
    ".htaccess", "index.php", "professor.php", "privacy.php", "community-guidelines.php",
    "sitemap.php", "config.example.php",
)
SERVER_DIRS = ("app", "api", "admin", "bin", "database")


def assert_safe(path: Path) -> None:
    resolved = path.resolve(strict=False)
    if RELEASE.resolve() not in resolved.parents:
        raise SystemExit("Refusing release path outside .release")
    for source in [*(ROOT / name for name in SERVER_FILES), *(ROOT / name for name in SERVER_DIRS)]:
        if source.is_symlink() or any(item.is_symlink() for item in source.rglob("*")):
            raise SystemExit(f"Refusing symbolic link in release source: {source}")


def main() -> int:
    assert_safe(OUTPUT)
    subprocess.run([sys.executable, str(STATIC_BUILDER), "--output", str(OUTPUT)], cwd=ROOT, check=True)
    for name in SERVER_FILES:
        source = ROOT / name
        if not source.is_file():
            raise SystemExit(f"Missing server runtime file: {name}")
        shutil.copy2(source, OUTPUT / name, follow_symlinks=False)
    for name in SERVER_DIRS:
        source = ROOT / name
        shutil.copytree(source, OUTPUT / name, dirs_exist_ok=True, symlinks=False)
    forbidden = [OUTPUT / "config.php", OUTPUT / ".git", OUTPUT / "storage" / "backups"]
    if any(path.exists() for path in forbidden):
        raise SystemExit("Private runtime material entered the release")
    archive = shutil.make_archive(str(RELEASE / "parspack-site"), "zip", root_dir=OUTPUT)
    print(f"\nParsPack release ready:\n{OUTPUT}\n{archive}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
