"""model_router_helpers 模块单元测试。

覆盖提示词加载、provider 错误信息脱敏、消息构建、
聊天内容提取、HTTP 调用异常处理。
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException

from app.services.model_router_helpers import (
    PROMPT_ROOT,
    _chat_messages,
    _deepseek_messages,
    _extract_chat_content,
    _post_chat_completion,
    _post_image_generation,
    _provider_display_label,
    _provider_response_shape_error,
    _redacted_provider_error,
    _redacted_provider_error_from_response,
    _redacted_provider_timeout,
    _resolved_aspect_ratio,
    _string_list,
    load_platform_style_reference,
    load_prompt,
)


class TestLoadPrompt:
    def test_loads_existing_prompt(self) -> None:
        # draft_generation.md 应该存在于 prompts/ 目录
        content = load_prompt("draft_generation")
        assert isinstance(content, str)
        assert len(content) > 0

    def test_missing_prompt_raises_500(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            load_prompt("nonexistent_prompt_xyz")
        assert exc_info.value.status_code == 500
        assert "nonexistent_prompt_xyz" in exc_info.value.detail

    def test_prompt_root_is_path(self) -> None:
        from pathlib import Path

        assert isinstance(PROMPT_ROOT, Path)
        assert PROMPT_ROOT.exists()


class TestLoadPlatformStyleReference:
    def test_xiaohongshu_returns_content(self) -> None:
        result = load_platform_style_reference("xiaohongshu")
        assert isinstance(result, str)

    def test_unknown_platform_returns_empty(self) -> None:
        assert load_platform_style_reference("unknown") == ""

    def test_none_returns_empty(self) -> None:
        assert load_platform_style_reference(None) == ""


class TestStringList:
    def test_valid_list(self) -> None:
        assert _string_list(["a", "b", "c"]) == ["a", "b", "c"]

    def test_filters_empty_strings(self) -> None:
        assert _string_list(["a", "", "  ", "b"]) == ["a", "b"]

    def test_non_list_returns_empty(self) -> None:
        assert _string_list("not a list") == []
        assert _string_list(None) == []

    def test_converts_non_string_items(self) -> None:
        assert _string_list([1, 2, "three"]) == ["1", "2", "three"]


class TestRedactedProviderError:
    def test_401_returns_auth_error(self) -> None:
        result = _redacted_provider_error("DeepSeek", 401)
        assert "授权失败" in result

    def test_404_returns_not_found(self) -> None:
        result = _redacted_provider_error("DeepSeek", 404)
        assert "不可用" in result

    def test_429_returns_rate_limit(self) -> None:
        result = _redacted_provider_error("DeepSeek", 429)
        assert "频繁" in result or "额度" in result

    def test_other_status_returns_generic(self) -> None:
        result = _redacted_provider_error("DeepSeek", 500)
        assert "HTTP 500" in result

    def test_no_status_returns_network_error(self) -> None:
        result = _redacted_provider_error("DeepSeek")
        assert "网络" in result

    def test_unknown_provider_uses_default_label(self) -> None:
        result = _redacted_provider_error("UnknownProvider", 401)
        assert "模型服务" in result


class TestProviderDisplayLabel:
    def test_known_providers(self) -> None:
        assert _provider_display_label("DeepSeek") == "改写服务"
        assert "撰稿" in _provider_display_label("OpenAI-compatible draft provider")
        assert "图片" in _provider_display_label("OpenAI-compatible image provider")

    def test_unknown_provider(self) -> None:
        assert _provider_display_label("Unknown") == "模型服务"


class TestProviderResponseShapeError:
    def test_includes_provider_label(self) -> None:
        result = _provider_response_shape_error("DeepSeek", "数据缺失")
        assert "改写服务" in result
        assert "数据缺失" in result


class TestRedactedProviderErrorFromResponse:
    def _make_response(
        self,
        status_code: int = 401,
        json_data: dict | None = None,
    ) -> httpx.Response:
        response = MagicMock(spec=httpx.Response)
        response.status_code = status_code
        response.json = MagicMock(return_value=json_data or {})
        return response

    def test_invalid_api_key_401(self) -> None:
        resp = self._make_response(
            401,
            {"error": {"code": "INVALID_API_KEY", "message": "invalid api key"}},
        )
        result = _redacted_provider_error_from_response("DeepSeek", resp)
        assert "授权无效" in result

    def test_invalid_size_400(self) -> None:
        resp = self._make_response(400, {"error": {"message": "invalid size"}})
        result = _redacted_provider_error_from_response("DeepSeek", resp)
        assert "图片尺寸" in result

    def test_other_error_falls_back(self) -> None:
        resp = self._make_response(500, {})
        result = _redacted_provider_error_from_response("DeepSeek", resp)
        assert "HTTP 500" in result

    def test_non_dict_json(self) -> None:
        resp = self._make_response(500, None)
        resp.json = MagicMock(side_effect=ValueError("not json"))
        result = _redacted_provider_error_from_response("DeepSeek", resp)
        assert "网络" in result or "HTTP 500" in result


class TestRedactedProviderTimeout:
    def test_includes_timeout_seconds(self) -> None:
        result = _redacted_provider_timeout("DeepSeek", 30.0)
        assert "30" in result
        assert "超时" in result

    def test_includes_provider_label(self) -> None:
        result = _redacted_provider_timeout("DeepSeek", 60.0)
        assert "改写服务" in result


class TestDeepseekMessages:
    def test_returns_system_and_user(self) -> None:
        messages = _deepseek_messages("系统提示", {"topic": "测试"})
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "系统提示"
        assert messages[1]["role"] == "user"
        assert json.loads(messages[1]["content"])["topic"] == "测试"


class TestChatMessages:
    def test_returns_system_and_user(self) -> None:
        messages = _chat_messages("提示", {"key": "value"})
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"


class TestResolvedAspectRatio:
    def test_default_3_4(self) -> None:
        assert _resolved_aspect_ratio({}) == "3:4"

    def test_from_payload(self) -> None:
        assert _resolved_aspect_ratio({"aspect_ratio": "1:1"}) == "1:1"

    def test_from_template(self) -> None:
        payload = {"template": {"aspect_ratio": "9:16"}}
        assert _resolved_aspect_ratio(payload) == "9:16"

    def test_template_overrides_payload(self) -> None:
        payload = {"aspect_ratio": "4:5", "template": {"aspect_ratio": "1:1"}}
        assert _resolved_aspect_ratio(payload) == "1:1"


class TestExtractChatContent:
    def test_string_content(self) -> None:
        data = {"choices": [{"message": {"content": "正文内容"}}]}
        assert _extract_chat_content("test", data) == "正文内容"

    def test_list_content_joined(self) -> None:
        data = {
            "choices": [
                {"message": {"content": [{"text": "段落1"}, {"text": "段落2"}]}}
            ]
        }
        assert _extract_chat_content("test", data) == "段落1\n段落2"

    def test_empty_content_raises_502(self) -> None:
        data = {"choices": [{"message": {"content": ""}}]}
        with pytest.raises(HTTPException) as exc_info:
            _extract_chat_content("test", data)
        assert exc_info.value.status_code == 502

    def test_missing_choices_raises_502(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _extract_chat_content("test", {})
        assert exc_info.value.status_code == 502

    def test_empty_choices_raises_502(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _extract_chat_content("test", {"choices": []})
        assert exc_info.value.status_code == 502


class TestPostChatCompletion:
    def test_successful_call(self) -> None:
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value={"choices": []})

        mock_client = MagicMock(spec=httpx.Client)
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post = MagicMock(return_value=mock_response)

        with patch("app.services.model_router_helpers.httpx.Client", return_value=mock_client):
            result = _post_chat_completion("test", "https://api.test.com", "key", 30.0, {})
        assert result == {"choices": []}

    def test_http_status_error_raises_502(self) -> None:
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 401
        mock_response.json = MagicMock(return_value={})

        mock_client = MagicMock(spec=httpx.Client)
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "error", request=MagicMock(), response=mock_response
            )
        )

        with patch("app.services.model_router_helpers.httpx.Client", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                _post_chat_completion("test", "https://api.test.com", "key", 30.0, {})
        assert exc_info.value.status_code == 502

    def test_timeout_raises_504(self) -> None:
        mock_client = MagicMock(spec=httpx.Client)
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post = MagicMock(side_effect=httpx.TimeoutException("timeout"))

        with patch("app.services.model_router_helpers.httpx.Client", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                _post_chat_completion("test", "https://api.test.com", "key", 30.0, {})
        assert exc_info.value.status_code == 504

    def test_non_dict_response_raises_502(self) -> None:
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value="not a dict")

        mock_client = MagicMock(spec=httpx.Client)
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post = MagicMock(return_value=mock_response)

        with patch("app.services.model_router_helpers.httpx.Client", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                _post_chat_completion("test", "https://api.test.com", "key", 30.0, {})
        assert exc_info.value.status_code == 502


class TestPostImageGeneration:
    def test_successful_call(self) -> None:
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value={"data": [{"url": "https://img.test.com/a.png"}]})

        mock_client = MagicMock(spec=httpx.Client)
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post = MagicMock(return_value=mock_response)

        with patch("app.services.model_router_helpers.httpx.Client", return_value=mock_client):
            result = _post_image_generation("test", "https://api.test.com", "key", 30.0, {})
        assert "data" in result

    def test_http_error_raises_502(self) -> None:
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 500
        mock_response.json = MagicMock(return_value={})

        mock_client = MagicMock(spec=httpx.Client)
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "error", request=MagicMock(), response=mock_response
            )
        )

        with patch("app.services.model_router_helpers.httpx.Client", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                _post_image_generation("test", "https://api.test.com", "key", 30.0, {})
        assert exc_info.value.status_code == 502
