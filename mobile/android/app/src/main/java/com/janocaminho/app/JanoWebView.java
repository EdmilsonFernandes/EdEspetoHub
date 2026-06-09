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

        int variation = outAttrs.inputType & InputType.TYPE_MASK_VARIATION;
        int flags = outAttrs.inputType & InputType.TYPE_MASK_FLAGS;
        flags &= ~InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS;
        flags |= InputType.TYPE_TEXT_FLAG_AUTO_CORRECT;
        flags |= InputType.TYPE_TEXT_FLAG_CAP_SENTENCES;

        // Alguns teclados Android ocultam sugestoes quando o WebView marca o campo
        // como WEB_EDIT_TEXT/FILTER, mesmo com autocorrect ligado no HTML.
        if (variation == InputType.TYPE_TEXT_VARIATION_WEB_EDIT_TEXT
            || variation == InputType.TYPE_TEXT_VARIATION_FILTER) {
            variation = InputType.TYPE_TEXT_VARIATION_NORMAL;
        }

        outAttrs.inputType = InputType.TYPE_CLASS_TEXT | variation | flags;
        outAttrs.imeOptions &= ~EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;
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
