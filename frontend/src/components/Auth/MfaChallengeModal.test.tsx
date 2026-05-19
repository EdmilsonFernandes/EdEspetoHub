import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaChallengeModal } from './MfaChallengeModal';

describe('MfaChallengeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { readText: vi.fn().mockResolvedValue('123 456') },
      configurable: true,
    });
  });

  const renderModal = (onVerify = vi.fn()) => {
    render(
      <MfaChallengeModal
        open
        audience="customer"
        challenge={{ challengeToken: 'challenge-1', account: 'cliente@teste.com', trustDeviceAvailable: true }}
        onCancel={vi.fn()}
        onVerify={onVerify}
      />,
    );
    return onVerify;
  };

  it('validates automatically when the user completes six digits', async () => {
    const onVerify = renderModal();

    fireEvent.change(screen.getByLabelText(/Código do app autenticador/i), { target: { value: '654321' } });

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith({ code: '654321', trustDevice: false });
    });
  });

  it('pastes a copied authenticator code and validates it automatically', async () => {
    const onVerify = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Colar Código/i }));

    await waitFor(() => {
      expect(window.navigator.clipboard.readText).toHaveBeenCalled();
      expect(onVerify).toHaveBeenCalledWith({ code: '123456', trustDevice: false });
    });
  });

  it('falls back to focused manual paste instructions when clipboard read is blocked', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { readText: vi.fn().mockRejectedValue(new Error('blocked')) },
      configurable: true,
    });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Colar Código/i }));

    expect(await screen.findByText(/Não deu para ler automaticamente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Código do app autenticador/i)).toHaveFocus();
  });
});
