#!/usr/bin/env python3
"""Adversarial regression tests for privacy-safe, hash-verified public data."""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def import_from(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PublicDataPrivacyRegression(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="ui-v17-privacy-")
        self.root = Path(self.directory.name)
        shutil.copy2(ROOT / "index.html", self.root / "index.html")
        for folder in ("assets/js", "assets/data", "assets/avatar"):
            shutil.copytree(ROOT / folder, self.root / folder)
        (self.root / "tools").mkdir()
        for name in ("validate-v17-data.py", "sanitize-v17-data.py"):
            shutil.copy2(ROOT / "tools" / name, self.root / "tools" / name)
        self.validator = import_from(self.root / "tools/validate-v17-data.py", "v17_privacy_validator")
        self.sanitizer = import_from(self.root / "tools/sanitize-v17-data.py", "v17_privacy_sanitizer")

    def tearDown(self) -> None:
        self.directory.cleanup()

    def assert_rejected(self, expected: str) -> None:
        with self.assertRaisesRegex(AssertionError, expected), contextlib.redirect_stdout(io.StringIO()):
            self.validator.main()

    def replace_dataset(self, mutate) -> None:
        scripts = self.validator.script_references()
        pack, _, _ = self.validator.load_public_data(scripts)
        mutate(pack)
        raw, compressed = self.sanitizer.write_chunks(self.validator, pack, scripts)
        self.sanitizer.update_manifest(self.validator, pack, raw, compressed, scripts)

    @staticmethod
    def singleton(pack: dict) -> list:
        return next(course for professor in pack["p"] for course in professor[7] if course[1] < 2)

    @staticmethod
    def nonrankable_multiple(pack: dict) -> list:
        return next(course for professor in pack["p"] for course in professor[7]
                    if course[1] >= 2 and not course[5])

    def test_clean_public_data_passes(self) -> None:
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(self.validator.main(), 0)

    def test_singleton_overall_is_rejected_even_when_rehashed(self) -> None:
        self.replace_dataset(lambda pack: self.singleton(pack).__setitem__(2, 4.5))
        self.assert_rejected("singleton course score")

    def test_singleton_dimension_is_rejected_even_when_rehashed(self) -> None:
        def mutate(pack):
            dimension = next(d for d in self.singleton(pack)[3] if d[1] < 2)
            dimension[0] = 4.5
        self.replace_dataset(mutate)
        self.assert_rejected("singleton teaching-dimension score")

    def test_singleton_exact_date_is_rejected_even_when_rehashed(self) -> None:
        self.replace_dataset(lambda pack: self.singleton(pack).__setitem__(4, "2026-08-20"))
        self.assert_rejected("singleton course score or exact evidence date")

    def test_nonrankable_invalid_date_syntax_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: self.nonrankable_multiple(pack).__setitem__(4, "2026-01-01<script>"))
        self.assert_rejected("invalid public evidence date syntax")

    def test_nonrankable_invalid_calendar_date_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: self.nonrankable_multiple(pack).__setitem__(4, "2026-02-30"))
        self.assert_rejected("invalid public evidence calendar date")

    def test_future_evidence_date_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: self.nonrankable_multiple(pack).__setitem__(4, "2030-01-01"))
        self.assert_rejected("future public evidence date")

    def test_untrusted_official_profile_url_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: pack["p"][0].__setitem__(5, "https://ui.ac.ir.attacker.invalid/x"))
        self.assert_rejected("outside trusted HTTPS ui.ac.ir")

    def test_plain_http_official_profile_url_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: pack["p"][0].__setitem__(5, "http://ris.ui.ac.ir/profile/test"))
        self.assert_rejected("outside trusted HTTPS ui.ac.ir")

    def test_personal_email_in_public_text_is_rejected(self) -> None:
        synthetic_email = "student" + "@" + "example.com"
        self.replace_dataset(lambda pack: self.nonrankable_multiple(pack).__setitem__(0, synthetic_email))
        self.assert_rejected("possible personal identifier")

    def test_personal_mobile_in_public_text_is_rejected(self) -> None:
        synthetic_mobile = "0912" + "3456789"
        self.replace_dataset(lambda pack: self.nonrankable_multiple(pack).__setitem__(0, synthetic_mobile))
        self.assert_rejected("possible personal identifier")

    def test_raw_chat_top_level_field_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: pack.__setitem__("raw_chat", ["private identifiable student comment"]))
        self.assert_rejected("top-level field may expose raw student")

    def test_unexpected_raw_course_field_is_rejected(self) -> None:
        self.replace_dataset(lambda pack: self.nonrankable_multiple(pack).append("private raw student comment"))
        self.assert_rejected("course schema may expose raw student data")

    def test_dimension_above_valid_scale_is_rejected(self) -> None:
        def mutate(pack):
            course = self.nonrankable_multiple(pack)
            dimension = next(d for d in course[3] if d[1] >= 2)
            dimension[0] = 8.0
        self.replace_dataset(mutate)
        self.assert_rejected("invalid public dimension score")

    def test_loaded_chunk_tampering_is_rejected(self) -> None:
        path = self.root / self.validator.script_references()[0]
        path.write_text(path.read_text(encoding="utf-8") + "// tampered\n", encoding="utf-8")
        self.assert_rejected("legacy public data alias differs")

    def test_legacy_alias_tampering_is_rejected(self) -> None:
        path = self.root / "assets/js/data-01.js"
        path.write_text(path.read_text(encoding="utf-8") + "// old unsafe alias\n", encoding="utf-8")
        self.assert_rejected("legacy public data alias differs")

    def test_runtime_executable_tampering_is_rejected(self) -> None:
        path = self.root / self.validator.runtime_references()[0]
        path.write_text(path.read_text(encoding="utf-8") + "\n// tampered executable\n", encoding="utf-8")
        self.assert_rejected("sha256 mismatch for executable/data file")

    def test_manifest_database_hash_tampering_is_rejected(self) -> None:
        path = self.root / "assets/data/dataset-manifest.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["sha256"]["site_database"] = "0" * 64
        path.write_text(json.dumps(manifest), encoding="utf-8")
        self.assert_rejected("sha256.site_database")

    def test_extra_untracked_public_payload_is_rejected(self) -> None:
        payload = self.validator.extract_chunk(self.root / self.validator.script_references()[0])
        (self.root / "assets/js/data-hidden-unsafe.js").write_text(
            f'window.privateData="{payload}";\n', encoding="utf-8"
        )
        self.assert_rejected("untracked public data payload")

    def test_public_sanitizer_is_byte_for_byte_idempotent(self) -> None:
        def snapshot():
            paths = self.validator.public_chunk_files(self.validator.script_references())
            paths.append("assets/data/dataset-manifest.json")
            return {path: (self.root / path).read_bytes() for path in paths}

        initial = snapshot()
        scripts = self.validator.script_references()
        pack, _, _ = self.validator.load_public_data(scripts)
        self.assertEqual(self.sanitizer.sanitize(pack), (0, 0, 0))
        raw, compressed = self.sanitizer.write_chunks(self.validator, pack, scripts)
        self.sanitizer.update_manifest(self.validator, pack, raw, compressed, scripts)
        self.assertEqual(snapshot(), initial)


if __name__ == "__main__":
    unittest.main(verbosity=2)
