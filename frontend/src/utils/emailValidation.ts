const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gmail.come': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'icloud.con': 'icloud.com',
};

export const getEmailDomainTypoMessage = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return '';
  const suggestedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domain];
  if (!suggestedDomain) return '';
  return `Confira o e-mail. Você quis dizer ${localPart}@${suggestedDomain}?`;
};

export const getEmailValidationMessage = (value?: string | null) => {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Informe um e-mail válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalized)) return 'Informe um e-mail válido.';
  return getEmailDomainTypoMessage(normalized);
};
