from app.schemas.content import ContentGenerateRequest
from app.services.topic_intent import first_matching_topic_intent


FORBIDDEN_PROMOTION_CLAIMS = [
    "guaranteed admission",
    "guaranteed graduation",
    "guaranteed supervisor reply",
    "fake official endorsement",
    "fake rankings",
    "fake school logos",
    "unsupported tuition or price conclusions",
]

QUALITY_CHECKS = [
    "topic intent preserved",
    "source requirements satisfied or downgraded to verification framework",
    "CTA is clear and compliant",
    "cover angle matches title/body promise",
    "manual review remains required",
]

BRIEF_BY_INTENT = {
    "list_filter": {
        "target_persona": "applicant comparing doctoral routes or program pools",
        "pain_point": "does not know which routes are credible, affordable, or suitable",
        "trust_proof": "use verified source cards before naming programs or rankings",
        "offer_angle": "help the reader shortlist route dimensions before consultation",
        "cta": "invite the reader to bring their background for a manual fit check",
        "source_requirements": [
            "ranking, school, program, tuition, and certification claims need source cards",
            "without sources, provide comparison dimensions instead of named conclusions",
        ],
        "cover_angle": "ranking/list matrix with certification, budget, risk, and fit columns",
        "success_metric": "saves and comments asking for route comparison",
    },
    "source_check": {
        "target_persona": "applicant or operator verifying official program facts",
        "pain_point": "needs school, fee, logo, policy, or ranking facts but sources may be weak",
        "trust_proof": "show source boundaries and manual review notes before drafting",
        "offer_angle": "turn verification into a safer consultation entry point",
        "cta": "ask the reader to submit source links for manual review",
        "source_requirements": [
            "official pages, URLs, snippets, collection time, and usage boundaries are required",
            "missing live sources must produce verification steps only",
        ],
        "cover_angle": "source-card or verification checklist cover",
        "success_metric": "private messages with source links or verification questions",
    },
    "route": {
        "target_persona": "master's graduate choosing a doctoral application route",
        "pain_point": "cannot decide between domestic, overseas, in-service, or project-first paths",
        "trust_proof": "explain decision criteria and risk boundaries instead of one-size-fits-all advice",
        "offer_angle": "position consultation as route triage, not a guaranteed offer",
        "cta": "invite the reader to map budget, time, background, and goal before consulting",
        "source_requirements": [
            "current program facts require knowledge or web evidence",
            "route advice can use a decision framework when sources are incomplete",
        ],
        "cover_angle": "route decision map or forked-path cover",
        "success_metric": "comments describing background and route uncertainty",
    },
    "mentor": {
        "target_persona": "applicant preparing supervisor matching or outreach",
        "pain_point": "does not know how to prove direction fit before contacting supervisors",
        "trust_proof": "anchor advice on research direction, paper/project overlap, and material readiness",
        "offer_angle": "offer a fit-diagnosis checklist before outreach",
        "cta": "ask the reader to prepare direction keywords and past work for review",
        "source_requirements": [
            "specific supervisor claims need verified public sources",
            "without sources, use matching dimensions and preparation steps",
        ],
        "cover_angle": "mentor-fit matrix or direction self-check cover",
        "success_metric": "saves and DMs asking for direction-fit diagnosis",
    },
    "timeline": {
        "target_persona": "in-service applicant planning doctoral application timing",
        "pain_point": "does not know what to prepare first or when to contact programs",
        "trust_proof": "break tasks into timeline stages and identify source-sensitive deadlines",
        "offer_angle": "turn timing anxiety into a preparation checklist consultation",
        "cta": "invite the reader to compare their current stage with the checklist",
        "source_requirements": [
            "official deadlines and policies require source cards",
            "when dates are missing, provide relative preparation windows only",
        ],
        "cover_angle": "timeline, calendar, or material-priority cover",
        "success_metric": "saves and comments asking which stage they are in",
    },
    "background": {
        "target_persona": "applicant with weak paper or research experience signals",
        "pain_point": "worries that missing papers or scattered experience blocks doctoral applications",
        "trust_proof": "use background repair dimensions without promising acceptance",
        "offer_angle": "offer a conservative gap diagnosis before recommending programs",
        "cta": "ask the reader to list projects, work output, and research direction for review",
        "source_requirements": [
            "program eligibility claims require verified sources",
            "without sources, keep advice at preparation and feasibility-check level",
        ],
        "cover_angle": "background gap map or repair checklist cover",
        "success_metric": "DMs with background summaries for manual review",
    },
    "sales": {
        "target_persona": "potential consultation lead comparing doctoral project value",
        "pain_point": "has doubts about fit, recognition, budget, or service boundaries",
        "trust_proof": "state realistic criteria, forbidden claims, and next-step screening",
        "offer_angle": "low-pressure consultation fit check",
        "cta": "invite the reader to ask a specific fit question instead of promising results",
        "source_requirements": [
            "recognition, policy, price, and market claims require source cards",
            "sales copy must not fabricate offers, scarcity, or outcomes",
        ],
        "cover_angle": "consultation question card, objection card, or funnel checklist cover",
        "success_metric": "private messages with budget, goal, and background details",
    },
}

DEFAULT_BRIEF = {
    "target_persona": "postgraduate-to-PhD applicant",
    "pain_point": "needs clear next steps without exaggerated claims",
    "trust_proof": "use collected knowledge, web evidence, and manual review warnings",
    "offer_angle": "help the reader move from vague interest to a safe next-step checklist",
    "cta": "invite the reader to share background for manual review",
    "source_requirements": [
        "current facts require source cards",
        "without sources, provide a verification or preparation framework",
    ],
    "cover_angle": "clear checklist cover matched to the topic promise",
    "success_metric": "saves, comments, and qualified private messages",
}


def _source_requirement_notes(
    source_context: dict[str, object] | None,
) -> list[str]:
    if not isinstance(source_context, dict):
        return ["source context unavailable; avoid current-fact conclusions"]

    web_search = source_context.get("web_search")
    if not isinstance(web_search, dict) or web_search.get("required") is not True:
        return ["use available knowledge and keep unsupported current facts out"]

    raw_results = web_search.get("results")
    if not isinstance(raw_results, list) or not raw_results:
        return [
            "live web evidence required but absent; write verification framework only",
            "do not name schools, prices, logos, rankings, policies, or market facts",
        ]

    return ["live web evidence is present; cite only supported claims"]


def build_promotion_brief(
    payload: ContentGenerateRequest,
    source_context: dict[str, object] | None = None,
) -> dict[str, object]:
    rule = first_matching_topic_intent(payload.topic, payload.tags)
    intent_key = rule.key if rule else "general"
    base = BRIEF_BY_INTENT.get(intent_key, DEFAULT_BRIEF)
    source_requirements = [
        *base["source_requirements"],
        *_source_requirement_notes(source_context),
    ]

    return {
        "topic": payload.topic,
        "intent": {
            "key": intent_key,
            "label": rule.label if rule else "general",
            "guidance": rule.guidance if rule else "preserve the selected topic promise",
        },
        "target_persona": payload.target_audience or base["target_persona"],
        "pain_point": base["pain_point"],
        "trust_proof": base["trust_proof"],
        "offer_angle": base["offer_angle"],
        "cta": base["cta"],
        "forbidden_claims": FORBIDDEN_PROMOTION_CLAIMS,
        "source_requirements": source_requirements,
        "cover_angle": base["cover_angle"],
        "success_metric": base["success_metric"],
        "quality_checks": QUALITY_CHECKS,
        "manual_review_required": True,
    }
