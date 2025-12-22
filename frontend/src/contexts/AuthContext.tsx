import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthSession = {
  token: string;
  user: any;
  store: any;
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

  useEffect(() => {
    const raw = localStorage.getItem('adminSession');
    if (raw) {
      setAuthState(JSON.parse(raw));
    }
    setHydrated(true);
  }, []);

  const setAuth = (session: AuthSession | null) => {
    if (session) {
      localStorage.setItem('adminSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('adminSession');
    }
    setAuthState(session);
  };

  const logout = () => {
    localStorage.removeItem('adminSession');
    setAuthState(null);
  };

  return <AuthContext.Provider value={{ auth, hydrated, setAuth, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
