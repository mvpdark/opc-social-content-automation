from app.services.trend_browser_scripts import (
    detail_visible_item_script,
    raw_visible_items_script,
)


def test_browser_cover_scripts_keep_lazy_srcset_and_background_fallbacks() -> None:
    scripts = [raw_visible_items_script(), detail_visible_item_script()]

    for script in scripts:
        assert "data-original-src" in script
        assert "data-srcset" in script
        assert "picture source" in script
        assert "backgroundImage" in script
        assert "blob:" in script
        assert "emoji" in script


def test_detail_script_extracts_xhs_state_body_and_metrics() -> None:
    script = detail_visible_item_script()

    assert "__INITIAL_STATE__" in script
    assert "noteDetailMap" in script
    assert "interactInfo" in script
    assert "value.desc" in script
    assert "likedCount" in script
    assert "collectedCount" in script
