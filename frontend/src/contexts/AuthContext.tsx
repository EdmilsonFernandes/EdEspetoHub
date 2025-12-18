import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface AuthState {
  token: string | null;
  user: any;
  store: any;
}

interface AuthContextValue {
  auth: AuthState;
  setAuth: (data: Partial<AuthState>) => void;
  clearAuth: () => void;
  hydrated: boolean;
}

const AUTH_STORAGE_KEY = 'adminSession';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  token: null,
  user: null,
  store: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setAuthState({ ...defaultState, ...parsed });
      } catch (error) {
        console.warn('Falha ao restaurar sessão', error);
      }
    }
    setHydrated(true);
  }, []);

  const persistAuth = (data: Partial<AuthState>) => {
    setAuthState((prev) => {
      const nextState = { ...prev, ...data } as AuthState;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    });
  };

  const clearAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState(defaultState);
  };

  const value = useMemo(
    () => ({ auth, setAuth: persistAuth, clearAuth, hydrated }),
    [auth, hydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
