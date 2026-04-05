package com.janocaminho.app;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String HUB_URL = "https://janocaminho.com.br/hub";
    private static final String PREFS_NAME = "jnk_mobile_prefs";
    private static final String LAST_URL_KEY = "last_url";
    private static final String ROOT_DOMAIN = "janocaminho.com.br";
    private static final long NAV_ANIM_DURATION_MS = 220L;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4401;
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 4402;

    private String lastKnownUrl = HUB_URL;
    private GeolocationPermissions.Callback pendingGeoCallback = null;
    private String pendingGeoOrigin = null;

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
        checkAndRequestMediaPermissionsOnce();
    }

    private void checkAndRequestMediaPermissionsOnce() {
        String[] permissions;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.READ_MEDIA_IMAGES
            };
        } else {
            permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            };
        }

        boolean needRequest = false;
        for (String p : permissions) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                needRequest = true;
                break;
            }
        }

        if (needRequest) {
            ActivityCompat.requestPermissions(this, permissions, MEDIA_PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        restoreLastVisitedUrl();
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
        if (webView.canGoBack()) {
            webView.goBack();
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
        settings.setGeolocationEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                    return;
                }
                pendingGeoOrigin = origin;
                pendingGeoCallback = callback;
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[] { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION },
                    LOCATION_PERMISSION_REQUEST_CODE
                );
            }

            // Garante que o seletor de arquivos funcione no WebView
            @Override
            public boolean onShowFileChooser(WebView webView, android.webkit.ValueCallback<android.net.Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
            }
        });
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        cookieManager.flush();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (pendingGeoCallback == null || pendingGeoOrigin == null) return;
            boolean granted = hasLocationPermission();
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void configureNavigationTransitions() {
        if (bridge == null || bridge.getWebView() == null) return;
        
        // Em vez de substituir o WebViewClient (o que quebra o Capacitor),
        // vamos apenas observar as mudanças de URL se possível ou aceitar que o Bridge cuida disso.
        // Para resolver o ERR_UNKNOWN_URL_SCHEME, precisamos que o Capacitor trate intents.
        // O BridgeActivity do Capacitor já lida com muitos esquemas, mas podemos reforçar.
    }

    // Override para interceptar URLs antes do WebView tentar carregar e falhar com esquema desconhecido
    @Override
    public void onStart() {
        super.onStart();
        configureWebViewPersistence();
        configureNavigationTransitions();
        restoreLastVisitedUrl();
        openDeepLinkIfAny();
        
        // Ajuste no WebView para aceitar intents de apps externos
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebViewClient(new com.getcapacitor.BridgeWebViewClient(bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url == null) return false;

                    if (url.startsWith("mailto:") || url.startsWith("rawbt:") || url.startsWith("tel:") || url.startsWith("whatsapp:")) {
                        try {
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    if (isTrustedUrl(url)) {
                        saveLastVisitedUrl();
                        return super.shouldOverrideUrlLoading(view, url);
                    }

                    return super.shouldOverrideUrlLoading(view, url);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    return shouldOverrideUrlLoading(view, url);
                }

                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    if (!isTrustedUrl(url)) return;

                    String previous = lastKnownUrl == null ? HUB_URL : lastKnownUrl;
                    boolean fromHub = previous.contains("/hub");
                    boolean toHub = url.contains("/hub");

                    if (fromHub && !toHub) {
                        animateSlideInFromRight(view);
                    } else if (!fromHub && toHub) {
                        animateSlideInFromLeft(view);
                    }
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    if (isTrustedUrl(url)) {
                        lastKnownUrl = url;
                    }
                }
            });
        }
    }

    private void animateSlideInFromRight(View view) {
        float width = view.getWidth() > 0 ? view.getWidth() : 1080f;
        view.setTranslationX(width * 0.12f);
        view.setAlpha(0.92f);
        view.animate()
            .translationX(0f)
            .alpha(1f)
            .setDuration(NAV_ANIM_DURATION_MS)
            .setInterpolator(new DecelerateInterpolator())
            .start();
    }

    private void animateSlideInFromLeft(View view) {
        float width = view.getWidth() > 0 ? view.getWidth() : 1080f;
        view.setTranslationX(-width * 0.10f);
        view.setAlpha(0.94f);
        view.animate()
            .translationX(0f)
            .alpha(1f)
            .setDuration(NAV_ANIM_DURATION_MS)
            .setInterpolator(new DecelerateInterpolator())
            .start();
    }

    private void restoreLastVisitedUrl() {
        if (bridge == null || bridge.getWebView() == null) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedUrl = prefs.getString(LAST_URL_KEY, HUB_URL);
        
        WebView webView = bridge.getWebView();
        String currentUrl = webView.getUrl();
        
        // Se não houver URL carregada ou se for a tela inicial branca, carrega a salva
        if (currentUrl == null || currentUrl.isEmpty() || currentUrl.equals("about:blank")) {
            webView.loadUrl(savedUrl);
            lastKnownUrl = savedUrl;
        }
    }

    private void saveLastVisitedUrl() {
        if (bridge == null || bridge.getWebView() == null) return;
        String currentUrl = bridge.getWebView().getUrl();
        if (currentUrl == null || !isTrustedUrl(currentUrl)) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(LAST_URL_KEY, currentUrl).apply();
    }

    private void openDeepLinkIfAny() {
        if (bridge == null || bridge.getWebView() == null) return;
        if (getIntent() == null || getIntent().getData() == null) return;
        String incoming = getIntent().getDataString();
        if (!isTrustedUrl(incoming)) return;
        bridge.getWebView().loadUrl(incoming);
        lastKnownUrl = incoming;
    }

    private boolean isTrustedUrl(String value) {
        if (value == null || value.isEmpty()) return false;
        String normalized = value.toLowerCase();
        if (normalized.startsWith("janocaminho://")) return true;
        return normalized.contains(ROOT_DOMAIN);
    }
}
