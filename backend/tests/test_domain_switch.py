"""内容域切换 API 测试（通用壳）。

通用壳本身不内置任何业务域。这些测试验证壳的域管理接口在
无域状态下的行为：列表为空、查询当前域报错、切换未知域被拒绝。
"""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app


def _domain_api_client() -> TestClient:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_list_domains_returns_empty_for_bare_shell() -> None:
    client = _domain_api_client()

    response = client.get("/api/workspace/domains")

    assert response.status_code == 200
    assert response.json() == []


def test_get_current_domain_fails_when_no_domain_registered() -> None:
    client = _domain_api_client()

    response = client.get("/api/workspace/domain")

    assert response.status_code == 409
    assert "尚未注册任何内容域" in response.json()["detail"]


def test_switch_domain_rejects_unknown_key() -> None:
    client = _domain_api_client()

    response = client.put("/api/workspace/domain", json={"domain_key": "nonexistent"})

    assert response.status_code == 400
    assert "未知内容域" in response.json()["detail"]
