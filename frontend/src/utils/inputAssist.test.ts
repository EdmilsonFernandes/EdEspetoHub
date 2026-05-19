import { describe, expect, it } from 'vitest';
import { inputAssistProps, textareaAssistProps } from './inputAssist';

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
});
