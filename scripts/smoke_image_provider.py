from __future__ import annotations

from fastapi import HTTPException

from app.services.model_router import model_router


def main() -> None:
    try:
        result = model_router.image_model(
            "image_generation",
            {
                "content_id": 0,
                "platform": "xiaohongshu",
                "title": "硕升博申请节奏",
                "body": "先确认研究方向，再准备材料和沟通导师。",
                "tags": ["硕升博", "博士申请", "规划"],
                "content_status": "approved",
                "template": {
                    "id": "xiaohongshu-cover",
                    "name": "Xiaohongshu cover",
                    "platform": "xiaohongshu",
                    "aspect_ratio": "3:4",
                    "description": "Readable title-led cover for notes.",
                },
                "aspect_ratio": "3:4",
                "style_notes": "clean, readable, warm but professional",
                "user": {"id": 0, "role": "system_smoke_test"},
            },
        )
    except HTTPException as exc:
        print("image_provider_status=failed")
        print(f"image_provider_error={exc.detail}")
        raise SystemExit(1) from exc

    print("image_provider_status=ok")
    print(f"image_provider_result_type={'local' if result.startswith('/static/') else 'remote'}")


if __name__ == "__main__":
    main()
