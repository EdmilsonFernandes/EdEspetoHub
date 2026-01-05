// @ts-nocheck
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

type Theme = 'light' | 'dark';

type Branding = {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  brandName?: string;
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  branding: Branding;
  setBranding: (branding: Branding) => void;
}

const defaultBranding: Branding = {
  primaryColor: '#b91c1c',
  secondaryColor: '#111827',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const resolveStoredBranding = (): Branding =>
{
  const rawSession = localStorage.getItem('adminSession');
  if (rawSession)
  {
    try
    {
      const session = JSON.parse(rawSession);
      const settings = session?.store?.settings ?? {};
      return {
        primaryColor: settings.primaryColor || defaultBranding.primaryColor,
        secondaryColor: settings.secondaryColor || defaultBranding.secondaryColor,
        logoUrl: resolveAssetUrl(settings.logoUrl),
        brandName: session?.store?.name,
      };
    } catch (error)
    {
      console.error('Failed to parse adminSession branding', error);
    }
  }

  return defaultBranding;
};

const applyBrandingToCssVars = (branding: Branding) =>
{
  const { primaryColor, secondaryColor } = { ...defaultBranding, ...branding };
  document.documentElement.style.setProperty('--primary-color', primaryColor || defaultBranding.primaryColor!);
  document.documentElement.style.setProperty('--secondary-color', secondaryColor || defaultBranding.secondaryColor!);
  document.documentElement.style.setProperty('--color-primary', primaryColor || defaultBranding.primaryColor!);
  document.documentElement.style.setProperty('--color-secondary', secondaryColor || defaultBranding.secondaryColor!);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  const [branding, setBrandingState] = useState<Branding>(resolveStoredBranding);
  const lastAppliedBrandingKey = useRef('');

  useEffect(() => {
    console.count('Theme toggle effect');
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    console.count('Theme apply effect');

    const key = `${branding?.primaryColor ?? ''}|${branding?.secondaryColor ?? ''}|${branding?.logoUrl ?? ''}|${branding?.brandName ?? ''}`;
    if (!key.trim()) return;
    if (lastAppliedBrandingKey.current === key) return;
    lastAppliedBrandingKey.current = key;

    applyBrandingToCssVars(branding);
  }, [branding?.primaryColor, branding?.secondaryColor, branding?.logoUrl, branding?.brandName]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const setBranding = useCallback((nextBranding: Branding) => {
    setBrandingState((prev) => {
      const resolvedLogo =
        nextBranding?.logoUrl === undefined
          ? prev?.logoUrl
          : resolveAssetUrl(nextBranding?.logoUrl);
      const merged = {
        ...defaultBranding,
        ...prev,
        ...nextBranding,
        logoUrl: resolvedLogo,
      };
      const prevKey = `${prev?.primaryColor ?? ''}|${prev?.secondaryColor ?? ''}|${prev?.logoUrl ?? ''}|${prev?.brandName ?? ''}`;
      const nextKey = `${merged?.primaryColor ?? ''}|${merged?.secondaryColor ?? ''}|${merged?.logoUrl ?? ''}|${merged?.brandName ?? ''}`;

      if (prevKey === nextKey)
      {
        return prev;
      }

      return merged;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, branding, setBranding }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
