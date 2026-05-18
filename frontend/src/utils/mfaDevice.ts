const DEVICE_ID_KEY = 'jnc:mfa:device-id';
const TRUSTED_TOKEN_KEY = 'jnc:mfa:trusted-token';
const TRUSTED_LABEL_KEY = 'jnc:mfa:trusted-label';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `jnc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getMfaDeviceContext = () => {
  if (typeof window === 'undefined') {
    return { deviceId: '', trustedDeviceToken: '', deviceLabel: 'Web' };
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = createId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  const trustedDeviceToken = localStorage.getItem(TRUSTED_TOKEN_KEY) || '';
  const deviceLabel =
    localStorage.getItem(TRUSTED_LABEL_KEY) ||
    (navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Navegador');

  return {
    deviceId,
    trustedDeviceToken,
    deviceLabel,
  };
};

export const persistTrustedMfaDevice = (trustedDevice?: { token?: string; label?: string }) => {
  if (typeof window === 'undefined' || !trustedDevice?.token) return;
  localStorage.setItem(TRUSTED_TOKEN_KEY, trustedDevice.token);
  if (trustedDevice.label) {
    localStorage.setItem(TRUSTED_LABEL_KEY, trustedDevice.label);
  }
};

export const forgetTrustedMfaDevice = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TRUSTED_TOKEN_KEY);
  localStorage.removeItem(TRUSTED_LABEL_KEY);
};
