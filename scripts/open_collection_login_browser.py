from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"


def _search_url(platform: str, keyword: str) -> str:
    encoded_keyword = quote(keyword.strip() or "硕升博")
    if platform == "douyin":
        return f"https://www.douyin.com/search/{encoded_keyword}"
    return f"https://www.xiaohongshu.com/search_result?keyword={encoded_keyword}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Open the persistent collection login browser for operator-owned login."
    )
    parser.add_argument("--platform", choices=["xiaohongshu", "douyin"], default="xiaohongshu")
    parser.add_argument("--keyword", default="硕升博")
    parser.add_argument(
        "--session-label",
        default=None,
        help="Persistent session label. Defaults to the platform so future collection jobs reuse it.",
    )
    parser.add_argument(
        "--timeout-minutes",
        type=int,
        default=480,
        help="How long to keep the visible browser process alive.",
    )
    parser.add_argument(
        "--print-session-dir",
        action="store_true",
        help="Print the persistent session directory and exit without opening a browser.",
    )
    args = parser.parse_args()

    sys.path.insert(0, str(BACKEND_ROOT))
    from app.services.trend_browser_collector import collection_session_dir

    session_dir = collection_session_dir(
        platform=args.platform,
        keyword=args.keyword,
        session_label=args.session_label or args.platform,
    )
    session_dir.mkdir(parents=True, exist_ok=True)

    if args.print_session_dir:
        print(session_dir)
        return

    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError as exc:
        print(
            "Playwright is not installed. Install backend[collector] before opening the login browser.",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    target_url = _search_url(args.platform, args.keyword)
    wait_ms = max(1, args.timeout_minutes) * 60 * 1000
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(session_dir),
            headless=False,
            slow_mo=120,
            viewport={"width": 1280, "height": 900},
        )
        page = context.pages[0] if context.pages else context.new_page()
        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=60_000)
        except Exception:
            pass
        print(f"Opened {args.platform} login browser with session: {session_dir}")
        try:
            page.wait_for_timeout(wait_ms)
        except PlaywrightError:
            pass
        finally:
            context.close()


if __name__ == "__main__":
    main()
