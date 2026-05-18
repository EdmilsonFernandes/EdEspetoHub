import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountMfaPanel } from './AccountMfaPanel';

const authServiceMock = vi.hoisted(() => ({
  getMfaStatus: vi.fn(),
  listTrustedDevices: vi.fn(),
  startMfaSetup: vi.fn(),
  confirmMfaSetup: vi.fn(),
  disableMfa: vi.fn(),
  revokeTrustedDevice: vi.fn(),
}));

vi.mock('../../services/authService', () => ({
  authService: authServiceMock,
}));

vi.mock('../../utils/mfaDevice', () => ({
  forgetTrustedMfaDevice: vi.fn(),
}));

describe('AccountMfaPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authServiceMock.getMfaStatus.mockResolvedValue({
      enabled: false,
      required: false,
      featureEnabled: true,
      trustedDeviceEnabled: true,
      trustedDeviceExpirationDays: 30,
      trustedDevicesCount: 0,
    });
    authServiceMock.listTrustedDevices.mockResolvedValue([]);
    authServiceMock.startMfaSetup.mockResolvedValue({
      secret: 'ABCDEF123456',
      qrCodeDataUrl: 'data:image/png;base64,abc',
    });
    authServiceMock.confirmMfaSetup.mockResolvedValue({ enabled: true, featureEnabled: true });
    authServiceMock.disableMfa.mockResolvedValue({ enabled: false, featureEnabled: true });

    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('keeps the disable code hidden until the user chooses to deactivate protection', async () => {
    authServiceMock.getMfaStatus.mockResolvedValue({
      enabled: true,
      required: true,
      featureEnabled: true,
      trustedDevicesCount: 1,
    });
    authServiceMock.listTrustedDevices.mockResolvedValue([
      { id: 'device-1', label: 'Celular do Edmilson', expiresAt: '2026-06-17T12:00:00.000Z' },
    ]);

    render(<AccountMfaPanel open authMode="customer" onClose={vi.fn()} />);

    expect(await screen.findByText('Protecao ativa')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Codigo do app autenticador para desativar/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Desativar protecao/i }));

    const input = await screen.findByLabelText(/Codigo do app autenticador para desativar/i);
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^Desativar$/i }));

    await waitFor(() => {
      expect(authServiceMock.disableMfa).toHaveBeenCalledWith('123456', { authMode: 'customer' });
    });
  });

  it('shows QR setup, manual key copy and confirmation only after activation starts', async () => {
    render(<AccountMfaPanel open authMode="admin" onClose={vi.fn()} />);

    expect(await screen.findByText('Protecao desativada')).toBeInTheDocument();
    expect(screen.queryByText('Chave manual')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ativar agora/i }));

    expect(await screen.findByAltText(/QR Code para ativar/i)).toBeInTheDocument();
    expect(screen.getByText('Chave manual')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Copiar/i }));

    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('ABCDEF123456');
    });

    fireEvent.change(screen.getByLabelText(/Codigo de ativacao do app autenticador/i), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ativar protecao/i }));

    await waitFor(() => {
      expect(authServiceMock.confirmMfaSetup).toHaveBeenCalledWith('654321', { authMode: 'admin' });
    });
  });

  it('opens directly in setup when the caller requests activation for a disabled account', async () => {
    const onStatusChange = vi.fn();

    render(<AccountMfaPanel open authMode="customer" initialIntent="setup" onStatusChange={onStatusChange} onClose={vi.fn()} />);

    expect(await screen.findByAltText(/QR Code para ativar/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(authServiceMock.startMfaSetup).toHaveBeenCalledWith({ authMode: 'customer' });
      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          featureEnabled: true,
        }),
      );
    });
  });
});
