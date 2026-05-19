import { Capacitor } from '@capacitor/core';
import { nativeBiometricService } from '../services/nativeBiometricService';

const DEVICE_ID_KEY = 'jnc:mfa:device-id';
const TRUSTED_TOKEN_KEY = 'jnc:mfa:trusted-token';
const TRUSTED_LABEL_KEY = 'jnc:mfa:trusted-label';

export type MfaAuthMode = 'admin' | 'customer' | 'motoboy' | 'superadmin' | 'condominium';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `jnc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const canSendTrustedToken = (authMode?: MfaAuthMode) => {
  if (typeof window === 'undefined') return false;
  if (!Capacitor.isNativePlatform()) return true;

  if (authMode === 'customer') {
    return nativeBiometricService.hasValidStoredCustomerEnrollment();
  }
  if (authMode === 'motoboy') {
    return nativeBiometricService.hasValidStoredMotoboyEnrollment();
  }
  if (authMode === 'admin') {
    return nativeBiometricService.hasValidStoredAdminEnrollment();
  }

  return false;
};

export const getMfaDeviceContext = (options?: { authMode?: MfaAuthMode }) => {
  if (typeof window === 'undefined') {
    return { deviceId: '', trustedDeviceToken: '', deviceLabel: 'Web' };
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = createId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  const trustedDeviceToken = canSendTrustedToken(options?.authMode)
    ? localStorage.getItem(TRUSTED_TOKEN_KEY) || ''
    : '';
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
