const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  
  // Se for um upload, PRECISA de domínio no APK
  if (normalized.startsWith('/uploads/')) {
    // Tenta pegar de VITE_API_BASE_URL, se não existir tenta janocaminho.com.br direto
    const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://www.janocaminho.com.br';
    
    let base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    
    // Se a base termina com /api, removemos para pegar os uploads na raiz do domínio
    base = base.replace(/\/api$/, '');
    
    return `${base}${normalized}`;
  }

  return normalized;
};
