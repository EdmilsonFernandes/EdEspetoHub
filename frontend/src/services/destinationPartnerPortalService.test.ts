import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../config/apiClient';
import { destinationPartnerPortalService } from './destinationPartnerPortalService';

vi.mock('../config/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const session = {
  token: 'partner-token',
  partner: {
    id: 'partner-1',
    name: 'Chale Parceiro',
    email: 'parceiro@example.com',
    status: 'active',
  },
  resources: [
    {
      permissionId: 'perm-1',
      resourceType: 'HOSPITALITY_PLACE' as const,
      permission: 'OWNER',
      item: { id: 'place-1', name: 'Chale Serra' },
    },
  ],
};

describe('destinationPartnerPortalService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.patch).mockReset();
    localStorage.clear();
  });

  it('logs in without app auth and persists the partner session', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(session);

    const result = await destinationPartnerPortalService.login('parceiro@example.com', 'senha123');

    expect(result).toEqual(session);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/destination-partner/auth/login',
      { email: 'parceiro@example.com', password: 'senha123' },
      { authMode: 'none' }
    );
    expect(destinationPartnerPortalService.getSession()).toEqual(session);
  });

  it('activates an invite without app auth and persists the partner session', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(session);

    await destinationPartnerPortalService.activate('invite-token', 'senha123');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/destination-partner/auth/activate',
      { token: 'invite-token', password: 'senha123' },
      { authMode: 'none' }
    );
    expect(destinationPartnerPortalService.getSession()).toEqual(session);
  });

  it('loads partner data with partner auth and without global auto logout', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      partner: session.partner,
      resources: session.resources,
    });

    await destinationPartnerPortalService.me();

    expect(apiClient.get).toHaveBeenCalledWith(
      '/destination-partner/me',
      { authMode: 'partner', skipAutoLogout: true }
    );
  });

  it('updates only the selected hospitality place through the partner route', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ id: 'place/1' });
    const payload = { name: 'Chale atualizado' };

    await destinationPartnerPortalService.updateHospitalityPlace('place/1', payload);

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/destination-partner/hospitality-places/place%2F1',
      payload,
      { authMode: 'partner', skipAutoLogout: true }
    );
  });

  it('updates only the selected listing through the partner route', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ id: 'listing/1' });
    const payload = { title: 'Restaurante atualizado' };

    await destinationPartnerPortalService.updateListing('listing/1', payload);

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/destination-partner/listings/listing%2F1',
      payload,
      { authMode: 'partner', skipAutoLogout: true }
    );
  });

  it('clears a saved partner session', () => {
    destinationPartnerPortalService.saveSession(session);
    expect(destinationPartnerPortalService.getSession()).toEqual(session);

    destinationPartnerPortalService.clearSession();

    expect(destinationPartnerPortalService.getSession()).toBeNull();
  });
});
