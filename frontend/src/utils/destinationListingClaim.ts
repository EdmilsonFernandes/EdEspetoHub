import { JNC_GOOGLE_PLAY_URL, JNC_IOS_HUB_URL } from './destinationQrPoster';

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
    `Olá, tudo bem? Sou o Edmilson, do Já no Caminho.`,
    '',
    `Estou montando um guia digital de ${destinationName} para hóspedes de chalés e pousadas encontrarem restaurantes, cafés, empórios e serviços locais.`,
    '',
    `O negócio ${listingName} aparece como curadoria inicial a partir de informações públicas e guias turísticos da cidade. Não é cobrança e não é link estranho: é um convite para você revisar/assumir o perfil no domínio oficial janocaminho.com.br.`,
    '',
    `Você pode atualizar fotos, WhatsApp, cardápio/serviços e informar quais chalés ou pousadas atende.`,
    '',
    `Link curto e seguro para assumir o perfil:`,
    inviteUrl,
    '',
    `Importante: não envio APK nem arquivo para instalar. O app é pela Google Play e o link acima fica no domínio oficial janocaminho.com.br.`,
    '',
    `Para ver como o hóspede encontra seu negócio no app:`,
    `Android: ${JNC_GOOGLE_PLAY_URL}`,
    `iPhone ou web: ${JNC_IOS_HUB_URL}`,
    '',
    `Se preferir não aparecer no guia, me responda REMOVER que eu retiro sem problema.`,
  ].join('\n');
};

export const buildHospitalityPlaceInviteMessage = (destination: any, place: any, inviteUrl: string) => {
  const destinationName = String(destination?.name || destination?.city || place?.city || 'sua cidade').trim();
  const placeName = String(place?.name || 'sua hospedagem').trim();
  return [
    `Olá, tudo bem? Sou o Edmilson, do Já no Caminho.`,
    '',
    `Estou organizando um guia digital de ${destinationName} para hóspedes encontrarem delivery, mercados, restaurantes, passeios e serviços próximos aos chalés e pousadas.`,
    '',
    `${placeName} aparece como curadoria inicial a partir de informações públicas e guias turísticos da cidade. Não é cobrança e não é link estranho: é um convite para você assumir gratuitamente o perfil no domínio oficial janocaminho.com.br.`,
    '',
    `Assumindo o perfil, você pode revisar fotos, WhatsApp, endereço, Instagram, link de reserva e gerar o QR Code para colocar na hospedagem.`,
    '',
    `Link curto e seguro para assumir/atualizar o perfil:`,
    inviteUrl,
    '',
    `Importante: não envio APK nem arquivo para instalar. O app é pela Google Play e o link acima fica no domínio oficial janocaminho.com.br.`,
    '',
    `Para ver a experiência do hóspede:`,
    `Android: ${JNC_GOOGLE_PLAY_URL}`,
    `iPhone ou web: ${JNC_IOS_HUB_URL}`,
    '',
    `Se preferir não aparecer no guia, me responda REMOVER que eu retiro sem problema.`,
  ].join('\n');
};

export const buildListingInviteWhatsAppUrl = (phone: string, message: string) => {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  if (!normalizedPhone) return '';
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};
