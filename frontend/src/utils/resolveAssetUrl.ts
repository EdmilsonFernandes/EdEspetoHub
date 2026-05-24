const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

const publicUploadsBaseUrl = (import.meta.env.VITE_PUBLIC_UPLOADS_BASE_URL || '').trim().replace(/\/+$/, '');
const publicUploadPrefixes = [
  '/uploads/products/',
  '/uploads/logos/',
  '/uploads/condominiums/',
  '/uploads/destinations/',
  '/uploads/payment/',
];

const isPublicUploadPath = (value: string) => publicUploadPrefixes.some((prefix) => value.startsWith(prefix));

/**
 * Resolve a URL de um asset (imagem, upload, etc) para garantir que funcione
 * tanto na Web quanto no APK (Android/iOS).
 */
export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;

  // Se for base64 ou blob, retorna direto
  if (/^data:|^blob:/i.test(value)) return value;

  // IMPORTANTE: Usamos sem 'www.' para garantir consistência com a configuração que você informou
  const productionDomain = 'https://janocaminho.com.br';
  
  // LOG PARA DEBUG NO APK
  const isMobile = typeof window !== 'undefined' && 
    (window.location.origin.includes('localhost') || window.location.origin.startsWith('capacitor://'));

  // 1. Se for uma URL absoluta
  if (isAbsoluteUrl(value)) {
    try {
      const parsed = new URL(value);
      if (publicUploadsBaseUrl && isPublicUploadPath(parsed.pathname)) {
        return `${publicUploadsBaseUrl}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Fallback to the existing normalization logic below.
    }

    // Se for um dos nossos domínios, garante HTTPS, domínio novo e REMOVE 'www.'
    if (value.includes('janocaminho.com.br') || value.includes('janocaminho.com.br')) {
      let normalized = value.replace(/^http:\/\//i, 'https://');
      normalized = normalized.replace('www.janocaminho.com.br', 'janocaminho.com.br');
      normalized = normalized.replace('janocaminho.com.br', 'janocaminho.com.br');
      return normalized;
    }
    return value;
  }

  // 2. Se chegamos aqui, a URL é relativa (ex: /uploads/... ou /imagem.jpg)
  const path = value.startsWith('/') ? value : `/${value}`;

  if (publicUploadsBaseUrl && isPublicUploadPath(path)) {
    return `${publicUploadsBaseUrl}${path}`;
  }
  
  // Lista de arquivos que sabemos que são LOCAIS do App (estão na pasta public)
  const isLocalAsset = path.startsWith('/icons/') || 
                       path.startsWith('/assets/') ||
                       path.startsWith('/marketing/') || 
                       path === '/favicon.svg' || 
                       path === '/logo.svg' || 
                       path === '/mercado-pago.svg' ||
                       path === '/janocaminho.jpg' ||
                       path === '/janocaminho.jpg' ||
                       path === '/janocaminho.jpg';

  // Se estivermos no APK e NÃO for um asset local, forçamos a resolução contra o servidor
  if (isMobile && !isLocalAsset) {
    // Usamos o domínio fixo sem 'www' no APK para evitar problemas de Nginx
    return `${productionDomain}${path}`;
  }

  // Na Web ou para assets locais no APK, mantém o comportamento padrão (relativo ao origin atual)
  return path;
};
