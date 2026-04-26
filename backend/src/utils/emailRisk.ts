const BUILT_IN_DISPOSABLE_EMAIL_DOMAINS = new Set([
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
]);

export const extractEmailDomain = (email?: string | null) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return '';
  return normalized.split('@').pop()?.trim() || '';
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
