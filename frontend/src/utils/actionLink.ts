import { Capacitor } from '@capacitor/core';
import type { NavigateFunction } from 'react-router-dom';

export type ActionTarget = {
  href: string;
  external: boolean;
};

const DEFAULT_FALLBACK_URL = '/create?plan=trial';

export const resolveActionTarget = (rawUrl?: string | null, fallbackUrl = DEFAULT_FALLBACK_URL): ActionTarget => {
  const normalized = String(rawUrl || '').trim();
  const fallback = String(fallbackUrl || DEFAULT_FALLBACK_URL).trim() || DEFAULT_FALLBACK_URL;
  const href = normalized || fallback;

  return {
    href,
    external: /^https?:\/\//i.test(href),
  };
};

export const openActionTarget = async (
  target: ActionTarget,
  navigate?: NavigateFunction
) => {
  if (target.external) {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: target.href });
        return;
      } catch {
        // Fallback handled below.
      }
    }

    const opened = window.open(target.href, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(target.href);
    }
    return;
  }

  if (navigate) {
    navigate(target.href);
    return;
  }

  window.location.assign(target.href);
};
