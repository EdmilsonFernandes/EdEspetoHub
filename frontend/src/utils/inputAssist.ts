export const inputAssistProps = {
  search: {
    type: 'search',
    autoComplete: 'on',
    autoCorrect: 'on',
    autoCapitalize: 'sentences',
    spellCheck: true,
    inputMode: 'search',
  },
  name: {
    type: 'text',
    autoComplete: 'name',
    autoCorrect: 'on',
    autoCapitalize: 'words',
    spellCheck: true,
  },
  email: {
    type: 'email',
    autoComplete: 'email',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    inputMode: 'email',
  },
  username: {
    autoComplete: 'username',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
  },
  currentPassword: {
    autoComplete: 'current-password',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
  },
  newPassword: {
    autoComplete: 'new-password',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
  },
  phone: {
    type: 'tel',
    autoComplete: 'tel',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    inputMode: 'tel',
  },
  phoneNational: {
    type: 'tel',
    autoComplete: 'tel-national',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    inputMode: 'tel',
  },
  document: {
    type: 'text',
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    inputMode: 'numeric',
  },
  postalCode: {
    type: 'text',
    autoComplete: 'postal-code',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    inputMode: 'numeric',
  },
  addressLine1: {
    type: 'text',
    autoComplete: 'address-line1',
    autoCorrect: 'on',
    autoCapitalize: 'words',
    spellCheck: true,
  },
  addressLine2: {
    type: 'text',
    autoComplete: 'address-line2',
    autoCorrect: 'on',
    autoCapitalize: 'words',
    spellCheck: true,
  },
  addressLine3: {
    type: 'text',
    autoComplete: 'address-line3',
    autoCorrect: 'on',
    autoCapitalize: 'words',
    spellCheck: true,
  },
  neighborhood: {
    type: 'text',
    autoComplete: 'address-level3',
    autoCorrect: 'on',
    autoCapitalize: 'words',
    spellCheck: true,
  },
  city: {
    type: 'text',
    autoComplete: 'address-level2',
    autoCorrect: 'on',
    autoCapitalize: 'words',
    spellCheck: true,
  },
  state: {
    type: 'text',
    autoComplete: 'address-level1',
    autoCorrect: 'off',
    autoCapitalize: 'characters',
    spellCheck: false,
  },
  otp: {
    autoComplete: 'one-time-code',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    inputMode: 'numeric',
  },
} as const;

export const textareaAssistProps = {
  notes: {
    autoComplete: 'on',
    autoCorrect: 'on',
    autoCapitalize: 'sentences',
    spellCheck: true,
    inputMode: 'text',
  },
  description: {
    autoComplete: 'on',
    autoCorrect: 'on',
    autoCapitalize: 'sentences',
    spellCheck: true,
    inputMode: 'text',
  },
} as const;

const SENSITIVE_INPUT_PATTERN = /(password|senha|token|otp|code|codigo|pin|mfa|email|mail|phone|telefone|whatsapp|tel|cpf|cnpj|document|documento|cep|zip|postal|pix|card|cartao|cvv)/i;

export const shouldEnableTextInputAssistance = (element: Pick<HTMLInputElement | HTMLTextAreaElement, 'tagName' | 'type' | 'name' | 'id' | 'getAttribute'>) => {
  const tagName = String(element.tagName || '').toLowerCase();
  if (tagName !== 'input' && tagName !== 'textarea') return false;
  if (String(element.getAttribute('data-no-text-assist') || '').toLowerCase() === 'true') return false;

  const type = String((element as HTMLInputElement).type || '').toLowerCase();
  const autoComplete = String(element.getAttribute('autocomplete') || '').toLowerCase();
  const inputMode = String(element.getAttribute('inputmode') || '').toLowerCase();
  const identity = [element.name, element.id, element.getAttribute('aria-label'), element.getAttribute('placeholder')]
    .map((value) => String(value || ''))
    .join(' ');

  if (tagName === 'textarea') return true;
  if (['password', 'email', 'tel', 'number', 'date', 'time', 'datetime-local', 'month', 'week', 'file', 'checkbox', 'radio', 'hidden'].includes(type)) return false;
  if (['one-time-code', 'current-password', 'new-password', 'email', 'tel', 'postal-code', 'cc-number', 'cc-csc'].includes(autoComplete)) return false;
  if (['numeric', 'decimal', 'tel', 'email'].includes(inputMode)) return false;
  return !SENSITIVE_INPUT_PATTERN.test(identity);
};

export const applyTextInputAssistance = (root: ParentNode = document) => {
  if (typeof document === 'undefined') return;
  const elements = Array.from(root.querySelectorAll?.('input, textarea') || []) as Array<HTMLInputElement | HTMLTextAreaElement>;
  elements.forEach((element) => {
    applyTextInputAssistanceToElement(element);
  });
};

export const applyTextInputAssistanceToElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return;
  if (!shouldEnableTextInputAssistance(element)) return;

  const setAttributeIfChanged = (name: string, value: string) => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const currentAutoComplete = element.getAttribute('autocomplete');
  setAttributeIfChanged(
    'autocomplete',
    currentAutoComplete && currentAutoComplete !== 'off' ? currentAutoComplete : 'on'
  );
  setAttributeIfChanged('autocorrect', 'on');
  setAttributeIfChanged('autocapitalize', element.getAttribute('autocapitalize') || 'sentences');
  setAttributeIfChanged('spellcheck', 'true');
  if (!element.getAttribute('inputmode')) setAttributeIfChanged('inputmode', 'text');
};

export const installTextInputAssistance = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  applyTextInputAssistance(document);
  const reapplyFocusedField = (event: Event) => {
    const target = event.target instanceof Element ? event.target : document.activeElement;
    applyTextInputAssistanceToElement(target);
    window.setTimeout(() => applyTextInputAssistanceToElement(target), 0);
  };
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) applyTextInputAssistance(node);
        });
      } else if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        applyTextInputAssistanceToElement(mutation.target);
      }
    });
  });
  observer.observe(document.body, {
    attributeFilter: ['autocomplete', 'autocorrect', 'autocapitalize', 'spellcheck', 'inputmode'],
    attributes: true,
    childList: true,
    subtree: true,
  });
  document.addEventListener('pointerdown', reapplyFocusedField, true);
  document.addEventListener('touchstart', reapplyFocusedField, true);
  document.addEventListener('focusin', reapplyFocusedField, true);

  return () => {
    observer.disconnect();
    document.removeEventListener('pointerdown', reapplyFocusedField, true);
    document.removeEventListener('touchstart', reapplyFocusedField, true);
    document.removeEventListener('focusin', reapplyFocusedField, true);
  };
};
