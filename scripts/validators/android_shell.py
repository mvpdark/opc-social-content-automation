from __future__ import annotations

from ._helpers import ROOT

def validate_android_shell_contract() -> int:
    main_activity = (
        ROOT
        / "android-shell"
        / "app"
        / "src"
        / "main"
        / "java"
        / "top"
        / "mvpdark"
        / "opc"
        / "MainActivity.java"
    )
    if not main_activity.exists():
        return 0

    text = main_activity.read_text(encoding="utf-8")
    required_snippets = [
        'target.addJavascriptInterface(new OmpcBridge(), "OMPCAndroid")',
        "public String shareToXiaohongshu(",
        "copyTextToClipboard(title, text)",
        "ShareLaunchResult shareResult = launchXiaohongshuShare(",
        'return shareResult.ok ? "ok" : "error:" + shareResult.message;',
        "new Intent(Intent.ACTION_SEND_MULTIPLE)",
        "putParcelableArrayListExtra(Intent.EXTRA_STREAM",
        "attachShareText(intent, title, text)",
        "clipData.addItem(new ClipData.Item(text))",
        'intent.putExtra("contentText", text)',
        "CountDownLatch latch = new CountDownLatch(1)",
        "shareImageToXiaohongshu(Uri imageUri, String title, String text)",
        "createLegacyXiaohongshuShareIntent(imageUri, title, text)",
        "若小红书未自动填入，请长按粘贴",
        "没找到可以接收封面图的发布入口",
    ]
    forbidden_snippets = [
        'openXiaohongshu(Uri.parse("https://www.xiaohongshu.com/explore"))',
        'openXiaohongshu(Uri.parse("https://www.xiaohongshu.com/discovery"))',
    ]

    total = 0
    for snippet in required_snippets:
        total += 1
        if snippet not in text:
            raise SystemExit(f"Missing Android shell share contract: {snippet}")
    for snippet in forbidden_snippets:
        total += 1
        if snippet in text:
            raise SystemExit(
                f"Android shell must not use misleading Xiaohongshu home fallback: {snippet}"
            )
    return total

