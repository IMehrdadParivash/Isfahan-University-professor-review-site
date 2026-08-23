#!/usr/bin/env python3
"""Sanitize every public V17 dataset copy and regenerate verifiable hashes."""
from __future__ import annotations

import argparse
import base64
import gzip
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_validator():
    spec = importlib.util.spec_from_file_location("ui_v17_validator", ROOT / "tools/validate-data.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load public V17 validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sanitize(pack: dict) -> tuple[int, int, int]:
    overall = dimensions = dates = 0
    for professor in pack.get("p", []):
        for course in professor[7]:
            if course[1] < 2:
                overall += course[2] is not None
                dates += course[4] is not None
                course[2] = course[4] = None
            for dimension in course[3]:
                if dimension[1] < 2:
                    dimensions += dimension[0] is not None
                    dimension[0] = None
    return overall, dimensions, dates


def write_chunks(validator, pack: dict, scripts: list[str]) -> tuple[bytes, bytes]:
    raw = json.dumps(pack, ensure_ascii=False, separators=(",", ":")).encode()
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    encoded = base64.b64encode(compressed).decode("ascii")
    width = (len(encoded) + len(scripts) - 1) // len(scripts)
    for offset, relative in enumerate(scripts):
        payload = encoded[offset * width : (offset + 1) * width]
        if not payload:
            raise RuntimeError("dataset has fewer encoded bytes than data chunks")
        source = (f'window.__UI_DB_GZ_PARTS=["{payload}"];\n' if offset == 0
                  else f'window.__UI_DB_GZ_PARTS.push("{payload}");\n')
        (ROOT / relative).write_text(source, encoding="utf-8")
    return raw, compressed


def update_manifest(validator, pack: dict, raw: bytes, compressed: bytes, scripts: list[str]) -> None:
    path = ROOT / "assets/data/dataset-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["dataset_version"] = "2026-08-23-v3-privacy-hardened"
    manifest["statistics"] = dict(pack["s"])
    manifest.setdefault("privacy", {}).update(
        student_personal_identifiers_in_frontend=False,
        raw_chat_text_in_frontend=False,
        singleton_scores_removed_before_publication=True,
        singleton_exact_dates_removed_before_publication=True,
    )
    manifest["sha256"] = {
        "canonical_roster": validator.roster_digest(pack),
        "safe_evidence": validator.evidence_digest(pack),
        "site_database": validator.sha256(raw),
        "public_compressed_dataset": validator.sha256(compressed),
        "public_data_chunks": {
            relative: validator.sha256((ROOT / relative).read_bytes())
            for relative in validator.public_chunk_files(scripts)
        },
        "public_runtime_files": {
            relative: validator.sha256((ROOT / relative).read_bytes())
            for relative in sorted(validator.runtime_references())
        },
    }
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    argparse.ArgumentParser(description=__doc__).parse_args()
    validator = load_validator()
    scripts = validator.script_references()
    pack, _, _ = validator.load_public_data(scripts)
    overall, dimensions, dates = sanitize(pack)
    raw, compressed = write_chunks(validator, pack, scripts)
    update_manifest(validator, pack, raw, compressed, scripts)
    print(
        f"Public V17 dataset rebuilt: {overall} singleton overall scores, "
        f"{dimensions} singleton dimension scores, and {dates} exact singleton dates removed; "
        f"{len(validator.public_chunk_files(scripts))} public chunk copies updated."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
