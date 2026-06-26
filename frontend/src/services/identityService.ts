import { apiClient } from '../config/apiClient';

export type IdentityLookupResult = {
  exists: boolean;
  identifierType?: string;
  userId?: string;
  name?: string;
  roles?: string[];
  verified?: boolean;
};

/**
 * Lookup de identidade (validador "já tem conta? integrar?"). Público.
 */
export const identityService = {
  async lookup(value: string): Promise<IdentityLookupResult> {
    const data = await apiClient.get(`/public/identity/lookup?value=${encodeURIComponent(value)}`, { authMode: 'none' });
    return data && typeof data === 'object' ? (data as IdentityLookupResult) : { exists: false };
  },
};
