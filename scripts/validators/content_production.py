from __future__ import annotations

from ._content_production_context import load_texts
from ._content_production_core import _check_core
from ._content_production_draft import _check_draft
from ._content_production_e2e_mobile import _check_e2e_mobile
from ._content_production_e2e_pc import _check_e2e_pc
from ._content_production_topic import _check_topic
from ._content_production_status import _check_status
from ._content_production_mobile import _check_mobile
from ._content_production_misc import _check_misc
from ._content_production_stale import _check_stale


def validate_content_production_contract() -> int:
    texts = load_texts()
    total = 0
    total += _check_core(texts)
    total += _check_draft(texts)
    total += _check_e2e_mobile(texts)
    total += _check_e2e_pc(texts)
    total += _check_topic(texts)
    total += _check_status(texts)
    total += _check_mobile(texts)
    total += _check_misc(texts)
    total += _check_stale(texts)
    return total
