from __future__ import annotations

from ._helpers import ROOT, _read_workspace_components_text

def validate_login_failure_contract() -> int:
    workspace_text = _read_workspace_components_text()
    android_text = (ROOT / "frontend" / "app" / "android" / "page.tsx").read_text(
        encoding="utf-8"
    )
    e2e_text = (ROOT / "frontend" / "tests" / "e2e" / "opc.smoke.spec.ts").read_text(
        encoding="utf-8"
    )

    total = 0
    login_client_contracts = [
        (
            "PC",
            workspace_text,
            "无法连接登录服务，请确认应用服务正在运行。",
        ),
        (
            "mobile",
            android_text,
            "登录服务暂时不可用，请确认应用服务已启动。",
        ),
    ]
    for label, text, fetch_failure_copy in login_client_contracts:
        required_snippets = [
            'fetch(`${API_BASE}/auth/mobile-login`',
            "response.status === 404 || response.status === 405",
            "response.status >= 500",
            "readApiError(response",
            "登录服务暂时不可用",
            'throw new Error("账号或密码不正确。");',
            "error instanceof TypeError",
            fetch_failure_copy,
        ]
        for snippet in required_snippets:
            if snippet not in text:
                raise SystemExit(f"Missing {label} login failure contract: {snippet}")
            total += 1

        server_failure_index = text.index("response.status >= 500")
        bad_credential_index = text.index('throw new Error("账号或密码不正确。");')
        if server_failure_index > bad_credential_index:
            raise SystemExit(f"{label} login 5xx handling must run before bad-credential fallback")
        total += 1

    e2e_contracts = [
        "async function mockRejectedLogin",
        "async function mockUnavailableLogin",
        "async function mockServerErrorLogin",
        "status: 401",
        'route.abort("failed")',
        "status: 503",
        "PC login shows bad-credential feedback without persisting password",
        "mobile login shows bad-credential feedback without persisting password",
        "PC login shows service-unavailable feedback without persisting password",
        "mobile login shows service-unavailable feedback without persisting password",
        "PC login shows server-error feedback without persisting password",
        "mobile login shows server-error feedback without persisting password",
        'not.toContainText("账号或密码不正确。")',
        "localStorageContains(page, rejectedLogin.password)",
    ]
    for snippet in e2e_contracts:
        if snippet not in e2e_text:
            raise SystemExit(f"Missing login failure E2E contract: {snippet}")
        total += 1

    return total
