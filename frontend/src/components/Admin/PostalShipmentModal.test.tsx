import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostalShipmentModal } from './PostalShipmentModal';

describe('PostalShipmentModal', () => {
  it('renders through a body portal so it stays above order drawers', () => {
    const { container } = render(
      <div data-testid="drawer-root">
        <PostalShipmentModal
          open
          order={{
            id: 'order-1',
            customerName: 'Cliente Teste',
            shipment: { trackingCode: 'AA123456789BR' },
          }}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </div>
    );

    const dialog = screen.getByRole('dialog', { name: /informar rastreio/i });
    expect(dialog).toBeInTheDocument();
    expect(document.body).toContainElement(dialog);
    expect(container).not.toContainElement(dialog);
  });
});
