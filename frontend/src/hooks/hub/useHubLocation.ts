import { useEffect, useMemo, useState } from 'react';
import { customerAccountService } from '../../services/customerAccountService';

export type HubLocation = { lat: number; lng: number };
export type HubRegion = { city: string; state: string };

export type PreferredDiscoveryAddress = {
  label: string;
  city: string;
  state: string;
  addressLine?: string;
  lat?: number | null;
  lng?: number | null;
};

type HubDebug = (event: string, payload?: Record<string, any>) => void;

const CUSTOMER_ADDRESS_UPDATED_EVENT = 'jnc:customer-addresses-updated';

const parseOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildCustomerAddressLookup = (address: any) => {
  const city = String(address?.city || '').trim();
  const state = String(address?.state || '').trim().toUpperCase();
  const street = String(address?.street || '').trim();
  const number = String(address?.number || '').trim();
  const streetLine = [street, number].filter(Boolean).join(', ');
  const addressLine = [
    street,
    number,
    String(address?.neighborhood || '').trim(),
    city,
    state,
    String(address?.cep || '').trim(),
  ]
    .filter(Boolean)
    .join(', ');
  const label = streetLine || (city && state ? `${city} - ${state}` : city || 'Endereço principal');

  return {
    city,
    state,
    addressLine,
    label: label || 'Endereço principal',
    lat: parseOptionalNumber(address?.lat),
    lng: parseOptionalNumber(address?.lng),
  };
};

type UseHubLocationParams = {
  customerToken?: string | null;
  customerEmail?: string | null;
  hubDebug: HubDebug;
};

