from __future__ import annotations

from ._helpers import ROOT, _extract_ts_const_string_array, _extract_topic_preset_objects, _require_unique, _contains_any, _split_topic_tags


def validate_topic_presets_contract() -> int:
    topic_presets_text = (ROOT / "frontend" / "lib" / "topic-presets.ts").read_text(
        encoding="utf-8"
    )
    presets = _extract_topic_preset_objects(topic_presets_text)
    required_fields = {
        "audience",
        "coverDirection",
        "desktopHelper",
        "desktopLabel",
        "key",
        "knowledgeQuery",
        "mobileHelper",
        "mobileLabel",
        "tags",
        "topic",
    }
    label_contract = {
        "榜单型": ("ranking-", ("榜", "排名", "筛", "清单", "预算", "风险", "认证", "项目")),
        "路线型": ("route-", ("路线", "选择", "取舍", "路径", "国内", "海外")),
        "导师型": ("mentor-", ("导师", "套磁", "研究方向", "论文")),
        "时间型": ("timeline-", ("时间", "节点", "材料", "DDL", "月份", "优先级")),
        "来源型": ("source-", ("来源", "核验", "官网", "校徽", "价格", "费用", "学费", "认证", "logo")),
        "转化型": ("sales-", ("咨询", "转化", "私域", "线索", "话术", "价值")),
    }
    topic_preset_mojibake_markers = (
        "鎯",
        "鐭",
        "鍗",
        "璺",
        "瀵",
        "鏃",
        "杞",
        "绾",
        "妫",
        "缂",
        "閫",
        "灏",
        "涓",
        "鍦",
        "鍚",
        "鏉",
        "浜",
        "鐢",
        "鑱",
        "绋",
        "褰",
        "鏍",
        "搴",
        "鍜",
    )

    total = 0
    if _split_topic_tags("水博，海外博士、在职博士;博士项目") != [
        "水博",
        "海外博士",
        "在职博士",
        "博士项目",
    ]:
        raise SystemExit("Topic preset tag splitter must support Chinese separators.")
    total += 1

    if len(presets) < 20:
        raise SystemExit("Generation topic preset pool is too small")
    total += 1

    source_evidence_keywords = _extract_ts_const_string_array(
        "SOURCE_EVIDENCE_REQUIRED_KEYWORDS",
        topic_presets_text,
    )
    required_source_keywords = [
        "官网",
        "官方",
        "来源",
        "费用",
        "学费",
        "价格",
        "排名",
        "榜单",
        "学校",
        "项目清单",
        "认证",
        "logo",
        "official",
        "tuition",
        "fees",
        "ranking",
        "program list",
        "accreditation",
        "市场数据",
        "市场行情",
        "行情",
        "market data",
        "market rates",
        "pricing benchmarks",
        "汇率",
        "exchange rate",
        "currency conversion",
    ]
    missing_source_keywords = sorted(
        keyword for keyword in required_source_keywords if keyword not in source_evidence_keywords
    )
    if missing_source_keywords:
        raise SystemExit(
            "Source-evidence custom topic classifier is missing keywords: "
            + ", ".join(missing_source_keywords)
        )
    total += len(required_source_keywords)

    for snippet in [
        "export function generationTopicRequiresSourceEvidence",
        'preset?.key.startsWith("source-")',
        "SOURCE_EVIDENCE_REQUIRED_KEYWORDS.some",
        "searchText.includes",
    ]:
        if snippet not in topic_presets_text:
            raise SystemExit(f"Missing source-evidence classifier contract: {snippet}")
        total += 1

    keyword_contract_cases = [
        ("global water PhD ranking list", True),
        ("全球水博排名清单", True),
        ("water resources PhD university program list", True),
        ("official tuition fees and logo verification", True),
        ("overseas doctoral consulting market data benchmarks", True),
        ("博士项目市场行情和最新价格", True),
        ("overseas doctoral exchange rate and currency conversion check", True),
        ("博士项目汇率和币种换算怎么核验", True),
        ("marketing content conversion hooks", False),
        ("how to choose domestic or overseas PhD route", False),
    ]
    for sample, expected_match in keyword_contract_cases:
        actual_match = _contains_any(sample, tuple(source_evidence_keywords))
        if actual_match != expected_match:
            raise SystemExit(
                f"Source-evidence keyword classifier sample {sample!r} expected "
                f"{expected_match}, got {actual_match}"
            )
        total += 1

    total += _require_unique([preset.get("key", "") for preset in presets], "topic preset keys")
    total += _require_unique([preset.get("topic", "") for preset in presets], "topic preset topics")

    labels = {preset.get("desktopLabel", "") for preset in presets}
    missing_labels = sorted(set(label_contract) - labels)
    if missing_labels:
        raise SystemExit("Missing topic preset categories: " + ", ".join(missing_labels))
    total += len(label_contract)

    minimum_label_counts = {
        "榜单型": 4,
        "路线型": 4,
        "导师型": 4,
        "时间型": 4,
        "来源型": 2,
        "转化型": 4,
    }
    for label, minimum in minimum_label_counts.items():
        actual_count = sum(1 for preset in presets if preset.get("desktopLabel") == label)
        if actual_count < minimum:
            raise SystemExit(
                f"Topic preset category {label} must have at least {minimum} items, got {actual_count}"
            )
        total += 1

    fact_sensitive_label_requirements = {
        "榜单型": (
            ("核实", "核验", "认证", "风险", "未核实", "不承诺"),
        ),
        "来源型": (
            ("官网", "官方"),
            ("核验", "待复核", "待确认", "未核实", "不写", "不展示"),
        ),
    }
    category_intent_contract = {
        "榜单型": {
            "required": ("榜", "排名", "清单", "筛", "预算", "风险", "认证", "项目"),
            "forbidden": ("导师匹配", "套磁邮件", "时间线", "私域SOP", "咨询转化"),
        },
        "路线型": {
            "required": ("路线", "选择", "取舍", "路径", "国内", "海外", "先选"),
            "forbidden": ("榜单", "导师匹配", "时间线", "私域SOP", "咨询转化"),
        },
        "导师型": {
            "required": ("导师", "套磁", "研究方向", "论文", "适配"),
            "forbidden": ("避坑榜", "预算榜单", "时间线", "私域SOP", "咨询转化"),
        },
        "时间型": {
            "required": ("时间", "节点", "材料", "截止", "优先级", "一年", "什么时候"),
            "forbidden": ("榜单", "排名", "导师匹配", "私域SOP", "咨询转化"),
        },
        "来源型": {
            "required": ("来源", "核验", "官网", "校徽", "价格", "费用", "学费", "认证", "logo"),
            "forbidden": ("导师匹配", "套磁邮件", "时间线", "私域SOP", "咨询转化"),
        },
        "转化型": {
            "required": ("咨询", "转化", "私域", "线索", "话术", "价值", "异议"),
            "forbidden": ("避坑榜", "预算榜单", "导师匹配", "时间线"),
        },
    }
    intent_fields = (
        "topic",
        "audience",
        "knowledgeQuery",
        "tags",
        "coverDirection",
        "desktopHelper",
        "mobileHelper",
    )
    drift_guard_fields = ("topic", "desktopHelper", "mobileHelper", "tags")

    for preset in presets:
        missing = sorted(field for field in required_fields if not preset.get(field, "").strip())
        if missing:
            raise SystemExit(
                f"Topic preset {preset.get('key', '<unknown>')} missing fields: "
                + ", ".join(missing)
            )
        for field in required_fields:
            value = preset[field]
            if any("\ue000" <= char <= "\uf8ff" for char in value):
                raise SystemExit(
                    f"Topic preset {preset['key']} field {field} contains private-use text"
                )
            marker = next(
                (marker for marker in topic_preset_mojibake_markers if marker in value),
                None,
            )
            if marker:
                raise SystemExit(
                    f"Topic preset {preset['key']} field {field} contains mojibake marker {marker}"
                )
        label = preset["desktopLabel"]
        if label not in label_contract:
            raise SystemExit(f"Unknown topic preset label: {label}")
        expected_prefix, semantic_terms = label_contract[label]
        if not preset["key"].startswith(expected_prefix):
            raise SystemExit(
                f"Topic preset {preset['key']} must use prefix {expected_prefix} for {label}"
            )
        semantic_text = " ".join(
            [
                preset["topic"],
                preset["mobileHelper"],
                preset["desktopHelper"],
                preset["coverDirection"],
                preset["knowledgeQuery"],
                preset["tags"],
            ]
        )
        if not _contains_any(semantic_text, semantic_terms):
            raise SystemExit(f"Topic preset {preset['key']} lacks semantic terms for {label}")
        intent_contract = category_intent_contract[label]
        intent_text = " ".join(preset[field] for field in intent_fields)
        if not _contains_any(intent_text, intent_contract["required"]):
            raise SystemExit(
                f"Topic preset {preset['key']} lacks intent anchors for {label}"
            )
        drift_guard_text = " ".join(preset[field] for field in drift_guard_fields)
        drift_term = next(
            (term for term in intent_contract["forbidden"] if term in drift_guard_text),
            None,
        )
        if drift_term:
            raise SystemExit(
                f"Topic preset {preset['key']} contains cross-category drift term {drift_term}"
            )
        tag_count = len(_split_topic_tags(preset["tags"]))
        if tag_count < 3:
            raise SystemExit(f"Topic preset {preset['key']} should have at least 3 tags")
        fact_requirements = fact_sensitive_label_requirements.get(label, ())
        fact_text = " ".join([preset["coverDirection"], preset["desktopHelper"]])
        for terms in fact_requirements:
            if not _contains_any(fact_text, terms):
                raise SystemExit(
                    f"Topic preset {preset['key']} lacks fact-sensitive boundary terms for {label}"
                )
            total += 1
        total += len(required_fields) + 5

    return total
