import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { storeService } from '../../services/storeService';
import { useHubStores } from './useHubStores';

vi.mock('../../services/storeService', () => ({
  storeService: {
    clearPortfolioCache: vi.fn(),
    discoverPortfolio: vi.fn(),
    listPortfolio: vi.fn(),
  },
}));

function StoresHarness() {
  const hub = useHubStores({
    selectedCondominiumSlug: '',
    activeLocation: { lat: -23.1, lng: -45.9 },
    activeRegion: { city: 'São José dos Campos', state: 'SP' },
    savedAddressLocation: null,
    userLocation: { lat: -23.1, lng: -45.9 },
    preferredDiscoveryAddress: null,
    hubDebug: vi.fn(),
  });

  return (
    <div>
      <span data-testid="loading">{String(hub.loading)}</span>
      <span data-testid="stores">{hub.stores.map((store) => store.slug).join(',')}</span>
      <button type="button" onClick={() => hub.setHubScopeOverride('all_stores')}>
        Ver todas
      </button>
    </div>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useHubStores', () => {
  it('loads portfolio with regional context and clears location when showing all stores', async () => {
    vi.mocked(storeService.discoverPortfolio)
      .mockResolvedValueOnce({ stores: [{ id: '1', slug: 'loja-a', name: 'Loja A' }], mode: 'nearby' } as any);
    vi.mocked(storeService.listPortfolio)
      .mockResolvedValueOnce([{ id: '2', slug: 'loja-b', name: 'Loja B' }] as any);

    render(<StoresHarness />);

    await waitFor(() => expect(screen.getByTestId('stores')).toHaveTextContent('loja-a'));
    expect(storeService.listPortfolio).not.toHaveBeenCalled();
    expect(storeService.discoverPortfolio).toHaveBeenLastCalledWith({
      lat: -23.1,
      lng: -45.9,
      city: 'São José dos Campos',
      state: 'SP',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }));

    await waitFor(() => expect(screen.getByTestId('stores')).toHaveTextContent('loja-b'));
    await waitFor(() =>
      expect(storeService.listPortfolio).toHaveBeenLastCalledWith({
        lat: null,
        lng: null,
        city: null,
        state: null,
      })
    );
  });
});
