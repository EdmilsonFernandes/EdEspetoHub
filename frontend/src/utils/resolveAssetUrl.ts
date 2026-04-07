const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  
  if (normalized.startsWith('/uploads/')) {
    // Tenta pegar a URL de várias fontes para não errar
    const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://api.janocaminho.com.br';
    
    let base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    
    // Remove o sufixo /api se ele existir na base, pois o /uploads costuma ser na raiz do domínio da API
    base = base.replace(/\/api$/, '');
    
    const finalUrl = `${base}${normalized}`;
    return finalUrl;
  }

  return normalized;
};
