/**
 * Helpers de normalização para campos de rede social / URL informados pelo
 * parceiro. O objetivo é aceitar o que a pessoa costuma digitar
 * (@usuario, usuario, instagram.com/usuario, http(s)://...) e devolver sempre
 * uma URL válida, sem rejeitar o cadastro por um detalhe de formatação.
 */

/**
 * Normaliza um handle/link do Instagram.
 * Aceita: "@perfil", "perfil", "instagram.com/perfil", "https://...".
 * Devolve sempre uma URL absoluta (ou null se vazio).
 */
export function normalizeInstagramUrl(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const withDomain = raw.replace(/^\/+/, '');
  if (/instagram\.com\//i.test(withDomain)) return `https://${withDomain}`;
  const handle = withDomain.replace(/^@+/, '').replace(/\/+$/, '').trim();
  if (!handle) return null;
  return `https://www.instagram.com/${handle}`;
}

/**
 * Normaliza uma URL externa genérica (site, Airbnb, Booking, cardápio).
 * Se vier sem protocolo mas parecer um domínio/caminho, adiciona https://.
 * Devolve null quando o valor é vazio ou claramente não é uma URL.
 */
export function normalizeExternalUrl(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w-]+(\.[\w-]+)+/.test(raw)) return `https://${raw.replace(/^\/+/, '')}`;
  return null;
}
