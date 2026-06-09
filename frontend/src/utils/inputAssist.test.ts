import { describe, expect, it } from 'vitest';
import {
  applyTextInputAssistance,
  inputAssistProps,
  installTextInputAssistance,
  shouldEnableTextInputAssistance,
  textareaAssistProps,
} from './inputAssist';

describe('inputAssistProps', () => {
  it('keeps suggestions enabled for common text and search fields', () => {
    expect(inputAssistProps.search).toMatchObject({
      autoComplete: 'on',
      autoCorrect: 'on',
      autoCapitalize: 'sentences',
      spellCheck: true,
      inputMode: 'search',
    });
    expect(inputAssistProps.name).toMatchObject({
      autoComplete: 'name',
      autoCorrect: 'on',
      autoCapitalize: 'words',
      spellCheck: true,
    });
    expect(textareaAssistProps.notes).toMatchObject({
      autoComplete: 'on',
      autoCorrect: 'on',
      autoCapitalize: 'sentences',
      spellCheck: true,
      inputMode: 'text',
    });
  });

  it('keeps sensitive fields protected from autocorrect and autocomplete', () => {
    expect(inputAssistProps.email).toMatchObject({
      autoComplete: 'email',
      autoCorrect: 'off',
      autoCapitalize: 'none',
      spellCheck: false,
      inputMode: 'email',
    });
    expect(inputAssistProps.currentPassword).toMatchObject({
      autoComplete: 'current-password',
      autoCorrect: 'off',
      autoCapitalize: 'none',
      spellCheck: false,
    });
    expect(inputAssistProps.newPassword.autoComplete).toBe('new-password');
    expect(inputAssistProps.document).toMatchObject({
      autoComplete: 'off',
      autoCorrect: 'off',
      autoCapitalize: 'none',
      spellCheck: false,
      inputMode: 'numeric',
    });
    expect(inputAssistProps.otp).toMatchObject({
      autoComplete: 'one-time-code',
      autoCorrect: 'off',
      autoCapitalize: 'none',
      spellCheck: false,
      inputMode: 'numeric',
    });
  });

  it('enables global assistance only for non-sensitive text fields', () => {
    const makeElement = (attrs: Record<string, string> = {}) => {
      const input = document.createElement('input');
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'type') input.type = value;
        else input.setAttribute(key, value);
      });
      return input;
    };

    expect(shouldEnableTextInputAssistance(makeElement({ name: 'customerName', placeholder: 'Nome completo' }))).toBe(true);
    expect(shouldEnableTextInputAssistance(makeElement({ name: 'addressComplement', placeholder: 'Complemento' }))).toBe(true);
    expect(shouldEnableTextInputAssistance(makeElement({ type: 'password', name: 'password' }))).toBe(false);
    expect(shouldEnableTextInputAssistance(makeElement({ name: 'email', autocomplete: 'email' }))).toBe(false);
    expect(shouldEnableTextInputAssistance(makeElement({ name: 'otp', autocomplete: 'one-time-code' }))).toBe(false);
  });

  it('forces text input mode for assisted common fields', () => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'customerNote';
    wrapper.appendChild(input);

    applyTextInputAssistance(wrapper);

    expect(input.getAttribute('autocomplete')).toBe('on');
    expect(input.getAttribute('autocorrect')).toBe('on');
    expect(input.getAttribute('autocapitalize')).toBe('sentences');
    expect(input.getAttribute('spellcheck')).toBe('true');
    expect(input.getAttribute('inputmode')).toBe('text');
  });

  it('reapplies assistance when a common field receives focus', () => {
    const cleanup = installTextInputAssistance();
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'customerNote';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    document.body.appendChild(input);

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(input.getAttribute('autocomplete')).toBe('on');
    expect(input.getAttribute('autocorrect')).toBe('on');
    expect(input.getAttribute('spellcheck')).toBe('true');

    cleanup();
    input.remove();
  });
});
