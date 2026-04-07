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

  // Se for uma URL absoluta, verificamos se precisa de upgrade para https ou troca de domínio
  if (isAbsoluteUrl(value)) {
    // 1. Força HTTPS se for o nosso domínio
    if (value.includes('janocaminho.com.br') || value.includes('chamanoespeto.com.br')) {
      normalized = value.replace(/^http:\/\//i, 'https://');
      // 2. Garante o domínio novo se ainda estiver o antigo
      normalized = normalized.replace('chamanoespeto.com.br', 'janocaminho.com.br');
      return normalized;
    }
    return value;
  }

  // Se chegamos aqui, a URL é relativa (ex: /uploads/...)
  const path = value.startsWith('/') ? value : `/${value}`;
  
  if (path.startsWith('/uploads/')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    
    try {
      // No APK/Capacitor, window.location.origin pode ser localhost ou capacitor://
      let origin = typeof window !== 'undefined' ? window.location.origin : productionDomain;
      
      // Se estivermos no mobile, forçamos o origin para o domínio de produção
      if (origin.includes('localhost') || origin.startsWith('capacitor://') || origin.startsWith('http://')) {
        origin = productionDomain;
      }

      // Resolve apiBase contra o origin determinado
      const parsed = new URL(apiBase, origin);
      
      // Remove o sufixo /api para pegar a base dos uploads
      const base = stripApiSuffix(`${parsed.origin}${parsed.pathname}`);
      const finalBase = base.endsWith('/') ? base.slice(0, -1) : base;
      
      return `${finalBase}${path}`;
    } catch {
      // Fallback de emergência
      return `${productionDomain}${path}`;
    }
  }

  return path;
};
