import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmartDrawerScrollArea } from './SmartDrawerScrollArea';

const mockScrollMetrics = (element: HTMLElement, metrics: { clientHeight: number; scrollHeight: number; scrollTop?: number }) => {
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: metrics.clientHeight });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: metrics.scrollHeight });
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    writable: true,
    value: metrics.scrollTop ?? 0,
  });
};

describe('SmartDrawerScrollArea', () => {
  it('shows compact scroll controls only when the drawer has hidden content', async () => {
    render(
      <SmartDrawerScrollArea className="h-32" contentClassName="space-y-2">
        <button type="button">Primeira opção</button>
        <button type="button">Última opção</button>
      </SmartDrawerScrollArea>
    );

    expect(screen.queryByRole('group', { name: 'Controle de rolagem do menu' })).not.toBeInTheDocument();

    const scroller = screen.getByTestId('smart-drawer-scroll');
    mockScrollMetrics(scroller, { clientHeight: 100, scrollHeight: 260 });
    fireEvent.scroll(scroller);

    expect(await screen.findByRole('group', { name: 'Controle de rolagem do menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rolar menu para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rolar menu para baixo' })).toBeEnabled();
  });

  it('scrolls the menu down and up from the compact controls', async () => {
    render(
      <SmartDrawerScrollArea className="h-32" contentClassName="space-y-2">
        <button type="button">Conta</button>
        <button type="button">Segurança</button>
      </SmartDrawerScrollArea>
    );

    const scroller = screen.getByTestId('smart-drawer-scroll');
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;
    mockScrollMetrics(scroller, { clientHeight: 120, scrollHeight: 340 });
    fireEvent.scroll(scroller);

    fireEvent.click(await screen.findByRole('button', { name: 'Rolar menu para baixo' }));

    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith({ top: 180, behavior: 'smooth' });
    });

    mockScrollMetrics(scroller, { clientHeight: 120, scrollHeight: 340, scrollTop: 120 });
    fireEvent.scroll(scroller);
    fireEvent.click(screen.getByRole('button', { name: 'Rolar menu para cima' }));

    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith({ top: -180, behavior: 'smooth' });
    });
  });
});
