package com.janocaminho.app;

import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String HUB_URL = "https://janocaminho.com.br/hub";

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
}
