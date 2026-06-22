from __future__ import annotations

from ._helpers import ROOT, _warn

def validate_topic_intent_runtime_contract() -> int:
    topic_intent_path = ROOT / "backend" / "app" / "services" / "topic_intent.py"
    if not topic_intent_path.exists():
        _warn(
            "topic_intent.py has been removed; functionality merged into "
            "content_prompt_builder.py and model_router.py. "
            "Skipping topic intent runtime contract."
        )
        return 0

    import sys

    backend_path = str(ROOT / "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

    from app.services.topic_intent import (  # noqa: PLC0415
        first_matching_topic_intent,
        is_water_ranking_topic,
    )

    cases = [
        ("全球水博排名必看", ["水博", "海外博士"], "list_filter", True),
        ("硕升博申请路线怎么选", ["硕升博", "国内博士"], "route", False),
        ("申请路线清单怎么看", ["路线选择", "国内博士", "海外博士"], "route", False),
        ("没有论文申博清单怎么看", ["背景补强", "项目经历"], "background", False),
        ("导师匹配前要做的方向自查", ["博士申请", "导师"], "mentor", False),
        ("导师清单怎么筛", ["导师匹配", "研究方向"], "mentor", False),
        ("导师匹配清单怎么看", ["博士申请", "论文"], "mentor", False),
        ("在职博士申请时间线怎么排", ["在职博士", "材料"], "timeline", False),
        ("申博材料清单怎么看", ["申请时间线", "材料准备"], "timeline", False),
        ("博士申请材料清单怎么看", ["时间安排", "材料准备"], "timeline", False),
        ("申请节点清单怎么看", ["时间安排", "截止时间"], "timeline", False),
        ("DDL清单怎么看", ["申请时间线", "材料准备"], "timeline", False),
        ("时间节点清单怎么看", ["申请时间线", "优先级"], "timeline", False),
        ("博士申请DDL清单", ["时间安排", "截止时间"], "timeline", False),
        ("适合上班族的博士项目怎么咨询", ["博士项目", "转化"], "sales", False),
        ("转化话术清单怎么看", ["咨询转化", "话术"], "sales", False),
        ("水博项目校徽和价格怎么核验", ["官网核验", "校徽"], "source_check", False),
        ("海外博士官方来源和费用怎么查", ["官方来源", "官网核验", "学费费用"], "source_check", False),
        ("官方来源清单怎么看", ["官网核验", "认证政策"], "source_check", False),
        ("别人问博士含金量怎么回答", ["咨询转化", "价值"], "sales", False),
    ]

    total = 0
    for topic, tags, expected_key, expected_ranking in cases:
        intent = first_matching_topic_intent(topic, tags)
        actual_key = intent.key if intent else None
        if actual_key != expected_key:
            raise SystemExit(
                f"Topic intent {topic!r} expected {expected_key}, got {actual_key}"
            )
        total += 1

        actual_ranking = is_water_ranking_topic(topic, tags)
        if actual_ranking != expected_ranking:
            raise SystemExit(
                f"Topic ranking flag {topic!r} expected {expected_ranking}, "
                f"got {actual_ranking}"
            )
        total += 1

    return total
