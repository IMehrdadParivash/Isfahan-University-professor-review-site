#!/usr/bin/env python3
"""Static and SQLite contract checks for the dependency-free PHP backend."""
from __future__ import annotations

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    connection = sqlite3.connect(":memory:")
    connection.executescript((ROOT / "database/schema.sqlite.sql").read_text(encoding="utf-8"))
    tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    required = {
        "faculties", "departments", "professors", "courses", "professor_courses", "users",
        "reviews", "review_ratings", "votes", "reports", "moderation_actions", "rate_limits",
        "professor_stats", "professor_change_requests",
    }
    require(required <= tables, f"missing database tables: {sorted(required - tables)}")

    connection.execute("INSERT INTO faculties(name,slug) VALUES('علوم','علوم')")
    connection.execute("INSERT INTO departments(faculty_id,name,slug) VALUES(1,'زیست','علوم-زیست')")
    connection.execute("INSERT INTO professors VALUES(1,1,'استاد نمونه','استادیار',NULL,1,'2026-08-30','2026-08-30')")
    connection.execute("INSERT INTO reviews(professor_id,display_mode,body,recommended,status,technical_hash,duplicate_hash,created_at,published_at) VALUES(1,'anonymous','یک تجربه آموزشی مشخص و قابل بررسی',1,'published','a','d','2026-08-30','2026-08-30')")
    connection.execute("INSERT INTO review_ratings VALUES(1,'overall',5)")
    connection.execute("INSERT INTO votes VALUES(1,'voter',1,'2026-08-30',NULL)")
    connection.execute("INSERT INTO reports(review_id,reporter_hash,reason,status,created_at) VALUES(1,'reporter','privacy','open','2026-08-30')")
    try:
        connection.execute("INSERT INTO review_ratings VALUES(1,'behavior',6)")
        raise AssertionError("rating constraint accepted score above five")
    except sqlite3.IntegrityError:
        pass
    try:
        connection.execute("INSERT INTO votes VALUES(1,'voter',-1,'2026-08-30',NULL)")
        raise AssertionError("duplicate vote identity was accepted")
    except sqlite3.IntegrityError:
        pass

    columns = {row[1]: row for row in connection.execute("PRAGMA table_info(reviews)")}
    require(columns["technical_hash"][3] == 0, "technical hash cannot be forgotten after retention window")
    require("ip" not in columns, "raw IP column exists in reviews")

    security = (ROOT / "app/Security.php").read_text(encoding="utf-8")
    service = (ROOT / "app/ReviewService.php").read_text(encoding="utf-8")
    api = (ROOT / "api/index.php").read_text(encoding="utf-8")
    admin = (ROOT / "admin/index.php").read_text(encoding="utf-8")
    require("hash_hmac('sha256'" in security, "client identifiers are not HMAC protected")
    require("strip_tags" in security and "moderationRisk" in security, "content safety controls are missing")
    require("verifyCsrf" in api and "rateLimit" in service, "CSRF or rate limiting is missing")
    require("duplicate_hash" in service and "technical_hash" in service, "duplicate/abuse controls are missing")
    require("'anonymous', 'alias', 'real_name', 'account'" in service, "review identity modes drifted")
    require("moderation_actions" in admin and "reason" in admin, "moderation audit trail is missing")
    require("DELETE FROM reviews" not in admin, "admin panel contains direct review deletion")
    require("config.php" in (ROOT / ".gitignore").read_text(encoding="utf-8"), "production config is not ignored")

    print("Backend contract checks passed: schema, constraints, privacy, abuse controls and moderation audit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
