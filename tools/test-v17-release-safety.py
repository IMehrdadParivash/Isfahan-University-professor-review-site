#!/usr/bin/env python3
"""Adversarial regression checks for V17 static publication and staging."""
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
STAGER = ROOT / "tools/stage-v16-release.py"
VERIFIER = ROOT / "tools/verify-v16-assets.py"
RELEASE = ROOT / ".release"
PROPRIETARY = ("RaviFaNum-", "Anjoman-", "Pinar-", "Kahroba-")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def invoke(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(STAGER), *args],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def remove_fixture_link(path: Path) -> None:
    # Path.exists() is false for dangling symlinks; is_symlink() is essential
    # after TemporaryDirectory removes their /tmp target.
    if path.is_symlink():
        path.unlink()
    elif path.exists():
        raise AssertionError(f"refusing to remove non-symlink test fixture: {path}")


def main() -> int:
    RELEASE.mkdir(exist_ok=True)
    # Unique fixture names avoid collisions if local and CI checks overlap.
    source_link = ROOT / "assets" / f"_release-safety-private-link-{os.getpid()}"
    output_link = RELEASE / f"_release-safety-output-link-{os.getpid()}"
    remove_fixture_link(ROOT / "assets" / "_release-safety-private-link")
    remove_fixture_link(RELEASE / "_release-safety-output-link")
    remove_fixture_link(source_link)
    remove_fixture_link(output_link)
    with tempfile.TemporaryDirectory(prefix="ui-v17-release-safety-") as temp:
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
            "index.html",
            "_headers",
            "robots.txt",
            "favicon.svg",
            "assets/data/dataset-manifest.json",
            "assets/fonts/Vazirmatn-Regular.woff2",
            "assets/fonts/Vazirmatn-Bold.woff2",
            "assets/fonts/OFL.txt",
        }
        require(required <= staged_files, f"required staged runtime files missing: {sorted(required - staged_files)}")
        require(not any(path.startswith(("tools/", ".github/", "vendor-fonts/")) for path in staged_files), "development/private files entered release")
        require(not any(Path(path).name.startswith(PROPRIETARY) for path in staged_files), "commercial fonts entered default public release")
        require(not any(path.startswith("assets/js/data-") and not path.startswith("assets/js/data-v17-") for path in staged_files), "inactive archived data chunks entered release")
        require(not any(path.endswith("README.md") for path in staged_files), "documentation unexpectedly entered staged release")
        active_loader_poses = {"pose-walk.webp", "pose-think.webp", "pose-work.webp", "pose-success.webp"}
        staged_poses = {Path(path).name for path in staged_files if path.startswith("assets/avatar/pose-")}
        require(staged_poses == active_loader_poses, f"staged avatar files differ from actual loading-story poses: {sorted(staged_poses)}")

        manifest = json.loads((output / "assets/data/dataset-manifest.json").read_text(encoding="utf-8"))
        chunk_hashes = manifest["sha256"]["public_data_chunks"]
        for relative, expected in chunk_hashes.items():
            staged_chunk = output / relative
            if not staged_chunk.exists() and not relative.startswith("assets/js/data-v17-"):
                continue
            actual = hashlib.sha256(staged_chunk.read_bytes()).hexdigest()
            require(actual == expected, f"staged chunk hash mismatch: {relative}")

        result = subprocess.run(
            [sys.executable, str(VERIFIER), "--root", str(output), "--allow-missing-fonts"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        require(result.returncode == 0, "independent staged verification failed:\n" + result.stdout + result.stderr)

        tamper_target = output / next(relative for relative in chunk_hashes if (output / relative).is_file())
        original = tamper_target.read_bytes()
        tamper_target.write_bytes(original + b"\n// tamper regression probe\n")
        try:
            result = subprocess.run(
                [sys.executable, str(VERIFIER), "--root", str(output), "--allow-missing-fonts"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            require(result.returncode != 0, "verifier accepted tampered public executable")
        finally:
            tamper_target.write_bytes(original)
            shutil.rmtree(output)

    print("V17 adversarial release safety checks passed: traversal, deletion, symlinks, allowlist, licensing and actual hashes.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"V17 release safety check failed: {exc}", file=sys.stderr)
        raise
