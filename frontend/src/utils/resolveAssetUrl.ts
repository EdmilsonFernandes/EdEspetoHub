const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

const stripApiSuffix = (url: string) => url.replace(/\/api\/?$/, '');

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  
  if (normalized.startsWith('/uploads/')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    
    try {
      // No APK/Capacitor, window.location.origin pode ser localhost ou capacitor://
      // Se a API for relativa, precisamos resolver contra o domínio real.
      let origin = typeof window !== 'undefined' ? window.location.origin : 'https://janocaminho.com.br';
      
      if (origin.includes('localhost') || origin.startsWith('capacitor://')) {
        origin = 'https://janocaminho.com.br';
      }

      // Resolve apiBase contra o origin determinado
      const parsed = new URL(apiBase, origin);
      
      // Remove o sufixo /api para pegar a base dos uploads
      const base = stripApiSuffix(`${parsed.origin}${parsed.pathname}`);
      const finalBase = base.endsWith('/') ? base.slice(0, -1) : base;
      
      return `${finalBase}${normalized}`;
    } catch {
      // Fallback final
      const base = stripApiSuffix(apiBase);
      const finalBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const prefix = (finalBase.startsWith('http') || finalBase === '') ? finalBase : 'https://janocaminho.com.br';
      return `${prefix}${normalized}`;
    }
  }

  return normalized;
};
