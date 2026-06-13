import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderTrackingProgressCard } from './OrderTrackingProgressCard';

const steps = [
  { id: 'pending', label: 'Pedido recebido', timestampLabel: '18:10' },
  { id: 'preparing', label: 'Em preparação', timestampLabel: '18:14' },
  { id: 'ready', label: 'Aguardando entregador' },
];

describe('OrderTrackingProgressCard', () => {
  it('shows the current and next steps while keeping the full timeline collapsed', () => {
    render(
      <OrderTrackingProgressCard
        steps={steps}
        currentIndex={1}
        isCancelled={false}
        isTerminal={false}
        expanded={false}
        onToggle={() => {}}
      />
    );

    expect(screen.getByText('Agora')).toBeInTheDocument();
    expect(screen.getByText('Próximo passo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver andamento completo/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Pedido recebido')).not.toBeInTheDocument();
  });

  it('requests expansion and renders every timeline step when expanded', () => {
    const onToggle = vi.fn();

    render(
      <OrderTrackingProgressCard
        steps={steps}
        currentIndex={1}
        isCancelled={false}
        isTerminal={false}
        expanded
        onToggle={onToggle}
      />
    );

    expect(screen.getByText('Pedido recebido')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ocultar andamento/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
