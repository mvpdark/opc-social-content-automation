from app.main import create_app


def test_documented_api_paths_are_registered() -> None:
    app = create_app()
    paths = set(app.openapi()["paths"])

    expected_paths = {
        "/health",
        "/api/auth/login",
        "/api/auth/register",
        "/api/content/generate",
        "/api/content/rewrite",
        "/api/content/list",
        "/api/content/{content_id}",
        "/api/content/{content_id}/review-request",
        "/api/content/{content_id}/reviews",
        "/api/content/{content_id}/ai-review",
        "/api/knowledge/upload",
        "/api/knowledge/search",
        "/api/trends/list",
        "/api/trends/report",
        "/api/trends/collect",
        "/api/trends/search-target",
        "/api/trends/jobs",
        "/api/trends/knowledge-digest",
        "/api/trends/keywords",
        "/api/image/generate",
        "/api/image/templates",
        "/api/image/list",
        "/api/image/{image_id}",
        "/api/workspace/dashboard",
        "/api/workspace/provider-status",
        "/api/workspace/approved-content",
        "/api/workspace/export",
        "/api/workspace/publish-record",
        "/api/workspace/publish-records",
    }

    assert expected_paths.issubset(paths)


def test_static_paths_are_registered_before_dynamic_fallbacks() -> None:
    app = create_app()
    routes = [route.path for route in app.routes]

    assert routes.index("/api/content/list") < routes.index("/api/content/{content_id}")
    assert routes.index("/api/image/templates") < routes.index("/api/image/{image_id}")
    assert routes.index("/api/image/list") < routes.index("/api/image/{image_id}")
