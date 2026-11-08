package ru.mirraskola.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Оболочка: игра из assets/site открывается как сайт https://appassets.androidplatform.net/,
 *  чтобы относительные ссылки (../, ?play=1) и localStorage работали как на GitHub Pages. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/";
    private WebView web;

    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "text/javascript"); MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css"); MIME.put("json", "application/json"); MIME.put("webmanifest", "application/manifest+json");
        MIME.put("svg", "image/svg+xml"); MIME.put("png", "image/png"); MIME.put("jpg", "image/jpeg"); MIME.put("jpeg", "image/jpeg");
        MIME.put("webp", "image/webp"); MIME.put("txt", "text/plain"); MIME.put("mp3", "audio/mpeg"); MIME.put("ogg", "audio/ogg");
        MIME.put("wav", "audio/wav"); MIME.put("woff2", "font/woff2");
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xFF090E15);
        setContentView(web);
        hideBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                String path = u.getPath() == null ? "/" : u.getPath();
                if (path.endsWith("/")) path += "index.html";
                if (path.endsWith("sw.js") || path.endsWith("version.txt")) return notFound();
                try {
                    InputStream in = getAssets().open("site" + path);
                    String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
                    String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
                    WebResourceResponse r = new WebResourceResponse(mime, "utf-8", in);
                    Map<String, String> h = new HashMap<>();
                    h.put("Cache-Control", "no-cache");
                    r.setResponseHeaders(h);
                    return r;
                } catch (IOException e) {
                    return notFound();
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOME);
    }

    private WebResourceResponse notFound() {
        WebResourceResponse r = new WebResourceResponse("text/plain", "utf-8", null);
        r.setStatusCodeAndReasonPhrase(404, "Not Found");
        return r;
    }

    @SuppressWarnings("deprecation")
    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Сначала закрываем открытое окно игры, потом шаг назад, потом выход
        web.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){var b=d.querySelector('[data-act=close],[data-a=close]');if(b)b.click();else d.close();return 'closed';}return '';})()", v -> {
            if (v != null && v.contains("closed")) return;
            if (web.canGoBack()) web.goBack(); else finish();
        });
    }
}
