import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { customerAccountService } from '../../services/customerAccountService';
import { useHubLocation } from './useHubLocation';

vi.mock('../../services/customerAccountService', () => ({
  customerAccountService: {
    listAddresses: vi.fn(),
  },
}));

function LocationHarness() {
  const location = useHubLocation({
    customerToken: 'token-cliente',
    customerEmail: 'cliente@email.com',
    hubDebug: vi.fn(),
  });

  return (
    <div>
      <span data-testid="label">{location.activeLocationLabel}</span>
      <span data-testid="lat">{location.activeLocation?.lat ?? ''}</span>
      <span data-testid="city">{location.activeRegion?.city ?? ''}</span>
      <span data-testid="href">{location.destinationListHref}</span>
    </div>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useHubLocation', () => {
  it('uses the default customer address as the hub location context', async () => {
    vi.mocked(customerAccountService.listAddresses).mockResolvedValue([
      {
        id: 'addr-1',
        street: 'Rua Principal',
        number: '10',
        neighborhood: 'Centro',
        city: 'São José dos Campos',
        state: 'SP',
        cep: '12200-000',
        lat: '-23.1791',
        lng: '-45.8872',
        isDefault: true,
      },
    ] as any);

    render(<LocationHarness />);

    await waitFor(() => expect(screen.getByTestId('label')).toHaveTextContent('Rua Principal, 10'));

    expect(screen.getByTestId('lat')).toHaveTextContent('-23.1791');
    expect(screen.getByTestId('city')).toHaveTextContent('São José dos Campos');
    expect(screen.getByTestId('href').textContent).toContain('city=S%C3%A3o+Jos%C3%A9+dos+Campos');
  });
});
