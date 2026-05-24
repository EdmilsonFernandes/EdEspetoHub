import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useHubFavorites } from './useHubFavorites';

type TestStore = {
  slug: string;
  name: string;
  isOpen: boolean;
  rating: number;
};

const stores: TestStore[] = [
  { slug: 'closed-best', name: 'Fechada Boa', isOpen: false, rating: 5 },
  { slug: 'open-good', name: 'Aberta Boa', isOpen: true, rating: 4.6 },
  { slug: 'open-best', name: 'Aberta Melhor', isOpen: true, rating: 4.9 },
];

function FavoritesHarness() {
  const { favoriteStoreSlugs, favoriteStores, toggleFavoriteStore } = useHubFavorites(stores);

  return (
    <div>
      <button type="button" onClick={() => toggleFavoriteStore('open-good')}>
        Alternar aberta
      </button>
      <span data-testid="slugs">{favoriteStoreSlugs.join(',')}</span>
      <span data-testid="stores">{favoriteStores.map((store) => store.slug).join(',')}</span>
    </div>
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('useHubFavorites', () => {
  it('loads favorites from storage and sorts open stores first', () => {
    localStorage.setItem('hub:favorites:stores', JSON.stringify(['closed-best', 'open-good', 'open-best']));

    render(<FavoritesHarness />);

    expect(screen.getByTestId('slugs')).toHaveTextContent('closed-best,open-good,open-best');
    expect(screen.getByTestId('stores')).toHaveTextContent('open-best,open-good,closed-best');
  });

  it('toggles and persists favorites', () => {
    render(<FavoritesHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Alternar aberta' }));
    });

    expect(screen.getByTestId('slugs')).toHaveTextContent('open-good');
    expect(localStorage.getItem('hub:favorites:stores')).toBe(JSON.stringify(['open-good']));
  });
});
