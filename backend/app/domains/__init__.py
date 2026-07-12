# Content domain plugin package
from __future__ import annotations
from app.core.domain import DomainRegistry

def register_all_domains(registry: DomainRegistry) -> None:
    from app.domains.ssb.domain import SSB_CONTENT_DOMAIN
    registry.register(SSB_CONTENT_DOMAIN)