export function useHubLocation({ customerToken, customerEmail, hubDebug }: UseHubLocationParams) {
  const [userLocation, setUserLocation] = useState<HubLocation | null>(null);
  const [userRegion, setUserRegion] = useState<HubRegion | null>(null);
  const [locationLabel, setLocationLabel] = useState('Sua região');
  const [preferredDiscoveryAddress, setPreferredDiscoveryAddress] = useState<PreferredDiscoveryAddress | null>(null);
  const [preferredAddressLoading, setPreferredAddressLoading] = useState(false);

  const savedAddressLocation = useMemo(() => {
    if (preferredDiscoveryAddress?.lat == null || preferredDiscoveryAddress?.lng == null) return null;
    return {
      lat: Number(preferredDiscoveryAddress.lat),
      lng: Number(preferredDiscoveryAddress.lng),
    };
  }, [preferredDiscoveryAddress?.lat, preferredDiscoveryAddress?.lng]);

  const activeLocation = savedAddressLocation || userLocation;
  const activeRegion =
    (preferredDiscoveryAddress?.city || preferredDiscoveryAddress?.state
      ? { city: preferredDiscoveryAddress?.city || '', state: preferredDiscoveryAddress?.state || '' }
      : null) ||
    userRegion;
  const activeLocationLabel = preferredDiscoveryAddress?.label || locationLabel;

  const destinationListHref = useMemo(() => {
    const search = new URLSearchParams();
    if (activeLocation?.lat != null) search.set('lat', String(activeLocation.lat));
    if (activeLocation?.lng != null) search.set('lng', String(activeLocation.lng));
    if (activeRegion?.city) search.set('city', activeRegion.city);
    if (activeRegion?.state) search.set('state', activeRegion.state);
    const suffix = search.toString();
    return suffix ? `/destinos?${suffix}` : '/destinos';
  }, [activeLocation?.lat, activeLocation?.lng, activeRegion?.city, activeRegion?.state]);

  useEffect(() => {
    let cancelled = false;

    const resolvePreferredDiscoveryAddress = async () => {
      if (!customerToken) {
        setPreferredDiscoveryAddress(null);
        setPreferredAddressLoading(false);
        hubDebug('preferred-address-cleared', { reason: 'no-customer-session' });
        return;
      }

      try {
        setPreferredAddressLoading(true);
        const rows = await customerAccountService.listAddresses();
        if (cancelled) return;
        const preferred = (Array.isArray(rows) ? rows : []).find((item: any) => item?.isDefault) || rows?.[0];
        if (!preferred) {
          setPreferredDiscoveryAddress(null);
          hubDebug('preferred-address-missing', { totalAddresses: Array.isArray(rows) ? rows.length : 0 });
          return;
        }

        const normalized = buildCustomerAddressLookup(preferred);
        if (!normalized.city && !normalized.state) {
          setPreferredDiscoveryAddress(null);
          hubDebug('preferred-address-invalid', {
            addressId: preferred?.id || null,
            hasLatLng: normalized.lat != null && normalized.lng != null,
          });
          return;
        }

        const nextAddress: PreferredDiscoveryAddress = {
          label: normalized.label,
          city: normalized.city,
          state: normalized.state,
          addressLine: normalized.addressLine,
          lat: normalized.lat,
          lng: normalized.lng,
        };

        setPreferredDiscoveryAddress(nextAddress);
        hubDebug('preferred-address-loaded', {
          addressId: preferred?.id || null,
          label: nextAddress.label,
          city: nextAddress.city,
          state: nextAddress.state,
          hasLatLng: nextAddress.lat != null && nextAddress.lng != null,
        });
      } catch {
        if (!cancelled) {
          setPreferredDiscoveryAddress(null);
          hubDebug('preferred-address-error');
        }
      } finally {
        if (!cancelled) {
          setPreferredAddressLoading(false);
        }
      }
    };

    void resolvePreferredDiscoveryAddress();
    const refreshAddressContext = () => {
      void resolvePreferredDiscoveryAddress();
    };
    window.addEventListener('focus', refreshAddressContext);
    window.addEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, refreshAddressContext as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshAddressContext);
      window.removeEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, refreshAddressContext as EventListener);
    };
  }, [customerEmail, customerToken, hubDebug]);

  useEffect(() => {
    let cancelled = false;
    const resolveUserLabel = async () => {
      if (!userLocation) return;
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.lat}&lon=${userLocation.lng}`,
          { signal: controller.signal }
        );
        window.clearTimeout(timeout);
        const data = await response.json().catch(() => null);
        const addr = data?.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          '';
        const locality =
          city ||
          addr.city_district ||
          addr.suburb ||
          addr.neighbourhood ||
          '';
        const state = (addr.state_code || addr.state || '').toString();
        const nextLabel = [locality, state].filter(Boolean).join(' - ').trim();
        if (!cancelled) {
          setUserRegion((city || locality) ? { city: String(city || locality), state } : null);
          if (nextLabel) setLocationLabel(nextLabel);
          hubDebug('gps-region-resolved', {
            lat: Number(userLocation.lat).toFixed(5),
            lng: Number(userLocation.lng).toFixed(5),
            city: String(city || locality || ''),
            state,
            label: nextLabel || 'Sua região',
          });
        }
      } catch (_error) {
        if (!cancelled) {
          setLocationLabel('Sua região');
          setUserRegion(null);
          hubDebug('gps-region-error', {
            lat: Number(userLocation.lat).toFixed(5),
            lng: Number(userLocation.lng).toFixed(5),
          });
        }
      }
    };
    resolveUserLabel();
    return () => {
      cancelled = true;
    };
  }, [hubDebug, userLocation]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (customerToken && preferredAddressLoading) return;
    if (savedAddressLocation) {
      setUserLocation(null);
      hubDebug('gps-skip-saved-address', {
        lat: Number(savedAddressLocation.lat).toFixed(5),
        lng: Number(savedAddressLocation.lng).toFixed(5),
      });
      return;
    }
    const timer = window.setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
          };
          setUserLocation({
            lat: nextLocation.lat,
            lng: nextLocation.lng,
          });
          hubDebug('gps-position-loaded', {
            lat: nextLocation.lat.toFixed(5),
            lng: nextLocation.lng.toFixed(5),
            accuracyM: Number(position.coords.accuracy || 0).toFixed(0),
          });
        },
        () => {
          setUserLocation(null);
          hubDebug('gps-position-error');
        },
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 10 * 60 * 1000 }
      );
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [customerToken, hubDebug, preferredAddressLoading, savedAddressLocation]);

  useEffect(() => {
    hubDebug('location-source', {
      source: savedAddressLocation ? 'saved_address' : activeLocation ? 'gps' : 'none',
      isLoggedIn: Boolean(customerToken),
      label: activeLocationLabel,
      lat: activeLocation ? Number(activeLocation.lat).toFixed(5) : null,
      lng: activeLocation ? Number(activeLocation.lng).toFixed(5) : null,
      regionCity: activeRegion?.city || null,
      regionState: activeRegion?.state || null,
    });
  }, [
    activeLocation,
    activeLocationLabel,
    activeRegion?.city,
    activeRegion?.state,
    customerToken,
    hubDebug,
    savedAddressLocation,
  ]);

  return {
    userLocation,
    userRegion,
    locationLabel,
    preferredDiscoveryAddress,
    savedAddressLocation,
    activeLocation,
    activeRegion,
    activeLocationLabel,
    destinationListHref,
  };
}
