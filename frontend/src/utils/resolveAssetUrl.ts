import { Capacitor } from '@capacitor/core';

const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

const publicUploadsBaseUrl = (import.meta.env.VITE_PUBLIC_UPLOADS_BASE_URL || '').trim().replace(/\/+$/, '');

export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // fallback
  }
  const origin = String(window.location.origin || '').toLowerCase();
  const protocol = String(window.location.protocol || '').toLowerCase();
  const hostname = String(window.location.hostname || '').toLowerCase();
  if (protocol === 'capacitor:' || protocol === 'ionic:') return true;
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return true;
  // No Capacitor Android com androidScheme: 'https', o app roda em https://localhost
  // Quando não estiver rodando o servidor Vite local (import.meta.env.DEV), é 100% o app empacotado.
  if (hostname === 'localhost' && !import.meta.env.DEV) return true;
  return false;
};

/**
 * Resolve a URL de um asset (imagem, upload, etc) para garantir que funcione
 * tanto na Web quanto no APK (Android/iOS).
 */
export const resolveAssetUrl = (value?: string | null): string => {
  if (!value) return '';

  const trimmed = String(value).trim();
  if (!trimmed) return '';

  // Se for base64 ou blob, retorna direto
  if (/^data:|^blob:/i.test(trimmed)) return trimmed;

  // IMPORTANTE: Domínio de produção para imagens e uploads reais
  const productionDomain = 'https://janocaminho.com.br';
  const isMobile = isNativePlatform();

  // 1. Se for uma URL absoluta
  if (isAbsoluteUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      
      // Se aponta para localhost ou 127.0.0.1 com /uploads
      if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.pathname.startsWith('/uploads')) {
        return `${productionDomain}${parsed.pathname}${parsed.search}`;
      }

      if (publicUploadsBaseUrl && parsed.pathname.startsWith('/uploads')) {
        return `${publicUploadsBaseUrl}${parsed.pathname}${parsed.search}`;
      }

      // Se for domínio janocaminho, garante HTTPS
      if (trimmed.includes('janocaminho.com.br')) {
        let normalized = trimmed.replace(/^http:\/\//i, 'https://');
        normalized = normalized.replace('www.janocaminho.com.br', 'janocaminho.com.br');
        return normalized;
      }

      return trimmed;
    } catch {
      return trimmed;
    }
  }

  // 2. URL relativa (ex: /uploads/... ou uploads/... ou /logo.svg)
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Se for qualquer upload (/uploads/...), aponta SEMPRE para o domínio de produção
  if (path.startsWith('/uploads/')) {
    if (publicUploadsBaseUrl) {
      return `${publicUploadsBaseUrl}${path}`;
    }
    return `${productionDomain}${path}`;
  }

  // Lista de arquivos locais que estão no pacote do app (/public)
  const isLocalAsset = path.startsWith('/icons/') || 
                       path.startsWith('/assets/') ||
                       path.startsWith('/marketing/') || 
                       path === '/favicon.svg' || 
                       path === '/logo.svg' || 
                       path === '/mercado-pago.svg' ||
                       path === '/janocaminho.jpg';

  // No APK, qualquer outro recurso não-local deve vir de produção
  if (isMobile && !isLocalAsset) {
    return `${productionDomain}${path}`;
  }

  return path;
};
