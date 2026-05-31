import { apiClient } from '../config/apiClient';

const SESSION_KEY = 'destinationPartnerSession';

export type DestinationPartnerResourceType = 'HOSPITALITY_PLACE' | 'DESTINATION_LISTING';

export type DestinationPartnerResource = {
  permissionId: string;
  resourceType: DestinationPartnerResourceType;
  permission: string;
  item: Record<string, any>;
};

export type DestinationPartnerSession = {
  token: string;
  partner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
  };
  resources?: DestinationPartnerResource[];
};

const authOptions = { authMode: 'partner', skipAutoLogout: true };

const readSession = (): DestinationPartnerSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const saveSession = (session: DestinationPartnerSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const destinationPartnerPortalService = {
  getSession: readSession,

  saveSession,

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  async login(email: string, password: string): Promise<DestinationPartnerSession> {
    const session = await apiClient.post('/destination-partner/auth/login', { email, password }, { authMode: 'none' });
    saveSession(session);
    return session;
  },

  async activate(token: string, password: string): Promise<DestinationPartnerSession> {
    const session = await apiClient.post('/destination-partner/auth/activate', { token, password }, { authMode: 'none' });
    saveSession(session);
    return session;
  },

  async me(): Promise<{ partner: DestinationPartnerSession['partner']; resources: DestinationPartnerResource[] }> {
    return apiClient.get('/destination-partner/me', authOptions);
  },

  async updateHospitalityPlace(placeId: string, payload: Record<string, any>) {
    return apiClient.patch(`/destination-partner/hospitality-places/${encodeURIComponent(placeId)}`, payload, authOptions);
  },

  async updateListing(listingId: string, payload: Record<string, any>) {
    return apiClient.patch(`/destination-partner/listings/${encodeURIComponent(listingId)}`, payload, authOptions);
  },
};
