import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ClientBottomNav } from './ClientBottomNav';

describe('ClientBottomNav', () => {
  it('renders the customer navigation with the selected destination tab', () => {
    render(
      <MemoryRouter>
        <ClientBottomNav active="destinations" />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Navegação principal do cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Visite/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses a custom orders handler when provided', () => {
    let opened = false;

    render(
      <MemoryRouter>
        <ClientBottomNav active="home" onOpenOrders={() => { opened = true; }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Pedidos/i }));

    expect(opened).toBe(true);
  });

  it('uses Mais as the account/profile entry point', () => {
    render(
      <MemoryRouter>
        <ClientBottomNav active="profile" />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Mais/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: /Perfil/i })).not.toBeInTheDocument();
  });
});
