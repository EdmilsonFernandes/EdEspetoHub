// Avatar de fallback 100% local: monograma (iniciais) em SVG data-URI com gradiente
// da marca. Antes apontava para api.dicebear.com — dependência externa que falhava
// junto quando o logo da loja estava quebrado (404 em /uploads) ou offline no WebView.
const PALETTES: Array<[string, string]> = [
  ['#153A4C', '#336886'],
  ['#336686', '#153A4C'],
  ['#5FD35A', '#2d5f7b'],
  ['#336886', '#336686'],
  ['#1A5068', '#5FD35A'],
];

export const getStoreMonogramDataUri = (name?: string | null) => {
  const rawName = String(name || '').trim();
  const initials =
    rawName
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'JC';

  const hash = Array.from(rawName || 'jc').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const [from, to] = PALETTES[hash % PALETTES.length];

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="96" height="96" rx="24" fill="url(#g)"/>` +
    `<text x="48" y="50" fill="#ffffff" font-family="Inter, 'Segoe UI', sans-serif" font-size="34" font-weight="800" text-anchor="middle" dominant-baseline="central">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// Mantém a assinatura antiga (seed + nome) para os callers existentes;
// o resultado agora é local, determinístico pelo nome e sem rede.
export const getStoreAvatarUrl = (seed?: string | null, fallbackName?: string | null) => {
  const name = String(fallbackName || seed || '').trim();
  return getStoreMonogramDataUri(name || 'Já no Caminho');
};
