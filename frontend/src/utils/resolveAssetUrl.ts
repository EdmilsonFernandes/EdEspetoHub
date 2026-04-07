const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  
  // Se for um upload, PRECISA de domínio no APK
  if (normalized.startsWith('/uploads/')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.janocaminho.com.br';
    const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const finalBase = cleanBase.replace(/\/api$/, '');
    return `${finalBase}${normalized}`;
  }

  return normalized;
};
