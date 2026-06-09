import { describe, expect, it } from 'vitest';
import { inputAssistProps, shouldEnableTextInputAssistance, textareaAssistProps } from './inputAssist';

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
});
