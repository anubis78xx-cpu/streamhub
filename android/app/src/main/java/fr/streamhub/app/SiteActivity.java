package fr.streamhub.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.util.Arrays;

/**
 * In-app window for a web site (my video sites, search results, Dailymotion...):
 * floating back and fullscreen buttons, ad blocker on the sites the user added (AdBlock),
 * cross-site pop-ups blocked, real fullscreen for video players.
 */
public class SiteActivity extends Activity {

    static final String EXTRA_URL = "url";

    private FrameLayout root;
    private WebView web;
    private View playerView;
    private WebChromeClient.CustomViewCallback playerCallback;
    private boolean immersive;
    /** Site of the page shown, read from the network thread by shouldInterceptRequest. */
    private volatile String pageHost;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF000000);
        getWindow().setNavigationBarColor(0xFF000000);

        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF000000);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(roundButton("←", "Retour", v -> goBack()), buttonParams(0));
        root.addView(roundButton("⛶", "Plein écran", v -> setFullscreen(!immersive)), buttonParams(1));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        // Pop-ups arrive in onCreateWindow, where ads are filtered out.
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                pageHost = Uri.parse(url).getHost();
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Only the pages of the sites the user added are filtered.
                if (!AdBlock.filtersPage(pageHost) || !AdBlock.isBlocked(request.getUrl().getHost())) return null;
                return new WebResourceResponse("text/plain", "utf-8", 403, "Blocked", null,
                        new ByteArrayInputStream(new byte[0]));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String scheme = request.getUrl().getScheme();
                // Web pages stay here; other links (apps, store) open outside, like in a browser.
                if ("http".equals(scheme) || "https".equals(scheme)) return false;
                try {
                    startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, request.getUrl()));
                } catch (Exception e) {
                    toast("Lien impossible à ouvrir");
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                // A pop-up to the same site opens here, one to another site is blocked (like a browser's pop-up blocker).
                WebView.HitTestResult hit = view.getHitTestResult();
                String target = hit != null ? hit.getExtra() : null;
                Uri current = Uri.parse(view.getUrl() == null ? "" : view.getUrl());
                if (target != null && target.startsWith("http") && siteOf(Uri.parse(target).getHost()).equals(siteOf(current.getHost()))) {
                    view.loadUrl(target);
                } else {
                    toast("Fenêtre surgissante bloquée");
                }
                return false;
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (playerView != null) { callback.onCustomViewHidden(); return; }
                playerView = view;
                playerCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                setFullscreen(true);
            }

            @Override
            public void onHideCustomView() {
                exitPlayerFullscreen();
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Protected (DRM) video only; camera and microphone are never granted.
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(r)) {
                        request.grant(new String[]{r});
                        return;
                    }
                }
                request.deny();
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(getIntent().getStringExtra(EXTRA_URL));
    }

    /** Registrable domain, roughly: "www.foo.co.uk" -> "foo.co.uk", "player.foo.com" -> "foo.com". */
    static String siteOf(String host) {
        if (host == null) return "";
        String[] p = host.toLowerCase().split("\\.");
        int n = p.length;
        if (n > 2 && p[n - 1].length() == 2 && Arrays.asList("co", "com", "org", "net", "gouv").contains(p[n - 2])) {
            return p[n - 3] + "." + p[n - 2] + "." + p[n - 1];
        }
        return n >= 2 ? p[n - 2] + "." + p[n - 1] : host;
    }

    private void goBack() {
        if (playerView != null) exitPlayerFullscreen();
        else if (web.canGoBack()) web.goBack();
        else finish();
    }

    private void exitPlayerFullscreen() {
        if (playerView == null) return;
        root.removeView(playerView);
        playerView = null;
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        setFullscreen(false);
        if (playerCallback != null) playerCallback.onCustomViewHidden();
        playerCallback = null;
    }

    /** Hides the status and navigation bars (swipe from the edge shows them for a moment). */
    private void setFullscreen(boolean on) {
        immersive = on;
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c == null) return;
            if (on) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            } else {
                c.show(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(on
                    ? View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    : 0);
        }
    }

    private TextView roundButton(String label, String description, View.OnClickListener onClick) {
        TextView b = new TextView(this);
        b.setText(label);
        b.setContentDescription(description);
        b.setTextColor(0xFFFFFFFF);
        b.setTextSize(20);
        b.setGravity(Gravity.CENTER);
        b.setAlpha(0.8f);
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(0xD90D0F17);
        bg.setStroke(dp(1), 0x40FFFFFF);
        b.setBackground(bg);
        b.setElevation(dp(4));
        b.setOnClickListener(onClick);
        return b;
    }

    private FrameLayout.LayoutParams buttonParams(int index) {
        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(dp(44), dp(44), Gravity.BOTTOM | Gravity.START);
        p.leftMargin = dp(14) + index * dp(52);
        p.bottomMargin = dp(18);
        return p;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void toast(String text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        goBack();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
