import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHubStoreDistances } from './useHubStoreDistances';

type TestStore = {
  id: string;
  slug: string;
  distanceSource: string;
  storeLat: number;
  storeLng: number;
};

function DistancesHarness({ stores }: { stores?: TestStore[] }) {
  const { distanceByStore, distanceLoading } = useHubStoreDistances({
    stores: stores || [
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
      <span data-testid="distance-store-10">{distanceByStore['store-10'] ?? ''}</span>
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

  it('calculates local distances for stores beyond the first eight cards', async () => {
    vi.useFakeTimers();
    const stores = Array.from({ length: 10 }, (_, index) => ({
      id: `store-${index + 1}`,
      slug: `loja-${index + 1}`,
      distanceSource: 'local',
      storeLat: -23.18 + index * 0.001,
      storeLng: -45.88,
    }));

    render(<DistancesHarness stores={stores} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const tenthDistance = Number(screen.getByTestId('distance-store-10').textContent);
    expect(tenthDistance).toBeGreaterThan(0);
  });
});
