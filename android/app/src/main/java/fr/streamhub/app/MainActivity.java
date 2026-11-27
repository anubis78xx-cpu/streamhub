package fr.streamhub.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Native shell around the StreamHub web app (bundled in assets/www).
 * Internal pages stay in the WebView; streaming services open in their own app
 * (Netflix, Disney+...), other sites in the in-app SiteActivity or the browser.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    private static final int FILE_REQUEST = 1;
    /** Hosts reachable through native.get: the video search (Dailymotion's public API). */
    private static final java.util.Set<String> GET_HOSTS = new java.util.HashSet<>(java.util.Arrays.asList(
            "api.dailymotion.com"));

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF0D0F17);
        getWindow().setNavigationBarColor(0xFF121522);
        AdBlock.load(this);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(0xFF0D0F17);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " StreamHubApp/2.1");

        web.addJavascriptInterface(new NativeBridge(), "StreamHubNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // Embedded players (YouTube, Arte...) navigate inside their own iframe.
                if (!request.isForMainFrame() || HOST.equals(uri.getHost())) return false;
                openExternal(uri.toString());
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // Fullscreen video: swap the WebView for the player's own view.
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) { callback.onCustomViewHidden(); return; }
                fullscreenView = view;
                fullscreenCallback = callback;
                setContentView(view);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                if (Build.VERSION.SDK_INT >= 30) getWindow().getInsetsController().hide(WindowInsets.Type.systemBars());
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_REQUEST);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
    }

    private void exitFullscreen() {
        if (fullscreenView == null) return;
        fullscreenView = null;
        setContentView(web);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        if (Build.VERSION.SDK_INT >= 30) getWindow().getInsetsController().show(WindowInsets.Type.systemBars());
        if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
    }

    /** Deep link first, then the app's home screen, then the web fallback. */
    private void openExternal(String url) {
        try {
            if (!url.startsWith("intent:")) {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return;
            }
            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            intent.setSelector(null);
            String pkg = intent.getPackage();
            String fallback = intent.getStringExtra("browser_fallback_url");
            try {
                startActivity(intent);
                return;
            } catch (ActivityNotFoundException ignored) {
                // The app is missing or does not handle this link.
            }
            if (pkg != null) {
                Intent launch = getPackageManager().getLaunchIntentForPackage(pkg);
                if (launch != null) {
                    startActivity(launch);
                    return;
                }
            }
            if (fallback != null) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)));
        } catch (Exception e) {
            Toast.makeText(this, "Impossible d'ouvrir ce lien", Toast.LENGTH_SHORT).show();
        }
    }

    /** Functions the web app can call as window.StreamHubNative. */
    private class NativeBridge {
        /** Installed versionName (from build.gradle), shown next to the app title. */
        @JavascriptInterface
        public String version() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }

        /**
         * Ad blocker of the in-app window: on or off, and the addresses of the sites the user
         * added (JSON list of URLs), the only pages it filters. Returns the number of blocked domains.
         */
        @JavascriptInterface
        public int setAdblock(boolean on, String sitesJson) {
            java.util.Set<String> domains = new java.util.HashSet<>();
            try {
                org.json.JSONArray urls = new org.json.JSONArray(sitesJson);
                for (int i = 0; i < urls.length(); i++) {
                    String host = Uri.parse(urls.getString(i)).getHost();
                    if (host != null) domains.add(SiteActivity.siteOf(host));
                }
            } catch (Exception ignored) {
                // no valid site: nothing is filtered
            }
            AdBlock.setUserSites(domains);
            AdBlock.enabled = on;
            return AdBlock.count();
        }

        /** Opens a web site in the in-app window (back and fullscreen buttons, ad blocker). */
        @JavascriptInterface
        public void openSite(String url) {
            if (!url.startsWith("https://") && !url.startsWith("http://")) return;
            Intent i = new Intent(MainActivity.this, SiteActivity.class);
            i.putExtra(SiteActivity.EXTRA_URL, url);
            runOnUiThread(() -> startActivity(i));
        }

        /**
         * Opens the user's own VPN app (Android package chosen in Settings), else Android's
         * VPN settings. Returns false when nothing could be opened.
         */
        @JavascriptInterface
        public boolean openVpn(String pkg) {
            try {
                Intent launch = pkg == null || pkg.isEmpty() ? null : getPackageManager().getLaunchIntentForPackage(pkg);
                startActivity(launch != null ? launch : new Intent(android.provider.Settings.ACTION_VPN_SETTINGS));
                return launch != null || pkg == null || pkg.isEmpty();
            } catch (ActivityNotFoundException e) {
                return false;
            }
        }

        /** True when a VPN is active on the phone, whichever app runs it. */
        @JavascriptInterface
        public boolean vpnActive() {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            android.net.NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
            return caps != null && caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_VPN);
        }

        /** VPN apps installed on the phone, as a JSON list of {name, pkg}, for the Settings picker. */
        @JavascriptInterface
        public String vpnApps() {
            org.json.JSONArray out = new org.json.JSONArray();
            Intent probe = new Intent("android.net.VpnService");
            for (android.content.pm.ResolveInfo r : getPackageManager().queryIntentServices(probe, 0)) {
                try {
                    String pkg = r.serviceInfo.packageName;
                    if (pkg.equals(getPackageName())) continue;
                    String name = getPackageManager().getApplicationLabel(getPackageManager().getApplicationInfo(pkg, 0)).toString();
                    out.put(new JSONObject().put("name", name).put("pkg", pkg));
                } catch (Exception ignored) {
                    // app removed in between
                }
            }
            return out.toString();
        }

        /**
         * GET from native code for the video search (Dailymotion's public API).
         * Answers through window.__nativeDone(id, ok, text).
         */
        @JavascriptInterface
        public void get(String url, String id) {
            new Thread(() -> {
                boolean ok = false;
                String text;
                try {
                    String host = Uri.parse(url).getHost();
                    if (!url.startsWith("https://") || !GET_HOSTS.contains(host)) throw new IOException("URL refusée");
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(15000);
                    c.setRequestProperty("User-Agent", "StreamHub/1.0");
                    int code = c.getResponseCode();
                    ok = code < 400;
                    text = ok ? readAll(c.getInputStream()) : "Erreur " + code;
                } catch (Exception e) {
                    text = "Pas de connexion internet";
                }
                final String js = "window.__nativeDone(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(text) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        @JavascriptInterface
        public void exportData(String json) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, "Sauvegarde StreamHub");
            send.putExtra(Intent.EXTRA_TEXT, json);
            startActivity(Intent.createChooser(send, "Sauvegarder StreamHub"));
        }
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) != -1) buf.write(chunk, 0, n);
        in.close();
        return buf.toString("UTF-8");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (fullscreenView != null) exitFullscreen();
        else if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
