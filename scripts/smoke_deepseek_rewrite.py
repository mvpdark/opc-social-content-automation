from __future__ import annotations

from app.services.model_router import model_router


def main() -> None:
    result = model_router.rewrite_model(
        "humanization",
        {
            "content_id": 0,
            "platform": "xiaohongshu",
            "title": "硕升博申请节奏",
            "body": "申请博士需要提前规划研究方向，准备材料，并与导师沟通。",
            "tags": ["硕升博", "博士申请"],
            "instruction": "Rewrite in a natural Chinese operator voice. Keep it concise.",
            "user": {"id": 0, "role": "system_smoke_test"},
        },
    )
    print("deepseek_rewrite_status=ok")
    print(f"deepseek_rewrite_chars={len(result)}")


if __name__ == "__main__":
    main()
