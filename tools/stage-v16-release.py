#!/usr/bin/env python3
"""Create a deployable V16 static directory with licensed fonts kept out of git.

The public/source checkout may omit proprietary WOFF2 binaries. This script
copies only runtime site files into a staging directory, installs the exact
licensed fonts from local archives, and runs the release verifier against the
staged output.

Usage:

    python tools/stage-v16-release.py

Default output: .release/v16

Required licensed archives must exist in the repository root or ./vendor-fonts/
as documented by tools/install-v16-fonts.py. Run this only where your font
license permits web deployment.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / ".release" / "v16")
    return parser.parse_args()


def run(*args: str) -> None:
    print("+", " ".join(args))
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> int:
    output = parse_args().output.resolve()
    if output == ROOT or ROOT in output.parents and output.name == "assets":
        raise SystemExit("Refusing unsafe release output path")

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    # Runtime root files only.
    for name in ("index.html", "_headers"):
        src = ROOT / name
        if src.is_file():
            shutil.copy2(src, output / name)

    # Copy runtime assets, but never copy source-checkout font binaries.
    assets_src = ROOT / "assets"
    assets_dst = output / "assets"

    def ignore_assets(directory: str, names: list[str]) -> set[str]:
        path = Path(directory)
        if path.name == "fonts":
            return {n for n in names if n.lower().endswith((".woff", ".woff2", ".ttf", ".otf"))}
        return set()

    shutil.copytree(assets_src, assets_dst, dirs_exist_ok=True, ignore=ignore_assets)

    run(sys.executable, str(TOOLS / "install-v16-fonts.py"), "--dest-root", str(output))
    run(sys.executable, str(TOOLS / "verify-v16-assets.py"), "--root", str(output))

    print("\nV16 staged release is ready:")
    print(output)
    print("Deploy this directory itself to Cloudflare Pages; do not deploy .release/ as a parent folder.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
