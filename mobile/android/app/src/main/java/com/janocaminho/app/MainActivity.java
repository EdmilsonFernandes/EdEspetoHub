package com.janocaminho.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String HUB_URL = "https://janocaminho.com.br/hub";
    private static final String PREFS_NAME = "jnk_mobile_prefs";
    private static final String LAST_URL_KEY = "last_url";
    private static final String ROOT_DOMAIN = "janocaminho.com.br";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setOnExitAnimationListener((provider) -> {
            View splashView = provider.getView();
            ObjectAnimator fade = ObjectAnimator.ofFloat(splashView, View.ALPHA, 1f, 0f);
            ObjectAnimator scaleX = ObjectAnimator.ofFloat(splashView, View.SCALE_X, 1f, 1.04f);
            ObjectAnimator scaleY = ObjectAnimator.ofFloat(splashView, View.SCALE_Y, 1f, 1.04f);

            AnimatorSet set = new AnimatorSet();
            set.playTogether(fade, scaleX, scaleY);
            set.setDuration(360L);
            set.setInterpolator(new DecelerateInterpolator());
            set.addListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    provider.remove();
                }
            });
            set.start();
        });
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebViewPersistence();
        restoreLastVisitedUrl();
        openDeepLinkIfAny();
    }

    @Override
    public void onPause() {
        super.onPause();
        saveLastVisitedUrl();
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openDeepLinkIfAny();
    }

    @Override
    public void onBackPressed() {
        if (bridge == null || bridge.getWebView() == null) {
            super.onBackPressed();
            return;
        }

        WebView webView = bridge.getWebView();
        String currentUrl = webView.getUrl();

        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }

        if (currentUrl != null && !currentUrl.contains("/hub")) {
            webView.loadUrl(HUB_URL);
            return;
        }

        super.onBackPressed();
    }

    private void configureWebViewPersistence() {
        if (bridge == null || bridge.getWebView() == null) return;
        WebView webView = bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        cookieManager.flush();
    }

    private void saveLastVisitedUrl() {
        if (bridge == null || bridge.getWebView() == null) return;
        String currentUrl = bridge.getWebView().getUrl();
        if (!isTrustedUrl(currentUrl)) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(LAST_URL_KEY, currentUrl).apply();
    }

    private void restoreLastVisitedUrl() {
        if (bridge == null || bridge.getWebView() == null) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedUrl = prefs.getString(LAST_URL_KEY, "");
        if (!isTrustedUrl(savedUrl)) return;
        String currentUrl = bridge.getWebView().getUrl();
        if (currentUrl == null || currentUrl.isEmpty() || currentUrl.contains("/hub")) {
            bridge.getWebView().loadUrl(savedUrl);
        }
    }

    private void openDeepLinkIfAny() {
        if (bridge == null || bridge.getWebView() == null) return;
        if (getIntent() == null || getIntent().getData() == null) return;
        String incoming = getIntent().getDataString();
        if (!isTrustedUrl(incoming)) return;
        bridge.getWebView().loadUrl(incoming);
    }

    private boolean isTrustedUrl(String value) {
        if (value == null || value.isEmpty()) return false;
        String normalized = value.toLowerCase();
        if (normalized.startsWith("janocaminho://")) return true;
        return normalized.contains(ROOT_DOMAIN);
    }
}
