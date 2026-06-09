package com.janocaminho.app;

import android.content.Context;
import android.text.InputType;
import android.util.AttributeSet;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.webkit.WebView;

public class JanoWebView extends WebView {

    public JanoWebView(Context context) {
        super(context);
    }

    public JanoWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public JanoWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        InputConnection connection = super.onCreateInputConnection(outAttrs);
        if (connection == null || outAttrs == null || !shouldEnableSuggestions(outAttrs.inputType)) {
            return connection;
        }

        outAttrs.inputType &= ~InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS;
        outAttrs.inputType |= InputType.TYPE_TEXT_FLAG_AUTO_CORRECT;
        outAttrs.inputType |= InputType.TYPE_TEXT_FLAG_CAP_SENTENCES;
        return connection;
    }

    private boolean shouldEnableSuggestions(int inputType) {
        int inputClass = inputType & InputType.TYPE_MASK_CLASS;
        if (inputClass != InputType.TYPE_CLASS_TEXT) return false;

        int variation = inputType & InputType.TYPE_MASK_VARIATION;
        return variation != InputType.TYPE_TEXT_VARIATION_PASSWORD
            && variation != InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            && variation != InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
            && variation != InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            && variation != InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS
            && variation != InputType.TYPE_TEXT_VARIATION_URI;
    }
}
