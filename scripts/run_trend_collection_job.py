from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run one operator-assisted Xiaohongshu/Douyin trend collection job."
    )
    parser.add_argument("job_id", type=int)
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--operator-wait-seconds", type=int, default=60)
    parser.add_argument("--max-scrolls", type=int, default=6)
    args = parser.parse_args()

    sys.path.insert(0, str(BACKEND_ROOT))
    try:
        from fastapi import HTTPException

        from app.db.session import SessionLocal
        from app.services.trend_browser_collector import run_browser_collection_job
    except ModuleNotFoundError as exc:
        print(
            json.dumps(
                {
                    "status": "blocked",
                    "job_id": args.job_id,
                    "detail": (
                        "Backend dependencies are not installed in this Python environment. "
                        "Install backend[collector] before running collection."
                    ),
                },
                ensure_ascii=False,
            )
        )
        raise SystemExit(1) from exc

    db = SessionLocal()
    try:
        items = run_browser_collection_job(
            db=db,
            job_id=args.job_id,
            headless=args.headless,
            operator_wait_seconds=max(0, args.operator_wait_seconds),
            max_scrolls=max(1, args.max_scrolls),
        )
    except HTTPException as exc:
        print(
            json.dumps(
                {
                    "status": "blocked",
                    "job_id": args.job_id,
                    "status_code": exc.status_code,
                    "detail": exc.detail,
                },
                ensure_ascii=False,
            )
        )
        raise SystemExit(1) from exc
    finally:
        db.close()

    print(
        json.dumps(
            {
                "status": "completed" if items else "needs_operator_review",
                "job_id": args.job_id,
                "collected_items": len(items),
                "trend_ids": [item.id for item in items],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
