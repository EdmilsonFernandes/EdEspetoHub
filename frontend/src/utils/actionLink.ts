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

export const resolveActionLabel = (
  rawLabel?: string | null,
  rawUrl?: string | null,
  fallbackUrl = DEFAULT_FALLBACK_URL
) => {
  const explicit = String(rawLabel || '').trim();
  if (explicit) return explicit;

  const { href } = resolveActionTarget(rawUrl, fallbackUrl);
  if (!href) return '';

  const normalizedHref = href.toLowerCase();

  if (normalizedHref.includes('play.google.com/store/apps')) return 'Baixar na Play Store';
  if (normalizedHref.includes('apps.apple.com/') || normalizedHref.includes('itunes.apple.com/')) return 'Baixar na App Store';
  if (normalizedHref.startsWith('/create')) return 'Criar loja';
  if (/^https?:\/\//i.test(href)) return 'Saiba mais';
  return 'Abrir';
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
