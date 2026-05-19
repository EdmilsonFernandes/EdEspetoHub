const categoryToStoreSegment = (category?: string | null) => {
  const key = String(category || '').toUpperCase();
  if (key.includes('RESTAURANTE') || key === 'NOITE') return 'restaurante';
  if (key === 'LOJA') return 'outros';
  return 'outros';
};

const normalizeBaseUrl = (value?: string | null) => String(value || '').trim().replace(/\/+$/, '');

const normalizeWhatsappPhone = (value?: string | null) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export const buildListingClaimUrl = (destination: any, listing: any, options: any = {}) => {
  const params = new URLSearchParams();
  params.set('source', 'destination_listing_claim');
  params.set('destinationListingId', String(listing?.id || ''));
  if (destination?.id) params.set('destinationId', String(destination.id));
  if (destination?.slug) params.set('destinationSlug', String(destination.slug));
  if (destination?.name) params.set('destinationName', String(destination.name));
  if (destination?.city) params.set('city', String(destination.city));
  if (destination?.state) params.set('state', String(destination.state));
  if (listing?.title) {
    params.set('storeName', String(listing.title));
    params.set('listingTitle', String(listing.title));
  }
  if (listing?.description) params.set('description', String(listing.description));
  if (listing?.address) params.set('address', String(listing.address));
  if (listing?.whatsapp || listing?.phone) params.set('phone', String(listing.whatsapp || listing.phone));
  params.set('segment', categoryToStoreSegment(listing?.category));
  if (options?.deliveryMode) params.set('deliveryMode', String(options.deliveryMode));
  if (Array.isArray(options?.placeIds) && options.placeIds.length) {
    params.set('placeIds', options.placeIds.map((id: any) => String(id || '').trim()).filter(Boolean).join(','));
  }
  const path = `/create?${params.toString()}`;
  const baseUrl = normalizeBaseUrl(options?.baseUrl);
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const buildListingInviteMessage = (destination: any, listing: any, claimUrl: string) => {
  const destinationName = String(destination?.name || destination?.city || 'sua cidade').trim();
  const listingName = String(listing?.title || 'seu negócio').trim();
  return [
    `Olá, tudo bem? Sou o Edmilson, do Já no Caminho.`,
    '',
    `Estou montando um guia digital de ${destinationName} para hóspedes de chalés e pousadas encontrarem restaurantes, cafés, empórios e serviços locais.`,
    '',
    `O negócio ${listingName} aparece como curadoria inicial da cidade. Quero te convidar para assumir gratuitamente esse perfil, atualizar fotos, cardápio e informar quais chalés/pousadas vocês atendem.`,
    '',
    `Link seguro para ativar:`,
    claimUrl,
    '',
    `Se preferir não aparecer no guia, me responda REMOVER que eu retiro sem problema.`,
  ].join('\n');
};

export const buildListingInviteWhatsAppUrl = (phone: string, message: string) => {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  if (!normalizedPhone) return '';
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};
