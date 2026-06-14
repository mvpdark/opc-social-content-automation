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
