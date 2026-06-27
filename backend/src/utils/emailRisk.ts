const BUILT_IN_DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Domínios temporários / descartáveis conhecidos
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmailo.com',
  'trashmail.com',
  'yopmail.com',
  // Domínios de teste / reservados (RFC 2606) — nenhum usuário real usa
  'test.local',
  'test.com',
  'teste.local',
  'example.com',
  'example.org',
  'example.net',
  'example.br',
  'fake.com',
  'fakeemail.com',
  'nada.com',
  'naoexiste.com',
]);

export const extractEmailDomain = (email?: string | null) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return '';
  return normalized.split('@').pop()?.trim() || '';
};

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

export const getEmailDomainTypoSuggestion = (email?: string | null) => {
  const normalized = String(email || '').trim().toLowerCase();
  const domain = extractEmailDomain(normalized);
  if (!domain) return null;
  const suggestedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domain];
  if (!suggestedDomain) return null;

  const localPart = normalized.split('@')[0]?.trim();
  return {
    domain,
    suggestedDomain,
    suggestedEmail: localPart ? `${localPart}@${suggestedDomain}` : suggestedDomain,
  };
};

export const getEmailDomainTypoMessage = (email?: string | null) => {
  const suggestion = getEmailDomainTypoSuggestion(email);
  if (!suggestion) return '';
  return `Confira o e-mail. Voce quis dizer ${suggestion.suggestedEmail}?`;
};

export const isDisposableEmailDomain = (email?: string | null, extraDomains: string[] = []) => {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  if (BUILT_IN_DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  return extraDomains.map((entry) => String(entry || '').trim().toLowerCase()).includes(domain);
};

export const isAllowlistedEmail = (email?: string | null, allowlistedEmails: string[] = []) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return allowlistedEmails
    .map((entry) => String(entry || '').trim().toLowerCase())
    .includes(normalized);
};
