import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { ADMIN_SESSION_EVENT, CUSTOMER_SESSION_EVENT, MOTOBOY_SESSION_EVENT } from '../services/nativeBiometricService';
import { storePushService } from '../services/storePushService';
import { clearAllCustomerSessions } from '../utils/customerSessionStorage';

type AuthSession = {
  token: string;
  user: any;
  store: any;
  subscription?: any;
  planTier?: string;
  features?: Record<string, boolean>;
};

type AuthContextType = {
  auth: AuthSession | null;
  hydrated: boolean;
  setAuth: (auth: AuthSession | null) => void;
  logout: () => void;
};
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const isOperationalAuthSession = (session: any): session is AuthSession => {
  const role = String(session?.user?.role || '').toUpperCase();
  const allowedRole = role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA';
  const hasStoreContext = Boolean(session?.store?.id || session?.store?.slug);
  return Boolean(session?.token && session?.user && allowedRole && hasStoreContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuthState] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const previousStoreRef = useRef<{ id?: string; slug?: string } | null>(null);

  const clearAdminPushSyncCache = () => {
    try {
      localStorage.removeItem('jnk_mobile_push_last_sync_store_token');
    } catch {
      // no-op
    }
  };

  const unregisterAdminPushToken = (session: AuthSession | null) => {
    if (typeof window === 'undefined') return;
    const storeId = String(session?.store?.id || '').trim();
    const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
    if (!storeId || !token) {
      clearAdminPushSyncCache();
      return;
    }

    void storePushService.unregisterPushToken(storeId, { token }).catch(() => undefined);
    clearAdminPushSyncCache();
  };

  const applyDocumentBranding = (session: AuthSession | null) => {
    const storeName = String(session?.store?.name || '').trim();
    const logoUrl = resolveAssetUrl(session?.store?.settings?.logoUrl || '') || '/janocaminho.jpg';
    const title = storeName ? `${storeName} | Admin | Já no Caminho` : 'Admin | Já no Caminho';
    document.title = title;

    const iconHref = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
    const iconLink =
      (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ||
      document.createElement('link');
    iconLink.setAttribute('rel', 'icon');
    iconLink.setAttribute('href', iconHref);
    document.head.appendChild(iconLink);
  };

  const clearStoreScopedClientState = (storeId?: string, storeSlug?: string) => {
    if (!storeId && !storeSlug) return;

    const keysToRemove = [
      storeId ? `adminNotifications:dismissed:${storeId}` : '',
      storeSlug ? `lastOrder:${storeSlug}` : '',
      storeSlug ? `lastOrders:${storeSlug}` : '',
      storeSlug ? `lastOrderItems:${storeSlug}` : '',
      storeSlug ? `store:coords:${storeSlug}` : '',
      storeSlug ? `reorder:${storeSlug}` : '',
    ].filter(Boolean);

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // no-op
      }
    });
  };

  const clearNonAdminSessions = () => {
    try {
      clearAllCustomerSessions();
      localStorage.removeItem('motoboySession');
      window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT));
      window.dispatchEvent(new CustomEvent(MOTOBOY_SESSION_EVENT));
    } catch {
      // Keep admin auth resilient when storage is restricted.
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem('adminSession');

    if (raw)
    {
      try
      {
        const parsed = JSON.parse(raw);

        if (isOperationalAuthSession(parsed))
        {
          clearNonAdminSessions();
          setAuthState(parsed);
          previousStoreRef.current = {
            id: parsed?.store?.id ? String(parsed.store.id) : '',
            slug: parsed?.store?.slug ? String(parsed.store.slug) : '',
          };
        } else
        {
          localStorage.removeItem('adminSession');
        }
      } catch (error)
      {
        console.error('Falha ao restaurar sessão do admin', error);
        localStorage.removeItem('adminSession');
      }
    }

    setHydrated(true);
  }, []);

  const setAuth = (session: AuthSession | null) => {
    const normalizedSession = isOperationalAuthSession(session) ? session : null;
    const previousUserId = String(auth?.user?.id || '').trim();
    const previousStoreId = previousStoreRef.current?.id;
    const previousStoreSlug = previousStoreRef.current?.slug;
    const nextUserId = normalizedSession?.user?.id ? String(normalizedSession.user.id) : '';
    const nextStoreId = normalizedSession?.store?.id ? String(normalizedSession.store.id) : '';
    const nextStoreSlug = normalizedSession?.store?.slug ? String(normalizedSession.store.slug) : '';

    const changedStore =
      Boolean(previousStoreId || previousStoreSlug) &&
      (previousStoreId !== nextStoreId || previousStoreSlug !== nextStoreSlug);
    const changedAdminIdentity =
      Boolean(auth?.token) &&
      (
        !normalizedSession?.token ||
        previousStoreId !== nextStoreId ||
        previousUserId !== nextUserId
      );

    if (changedStore) {
      clearStoreScopedClientState(previousStoreId, previousStoreSlug);
    }
    if (changedAdminIdentity) {
      unregisterAdminPushToken(auth);
    }

    if (normalizedSession) {
      clearNonAdminSessions();
      localStorage.setItem('adminSession', JSON.stringify(normalizedSession));
      window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EVENT, { detail: normalizedSession }));
    } else {
      localStorage.removeItem('adminSession');
      window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EVENT));
    }

    previousStoreRef.current = normalizedSession
      ? { id: nextStoreId, slug: nextStoreSlug }
      : null;

    applyDocumentBranding(normalizedSession);
    setAuthState(normalizedSession);
  };

  const logout = () => {
    unregisterAdminPushToken(auth);
    clearStoreScopedClientState(previousStoreRef.current?.id, previousStoreRef.current?.slug);
    localStorage.removeItem('adminSession');
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EVENT));
    previousStoreRef.current = null;
    applyDocumentBranding(null);
    setAuthState(null);
  };

  useEffect(() => {
    if (!hydrated || auth) return;
    applyDocumentBranding(null);
  }, [auth, hydrated]);

  return <AuthContext.Provider value={{ auth, hydrated, setAuth, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

