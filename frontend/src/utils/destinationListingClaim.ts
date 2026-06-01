const categoryToStoreSegment = (category?: string | null) => {
  const key = String(category || '').toUpperCase();
  if (key.includes('RESTAURANTE') || key === 'NOITE') return 'restaurante';
  if (key === 'LOJA') return 'outros';
  return 'outros';
};

const normalizeBaseUrl = (value?: string | null) => String(value || '').trim().replace(/\/+$/, '');
const cleanPathSegment = (value?: string | null) => encodeURIComponent(String(value || '').trim());

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
  if (listing?.city || destination?.city) params.set('city', String(listing.city || destination.city));
  if (listing?.state || destination?.state) params.set('state', String(listing.state || destination.state));
  if (listing?.title) {
    params.set('storeName', String(listing.title));
    params.set('listingTitle', String(listing.title));
  }
  if (listing?.description) params.set('description', String(listing.description));
  if (listing?.address) params.set('address', String(listing.address));
  if (listing?.addressNumber) params.set('addressNumber', String(listing.addressNumber));
  if (listing?.district) params.set('district', String(listing.district));
  if (listing?.zipCode) params.set('zipCode', String(listing.zipCode));
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

export const buildListingPublicInviteUrl = (destination: any, listing: any, options: any = {}) => {
  const destinationSlug = cleanPathSegment(destination?.slug || destination?.destinationSlug);
  const listingId = cleanPathSegment(listing?.id);
  if (!destinationSlug || !listingId) return buildListingClaimUrl(destination, listing, options);
  const path = `/convite/loja/${destinationSlug}/${listingId}`;
  const baseUrl = normalizeBaseUrl(options?.baseUrl);
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const buildHospitalityPlacePublicInviteUrl = (destination: any, place: any, options: any = {}) => {
  const destinationSlug = cleanPathSegment(destination?.slug || place?.destination?.slug);
  const placeSlug = cleanPathSegment(place?.slug);
  if (!destinationSlug || !placeSlug) return '';
  const path = `/convite/chale/${destinationSlug}/${placeSlug}`;
  const baseUrl = normalizeBaseUrl(options?.baseUrl);
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const buildListingInviteMessage = (destination: any, listing: any, inviteUrl: string) => {
  const destinationName = String(destination?.name || destination?.city || 'sua cidade').trim();
  const listingName = String(listing?.title || 'seu negócio').trim();
  return [
    `Olá, tudo bem? Sou o Edmilson, criador do Já no Caminho.`,
    '',
    `Estou montando uma página simples de ${destinationName} para hóspedes e visitantes encontrarem restaurantes, cafés, empórios, passeios e serviços locais com mais facilidade.`,
    '',
    `Incluí ${listingName} como sugestão inicial usando informações públicas. Não tem cobrança e não precisa instalar arquivo: é só um convite para você conferir, corrigir ou assumir o perfil no site oficial janocaminho.com.br.`,
    '',
    `Para as primeiras lojas convidadas, posso liberar 3 meses de acesso gratuito para testar pedidos, divulgação e atendimento pelo Já no Caminho antes de decidir continuar.`,
    '',
    `Você pode atualizar fotos, WhatsApp, cardápio ou serviços, endereço e informar quais hospedagens atende.`,
    '',
    `Link seguro para revisar o perfil:`,
    inviteUrl,
    '',
    `Se preferir não aparecer na página, me responda REMOVER que eu retiro sem problema.`,
  ].join('\n');
};

export const buildHospitalityPlaceInviteMessage = (destination: any, place: any, inviteUrl: string) => {
  const destinationName = String(destination?.name || destination?.city || place?.city || 'sua cidade').trim();
  const placeName = String(place?.name || 'sua hospedagem').trim();
  return [
    `Olá, tudo bem? Sou o Edmilson, criador do Já no Caminho.`,
    '',
    `Estou organizando uma página de ${destinationName} para hóspedes encontrarem delivery, mercados, restaurantes, passeios e serviços próximos das hospedagens.`,
    '',
    `${placeName} foi incluída como sugestão inicial usando informações públicas. Não tem cobrança e não precisa instalar arquivo: é só um convite para você conferir, corrigir ou assumir gratuitamente o perfil no site oficial janocaminho.com.br.`,
    '',
    `Para parceiros convidados, posso liberar 3 meses gratuitos para testar a página, o QR Code e a divulgação para hóspedes sem compromisso.`,
    '',
    `Assumindo o perfil, você pode revisar fotos, WhatsApp, endereço, Instagram, link de reserva e gerar um QR Code para deixar no quarto, recepção ou área comum.`,
    '',
    `Link seguro para revisar o perfil:`,
    inviteUrl,
    '',
    `Se preferir não aparecer na página, me responda REMOVER que eu retiro sem problema.`,
  ].join('\n');
};

export const buildListingInviteWhatsAppUrl = (phone: string, message: string) => {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  if (!normalizedPhone) return '';
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};
