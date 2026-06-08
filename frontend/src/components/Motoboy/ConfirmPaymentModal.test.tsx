import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';

describe('ConfirmPaymentModal', () => {
  it('shows store Pix as manual confirmation and confirms without cash value', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmPaymentModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        amount={42.5}
        paymentMethod="pix_loja"
        pixKey="chave-pix-da-loja"
      />
    );

    expect(screen.getByText('Pix da loja')).toBeInTheDocument();
    expect(screen.getByText(/não é validado automaticamente/i)).toBeInTheDocument();
    expect(screen.getByText('chave-pix-da-loja')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(onConfirm).toHaveBeenCalledWith(null);
  });
});
