export const MFA_CHALLENGE_EXPIRED_MESSAGE =
  'Este código de segurança expirou. Faça login novamente para gerar um novo código.';

export const isMfaChallengeExpiredError = (error: any) => {
  const code = String(error?.code || '').trim().toUpperCase();
  if (code === 'MFA-002' || code === 'MFA-003') return true;
  const message = String(error?.message || '').trim().toLowerCase();
  return (
    message.includes('validação de segurança expirada') ||
    message.includes('validacao de seguranca expirada') ||
    message.includes('security validation expired') ||
    (message.includes('mfa') && message.includes('tentativas')) ||
    (message.includes('muitas tentativas') && message.includes('login novamente'))
  );
};
