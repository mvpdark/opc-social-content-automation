from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "artifacts"
VIDEO_MARKERS = ("视频", "播放", "直播", "video-card", "video_note", "shorts")
BLOCKED_MARKERS = (
    "登录后查看搜索结果",
    "手机号登录",
    "获取验证码",
    "用户协议",
    "隐私政策",
    "扫码登录",
    "温馨提示",
    "广告屏蔽插件",
    "插件白名单",
    "沪ICP备",
    "营业执照",
    "公网安备",
    "增值电信业务经营许可证",
    "医疗器械网络交易服务第三方平台备案",
    "网械平台备字",
    "互联网药品信息服务资格证书",
    "网络文化经营许可证",
    "违法不良信息举报",
    "行吟信息科技",
    "个性化推荐算法",
    "网信算备",
    "beian.miit.gov.cn",
    "beian.cac.gov.cn",
    "agree.xiaohongshu.com",
    "fe-platform",
    ".pdf",
)


def normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def search_url(platform: str, keyword: str) -> str:
    encoded = quote(keyword)
    if platform == "xiaohongshu":
        return f"https://www.xiaohongshu.com/search_result?keyword={encoded}"
    raise SystemExit("Only xiaohongshu public image-text smoke test is enabled for now.")


def collect_public_candidates(
    platform: str,
    keyword: str,
    max_items: int,
    attempt: int = 1,
) -> dict[str, object]:
    try:
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Playwright is not installed. Run: python -m pip install -e \"backend[collector]\""
        ) from exc

    target_url = search_url(platform, keyword)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            storage_state=None,
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/148.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        page.goto(target_url, wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(8_000)
        for _ in range(4):
            page.mouse.wheel(0, 900)
            page.wait_for_timeout(1_600)

        raw_items = page.evaluate(
            """
() => Array.from(document.querySelectorAll("a, article, section, div"))
  .slice(0, 1200)
  .map((node) => {
    const linkNode = node.tagName === "A" ? node : node.querySelector("a[href]");
    return {
      text: (node.innerText || node.textContent || "").trim(),
      url: linkNode ? linkNode.href : location.href,
      className: node.className || "",
    };
  })
  .filter((item) => item.text.length > 30)
  .slice(0, 180)
"""
        )
        page_title = page.title()
        final_url = page.url
        context.close()
        browser.close()

    image_text_items = extract_image_text_candidates(
        raw_items=raw_items,
        final_url=final_url,
        max_items=max_items,
    )

    return {
        "attempt": attempt,
        "platform": platform,
        "keyword": keyword,
        "page_title": page_title,
        "final_url": final_url,
        "raw_candidates": len(raw_items),
        "image_text_count": len(image_text_items),
        "image_text_candidates": image_text_items,
    }


def run_serial_anonymous_attempts(
    platform: str,
    keyword: str,
    max_items: int,
    attempts: int,
) -> dict[str, object]:
    attempts = max(1, min(attempts, 10))
    results = [
        collect_public_candidates(
            platform=platform,
            keyword=keyword,
            max_items=max_items,
            attempt=index,
        )
        for index in range(1, attempts + 1)
    ]
    total_image_text_count = sum(int(result["image_text_count"]) for result in results)
    return {
        "platform": platform,
        "keyword": keyword,
        "mode": "serial_anonymous_no_cookie",
        "cookie_policy": "fresh_browser_context_without_storage_state",
        "attempts": attempts,
        "total_image_text_count": total_image_text_count,
        "successful_attempts": [
            result["attempt"] for result in results if int(result["image_text_count"]) > 0
        ],
        "results": results,
    }


def extract_image_text_candidates(
    raw_items: list[dict[str, object]],
    final_url: str,
    max_items: int,
) -> list[dict[str, str]]:
    seen: set[str] = set()
    image_text_items: list[dict[str, str]] = []
    for raw_item in raw_items:
        text = normalize_text(raw_item.get("text"))
        url = normalize_text(raw_item.get("url")) or final_url
        marker_source = f"{text} {url} {raw_item.get('className')}".lower()
        if len(text) < 30:
            continue
        if any(marker in marker_source for marker in BLOCKED_MARKERS):
            continue
        if any(marker in marker_source for marker in VIDEO_MARKERS):
            continue
        key = url if url != final_url else text[:160]
        if key in seen:
            continue
        seen.add(key)
        image_text_items.append(
            {
                "title": text[:80],
                "url": url,
                "content_preview": text[:320],
            }
        )
        if len(image_text_items) >= max_items:
            break
    return image_text_items


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        description="Smoke test anonymous public image-text search without storing results."
    )
    parser.add_argument("--platform", default="xiaohongshu")
    parser.add_argument("--keyword", default="硕升博")
    parser.add_argument("--max-items", type=int, default=8)
    parser.add_argument("--attempts", type=int, default=1)
    args = parser.parse_args()

    result = run_serial_anonymous_attempts(
        platform=args.platform,
        keyword=args.keyword,
        max_items=max(1, min(args.max_items, 20)),
        attempts=args.attempts,
    )
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_ROOT / f"public-image-text-search-{args.platform}.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "status": (
                    "ok" if int(result["total_image_text_count"]) > 0 else "needs_operator_review"
                ),
                "platform": result["platform"],
                "keyword": result["keyword"],
                "mode": result["mode"],
                "attempts": result["attempts"],
                "total_image_text_count": result["total_image_text_count"],
                "successful_attempts": result["successful_attempts"],
                "output_path": str(output_path),
                "sample": [
                    item
                    for attempt_result in result["results"]
                    for item in attempt_result["image_text_candidates"][:1]
                ][:3],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    sys.exit(main())
