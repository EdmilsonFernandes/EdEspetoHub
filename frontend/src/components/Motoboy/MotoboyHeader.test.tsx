import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotoboyHeader } from './MotoboyHeader';

describe('MotoboyHeader', () => {
  it('uses the current Ja no Caminho logo instead of the legacy logo', () => {
    render(<MotoboyHeader title="Fila de entregas" />);

    expect(screen.getByAltText('Já no Caminho')).toHaveAttribute('src', '/janocaminho.jpg');
    expect(screen.getByRole('heading', { name: 'Fila de entregas' })).toBeInTheDocument();
  });
});
