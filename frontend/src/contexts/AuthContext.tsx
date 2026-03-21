<<<<<<< HEAD
import React, { createContext, useContext, useEffect, useState } from 'react';
=======
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
>>>>>>> main

type AuthSession = {
  token: string;
  user: any;
  store: any;
<<<<<<< HEAD
=======
  subscription?: any;
  planTier?: string;
  features?: Record<string, boolean>;
>>>>>>> main
};

type AuthContextType = {
  auth: AuthSession | null;
  hydrated: boolean;
  setAuth: (auth: AuthSession | null) => void;
  logout: () => void;
};
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuthState] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
<<<<<<< HEAD
=======
  const previousStoreRef = useRef<{ id?: string; slug?: string } | null>(null);

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
>>>>>>> main

  useEffect(() => {
    const raw = localStorage.getItem('adminSession');

    if (raw)
    {
      try
      {
        const parsed = JSON.parse(raw);

        if (parsed?.token && parsed?.user)
        {
          setAuthState(parsed);
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
<<<<<<< HEAD
=======
    const previousStoreId = previousStoreRef.current?.id;
    const previousStoreSlug = previousStoreRef.current?.slug;
    const nextStoreId = session?.store?.id ? String(session.store.id) : '';
    const nextStoreSlug = session?.store?.slug ? String(session.store.slug) : '';

    const changedStore =
      Boolean(previousStoreId || previousStoreSlug) &&
      (previousStoreId !== nextStoreId || previousStoreSlug !== nextStoreSlug);

    if (changedStore) {
      clearStoreScopedClientState(previousStoreId, previousStoreSlug);
    }

>>>>>>> main
    if (session) {
      localStorage.setItem('adminSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('adminSession');
    }
<<<<<<< HEAD
=======

    previousStoreRef.current = session
      ? { id: nextStoreId, slug: nextStoreSlug }
      : null;

    applyDocumentBranding(session);
>>>>>>> main
    setAuthState(session);
  };

  const logout = () => {
<<<<<<< HEAD
    localStorage.removeItem('adminSession');
    setAuthState(null);
  };

=======
    clearStoreScopedClientState(previousStoreRef.current?.id, previousStoreRef.current?.slug);
    localStorage.removeItem('adminSession');
    previousStoreRef.current = null;
    applyDocumentBranding(null);
    setAuthState(null);
  };

  useEffect(() => {
    if (!hydrated || auth) return;
    applyDocumentBranding(null);
  }, [auth, hydrated]);

>>>>>>> main
  return <AuthContext.Provider value={{ auth, hydrated, setAuth, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
