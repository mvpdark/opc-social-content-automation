from fastapi.testclient import TestClient

from app.main import create_app
from app.services import dependency_service
from app.services.dependency_service import dependency_report


def test_dependency_report_has_expected_shape() -> None:
    report = dependency_report()

    assert report["status"] in {"ok", "attention", "blocked"}
    assert report["summary"]["total"] == len(report["items"])
    assert report["repair_steps"]
    assert report["repair_steps"][0] == "python scripts/setup_local.py"
    assert any(item["name"] == "Python" for item in report["items"])
    assert any(item["name"] == "Node.js" for item in report["items"])


def test_desktop_profile_does_not_surface_docker(monkeypatch) -> None:
    monkeypatch.setattr(dependency_service.settings, "runtime_profile", "desktop")
    report = dependency_report()

    assert all(item["name"] != "Docker" for item in report["items"])
    assert not any("Docker Desktop" in step for step in report["repair_steps"])


def test_dependency_report_endpoint() -> None:
    client = TestClient(create_app())
    response = client.get("/api/workspace/dependencies")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "attention", "blocked"}
    assert body["items"]
    assert body["summary"]["total"] == len(body["items"])
