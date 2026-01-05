// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { auth, hydrated } = useAuth();
  const { setBranding } = useTheme();
  const brandingKeyRef = useRef('');

  useEffect(() => {
    if (!hydrated || !auth?.store) return;

    const settings = auth?.store?.settings || {};
    const logoUrl = resolveAssetUrl(settings.logoUrl);
    const name = auth?.store?.name;

    const key = `${auth?.store?.id ?? ''}|${settings.primaryColor ?? ''}|${settings.secondaryColor ?? ''}|${logoUrl ?? ''}|${name ?? ''}`;
    if (!auth?.store?.id) return;
    if (brandingKeyRef.current === key) return;
    brandingKeyRef.current = key;

    setBranding({
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      logoUrl,
      brandName: name,
    });
  }, [
    hydrated,
    auth?.store?.id,
    auth?.store?.name,
    auth?.store?.settings?.logoUrl,
    auth?.store?.settings?.primaryColor,
    auth?.store?.settings?.secondaryColor,
    setBranding,
  ]);

  return <>{children}</>;
}
