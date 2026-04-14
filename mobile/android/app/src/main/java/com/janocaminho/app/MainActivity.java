package com.janocaminho.app;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.graphics.Color;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.Toast;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.play.core.appupdate.AppUpdateOptions;

public class MainActivity extends BridgeActivity {

    private static final String HUB_URL = "https://janocaminho.com.br/hub";
    private static final String TRUSTED_SCHEME = "https";
    private static final String TRUSTED_HOST = "janocaminho.com.br";
    private static final String TRUSTED_WWW_HOST = "www.janocaminho.com.br";
    private static final String APP_SCHEME = "janocaminho";
    private static final String PREFS_NAME = "jnk_mobile_prefs";
    private static final String LAST_URL_KEY = "last_url";
    private static final long NAV_ANIM_DURATION_MS = 220L;
    private static final long LAUNCH_OVERLAY_FADE_MS = 260L;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4401;
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 4402;
    private static final int APP_UPDATE_REQUEST_CODE = 4403;

    private String lastKnownUrl = HUB_URL;
    private GeolocationPermissions.Callback pendingGeoCallback = null;
    private String pendingGeoOrigin = null;
    private View launchOverlay;
    private ImageView launchLogo;
    private ProgressBar launchProgress;
    private boolean launchOverlayDismissed = false;
    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener installStateUpdatedListener;
    private boolean flexibleUpdatePromptVisible = false;

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
        initializeInAppUpdates();
        initializeLaunchOverlay();
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
        checkForAppUpdates();
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }
        webView.setBackgroundColor(Color.parseColor("#0B1220"));
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
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
        checkForAppUpdates();
        
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

                    String trustedUrl = normalizeTrustedWebUrl(url);
                    if (trustedUrl != null) {
                        saveLastVisitedUrl();
                        return super.shouldOverrideUrlLoading(view, trustedUrl);
                    }

                    return true;
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    return shouldOverrideUrlLoading(view, url);
                }

                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    if (normalizeTrustedWebUrl(url) == null) return;

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
                    String trustedUrl = normalizeTrustedWebUrl(url);
                    if (trustedUrl != null) {
                        lastKnownUrl = trustedUrl;
                        dismissLaunchOverlay();
                    }
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        if (appUpdateManager != null && installStateUpdatedListener != null) {
            appUpdateManager.unregisterListener(installStateUpdatedListener);
        }
        super.onDestroy();
    }

    private void initializeLaunchOverlay() {
        launchOverlay = findViewById(R.id.launch_overlay);
        launchLogo = findViewById(R.id.launch_logo);
        launchProgress = findViewById(R.id.launch_progress);

        View root = findViewById(R.id.main_root);
        if (root != null) {
            root.setBackgroundColor(Color.parseColor("#0B1220"));
        }

        if (launchOverlay != null) {
            launchOverlay.setAlpha(1f);
            launchOverlay.setVisibility(View.VISIBLE);
        }
        if (launchLogo != null) {
            launchLogo.setScaleX(0.92f);
            launchLogo.setScaleY(0.92f);
            launchLogo.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(420L)
                .setInterpolator(new DecelerateInterpolator())
                .start();
        }
        if (launchProgress != null) {
            launchProgress.setAlpha(0f);
            launchProgress.animate()
                .alpha(1f)
                .setStartDelay(130L)
                .setDuration(260L)
                .start();
        }
    }

    private void initializeInAppUpdates() {
        appUpdateManager = AppUpdateManagerFactory.create(this);
        installStateUpdatedListener = state -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED) {
                promptCompleteFlexibleUpdate();
            }
        };
        appUpdateManager.registerListener(installStateUpdatedListener);
    }

    private void checkForAppUpdates() {
        if (appUpdateManager == null) return;

        appUpdateManager
            .getAppUpdateInfo()
            .addOnSuccessListener(this::handleAppUpdateInfo)
            .addOnFailureListener(error ->
                android.util.Log.w("JNC_UPDATE", "Nao foi possivel consultar atualizacao na Play", error)
            );
    }

    private void handleAppUpdateInfo(AppUpdateInfo appUpdateInfo) {
        if (appUpdateInfo == null) return;

        if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
            promptCompleteFlexibleUpdate();
            return;
        }

        if (appUpdateInfo.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) {
            return;
        }

        if (!appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
            return;
        }

        try {
            appUpdateManager.startUpdateFlowForResult(
                appUpdateInfo,
                this,
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                APP_UPDATE_REQUEST_CODE
            );
        } catch (Exception error) {
            android.util.Log.w("JNC_UPDATE", "Falha ao iniciar atualizacao flexivel", error);
        }
    }

    private void promptCompleteFlexibleUpdate() {
        if (flexibleUpdatePromptVisible || isFinishing()) return;

        flexibleUpdatePromptVisible = true;
        runOnUiThread(() -> {
            if (isFinishing()) {
                flexibleUpdatePromptVisible = false;
                return;
            }

            new AlertDialog.Builder(this)
                .setTitle("Atualização pronta")
                .setMessage("Uma nova versão do Já no Caminho já foi baixada. Deseja reiniciar para aplicar agora?")
                .setCancelable(true)
                .setPositiveButton("Atualizar agora", (dialog, which) -> {
                    flexibleUpdatePromptVisible = false;
                    if (appUpdateManager != null) {
                        appUpdateManager.completeUpdate();
                    }
                })
                .setNegativeButton("Depois", (dialog, which) -> {
                    flexibleUpdatePromptVisible = false;
                    Toast.makeText(this, "Você pode concluir a atualização depois.", Toast.LENGTH_SHORT).show();
                })
                .setOnDismissListener(dialog -> flexibleUpdatePromptVisible = false)
                .show();
        });
    }

    private void dismissLaunchOverlay() {
        if (launchOverlayDismissed || launchOverlay == null) return;
        launchOverlayDismissed = true;
        launchOverlay.animate()
            .alpha(0f)
            .setDuration(LAUNCH_OVERLAY_FADE_MS)
            .setInterpolator(new DecelerateInterpolator())
            .withEndAction(() -> {
                launchOverlay.setVisibility(View.GONE);
                launchOverlay.setAlpha(1f);
            })
            .start();
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
        String trustedUrl = normalizeTrustedWebUrl(currentUrl);
        if (trustedUrl == null) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(LAST_URL_KEY, trustedUrl).apply();
    }

    private void openDeepLinkIfAny() {
        if (bridge == null || bridge.getWebView() == null) return;
        if (getIntent() == null || getIntent().getData() == null) return;
        String incoming = getIntent().getDataString();
        String trustedUrl = normalizeTrustedWebUrl(incoming);
        if (trustedUrl == null) return;
        bridge.getWebView().loadUrl(trustedUrl);
        lastKnownUrl = trustedUrl;
    }

    private String normalizeTrustedWebUrl(String value) {
        if (value == null || value.isEmpty()) return null;
        try {
            Uri uri = Uri.parse(value);
            String scheme = uri.getScheme();
            if (scheme == null) return null;

            if (TRUSTED_SCHEME.equalsIgnoreCase(scheme)) {
                String host = uri.getHost();
                if (!isTrustedHost(host)) return null;
                return uri.buildUpon()
                    .scheme(TRUSTED_SCHEME)
                    .encodedAuthority(TRUSTED_HOST)
                    .build()
                    .toString();
            }

            if (APP_SCHEME.equalsIgnoreCase(scheme)) {
                String internalPath = buildInternalPathFromAppUri(uri);
                if (internalPath == null) return null;
                return TRUSTED_SCHEME + "://" + TRUSTED_HOST + internalPath;
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private boolean isTrustedHost(String host) {
        if (host == null || host.isEmpty()) return false;
        return TRUSTED_HOST.equalsIgnoreCase(host) || TRUSTED_WWW_HOST.equalsIgnoreCase(host);
    }

    private String buildInternalPathFromAppUri(Uri uri) {
        String host = uri.getHost();
        String path = uri.getEncodedPath();
        StringBuilder builder = new StringBuilder("/");

        if (host != null && !host.isEmpty()) {
            builder.append(host);
        }

        if (path != null && !path.isEmpty()) {
            if (builder.charAt(builder.length() - 1) == '/' && path.startsWith("/")) {
                builder.append(path.substring(1));
            } else {
                builder.append(path);
            }
        }

        String internalPath = builder.toString();
        if (!internalPath.matches("^/[A-Za-z0-9/_\\-\\.]*$")) return null;

        String query = uri.getEncodedQuery();
        String fragment = uri.getEncodedFragment();
        if (query != null && !query.isEmpty()) {
            internalPath = internalPath + "?" + query;
        }
        if (fragment != null && !fragment.isEmpty()) {
            internalPath = internalPath + "#" + fragment;
        }
        return internalPath;
    }
}
