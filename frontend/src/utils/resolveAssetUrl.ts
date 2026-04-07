const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  
  if (normalized.startsWith('/uploads/')) {
    // Prioriza o domínio www que está no seu env.docker
    const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://www.janocaminho.com.br';
    
    let base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    
    // Remove o sufixo /api para pegar os uploads na raiz do domínio (como configurado no Nginx)
    base = base.replace(/\/api$/, '');
    
    return `${base}${normalized}`;
  }

  return normalized;
};
