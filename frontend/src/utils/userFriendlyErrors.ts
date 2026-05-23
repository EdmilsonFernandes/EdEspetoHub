const NETWORK_ERROR_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /backend is unavailable/i,
  /fetch failed/i,
  /socket hang up/i,
  /econnrefused/i,
  /etimedout/i,
  /connection terminated/i,
];

const TECHNICAL_ERROR_PATTERNS = [
  /erro inesperado/i,
  /unexpected error/i,
  /internal server error/i,
  /backend error/i,
  /database/i,
  /postgres/i,
  /sql/i,
  /typeorm/i,
  /undefined is not/i,
  /cannot read/i,
];

const getErrorMessage = (error: unknown) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || '';
  if (typeof error === 'object' && 'message' in error) {
    return String((error as any).message || '');
  }
  return String(error || '');
};

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object') return '';
  return String((error as any).code || '').trim().toUpperCase();
};

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return 0;
  const status = Number((error as any).status || (error as any).statusCode || 0);
  return Number.isFinite(status) ? status : 0;
};

export const isTransientConnectionError = (error: unknown) => {
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT') return true;
  if (status > 0 && (status === 408 || status === 429 || status === 502 || status === 503 || status === 504)) return true;
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const normalizeUserFacingError = (
  error: unknown,
  fallback = 'Não foi possível completar a operação agora. Tente novamente em instantes.'
) => {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).trim();

  if (status === 401 || status === 403) {
    return message || 'Sua sessão expirou. Entre novamente para continuar.';
  }

  if (isTransientConnectionError(error)) {
    return 'Conexão instável. Verifique sua internet e tente novamente.';
  }

  if (status >= 500 || TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'Encontramos uma instabilidade no sistema. Tente novamente em instantes.';
  }

  return message || fallback;
};

export const toUserFriendlyError = (
  error: unknown,
  fallback?: string
) => {
  const nextError: any = new Error(normalizeUserFacingError(error, fallback));
  if (error && typeof error === 'object') {
    nextError.status = (error as any).status || (error as any).statusCode || 0;
    nextError.code = (error as any).code || '';
    nextError.details = (error as any).details || null;
  }
  nextError.isTransient = isTransientConnectionError(error);
  return nextError;
};
