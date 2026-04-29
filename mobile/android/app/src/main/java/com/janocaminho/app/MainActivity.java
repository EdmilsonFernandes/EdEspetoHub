package com.janocaminho.app;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.annotation.SuppressLint;
import android.graphics.Color;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.os.Build;
import android.net.http.SslError;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.appcompat.app.AlertDialog;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.play.core.appupdate.AppUpdateOptions;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String HUB_URL = "https://janocaminho.com.br/hub";
    private static final String TRUSTED_SCHEME = "https";
    private static final String TRUSTED_HOST = "janocaminho.com.br";
    private static final String TRUSTED_WWW_HOST = "www.janocaminho.com.br";
    private static final String APP_SCHEME = "janocaminho";
    private static final String PREFS_NAME = "jnk_mobile_prefs";
    private static final String SECURE_PREFS_NAME = "jnk_secure_bio_prefs";
    private static final String LAST_URL_KEY = "last_url";
    private static final String CUSTOMER_PROFILE_KEY = "customer_profile";
    private static final String CUSTOMER_SESSION_KEY = "customer_session";
    private static final String ADMIN_PROFILE_KEY = "admin_profile";
    private static final String ADMIN_SESSION_KEY = "admin_session";
    private static final String MOTOBOY_PROFILE_KEY = "motoboy_profile";
    private static final String MOTOBOY_SESSION_KEY = "motoboy_session";
    private static final String BIOMETRIC_RESULT_EVENT = "jnc:android-biometric-result";
    private static final long NAV_ANIM_DURATION_MS = 220L;
    private static final long LAUNCH_OVERLAY_FADE_MS = 260L;
    private static final long LAUNCH_OVERLAY_NETWORK_TIMEOUT_MS = 9000L;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4401;
    private static final int APP_UPDATE_REQUEST_CODE = 4403;

    private String lastKnownUrl = HUB_URL;
    private GeolocationPermissions.Callback pendingGeoCallback = null;
    private String pendingGeoOrigin = null;
    private View launchOverlay;
    private ImageView launchLogo;
    private ProgressBar launchProgress;
    private TextView launchSubtitleText;
    private Button launchRetryButton;
    private boolean launchOverlayDismissed = false;
    private boolean pageFailedToLoad = false;
    private final Handler launchOverlayHandler = new Handler(Looper.getMainLooper());
    private Runnable launchOverlayTimeoutRunnable;
    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener installStateUpdatedListener;
    private boolean flexibleUpdatePromptVisible = false;
    private boolean biometricBridgeInjected = false;

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
        EdgeToEdge.enable(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
        }
        super.onCreate(savedInstanceState);
        initializeInAppUpdates();
        initializeLaunchOverlay();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Se a página falhou (deploy, idle, sem rede), reativa o overlay e tenta recarregar
        if (pageFailedToLoad) {
            launchOverlayDismissed = false;
            retryInitialPageLoad();
        } else {
            restoreLastVisitedUrl();
        }
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
        if (!biometricBridgeInjected) {
            webView.addJavascriptInterface(new BiometricBridge(), "JNCBiometrics");
            biometricBridgeInjected = true;
        }
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
    @SuppressLint("SetJavaScriptEnabled")
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

                    if (!launchOverlayDismissed) {
                        showLaunchOverlayLoading(null);
                        scheduleLaunchOverlayTimeout();
                    }

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
                        pageFailedToLoad = false;
                        cancelLaunchOverlayTimeout();
                        lastKnownUrl = trustedUrl;
                        dismissLaunchOverlay();
                    }
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                    if (request == null || !request.isForMainFrame()) return;

                    String failingUrl = request.getUrl() == null ? null : request.getUrl().toString();
                    if (normalizeTrustedWebUrl(failingUrl) == null) return;

                    pageFailedToLoad = true;
                    launchOverlayDismissed = false;
                    showLaunchOverlayRecovery(getString(R.string.launch_timeout_message));
                }

                @Override
                public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                    super.onReceivedHttpError(view, request, errorResponse);
                    if (request == null || !request.isForMainFrame()) return;

                    String failingUrl = request.getUrl() == null ? null : request.getUrl().toString();
                    if (normalizeTrustedWebUrl(failingUrl) == null) return;

                    int statusCode = errorResponse == null ? 0 : errorResponse.getStatusCode();
                    if (statusCode >= 500) {
                        pageFailedToLoad = true;
                        launchOverlayDismissed = false;
                        showLaunchOverlayRecovery(getString(R.string.launch_http_error_message));
                    }
                }

                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    handler.cancel();
                    pageFailedToLoad = true;
                    launchOverlayDismissed = false;
                    showLaunchOverlayRecovery(getString(R.string.launch_ssl_error_message));
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
        launchSubtitleText = findViewById(R.id.launch_subtitle_text);
        launchRetryButton = findViewById(R.id.launch_retry_button);

        View root = findViewById(R.id.main_root);
        if (root != null) {
            root.setBackgroundColor(Color.parseColor("#0B1220"));
        }

        if (launchOverlay != null) {
            launchOverlay.setAlpha(1f);
            launchOverlay.setVisibility(View.VISIBLE);
            applyLaunchOverlayInsets();
        }
        if (launchRetryButton != null) {
            launchRetryButton.setVisibility(View.GONE);
            launchRetryButton.setOnClickListener((v) -> retryInitialPageLoad());
        }
        if (launchSubtitleText != null) {
            launchSubtitleText.setText(getString(R.string.launch_subtitle));
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

    private void applyLaunchOverlayInsets() {
        if (launchOverlay == null) return;

        final int baseLeft = launchOverlay.getPaddingLeft();
        final int baseTop = launchOverlay.getPaddingTop();
        final int baseRight = launchOverlay.getPaddingRight();
        final int baseBottom = launchOverlay.getPaddingBottom();

        ViewCompat.setOnApplyWindowInsetsListener(launchOverlay, (view, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(
                baseLeft,
                baseTop + systemBars.top,
                baseRight,
                baseBottom + systemBars.bottom
            );
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(launchOverlay);
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
        cancelLaunchOverlayTimeout();
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

    private void showLaunchOverlayLoading(String message) {
        if (launchOverlay == null || launchOverlayDismissed) return;

        launchOverlay.setVisibility(View.VISIBLE);
        launchOverlay.setAlpha(1f);

        if (launchSubtitleText != null) {
            launchSubtitleText.setText(
                message == null || message.trim().isEmpty()
                    ? getString(R.string.launch_subtitle)
                    : message
            );
        }

        if (launchProgress != null) {
            launchProgress.setVisibility(View.VISIBLE);
            launchProgress.setAlpha(1f);
        }

        if (launchRetryButton != null) {
            launchRetryButton.setVisibility(View.GONE);
        }
    }

    private void showLaunchOverlayRecovery(String message) {
        if (launchOverlay == null || launchOverlayDismissed) return;

        cancelLaunchOverlayTimeout();
        launchOverlay.setVisibility(View.VISIBLE);
        launchOverlay.setAlpha(1f);

        if (launchSubtitleText != null) {
            launchSubtitleText.setText(
                message == null || message.trim().isEmpty()
                    ? getString(R.string.launch_timeout_message)
                    : message
            );
        }

        if (launchProgress != null) {
            launchProgress.animate().cancel();
            launchProgress.setVisibility(View.GONE);
        }

        if (launchRetryButton != null) {
            launchRetryButton.setVisibility(View.VISIBLE);
        }
    }

    private void scheduleLaunchOverlayTimeout() {
        if (launchOverlayDismissed) return;

        cancelLaunchOverlayTimeout();
        launchOverlayTimeoutRunnable = () -> {
            if (!launchOverlayDismissed) {
                showLaunchOverlayRecovery(getString(R.string.launch_timeout_message));
            }
        };
        launchOverlayHandler.postDelayed(launchOverlayTimeoutRunnable, LAUNCH_OVERLAY_NETWORK_TIMEOUT_MS);
    }

    private void cancelLaunchOverlayTimeout() {
        if (launchOverlayTimeoutRunnable == null) return;
        launchOverlayHandler.removeCallbacks(launchOverlayTimeoutRunnable);
        launchOverlayTimeoutRunnable = null;
    }

    private void retryInitialPageLoad() {
        if (bridge == null || bridge.getWebView() == null) return;

        String retryUrl = normalizeTrustedWebUrl(lastKnownUrl);
        if (retryUrl == null) {
            retryUrl = HUB_URL;
        }

        showLaunchOverlayLoading(getString(R.string.launch_retrying_message));
        scheduleLaunchOverlayTimeout();
        bridge.getWebView().stopLoading();
        bridge.getWebView().loadUrl(retryUrl);
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
            if (!launchOverlayDismissed) {
                showLaunchOverlayLoading(null);
                scheduleLaunchOverlayTimeout();
            }
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

    private SharedPreferences getSecurePreferences() {
        try {
            String masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);
            return EncryptedSharedPreferences.create(
                SECURE_PREFS_NAME,
                masterKeyAlias,
                this,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception error) {
            android.util.Log.w("JNC_BIO", "Falha ao abrir storage seguro, usando fallback local", error);
            return getSharedPreferences(SECURE_PREFS_NAME, MODE_PRIVATE);
        }
    }

    private boolean isBiometricAvailableNative() {
        int result = BiometricManager.from(this).canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL
        );
        return result == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private void dispatchBiometricResult(String requestId, boolean success, String message) {
        if (bridge == null || bridge.getWebView() == null) return;
        try {
            JSONObject detail = new JSONObject();
            detail.put("requestId", requestId == null ? "" : requestId);
            detail.put("success", success);
            detail.put("message", message == null ? "" : message);
            String script =
                "window.dispatchEvent(new CustomEvent('" + BIOMETRIC_RESULT_EVENT + "',{detail:" + detail.toString() + "}));";
            bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(script, null));
        } catch (Exception error) {
            android.util.Log.w("JNC_BIO", "Falha ao enviar evento biometrico ao app", error);
        }
    }

    private class BiometricBridge {

        @JavascriptInterface
        public boolean isBiometricAvailable() {
            return isBiometricAvailableNative();
        }

        @JavascriptInterface
        public boolean hasCustomerProfile() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.contains(CUSTOMER_PROFILE_KEY) && prefs.contains(CUSTOMER_SESSION_KEY);
        }

        @JavascriptInterface
        public String getCustomerProfile() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.getString(CUSTOMER_PROFILE_KEY, "");
        }

        @JavascriptInterface
        public String getCustomerSession() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.getString(CUSTOMER_SESSION_KEY, "");
        }

        @JavascriptInterface
        public boolean hasAdminProfile() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.contains(ADMIN_PROFILE_KEY) && prefs.contains(ADMIN_SESSION_KEY);
        }

        @JavascriptInterface
        public String getAdminProfile() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.getString(ADMIN_PROFILE_KEY, "");
        }

        @JavascriptInterface
        public String getAdminSession() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.getString(ADMIN_SESSION_KEY, "");
        }

        @JavascriptInterface
        public boolean hasMotoboyProfile() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.contains(MOTOBOY_PROFILE_KEY) && prefs.contains(MOTOBOY_SESSION_KEY);
        }

        @JavascriptInterface
        public String getMotoboyProfile() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.getString(MOTOBOY_PROFILE_KEY, "");
        }

        @JavascriptInterface
        public String getMotoboySession() {
            SharedPreferences prefs = getSecurePreferences();
            return prefs.getString(MOTOBOY_SESSION_KEY, "");
        }

        @JavascriptInterface
        public boolean saveCustomerProfile(String profileJson, String sessionJson) {
            if (profileJson == null || profileJson.trim().isEmpty() || sessionJson == null || sessionJson.trim().isEmpty()) {
                return false;
            }
            try {
                SharedPreferences prefs = getSecurePreferences();
                prefs.edit()
                    .putString(CUSTOMER_PROFILE_KEY, profileJson)
                    .putString(CUSTOMER_SESSION_KEY, sessionJson)
                    .apply();
                return true;
            } catch (Exception error) {
                android.util.Log.w("JNC_BIO", "Falha ao salvar sessao biometrica", error);
                return false;
            }
        }

        @JavascriptInterface
        public boolean saveAdminProfile(String profileJson, String sessionJson) {
            if (profileJson == null || profileJson.trim().isEmpty() || sessionJson == null || sessionJson.trim().isEmpty()) {
                return false;
            }
            try {
                SharedPreferences prefs = getSecurePreferences();
                prefs.edit()
                    .putString(ADMIN_PROFILE_KEY, profileJson)
                    .putString(ADMIN_SESSION_KEY, sessionJson)
                    .apply();
                return true;
            } catch (Exception error) {
                android.util.Log.w("JNC_BIO", "Falha ao salvar sessao biometrica do admin", error);
                return false;
            }
        }

        @JavascriptInterface
        public boolean saveMotoboyProfile(String profileJson, String sessionJson) {
            if (profileJson == null || profileJson.trim().isEmpty() || sessionJson == null || sessionJson.trim().isEmpty()) {
                return false;
            }
            try {
                SharedPreferences prefs = getSecurePreferences();
                prefs.edit()
                    .putString(MOTOBOY_PROFILE_KEY, profileJson)
                    .putString(MOTOBOY_SESSION_KEY, sessionJson)
                    .apply();
                return true;
            } catch (Exception error) {
                android.util.Log.w("JNC_BIO", "Falha ao salvar sessao biometrica do motoboy", error);
                return false;
            }
        }

        @JavascriptInterface
        public boolean clearCustomerProfile() {
            try {
                SharedPreferences prefs = getSecurePreferences();
                prefs.edit()
                    .remove(CUSTOMER_PROFILE_KEY)
                    .remove(CUSTOMER_SESSION_KEY)
                    .apply();
                return true;
            } catch (Exception error) {
                android.util.Log.w("JNC_BIO", "Falha ao limpar sessao biometrica", error);
                return false;
            }
        }

        @JavascriptInterface
        public boolean clearAdminProfile() {
            try {
                SharedPreferences prefs = getSecurePreferences();
                prefs.edit()
                    .remove(ADMIN_PROFILE_KEY)
                    .remove(ADMIN_SESSION_KEY)
                    .apply();
                return true;
            } catch (Exception error) {
                android.util.Log.w("JNC_BIO", "Falha ao limpar sessao biometrica do admin", error);
                return false;
            }
        }

        @JavascriptInterface
        public boolean clearMotoboyProfile() {
            try {
                SharedPreferences prefs = getSecurePreferences();
                prefs.edit()
                    .remove(MOTOBOY_PROFILE_KEY)
                    .remove(MOTOBOY_SESSION_KEY)
                    .apply();
                return true;
            } catch (Exception error) {
                android.util.Log.w("JNC_BIO", "Falha ao limpar sessao biometrica do motoboy", error);
                return false;
            }
        }

        @JavascriptInterface
        public void authenticateCustomer(String requestId, String reason) {
            runOnUiThread(() -> {
                if (!isBiometricAvailableNative()) {
                    dispatchBiometricResult(requestId, false, "Biometria não disponível neste aparelho.");
                    return;
                }

                BiometricPrompt biometricPrompt = new BiometricPrompt(
                    MainActivity.this,
                    ContextCompat.getMainExecutor(MainActivity.this),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            dispatchBiometricResult(requestId, true, "");
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            dispatchBiometricResult(requestId, false, errString == null ? "" : errString.toString());
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                        }
                    }
                );

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Entrar com biometria")
                    .setSubtitle(
                        reason == null || reason.trim().isEmpty()
                            ? "Confirme sua identidade para acessar sua conta"
                            : reason
                    )
                    .setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                    .build();

                biometricPrompt.authenticate(promptInfo);
            });
        }

        @JavascriptInterface
        public void authenticateAdmin(String requestId, String reason) {
            authenticateCustomer(requestId, reason);
        }

        @JavascriptInterface
        public void authenticateMotoboy(String requestId, String reason) {
            authenticateCustomer(requestId, reason);
        }
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
