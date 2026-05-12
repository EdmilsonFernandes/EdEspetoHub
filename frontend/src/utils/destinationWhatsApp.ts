export const normalizeBrazilianContactPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('55')) {
    const local = digits.slice(2);
    return local.length === 10 || local.length === 11 ? digits : '';
  }

  return digits.length === 10 || digits.length === 11 ? `55${digits}` : '';
};

export const normalizeWhatsAppPhone = (value?: string | null) => {
  const normalized = normalizeBrazilianContactPhone(value);
  if (!normalized) return '';
  return /^55\d{2}9\d{8}$/.test(normalized) ? normalized : '';
};

export const buildWhatsAppUrl = (phone?: string | null, message?: string, native = false) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return '';
  const encodedMessage = message ? encodeURIComponent(message) : '';
  if (native) {
    return encodedMessage
      ? `whatsapp://send?phone=${normalizedPhone}&text=${encodedMessage}`
      : `whatsapp://send?phone=${normalizedPhone}`;
  }
  return encodedMessage
    ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
    : `https://wa.me/${normalizedPhone}`;
};

export const buildPhoneCallUrl = (phone?: string | null) => {
  const normalizedPhone = normalizeBrazilianContactPhone(phone);
  return normalizedPhone ? `tel:+${normalizedPhone}` : '';
};

export const prettifyDestinationLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const buildDestinationInquiryMessage = ({
  destinationName,
  city,
  state,
  itemName,
  itemType,
  placeName,
  storeName,
}: {
  destinationName?: string | null;
  city?: string | null;
  state?: string | null;
  itemName?: string | null;
  itemType?: string | null;
  placeName?: string | null;
  storeName?: string | null;
}) => {
  const location = [city || destinationName, state].filter(Boolean).join(' - ');
  const subject = String(itemName || storeName || 'esse atendimento').trim();
  const typeLabel = String(itemType || 'serviço').trim().toLowerCase();
  const context = placeName ? ` enquanto estou vendo opções para ${placeName}` : '';

  return [
    `Olá! Encontrei ${subject} pelo Já no Caminho.`,
    location ? `Estou visitando ${location}${context}.` : context ? `Estou visitando a região${context}.` : '',
    `Gostaria de saber mais sobre ${typeLabel}: disponibilidade, valores e como funciona o atendimento.`,
    'Pode me passar os detalhes, por favor?',
  ].filter(Boolean).join('\n');
};
