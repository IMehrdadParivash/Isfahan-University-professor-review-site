#!/usr/bin/env python3
"""Safely build the active static website under the local .release tree."""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
RELEASE_ROOT = ROOT / ".release"
PROPRIETARY_FAMILIES = ("RaviFaNum-", "Anjoman-", "Pinar-", "Kahroba-")


class AssetParser(HTMLParser):
    """Collect local runtime references without executing or guessing site code."""

    def __init__(self) -> None:
        super().__init__()
        self.references: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key not in {"src", "href"} or not value:
                continue
            parsed = urlsplit(value)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            self.references.add(parsed.path.lstrip("/"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=RELEASE_ROOT / "site")
    return parser.parse_args()


def run(*args: str) -> None:
    print("+", " ".join(args))
    subprocess.run(args, cwd=ROOT, check=True)


def safe_output_path(candidate: Path) -> Path:
    """Reject symlink traversal, parent traversal and deletion outside .release."""
    absolute = candidate if candidate.is_absolute() else ROOT / candidate
    if any(part == ".." for part in absolute.parts):
        raise SystemExit("Refusing unsafe release output path: parent traversal")
    resolved = absolute.resolve(strict=False)
    allowed_root = RELEASE_ROOT.resolve(strict=False)
    if resolved == allowed_root or allowed_root not in resolved.parents:
        raise SystemExit("Refusing unsafe release output path: must be inside .release/")
    for ancestor in (absolute, *absolute.parents):
        if ancestor == ROOT.parent:
            break
        if ancestor.is_symlink():
            raise SystemExit("Refusing unsafe release output path: symbolic link")
    return resolved


def assert_no_source_symlinks() -> None:
    for path in (ROOT / "assets").rglob("*"):
        if path.is_symlink():
            raise SystemExit(f"Refusing to stage symbolic-link source asset: {path.relative_to(ROOT)}")


def active_runtime_files() -> set[Path]:
    parser = AssetParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    relative = {Path("index.html"), Path("assets/data/dataset-manifest.json")}
    for name in ("_headers", "robots.txt", "favicon.ico", "favicon.svg", "sitemap.xml"):
        if (ROOT / name).is_file():
            relative.add(Path(name))

    for ref in parser.references:
        candidate = Path(ref)
        if candidate.is_absolute() or ".." in candidate.parts:
            raise SystemExit(f"Refusing unsafe HTML asset reference: {ref}")
        source = ROOT / candidate
        if source.is_file():
            relative.add(candidate)

    # Publicly redistributable Vazirmatn must ship together with its full license.
    for name in ("Vazirmatn-Regular.woff2", "Vazirmatn-Bold.woff2", "OFL.txt"):
        path = Path("assets/fonts") / name
        if not (ROOT / path).is_file():
            raise SystemExit(f"Missing redistributable licensed font asset: {path}")
        relative.add(path)

    # Include relative CSS url() assets if a future stylesheet needs one.
    for css in tuple(path for path in relative if path.suffix.lower() == ".css"):
        text = (ROOT / css).read_text(encoding="utf-8")
        for ref in re.findall(r"url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)", text, flags=re.I):
            parsed = urlsplit(ref.strip())
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            candidate = (ROOT / css.parent / parsed.path).resolve(strict=False)
            if ROOT not in candidate.parents:
                raise SystemExit(f"Refusing CSS asset outside repository: {ref}")
            if candidate.is_file():
                relative.add(candidate.relative_to(ROOT))
    return relative


def main() -> int:
    args = parse_args()
    output = safe_output_path(args.output)
    assert_no_source_symlinks()

    # Cryptographic hashes cannot replace semantic privacy validation: a freshly
    # rehashed but disclosure-bearing dataset must never delete or replace output.
    run(sys.executable, str(TOOLS / "validate-data.py"))

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    for relative in sorted(active_runtime_files()):
        if relative.parent == Path("assets/fonts") and relative.name.startswith(PROPRIETARY_FAMILIES):
            continue
        source, destination = ROOT / relative, output / relative
        if source.is_symlink() or not source.is_file():
            raise SystemExit(f"Refusing unsafe/missing runtime source: {relative}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination, follow_symlinks=False)

    run(sys.executable, str(TOOLS / "verify-assets.py"), "--root", str(output))

    print("\nThe static website release is ready:")
    print(output)
    print("Deploy this directory itself to Cloudflare Pages; do not deploy .release/ as a parent folder.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
