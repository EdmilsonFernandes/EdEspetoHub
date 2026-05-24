import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHubStoreDistances } from './useHubStoreDistances';

function DistancesHarness() {
  const { distanceByStore, distanceLoading } = useHubStoreDistances({
    stores: [
      {
        id: 'store-a',
        slug: 'loja-a',
        distanceSource: 'local',
        storeLat: -23.18,
        storeLng: -45.88,
      },
    ],
    activeLocation: { lat: -23.18, lng: -45.89 },
    activeRegion: { city: 'São José dos Campos', state: 'SP' },
    preferredDiscoveryAddress: null,
    savedAddressLocation: null,
    isCondominiumScope: false,
    hubDebug: vi.fn(),
    hubDebugEnabled: false,
  });

  return (
    <div>
      <span data-testid="distance">{distanceByStore['store-a'] ?? ''}</span>
      <span data-testid="loading">{String(distanceLoading)}</span>
    </div>
  );
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('useHubStoreDistances', () => {
  it('calculates and caches local store distances', async () => {
    vi.useFakeTimers();

    render(<DistancesHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('distance').textContent).not.toBe('');

    const distance = Number(screen.getByTestId('distance').textContent);
    expect(distance).toBeGreaterThan(0);
    expect(localStorage.key(0)).toContain('hub:store-distance:');
  });
});
