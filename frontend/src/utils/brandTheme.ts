// @ts-nocheck
import { defaultBranding } from '../constants';

export const applyBrandTheme = (branding) => {
  const primary = branding?.primaryColor || defaultBranding.primaryColor;
  const secondary = branding?.accentColor || primary || defaultBranding.accentColor;
  document.documentElement.style.setProperty('--primary-color', primary);
  document.documentElement.style.setProperty('--accent-color', secondary);
  document.documentElement.style.setProperty('--color-primary', primary);
  document.documentElement.style.setProperty('--color-secondary', secondary);
};
