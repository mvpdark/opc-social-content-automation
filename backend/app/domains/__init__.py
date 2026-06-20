"""内容域插件包。

每个子目录是一个业务域（如 ``ssb`` 硕升博），导出一个
``ContentDomain`` 实例。``register_all_domains`` 在应用启动时
把所有域注册到全局 registry，新增域只需在此处追加一行。

通用壳本身不内置任何业务域。各业务项目（如 OMCP-SSB）在自己的
``domains/`` 包里定义域配置，部署时把对应目录挂载进来并在此注册。
"""

from __future__ import annotations

from app.core.domain import DomainRegistry


def register_all_domains(registry: DomainRegistry) -> None:
    """注册全部内置内容域。

    通用壳默认不注册任何域。部署具体业务项目时，在此处追加注册代码，
    例如::

        from app.domains.ssb.domain import SSB_CONTENT_DOMAIN
        registry.register(SSB_CONTENT_DOMAIN)
    """
    return None
