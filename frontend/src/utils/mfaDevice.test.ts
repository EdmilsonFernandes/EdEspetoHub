import { beforeEach, describe, expect, it, vi } from 'vitest';

const capacitorMock = vi.hoisted(() => ({
  native: false,
}));

const biometricMock = vi.hoisted(() => ({
  hasValidStoredAdminEnrollment: vi.fn(),
  hasValidStoredCustomerEnrollment: vi.fn(),
  hasValidStoredMotoboyEnrollment: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => capacitorMock.native,
  },
}));

vi.mock('../services/nativeBiometricService', () => ({
  nativeBiometricService: biometricMock,
}));

import { forgetTrustedMfaDevice, getMfaDeviceContext, persistTrustedMfaDevice } from './mfaDevice';

describe('mfaDevice', () => {
  beforeEach(() => {
    localStorage.clear();
    capacitorMock.native = false;
    biometricMock.hasValidStoredAdminEnrollment.mockReturnValue(false);
    biometricMock.hasValidStoredCustomerEnrollment.mockReturnValue(false);
    biometricMock.hasValidStoredMotoboyEnrollment.mockReturnValue(false);
    localStorage.setItem('jnc:mfa:device-id', 'device-123');
    localStorage.setItem('jnc:mfa:trusted-token', 'trusted-token');
  });

  it('keeps trusted device support on web because there is no native biometric gate', () => {
    const context = getMfaDeviceContext({ authMode: 'customer' });

    expect(context).toEqual(expect.objectContaining({
      deviceId: 'device-123',
      trustedDeviceToken: 'trusted-token',
    }));
  });

  it('does not send a customer trusted token in the native app when biometrics are disabled', () => {
    capacitorMock.native = true;

    const context = getMfaDeviceContext({ authMode: 'customer' });

    expect(context.trustedDeviceToken).toBe('');
  });

  it('sends a customer trusted token in the native app only when customer biometrics are active', () => {
    capacitorMock.native = true;
    biometricMock.hasValidStoredCustomerEnrollment.mockReturnValue(true);

    const context = getMfaDeviceContext({ authMode: 'customer' });

    expect(context.trustedDeviceToken).toBe('trusted-token');
  });

  it('checks the motoboy biometric enrollment separately from customer enrollment', () => {
    capacitorMock.native = true;
    biometricMock.hasValidStoredCustomerEnrollment.mockReturnValue(true);

    expect(getMfaDeviceContext({ authMode: 'motoboy' }).trustedDeviceToken).toBe('');

    biometricMock.hasValidStoredMotoboyEnrollment.mockReturnValue(true);

    expect(getMfaDeviceContext({ authMode: 'motoboy' }).trustedDeviceToken).toBe('trusted-token');
  });

  it('clears the trusted MFA token when requested', () => {
    persistTrustedMfaDevice({ token: 'next-token', label: 'Celular' });

    expect(getMfaDeviceContext({ authMode: 'customer' }).trustedDeviceToken).toBe('next-token');

    forgetTrustedMfaDevice();

    expect(getMfaDeviceContext({ authMode: 'customer' }).trustedDeviceToken).toBe('');
  });
});
