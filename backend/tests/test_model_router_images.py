"""model_router_images 模块单元测试。

覆盖图片尺寸映射、宽高比解析、SVG 封面生成、图片 prompt 构建、
图片 URL 提取和 base64 解码。
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services.model_router_images import (
    DEFAULT_XIAOHONGSHU_IMAGE_SIZE,
    FILENAME_RE,
    GENERATED_ASSET_ROOT,
    IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO,
    IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO,
    _aspect_ratio_size,
    _extract_image_url,
    _image_prompt,
    _image_size,
    _matching_configured_image_size,
    _ratio_value,
    _test_image,
    _wrap_svg_text,
)


class TestAspectRatioSize:
    def test_known_ratios(self) -> None:
        assert _aspect_ratio_size("1:1") == (1080, 1080)
        assert _aspect_ratio_size("3:4") == (2048, 2736)
        assert _aspect_ratio_size("4:5") == (1080, 1350)
        assert _aspect_ratio_size("9:16") == (900, 1600)

    def test_unknown_ratio_defaults_to_3_4(self) -> None:
        assert _aspect_ratio_size("16:9") == (2048, 2736)

    def test_empty_defaults_to_3_4(self) -> None:
        assert _aspect_ratio_size("") == (2048, 2736)


class TestRatioValue:
    def test_standard_ratio(self) -> None:
        assert _ratio_value("3:4") == 0.75

    def test_x_separator(self) -> None:
        assert _ratio_value("1024x1024") == 1.0

    def test_invalid_format_returns_none(self) -> None:
        assert _ratio_value("invalid") is None

    def test_zero_width_returns_none(self) -> None:
        assert _ratio_value("0:4") is None

    def test_non_numeric_returns_none(self) -> None:
        assert _ratio_value("a:b") is None


class TestMatchingConfiguredImageSize:
    def test_no_config_returns_none(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = ""
            assert _matching_configured_image_size("3:4") is None

    def test_matching_ratio_returns_size(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = "2048x2736"
            assert _matching_configured_image_size("3:4") == "2048x2736"

    def test_non_matching_ratio_returns_none(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = "1024x1024"
            assert _matching_configured_image_size("3:4") is None

    def test_invalid_config_ratio_returns_config(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = "invalid"
            assert _matching_configured_image_size("3:4") == "invalid"


class TestWrapSvgText:
    def test_short_text(self) -> None:
        result = _wrap_svg_text("短文本", width=12)
        assert len(result) >= 1

    def test_long_text_wrapped(self) -> None:
        result = _wrap_svg_text("这是一段很长的标题文本用于测试自动换行功能", width=10)
        assert len(result) > 1

    def test_max_lines_limit(self) -> None:
        result = _wrap_svg_text("A" * 100, width=5, max_lines=3)
        assert len(result) <= 3

    def test_empty_returns_default(self) -> None:
        result = _wrap_svg_text("", width=12)
        assert result == ["OPC 本地检查封面"]


class TestTestImage:
    def test_generates_svg_file(self) -> None:
        payload = {
            "title": "测试标题",
            "platform": "xiaohongshu",
            "aspect_ratio": "1:1",
        }
        url = _test_image(payload)
        assert url.endswith(".svg")
        assert "codex-test-" in url

        # 验证文件确实生成了
        filename = url.split("/")[-1]
        svg_path = GENERATED_ASSET_ROOT / filename
        assert svg_path.exists()
        content = svg_path.read_text(encoding="utf-8")
        assert "<svg" in content
        assert "测试标题" in content

    def test_uses_template_name(self) -> None:
        payload = {
            "title": "标题",
            "template": {"name": "自定义模板"},
        }
        url = _test_image(payload)
        filename = url.split("/")[-1]
        svg_path = GENERATED_ASSET_ROOT / filename
        content = svg_path.read_text(encoding="utf-8")
        assert "自定义模板" in content

    def test_default_title(self) -> None:
        url = _test_image({})
        filename = url.split("/")[-1]
        svg_path = GENERATED_ASSET_ROOT / filename
        content = svg_path.read_text(encoding="utf-8")
        assert "OPC 本地检查封面" in content


class TestImageSize:
    def test_default_3_4(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = ""
            assert _image_size("3:4") == DEFAULT_XIAOHONGSHU_IMAGE_SIZE

    def test_matching_config(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = "1024x1024"
            assert _image_size("1:1") == "1024x1024"

    def test_known_ratio_without_config(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = ""
            assert _image_size("1:1") == "1024x1024"

    def test_unknown_ratio_defaults(self) -> None:
        with patch("app.services.model_router_images.settings") as mock_settings:
            mock_settings.image_size = ""
            assert _image_size("16:9") == DEFAULT_XIAOHONGSHU_IMAGE_SIZE


class TestImagePrompt:
    def test_basic_prompt(self) -> None:
        prompt = _image_prompt("基础模板", {"title": "标题", "platform": "xiaohongshu"})
        assert "基础模板" in prompt
        assert "标题" in prompt
        assert "xiaohongshu" in prompt

    def test_includes_tags(self) -> None:
        prompt = _image_prompt("模板", {"tags": ["博士", "申请"]})
        assert "#博士" in prompt
        assert "#申请" in prompt

    def test_includes_visual_direction(self) -> None:
        prompt = _image_prompt(
            "模板",
            {
                "visual_direction": {
                    "id": "dir1",
                    "name": "方向1",
                    "instructions": "使用暖色调",
                    "avoid": "避免冷色",
                }
            },
        )
        assert "dir1" in prompt
        assert "方向1" in prompt
        assert "暖色调" in prompt

    def test_includes_style_reference(self) -> None:
        prompt = _image_prompt("模板", {"style_reference": "参考样式内容"})
        assert "参考样式内容" in prompt

    def test_truncates_body_to_500(self) -> None:
        long_body = "A" * 600
        prompt = _image_prompt("模板", {"body": long_body})
        assert "A" * 500 in prompt
        assert "A" * 501 not in prompt


class TestExtractImageUrl:
    def test_url_field(self) -> None:
        data = {"data": [{"url": "https://img.test.com/a.png"}]}
        result = _extract_image_url("test", data, {})
        assert result == "https://img.test.com/a.png"

    def test_b64_json_field(self) -> None:
        # 使用一个最小的有效 PNG base64
        import base64

        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
            b"\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00"
            b"\x03\x00\x01\x5c\xcd\xff\x69\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        b64 = base64.b64encode(png_bytes).decode()
        data = {"data": [{"b64_json": b64}]}
        payload = {"title": "test-image"}
        result = _extract_image_url("test", data, payload)
        assert result.endswith(".png")
        assert "image2-" in result

    def test_empty_data_raises_502(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _extract_image_url("test", {"data": []}, {})
        assert exc_info.value.status_code == 502

    def test_no_data_key_raises_502(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _extract_image_url("test", {}, {})
        assert exc_info.value.status_code == 502

    def test_no_url_or_b64_raises_502(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _extract_image_url("test", {"data": [{}]}, {})
        assert exc_info.value.status_code == 502

    def test_non_dict_item_raises_502(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _extract_image_url("test", {"data": ["not a dict"]}, {})
        assert exc_info.value.status_code == 502


class TestConstants:
    def test_image_pixel_sizes_defined(self) -> None:
        assert "1:1" in IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO
        assert "3:4" in IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO
        assert "4:5" in IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO
        assert "9:16" in IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO

    def test_provider_sizes_defined(self) -> None:
        assert "1:1" in IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO
        assert "3:4" in IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO

    def test_default_size_is_3_4(self) -> None:
        assert DEFAULT_XIAOHONGSHU_IMAGE_SIZE == IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO["3:4"]

    def test_generated_asset_root_exists_or_creatable(self) -> None:
        assert isinstance(GENERATED_ASSET_ROOT, Path)

    def test_filename_re_strips_special_chars(self) -> None:
        assert FILENAME_RE.sub("-", "test file@name") == "test-file-name"
