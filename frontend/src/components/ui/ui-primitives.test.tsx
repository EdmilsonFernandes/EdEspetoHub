import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomSheet, Button, Chip, EmptyState, SurfaceCard, TextareaField, TextField } from './index';

describe('ui primitives', () => {
  it('renders a loading button with disabled state', () => {
    render(<Button loading>Finalizar</Button>);

    const button = screen.getByRole('button', { name: 'Aguarde...' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders text field labels, hints and errors accessibly', () => {
    render(<TextField name="email" label="E-mail" error="Informe um e-mail válido" />);

    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
  });

  it('renders textarea hints', () => {
    render(<TextareaField name="notes" label="Observação" hint="Opcional" />);

    expect(screen.getByLabelText('Observação')).toHaveAttribute('aria-describedby', 'notes-hint');
    expect(screen.getByText('Opcional')).toBeInTheDocument();
  });

  it('renders selected chips with pressed state', () => {
    render(<Chip selected>Todos</Chip>);

    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders surface cards and empty states', () => {
    render(
      <SurfaceCard as="section" aria-label="Resumo">
        <EmptyState title="Nada por aqui" description="Tente novamente mais tarde." />
      </SurfaceCard>
    );

    expect(screen.getByRole('region', { name: 'Resumo' })).toBeInTheDocument();
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
  });

  it('closes bottom sheet from overlay and close button', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Forma de pagamento">
        <p>Escolha uma opção.</p>
      </BottomSheet>
    );

    expect(screen.getByRole('dialog', { name: 'Forma de pagamento' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' })[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
