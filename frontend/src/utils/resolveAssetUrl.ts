const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:|^blob:/i.test(value);

export const resolveAssetUrl = (value?: string) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  
  if (normalized.startsWith('/uploads/')) {
    // Usando o domínio exato que funcionou no seu log da web
    const base = 'https://janocaminho.com.br';
    return `${base}${normalized}`;
  }

  return normalized;
};
