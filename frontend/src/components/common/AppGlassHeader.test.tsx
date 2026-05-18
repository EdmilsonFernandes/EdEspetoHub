import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppGlassHeader } from './AppGlassHeader';

describe('AppGlassHeader', () => {
  it('renders navigation context and slotted content', () => {
    render(
      <MemoryRouter>
        <AppGlassHeader title="Meus Pedidos" eyebrow="Histórico" subtitle="2 em andamento">
          <button type="button">Todos</button>
        </AppGlassHeader>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Meus Pedidos' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveClass('jnc-app-glass-header');
    expect(screen.getByText('Histórico')).toBeInTheDocument();
    expect(screen.getByText('2 em andamento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
  });

  it('uses the explicit back handler when provided', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <AppGlassHeader title="Minha Conta" onBack={onBack} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('can render a contextual logo in the eyebrow', () => {
    render(
      <MemoryRouter>
        <AppGlassHeader title="Detalhes do Pedido" eyebrow="Loja Teste" eyebrowLogoSrc="/loja.png" eyebrowLogoAlt="Logo da loja" />
      </MemoryRouter>
    );

    expect(screen.getByAltText('Logo da loja')).toHaveAttribute('src', '/loja.png');
  });
});
