from __future__ import annotations

from app.services.model_router import model_router


def main() -> None:
    result = model_router.draft_model(
        "draft_generation",
        {
            "platform": "xiaohongshu",
            "topic": "硕升博申请节奏怎么规划",
            "tags": ["硕升博", "博士申请", "规划"],
            "tone": "自然、可信、克制",
            "target_audience": "正在准备硕升博申请的学生",
            "knowledge_query": "硕升博申请节奏",
            "knowledge_context": [
                {
                    "id": 0,
                    "title": "测试上下文",
                    "category": "smoke",
                    "content": "先确认研究方向，再准备材料和沟通导师。",
                    "score": 1.0,
                    "match_type": "manual",
                }
            ],
            "user": {"id": 0, "role": "system_smoke_test"},
        },
    )
    print("draft_provider_status=ok")
    print(f"draft_provider_chars={len(result)}")


if __name__ == "__main__":
    main()
