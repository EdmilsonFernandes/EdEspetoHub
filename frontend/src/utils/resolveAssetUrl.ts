const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

const stripApiSuffix = (url: string) => url.replace(/\/api\/?$/, '');

/**
 * Resolve a URL de um asset (imagem, upload, etc) para garantir que funcione
 * tanto na Web quanto no APK (Android/iOS).
 */
export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;

  // Se for base64 ou blob, retorna direto
  if (/^data:|^blob:/i.test(value)) return value;

  const productionDomain = 'https://janocaminho.com.br';
  let normalized = value;

  // LOG PARA DEBUG NO APK
  const isMobile = typeof window !== 'undefined' && 
    (window.location.origin.includes('localhost') || window.location.origin.startsWith('capacitor://'));

  // Se for uma URL absoluta, verificamos se precisa de upgrade para https ou troca de domínio
  if (isAbsoluteUrl(value)) {
    if (value.includes('janocaminho.com.br') || value.includes('chamanoespeto.com.br')) {
      normalized = value.replace(/^http:\/\//i, 'https://');
      normalized = normalized.replace('chamanoespeto.com.br', 'janocaminho.com.br');
      if (isMobile) console.log(`[AssetRes] Absolute Fixed: ${value} -> ${normalized}`);
      return normalized;
    }
    return value;
  }

  // Se chegamos aqui, a URL é relativa (ex: /uploads/...)
  const path = value.startsWith('/') ? value : `/${value}`;
  
  if (path.startsWith('/uploads/')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    
    try {
      let origin = typeof window !== 'undefined' ? window.location.origin : productionDomain;
      
      if (origin.includes('localhost') || origin.startsWith('capacitor://') || origin.startsWith('http://')) {
        origin = productionDomain;
      }

      const parsed = new URL(apiBase, origin);
      const base = stripApiSuffix(`${parsed.origin}${parsed.pathname}`);
      const finalBase = base.endsWith('/') ? base.slice(0, -1) : base;
      
      const finalUrl = `${finalBase}${path}`;
      if (isMobile) console.log(`[AssetRes] Relative Resolved: ${value} -> ${finalUrl} (Origin: ${window.location.origin}, ApiBase: ${apiBase})`);
      return finalUrl;
    } catch (err) {
      const fallback = `${productionDomain}${path}`;
      if (isMobile) console.error(`[AssetRes] Error resolving ${value}, fallback to ${fallback}`, err);
      return fallback;
    }
  }

  return path;
};
