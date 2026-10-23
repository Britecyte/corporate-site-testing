#!/usr/bin/env python3
"""
Validate news data and remove legacy per-article pages.

Homepage cards load from data/news.json and link straight to each item's
first source URL (publication PDF, press release, etc.).

Non-engineers: edit data/news.json only — no rebuild required for the listing.
Optional cleanup:
  python3 scripts/build-news.py
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "news.json"
NEWS_DIR = ROOT / "news"


def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8"))
    if not isinstance(items, list) or not items:
        raise SystemExit("data/news.json must be a non-empty array")

    for item in items:
        slug = item.get("id", "")
        if not re.fullmatch(r"[a-z0-9-]+", slug):
            raise SystemExit(f"Invalid id (use lowercase letters, numbers, hyphens): {slug!r}")
        links = item.get("links") or []
        if not links or not links[0].get("url"):
            raise SystemExit(f"Missing source link for {slug}")

    removed = 0
    if NEWS_DIR.is_dir():
        for child in NEWS_DIR.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
                removed += 1
                print(f"  removed news/{child.name}/")
            elif child.name == "_article-template.html":
                child.unlink()
                print("  removed news/_article-template.html")

    print(f"Validated {len(items)} news items. Listing is driven by data/news.json.")
    if removed:
        print(f"Cleaned {removed} legacy article folder(s).")


if __name__ == "__main__":
    main()
