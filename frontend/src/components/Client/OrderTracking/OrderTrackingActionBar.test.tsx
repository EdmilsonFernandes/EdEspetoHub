import { fireEvent, render, screen } from '@testing-library/react';
import { SealCheck } from '@phosphor-icons/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderTrackingActionBar } from './OrderTrackingActionBar';

describe('OrderTrackingActionBar', () => {
  it('renders the contextual action and invokes it', () => {
    const onClick = vi.fn();

    render(
      <OrderTrackingActionBar
        label="Confirmar recebimento"
        detail="Finalize o pedido depois de conferir a entrega."
        icon={<SealCheck size={16} />}
        onClick={onClick}
        tone="success"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recebimento' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Próxima ação do pedido')).toBeInTheDocument();
  });

  it('disables the action while loading', () => {
    render(
      <OrderTrackingActionBar
        label="Confirmar recebimento"
        detail="Finalize o pedido."
        icon={<SealCheck size={16} />}
        onClick={() => {}}
        loading
      />
    );

    expect(screen.getByRole('button', { name: 'Aguarde...' })).toBeDisabled();
  });
});
