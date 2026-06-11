from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.main import create_app


def test_health_endpoint() -> None:
    client = TestClient(create_app())
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "opc-backend"}


def test_database_connection_errors_are_reported_as_service_unavailable() -> None:
    app = create_app()

    @app.get("/raise-operational-error")
    def raise_operational_error() -> None:
        raise OperationalError("select 1", {}, Exception("connection refused"))

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/raise-operational-error")

    assert response.status_code == 503
    assert response.json()["detail"] == "database_unavailable"
