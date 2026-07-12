package top.mvpdark.opc;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class MainActivity extends Activity {
    private static final String ALLOWED_HOST = "opc.mvpdark.top";
    private static final String START_URL = "https://opc.mvpdark.top/android?shell=android";
    private static final String UPDATE_MANIFEST_URL = "https://opc.mvpdark.top/downloads/ompc-update.json";
    private static final String XIAOHONGSHU_PACKAGE = "com.xingin.xhs";
    private static final int FILE_CHOOSER_REQUEST = 4101;
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private File pendingUpdateApk;
    private boolean installPermissionSettingsOpened;
    private OnBackInvokedCallback backInvokedCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWindow();
        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(webView);
        configureWebView(webView);
        registerBackHandler();
        if (savedInstanceState == null) {
            webView.loadUrl(START_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
        requestNotificationPermission();
        checkForUpdates();
    }

    private void configureWindow() {
        getWindow().setStatusBarColor(Color.rgb(248, 245, 236));
        getWindow().setNavigationBarColor(Color.rgb(248, 245, 236));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(WebView target) {
        WebSettings settings = target.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setUserAgentString(settings.getUserAgentString() + " OMPCWorkstation/1.0");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(target, true);
        }

        // Clear cached web content to prevent stale white-screen pages
        target.clearCache(true);
        target.clearHistory();

        target.setOverScrollMode(View.OVER_SCROLL_NEVER);
        target.addJavascriptInterface(new OmpcBridge(), "OMPCAndroid");
        target.setWebViewClient(new ShellWebViewClient());
        target.setWebChromeClient(new ShellChromeClient());
    }

    private void registerBackHandler() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback = this::handleBackNavigation;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                backInvokedCallback
            );
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 4102);
        }
    }

    @Override
    public void onBackPressed() {
        handleBackNavigation();
    }

    private void handleBackNavigation() {
        if (webView == null) {
            finish();
            return;
        }

        webView.evaluateJavascript(
            "(function(){try{return !!(window.OMPCMobileBack && window.OMPCMobileBack());}catch(error){return false;}})();",
            handled -> {
                if ("true".equals(handled)) {
                    return;
                }
                handleWebViewBackNavigation();
            }
        );
    }

    private void handleWebViewBackNavigation() {
        if (webView != null && webView.canGoBack()) {
            String previousUrl = null;
            int currentIndex = webView.copyBackForwardList().getCurrentIndex();
            if (currentIndex > 0) {
                previousUrl = webView.copyBackForwardList().getItemAtIndex(currentIndex - 1).getUrl();
            }
            if (previousUrl != null && isAllowedShellUrl(Uri.parse(previousUrl))) {
                webView.goBack();
            } else {
                webView.loadUrl(START_URL);
            }
            return;
        }
        finish();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backInvokedCallback);
            backInvokedCallback = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingUpdateApk != null && installPermissionSettingsOpened) {
            File apkFile = pendingUpdateApk;
            pendingUpdateApk = null;
            installPermissionSettingsOpened = false;
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                installUpdate(apkFile);
            } else {
                showToast("请允许 OMPC工作站 安装未知应用后再更新。");
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                result = new Uri[] { uri };
            }
        }
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    private void checkForUpdates() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(UPDATE_MANIFEST_URL).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestProperty("Cache-Control", "no-cache");
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    return;
                }
                String manifestJson = readText(connection.getInputStream());
                JSONObject manifest = new JSONObject(manifestJson);
                UpdateInfo updateInfo = new UpdateInfo(
                    manifest.optInt("versionCode", 0),
                    manifest.optString("versionName", ""),
                    manifest.optString("apkUrl", ""),
                    manifest.optString("sha256", ""),
                    manifest.optString("notes", ""),
                    manifest.optBoolean("force", false)
                );
                if (
                    updateInfo.versionCode > getCurrentVersionCode()
                        && isTrustedUpdateUrl(updateInfo.apkUrl)
                        && updateInfo.sha256.length() == 64
                ) {
                    runOnUiThread(() -> showUpdateDialog(updateInfo));
                }
            } catch (Exception ignored) {
                // Update checks should never block the workspace.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private void showUpdateDialog(UpdateInfo updateInfo) {
        String notes = updateInfo.notes.trim().isEmpty() ? "建议更新到最新版本。" : updateInfo.notes.trim();
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("发现新版本 " + updateInfo.versionName)
            .setMessage("当前版本：" + getCurrentVersionName() + "\n\n" + notes)
            .setPositiveButton("立即更新", (dialogInterface, which) -> downloadAndInstallUpdate(updateInfo))
            .setNegativeButton(updateInfo.force ? "退出" : "稍后", (dialogInterface, which) -> {
                if (updateInfo.force) {
                    finish();
                }
            })
            .create();
        dialog.setCancelable(!updateInfo.force);
        dialog.show();
    }

    private void downloadAndInstallUpdate(UpdateInfo updateInfo) {
        ProgressDialog progressDialog = new ProgressDialog(this);
        progressDialog.setTitle("正在下载更新");
        progressDialog.setMessage("请稍等，下载完成后会打开安装确认。");
        progressDialog.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
        progressDialog.setIndeterminate(false);
        progressDialog.setMax(100);
        progressDialog.setCancelable(false);
        progressDialog.show();

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                File updateDir = new File(getCacheDir(), "updates");
                if (!updateDir.exists() && !updateDir.mkdirs()) {
                    throw new IOException("无法创建更新缓存");
                }
                clearSharedCoverCache(updateDir);
                File apkFile = new File(updateDir, "ompc-workstation-" + updateInfo.versionCode + ".apk");
                MessageDigest digest = MessageDigest.getInstance("SHA-256");

                connection = (HttpURLConnection) new URL(updateInfo.apkUrl).openConnection();
                connection.setConnectTimeout(12000);
                connection.setReadTimeout(20000);
                int totalLength = connection.getContentLength();
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    throw new IOException("更新包下载失败");
                }

                try (
                    InputStream inputStream = connection.getInputStream();
                    FileOutputStream outputStream = new FileOutputStream(apkFile)
                ) {
                    byte[] buffer = new byte[8192];
                    int read;
                    int downloaded = 0;
                    while ((read = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        downloaded += read;
                        if (totalLength > 0) {
                            int progress = Math.min(100, (int) ((downloaded * 100L) / totalLength));
                            runOnUiThread(() -> progressDialog.setProgress(progress));
                        }
                    }
                }

                String actualSha256 = bytesToHex(digest.digest());
                if (!actualSha256.equalsIgnoreCase(updateInfo.sha256)) {
                    apkFile.delete();
                    throw new IOException("更新包校验失败");
                }

                runOnUiThread(() -> {
                    progressDialog.dismiss();
                    installUpdate(apkFile);
                });
            } catch (IOException | NoSuchAlgorithmException error) {
                runOnUiThread(() -> {
                    progressDialog.dismiss();
                    showToast(error.getMessage() == null ? "更新失败，请稍后重试。" : error.getMessage());
                });
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private void installUpdate(File apkFile) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
            pendingUpdateApk = apkFile;
            installPermissionSettingsOpened = true;
            Intent settingsIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getPackageName())
            );
            try {
                startActivity(settingsIntent);
            } catch (ActivityNotFoundException ignored) {
                showToast("请在系统设置里允许 OMPC工作站 安装未知应用。");
            }
            return;
        }

        Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apkFile);
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(installIntent);
        } catch (ActivityNotFoundException ignored) {
            showToast("没有找到系统安装器。");
        }
    }

    private boolean isTrustedUpdateUrl(String url) {
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        String path = uri.getPath();
        return "https".equals(uri.getScheme())
            && host != null
            && host.endsWith(ALLOWED_HOST)
            && path != null
            && path.startsWith("/downloads/");
    }

    private long getCurrentVersionCode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return getPackageManager().getPackageInfo(getPackageName(), 0).getLongVersionCode();
            }
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
        } catch (PackageManager.NameNotFoundException ignored) {
            return 0;
        }
    }

    private String getCurrentVersionName() {
        try {
            String versionName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            return versionName == null ? "未知" : versionName;
        } catch (PackageManager.NameNotFoundException ignored) {
            return "未知";
        }
    }

    private String readText(InputStream inputStream) throws IOException {
        try (InputStream source = inputStream; ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = source.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            return outputStream.toString("UTF-8");
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format(Locale.US, "%02x", value));
        }
        return builder.toString();
    }

    private void showToast(String message) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show();
    }

    private static class UpdateInfo {
        final int versionCode;
        final String versionName;
        final String apkUrl;
        final String sha256;
        final String notes;
        final boolean force;

        UpdateInfo(int versionCode, String versionName, String apkUrl, String sha256, String notes, boolean force) {
            this.versionCode = versionCode;
            this.versionName = versionName;
            this.apkUrl = apkUrl;
            this.sha256 = sha256;
            this.notes = notes;
            this.force = force;
        }
    }

    private class OmpcBridge {
        @JavascriptInterface
        public String shareToXiaohongshu(String title, String text, String imageBase64, String fileName) {
            if (imageBase64 == null || imageBase64.trim().isEmpty()) {
                return "error:封面图为空";
            }

            try {
                File sharedDir = new File(getCacheDir(), "shared_covers");
                if (!sharedDir.exists() && !sharedDir.mkdirs()) {
                    return "error:无法创建封面缓存";
                }
                clearSharedCoverCache(sharedDir);

                File imageFile = new File(sharedDir, sanitizeShareFileName(fileName));
                byte[] imageBytes = Base64.decode(stripBase64Prefix(imageBase64), Base64.DEFAULT);
                try (FileOutputStream outputStream = new FileOutputStream(imageFile)) {
                    outputStream.write(imageBytes);
                }

                Uri imageUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    imageFile
                );
                String safeTitle = normalizeShareText(title, "小红书图文");
                String safeText = normalizeShareText(text, safeTitle);

                ShareLaunchResult shareResult = launchXiaohongshuShare(imageUri, safeTitle, safeText);
                return shareResult.ok ? "ok" : "error:" + shareResult.message;
            } catch (IllegalArgumentException | IOException error) {
                return "error:" + normalizeShareText(error.getMessage(), "原生分享失败");
            }
        }
    }

    private class ShellWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return shouldOpenExternally(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return shouldOpenExternally(Uri.parse(url));
        }

        private boolean shouldOpenExternally(Uri uri) {
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if ("http".equals(scheme) || "https".equals(scheme)) {
                if (host != null && host.endsWith(ALLOWED_HOST)) {
                    if (isAllowedShellUrl(uri)) {
                        return false;
                    }
                    webView.loadUrl(START_URL);
                    return true;
                }
                if (isXiaohongshuHost(host)) {
                    return openXiaohongshu(uri);
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                    return true;
                }
                return true;
            }
            if (isXiaohongshuScheme(scheme)) {
                return openXiaohongshu(uri);
            }
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                return true;
            }
            return true;
        }
    }

    private boolean isAllowedShellUrl(Uri uri) {
        String host = uri.getHost();
        String path = uri.getPath();
        return host != null && host.endsWith(ALLOWED_HOST) && path != null && path.startsWith("/android");
    }

    private boolean isXiaohongshuHost(String host) {
        return host != null
            && (host.equals("xiaohongshu.com")
                || host.endsWith(".xiaohongshu.com")
                || host.equals("xhslink.com")
                || host.endsWith(".xhslink.com"));
    }

    private boolean isXiaohongshuScheme(String scheme) {
        return scheme != null
            && (scheme.equals("xhsdiscover")
                || scheme.equals("xhs")
                || scheme.equals("xiaohongshu")
                || scheme.startsWith("xhs"));
    }

    private boolean openXiaohongshu(Uri uri) {
        Intent xiaohongshuIntent = new Intent(Intent.ACTION_VIEW, uri);
        xiaohongshuIntent.setPackage(XIAOHONGSHU_PACKAGE);
        try {
            startActivity(xiaohongshuIntent);
            return true;
        } catch (ActivityNotFoundException ignored) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignoredAgain) {
                return true;
            }
            return true;
        }
    }

    private String stripBase64Prefix(String value) {
        int commaIndex = value.indexOf(',');
        if (value.startsWith("data:") && commaIndex >= 0) {
            return value.substring(commaIndex + 1);
        }
        return value;
    }

    private String sanitizeShareFileName(String fileName) {
        String normalized = fileName == null ? "" : fileName.trim().replaceAll("[^A-Za-z0-9._-]", "_");
        if (normalized.isEmpty()) {
            normalized = "xhs-cover.png";
        }
        if (!normalized.toLowerCase().endsWith(".png")) {
            normalized = normalized + ".png";
        }
        if (normalized.length() > 96) {
            normalized = normalized.substring(0, 88) + ".png";
        }
        return normalized;
    }

    private String normalizeShareText(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value;
    }

    private void clearSharedCoverCache(File sharedDir) {
        File[] files = sharedDir.listFiles();
        if (files == null) {
            return;
        }
        for (File file : files) {
            if (file.isFile()) {
                file.delete();
            }
        }
    }

    private void copyTextToClipboard(String title, String text) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText(title, text));
        }
    }

    private ArrayList<Uri> createImageUriList(Uri imageUri) {
        ArrayList<Uri> imageUris = new ArrayList<>();
        imageUris.add(imageUri);
        return imageUris;
    }

    private ClipData createXiaohongshuShareClipData(Uri imageUri, String text) {
        ClipData clipData = new ClipData(
            "xhs-share",
            new String[] { "image/png", "text/plain" },
            new ClipData.Item(imageUri)
        );
        clipData.addItem(new ClipData.Item(text));
        return clipData;
    }

    private void attachShareText(Intent intent, String title, String text) {
        intent.putExtra(Intent.EXTRA_TITLE, title);
        intent.putExtra(Intent.EXTRA_SUBJECT, title);
        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.putExtra("title", title);
        intent.putExtra("content", text);
        intent.putExtra("contentText", text);
    }

    private Intent createXiaohongshuShareIntent(Uri imageUri, String title, String text) {
        Intent intent = new Intent(Intent.ACTION_SEND_MULTIPLE);
        intent.setType("image/*");
        intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, createImageUriList(imageUri));
        attachShareText(intent, title, text);
        intent.setClipData(createXiaohongshuShareClipData(imageUri, text));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private Intent createLegacyXiaohongshuShareIntent(Uri imageUri, String title, String text) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_STREAM, imageUri);
        attachShareText(intent, title, text);
        intent.setClipData(createXiaohongshuShareClipData(imageUri, text));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private ShareLaunchResult launchXiaohongshuShare(Uri imageUri, String title, String text) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            copyTextToClipboard(title, text);
            return shareImageToXiaohongshu(imageUri, title, text);
        }

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<ShareLaunchResult> result = new AtomicReference<>(
            ShareLaunchResult.error("小红书分享未启动，正文已复制，可手动发布。")
        );
        runOnUiThread(() -> {
            try {
                copyTextToClipboard(title, text);
                result.set(shareImageToXiaohongshu(imageUri, title, text));
            } finally {
                latch.countDown();
            }
        });

        try {
            if (!latch.await(3, TimeUnit.SECONDS)) {
                return ShareLaunchResult.error("小红书分享启动超时，正文已复制，可手动发布。");
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return ShareLaunchResult.error("小红书分享被中断，正文已复制，可手动发布。");
        }
        return result.get();
    }

    private ShareLaunchResult shareImageToXiaohongshu(Uri imageUri, String title, String text) {
        Intent xiaohongshuIntent = createXiaohongshuShareIntent(imageUri, title, text);
        xiaohongshuIntent.setPackage(XIAOHONGSHU_PACKAGE);
        grantUriPermission(XIAOHONGSHU_PACKAGE, imageUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(xiaohongshuIntent);
            showToast("封面已发送，标题和正文已复制；若小红书未自动填入，请长按粘贴。");
            return ShareLaunchResult.ok();
        } catch (ActivityNotFoundException ignored) {
            Intent legacyIntent = createLegacyXiaohongshuShareIntent(imageUri, title, text);
            legacyIntent.setPackage(XIAOHONGSHU_PACKAGE);
            try {
                startActivity(legacyIntent);
                showToast("封面已发送，标题和正文已复制；若小红书未自动填入，请长按粘贴。");
                return ShareLaunchResult.ok();
            } catch (ActivityNotFoundException ignoredAgain) {
                return shareWithChooser(imageUri, title, text);
            }
        }
    }

    private ShareLaunchResult shareWithChooser(Uri imageUri, String title, String text) {
        try {
            Intent chooser = Intent.createChooser(
                createXiaohongshuShareIntent(imageUri, title, text),
                "分享到小红书"
            );
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] {
                createLegacyXiaohongshuShareIntent(imageUri, title, text)
            });
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(chooser);
            showToast("封面已发送，标题和正文已复制；若小红书未自动填入，请长按粘贴。");
            return ShareLaunchResult.ok();
        } catch (ActivityNotFoundException ignored) {
            showToast("没找到可以接收封面图的发布入口，文案已复制，请手动打开小红书。");
            return ShareLaunchResult.error("没找到可以接收封面图的发布入口；文案已复制，请手动打开小红书。");
        }
    }

    private static class ShareLaunchResult {
        final boolean ok;
        final String message;

        private ShareLaunchResult(boolean ok, String message) {
            this.ok = ok;
            this.message = message;
        }

        static ShareLaunchResult ok() {
            return new ShareLaunchResult(true, "ok");
        }

        static ShareLaunchResult error(String message) {
            return new ShareLaunchResult(false, message);
        }
    }

    private class ShellChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(
            WebView webView,
            ValueCallback<Uri[]> filePathCallback,
            FileChooserParams fileChooserParams
        ) {
            if (MainActivity.this.filePathCallback != null) {
                MainActivity.this.filePathCallback.onReceiveValue(null);
            }
            MainActivity.this.filePathCallback = filePathCallback;
            Intent intent = fileChooserParams.createIntent();
            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
            } catch (ActivityNotFoundException error) {
                MainActivity.this.filePathCallback = null;
                return false;
            }
            return true;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                request.grant(request.getResources());
            }
        }
    }
}
