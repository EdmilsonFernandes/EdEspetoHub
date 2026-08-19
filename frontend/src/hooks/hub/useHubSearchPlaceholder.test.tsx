import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHubSearchPlaceholder } from './useHubSearchPlaceholder';

function PlaceholderHarness({ paused = false }: { paused?: boolean }) {
  const { searchPlaceholder, searchPlaceholderVisible } = useHubSearchPlaceholder(paused);
  return (
    <div>
      <span data-testid="placeholder">{searchPlaceholder}</span>
      <span data-testid="visible">{String(searchPlaceholderVisible)}</span>
    </div>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useHubSearchPlaceholder', () => {
  it('abre com a pergunta humana e rotaciona para o catálogo após o delay', () => {
    vi.useFakeTimers();

    render(<PlaceholderHarness />);

    // Auditoria 2 (18/08): o repouso é o opener humano; a rotação ensina o catálogo.
    expect(screen.getByTestId('placeholder')).toHaveTextContent('O que você procura hoje?');
    expect(screen.getByTestId('visible')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(screen.getByTestId('visible')).toHaveTextContent('false');

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByTestId('placeholder')).toHaveTextContent('Buscar espetinho...');
    expect(screen.getByTestId('visible')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(2800 + 350);
    });
    expect(screen.getByTestId('placeholder')).toHaveTextContent('Buscar hambúrguer...');
  });

  it('does not rotate while search is active', () => {
    vi.useFakeTimers();

    render(<PlaceholderHarness paused />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('placeholder')).toHaveTextContent('O que você procura hoje?');
    expect(screen.getByTestId('visible')).toHaveTextContent('true');
  });
});
