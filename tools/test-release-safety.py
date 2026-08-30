#!/usr/bin/env python3
"""Adversarial regression checks for the static publication and staging pipeline."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
STAGER = ROOT / "tools/build-release.py"
VERIFIER = ROOT / "tools/verify-assets.py"
RELEASE = ROOT / ".release"
PROPRIETARY = ("RaviFaNum-", "Anjoman-", "Pinar-", "Kahroba-")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def invoke(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(STAGER), *args], cwd=ROOT, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )


def remove_fixture_link(path: Path) -> None:
    if path.is_symlink():
        path.unlink()
    elif path.exists():
        raise AssertionError(f"refusing to remove non-symlink test fixture: {path}")


def main() -> int:
    RELEASE.mkdir(exist_ok=True)
    source_link = ROOT / "assets" / f"_release-safety-private-link-{os.getpid()}"
    output_link = RELEASE / f"_release-safety-output-link-{os.getpid()}"
    remove_fixture_link(ROOT / "assets" / "_release-safety-private-link")
    remove_fixture_link(RELEASE / "_release-safety-output-link")
    remove_fixture_link(source_link)
    remove_fixture_link(output_link)

    with tempfile.TemporaryDirectory(prefix="ui-release-safety-") as temp:
        external = Path(temp) / "external"
        external.mkdir()
        sentinel = external / "must-survive.txt"
        sentinel.write_text("private data", encoding="utf-8")

        blocked = invoke("--output", str(external))
        require(blocked.returncode != 0, "stager accepted output outside .release")
        require(sentinel.read_text(encoding="utf-8") == "private data", "external output was deleted")

        blocked = invoke("--output", str(RELEASE / ".." / "outside"))
        require(blocked.returncode != 0, "stager accepted parent traversal")

        try:
            output_link.symlink_to(external, target_is_directory=True)
            blocked = invoke("--output", str(output_link / "nested"))
            require(blocked.returncode != 0, "stager followed output symbolic link")
            require(sentinel.exists(), "symbolic-link output deleted external data")
        finally:
            remove_fixture_link(output_link)

        try:
            source_link.symlink_to(sentinel)
            blocked = invoke("--output", str(RELEASE / "_release-safety-rejected"))
            require(blocked.returncode != 0, "stager followed private source symbolic link")
        finally:
            remove_fixture_link(source_link)

        output = RELEASE / "_release-safety-ok"
        staged = invoke("--output", str(output))
        require(staged.returncode == 0, "safe stage failed:\n" + staged.stdout + staged.stderr)

        staged_files = {path.relative_to(output).as_posix() for path in output.rglob("*") if path.is_file()}
        required = {
            "index.html", "_headers", "robots.txt", "favicon.svg",
            "assets/data/dataset-manifest.json",
            "assets/js/app.js", "assets/js/community-notes.js", "assets/js/reviews.js", "assets/js/loader.js",
            "assets/css/app.css",
            "assets/fonts/Vazirmatn-Regular.woff2", "assets/fonts/Vazirmatn-Bold.woff2", "assets/fonts/OFL.txt",
        }
        require(required <= staged_files, f"required staged runtime files missing: {sorted(required - staged_files)}")
        require(not any(path.startswith(("tools/", ".github/", "vendor-fonts/")) for path in staged_files), "development/private files entered release")
        require(not any(Path(path).name.startswith(PROPRIETARY) for path in staged_files), "commercial fonts entered default public release")

        dataset_scripts = {path for path in staged_files if path.startswith("assets/data/") and path.endswith(".js")}
        expected_dataset = {f"assets/data/professors-{index:02}.js" for index in range(1, 7)}
        require(dataset_scripts == expected_dataset, f"unexpected public dataset copies: {sorted(dataset_scripts)}")
        require(not any(path.startswith("assets/js/data") for path in staged_files), "inactive archived data chunks entered release")
        require(not any(path.endswith("README.md") for path in staged_files), "documentation unexpectedly entered staged release")
        require(not any(path.startswith("assets/avatar/") for path in staged_files), "avatar assets entered the public release")

        staged_html = (output / "index.html").read_text(encoding="utf-8")
        staged_loader = (output / "assets/js/loader.js").read_text(encoding="utf-8")
        require("assets/avatar/" not in staged_html, "index.html still references avatar assets")
        require("assets/avatar/" not in staged_loader, "loader runtime still references avatar assets")
        require("story-avatar" not in staged_html, "avatar element returned to the loading screen")

        manifest = json.loads((output / "assets/data/dataset-manifest.json").read_text(encoding="utf-8"))
        chunk_hashes = manifest["sha256"]["public_data_chunks"]
        require(set(chunk_hashes) == expected_dataset, "manifest contains stale dataset aliases")
        for relative, expected in chunk_hashes.items():
            actual = hashlib.sha256((output / relative).read_bytes()).hexdigest()
            require(actual == expected, f"staged chunk hash mismatch: {relative}")

        runtime = manifest["integrity"]["public_runtime_git_blobs"]
        expected_runtime = {"assets/js/app.js", "assets/js/community-notes.js", "assets/js/reviews.js", "assets/js/loader.js"}
        require(set(runtime) == expected_runtime, "manifest runtime allowlist is stale")

        result = subprocess.run(
            [sys.executable, str(VERIFIER), "--root", str(output)], cwd=ROOT,
            capture_output=True, text=True, check=False,
        )
        require(result.returncode == 0, "independent staged verification failed:\n" + result.stdout + result.stderr)

        tamper_target = output / next(relative for relative in chunk_hashes if (output / relative).is_file())
        original = tamper_target.read_bytes()
        tamper_target.write_bytes(original + b"\n// tamper regression probe\n")
        try:
            result = subprocess.run(
                [sys.executable, str(VERIFIER), "--root", str(output)], cwd=ROOT,
                capture_output=True, text=True, check=False,
            )
            require(result.returncode != 0, "verifier accepted tampered public data")
        finally:
            tamper_target.write_bytes(original)

        runtime_target = output / "assets/js/community-notes.js"
        original_runtime = runtime_target.read_bytes()
        runtime_target.write_bytes(original_runtime + b"\n// runtime tamper probe\n")
        try:
            result = subprocess.run(
                [sys.executable, str(VERIFIER), "--root", str(output)], cwd=ROOT,
                capture_output=True, text=True, check=False,
            )
            require(result.returncode != 0, "verifier accepted tampered qualitative runtime")
        finally:
            runtime_target.write_bytes(original_runtime)
            shutil.rmtree(output)

    print("Release safety checks passed: traversal, deletion, symlinks, allowlist, licensing, no avatar assets and integrity metadata.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Release safety check failed: {exc}", file=sys.stderr)
        raise
