// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bed, Buildings, ChartBar, ChatCircleText, CheckCircle, ClockCountdown, Compass, CopySimple, Cpu, Eye, EyeSlash, ImageSquare, LinkSimpleHorizontal, MagnifyingGlass, MapTrifold, Megaphone, PaperPlaneTilt, PencilSimple, Plus, QrCode, ShieldCheck, Sparkle, Trash, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import { destinationService } from '../services/destinationService';
import { addressLookupService } from '../services/addressLookupService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { canUseNativeImagePicker, pickNativeImageAsDataUrl } from '../utils/nativeImagePicker';
import { BRAZIL_STATES, loadBrazilCitiesByState } from '../utils/brazilLocations';
import {
  buildHospitalityPlaceSmartQrUrl,
  buildHospitalityPlacePosterFileName,
  escapePosterHtml,
} from '../utils/destinationQrPoster';
import {
  buildHospitalityPlaceInviteMessage,
  buildHospitalityPlacePublicInviteUrl,
  buildListingInviteMessage,
  buildListingInviteWhatsAppUrl,
  buildListingPublicInviteUrl,
} from '../utils/destinationListingClaim';

const DESTINATION_GALLERY_SLOTS = 4;

const emptyDestinationGallerySlot = {
  id: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  imageFile: '',
  actionTarget: '',
  active: true,
  sortOrder: 0,
};

const createEmptyDestinationGallerySlots = () =>
  Array.from({ length: DESTINATION_GALLERY_SLOTS }, (_, index) => ({
    ...emptyDestinationGallerySlot,
    sortOrder: index,
  }));

const normalizeDestinationGallerySlots = (value: any, fallbackName = 'Destino') => {
  const slots = Array.isArray(value) ? [...value] : [];
  slots.sort((left: any, right: any) => Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0));
  return Array.from({ length: DESTINATION_GALLERY_SLOTS }, (_, index) => {
    const slot = slots[index] || {};
    return {
      ...emptyDestinationGallerySlot,
      id: String(slot.id || ''),
      title: String(slot.title || (slot.imageUrl || slot.imageFile ? `Foto ${index + 1} de ${fallbackName}` : '')),
      subtitle: String(slot.subtitle || ''),
      imageUrl: String(slot.imageUrl || slot.bannerUrl || ''),
      imageFile: String(slot.imageFile || ''),
      actionTarget: String(slot.actionTarget || ''),
      active: slot.active !== false,
      sortOrder: index,
    };
  });
};

const createEmptyDestinationForm = () => ({
  name: '',
  slug: '',
  city: '',
  state: 'SP',
  description: '',
  heroTitle: '',
  heroSubtitle: '',
  logoUrl: '',
  bannerUrl: '',
  logoFile: '',
  bannerFile: '',
  lat: '',
  lng: '',
  active: true,
  sortOrder: 0,
  gallery: createEmptyDestinationGallerySlots(),
});

const emptyPlace = {
  destinationId: '',
  name: '',
  slug: '',
  type: 'CHALE',
  description: '',
  zipCode: '',
  address: '',
  addressNumber: '',
  district: '',
  city: '',
  state: '',
  whatsapp: '',
  websiteUrl: '',
  instagramUrl: '',
  logoUrl: '',
  bannerUrl: '',
  bannerUrls: ['', '', '', ''],
  logoFile: '',
  bannerFile: '',
  bannerFiles: ['', '', '', ''],
  lat: '',
  lng: '',
  deliveryInstructions: '',
  active: true,
  sortOrder: 0,
};

const PLACE_BANNER_SLOTS = 4;

const normalizePlaceBannerSlots = (value: any) => {
  const slots = Array.isArray(value) ? value : [];
  return Array.from({ length: PLACE_BANNER_SLOTS }, (_, index) => String(slots[index] || '').trim());
};

const emptyListing = {
  destinationId: '',
  hospitalityPlaceId: '',
  hospitalityPlaceIds: [],
  hospitalityPlaceLinks: [],
  storeId: '',
  title: '',
  category: 'SERVICO',
  description: '',
  zipCode: '',
  address: '',
  addressNumber: '',
  district: '',
  city: '',
  state: '',
  lat: '',
  lng: '',
  whatsapp: '',
  websiteUrl: '',
  instagramUrl: '',
  imageUrl: '',
  imageFile: '',
  ctaType: 'WHATSAPP',
  ctaUrl: '',
  active: true,
  featured: false,
  sortOrder: 0,
};

const emptyStoreLink = {
  placeId: '',
  storeId: '',
  deliveryEnabled: true,
  pickupEnabled: false,
  deliveryFee: '',
  estimatedMinutes: '',
  notes: '',
  recommended: false,
};

const emptyPagination = {
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

const emptyCatalog = {
  metrics: { destinations: 0, places: 0, listings: 0, pending: 0 },
  states: [{ id: 'all', label: 'Todas UFs', count: 0 }],
  categories: [{ id: 'all', label: 'Todas categorias', count: 0 }],
  destinations: [],
  pagination: emptyPagination,
};

const imageFor = (item: any) =>
  resolveAssetUrl(item?.bannerUrl || item?.logoUrl || item?.imageUrl || '') ||
  getStoreAvatarUrl(item?.slug || item?.id, item?.name || item?.title);

const logoFor = (item: any) =>
  resolveAssetUrl(item?.logoUrl || item?.bannerUrl || item?.imageUrl || '') ||
  getStoreAvatarUrl(item?.slug || item?.id, item?.name || item?.title);

const normalizeListingPlaceIds = (placeIds: any, fallbackPlaceId?: any) => {
  const raw = Array.isArray(placeIds)
    ? placeIds
    : typeof placeIds === 'string'
      ? placeIds.split(',')
      : [];
  if (fallbackPlaceId) raw.push(fallbackPlaceId);
  return Array.from(new Set(raw.map((item: any) => String(item || '').trim()).filter(Boolean)));
};

const normalizeListingPlaceLinks = (placeLinks: any, placeIds: any, fallbackPlaceId?: any) => {
  const selectedIds = normalizeListingPlaceIds(placeIds, fallbackPlaceId);
  const links = new Map<string, { hospitalityPlaceId: string; sortOrder: number }>();
  (Array.isArray(placeLinks) ? placeLinks : []).forEach((link: any, index: number) => {
    const placeId = String(link?.hospitalityPlaceId || link?.placeId || link?.id || '').trim();
    if (!placeId || links.has(placeId)) return;
    const sortOrder = Number(link?.sortOrder ?? index);
    links.set(placeId, {
      hospitalityPlaceId: placeId,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
    });
  });
  return selectedIds.map((placeId, index) => ({
    hospitalityPlaceId: placeId,
    sortOrder: links.get(placeId)?.sortOrder ?? index,
  }));
};

const listingPlacesForDisplay = (listing: any, places: any[]) => {
  const ids = normalizeListingPlaceIds(listing?.hospitalityPlaceIds, listing?.hospitalityPlaceId);
  const knownPlaces = [
    ...(Array.isArray(listing?.hospitalityPlaces) ? listing.hospitalityPlaces : []),
    ...(listing?.hospitalityPlace ? [listing.hospitalityPlace] : []),
    ...(Array.isArray(places) ? places : []),
  ];
  const byId = new Map<string, any>();
  knownPlaces.filter(Boolean).forEach((place: any) => {
    const id = String(place?.id || '');
    if (id && !byId.has(id)) byId.set(id, place);
  });
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

const listingAppliesToPlace = (listing: any, placeId: string) => {
  const ids = normalizeListingPlaceIds(listing?.hospitalityPlaceIds, listing?.hospitalityPlaceId);
  return ids.length === 0 || ids.includes(String(placeId));
};

const listingLinkForPlace = (listing: any, placeId: string) => {
  const links = normalizeListingPlaceLinks(listing?.hospitalityPlaceLinks, listing?.hospitalityPlaceIds, listing?.hospitalityPlaceId);
  return links.find((link) => String(link.hospitalityPlaceId) === String(placeId)) || null;
};

const initialsFor = (value = '') =>
  String(value || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const formatCepBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const slugifyDestinationName = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const formatPhoneBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const requestTone = (status?: string) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (normalized === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (normalized === 'cancelled') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

const requestStatusLabel = (status?: string) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'approved') return 'Aprovada';
  if (normalized === 'rejected') return 'Recusada';
  if (normalized === 'cancelled') return 'Cancelada';
  return 'Pendente';
};

const isPendingRequest = (status?: string) => String(status || 'pending').toLowerCase() === 'pending';

const partnerTypeLabel = (request: any) => {
  const partnerType = String(request?.partnerType || '').toUpperCase();
  if (partnerType === 'SERVICE_PROVIDER') return labelForListingCategory(request?.category) || 'Serviço local';
  const placeType = String(request?.placeType || 'HOSPITALITY').toUpperCase();
  const labels: any = {
    CHALE: 'Chalé',
    POUSADA: 'Pousada',
    HOTEL: 'Hotel',
    CABANA: 'Cabana',
    CASA_TEMPORADA: 'Casa de temporada',
    OUTRO: 'Hospedagem',
  };
  return labels[placeType] || 'Hospedagem';
};

const isPartnerClaimRequest = (request: any) => Boolean(request?.claimedHospitalityPlaceId || request?.claimedListingId);
const partnerAccountStatus = (request: any) => String(request?.createdPartnerAccount?.status || '').toLowerCase();
const partnerAccessLabel = (request: any) => {
  if (String(request?.status || '').toLowerCase() !== 'approved') return '';
  const status = partnerAccountStatus(request);
  if (status === 'active') return 'Portal ativo';
  if (request?.createdPartnerAccountId) return 'Aguardando ativação';
  return 'Conta pendente';
};
const claimedResourceLabel = (request: any) => (
  request?.claimedHospitalityPlace?.name
  || request?.claimedListing?.title
  || request?.claimedHospitalityPlaceId
  || request?.claimedListingId
  || 'perfil existente'
);

const formatRequestDate = (value: any) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const statusPill = (active: any) =>
  active === false
    ? 'border-slate-200 bg-slate-100 text-slate-600'
    : 'border-emerald-100 bg-emerald-50 text-emerald-700';

const activeLabel = (active: any) => (active === false ? 'Inativo' : 'Ativo');

const labelForListingCategory = (value: any) => {
  const normalized = String(value || 'SERVICO').toUpperCase();
  const labels: any = {
    PASSEIO: 'Passeio',
    MASSAGEM: 'Massagem',
    RESTAURANTE_VISITAR: 'Restaurante',
    NOITE: 'Noite',
    ATRATIVO: 'Atrativo',
    SERVICO: 'Serviço',
  };
  return labels[normalized] || normalized.replace(/_/g, ' ');
};

const actionButtonClass = (tone = 'neutral') => {
  const tones: any = {
    neutral: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    primary: 'bg-[#153A4C] text-white shadow-[0_10px_24px_-18px_rgba(21,58,76,0.9)] hover:bg-[#1f4f67]',
    success: 'bg-emerald-600 text-white shadow-[0_10px_24px_-18px_rgba(5,150,105,0.9)] hover:bg-emerald-700',
    muted: 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200',
    amber: 'bg-amber-500 text-slate-950 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.9)] hover:bg-amber-400',
    danger: 'border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
  };
  return `inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone] || tones.neutral}`;
};

const toFormValue = (value: any) => (value === null || value === undefined ? '' : value);

const toBool = (value: any) => value === true || String(value).toLowerCase() === 'true';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_error'));
    reader.readAsDataURL(file);
  });

const compressImageFileToDataUrl = (file: File, maxEdge = 1600) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const width = Number(image.width || 0);
        const height = Number(image.height || 0);
        if (!width || !height) throw new Error('invalid_image');

        const ratio = Math.min(1, maxEdge / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * ratio));
        const targetHeight = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_error');
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

        let quality = 0.86;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1_200_000 && quality > 0.62) {
          quality -= 0.06;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image_load_error'));
    };
    image.src = objectUrl;
  });

const prepareImageUpload = async (file: File, maxEdge = 1600) => {
  if (!file.type.startsWith('image/')) throw new Error('invalid_file_type');
  if (file.type === 'image/gif') return readFileAsDataUrl(file);
  try {
    return await compressImageFileToDataUrl(file, maxEdge);
  } catch {
    return readFileAsDataUrl(file);
  }
};

const MediaUploadField = ({
  label,
  hint,
  urlValue,
  fileValue,
  onUrlChange,
  onFileChange,
  onError,
  maxEdge = 1600,
  previewMode = 'square',
}: any) => {
  const previewUrl = fileValue || resolveAssetUrl(urlValue || '') || '';
  const canUseNativePicker = canUseNativeImagePicker();
  const isWidePreview = previewMode === 'wide';

  const handleFile = async (event: any) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await prepareImageUpload(file, maxEdge);
      onFileChange(dataUrl);
      onUrlChange('');
    } catch {
      onError?.('Não foi possível carregar a imagem selecionada.');
    }
  };

  const handleNativePicker = async () => {
    try {
      const dataUrl = await pickNativeImageAsDataUrl({
        quality: maxEdge > 1600 ? 78 : 82,
        promptLabelHeader: label,
      });
      if (!dataUrl) return;
      onFileChange(dataUrl);
      onUrlChange('');
    } catch {
      onError?.('Não foi possível abrir a câmera ou galeria agora.');
    }
  };

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-3 sm:col-span-2">
      <div className={`grid gap-3 ${isWidePreview ? '' : 'sm:grid-cols-[112px_1fr]'}`}>
        <div className={`flex min-w-0 max-w-full items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 ${isWidePreview ? 'aspect-video w-full' : 'h-28'}`}>
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full max-w-full object-cover" />
          ) : (
            <ImageSquare size={34} weight="duotone" className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-950">{label}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{hint}</p>
            </div>
            {fileValue ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                Upload pronto
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canUseNativePicker ? (
              <button type="button" onClick={handleNativePicker} className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#153A4C] px-3 py-2 text-left text-[11px] font-black uppercase leading-tight tracking-[0.1em] text-white">
                <UploadSimple size={14} weight="bold" />
                <span className="min-w-0">Tirar ou escolher foto</span>
              </button>
            ) : (
              <label className="relative inline-flex max-w-full cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-[#153A4C] px-3 py-2 text-left text-[11px] font-black uppercase leading-tight tracking-[0.1em] text-white">
                <UploadSimple size={14} weight="bold" />
                <span className="min-w-0">Escolher foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFile}
                />
              </label>
            )}
            {(fileValue || urlValue) ? (
              <button type="button" onClick={() => { onFileChange(''); onUrlChange(''); }} className="max-w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-black uppercase leading-tight tracking-[0.1em] text-slate-600">
                Limpar
              </button>
            ) : null}
          </div>
          <label className="mt-3 flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <LinkSimpleHorizontal size={16} weight="bold" className="text-slate-400" />
            <input
              value={urlValue || ''}
              onChange={(event) => {
                onUrlChange(event.target.value);
                if (event.target.value) onFileChange('');
              }}
              placeholder="Ou cole uma URL pública da imagem"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

const DestinationAddressFields = ({
  value,
  update,
  loading,
  error,
  title,
  hint,
}: any) => {
  const hasCoordinates = Boolean(String(value?.lat || '').trim() && String(value?.lng || '').trim());

  return (
    <div className="sm:col-span-2 rounded-[1.5rem] border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{title || 'Endereço'}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {hint || 'Digite o CEP para preencher automaticamente. Se não encontrar, preencha manualmente.'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${hasCoordinates ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {hasCoordinates ? 'Coordenada salva' : 'Coordenada ao salvar'}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_120px]">
        <div>
          <input value={value.zipCode || ''} onChange={(event) => update('zipCode', formatCepBr(event.target.value))} placeholder="CEP" inputMode="numeric" autoComplete="postal-code" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
          {loading ? <p className="mt-1 px-1 text-[11px] font-bold text-[#336886]">Buscando endereço...</p> : null}
          {error ? <p className="mt-1 px-1 text-[11px] font-bold text-rose-600">{error}</p> : null}
        </div>
        <input value={value.address || ''} onChange={(event) => update('address', event.target.value)} placeholder="Rua, estrada ou local" autoComplete="address-line1" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
        <input value={value.addressNumber || ''} onChange={(event) => update('addressNumber', event.target.value)} placeholder="Número" autoComplete="address-line2" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
        <input value={value.district || ''} onChange={(event) => update('district', event.target.value)} placeholder="Bairro / região" autoComplete="address-level3" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
        <input value={value.city || ''} onChange={(event) => update('city', event.target.value)} placeholder="Cidade" autoComplete="address-level2" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
        <input value={value.state || ''} onChange={(event) => update('state', event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} placeholder="UF" autoComplete="address-level1" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
      </div>
      <p className="mt-2 px-1 text-[11px] font-semibold text-slate-500">
        Latitude/longitude ficam ocultas para o cliente e são usadas só para mapa, Waze e Google Maps.
      </p>
    </div>
  );
};

export function SuperAdminDestinations() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ destinations: [], places: [], listings: [], partnerRequests: [], storeRequests: [], stores: [] });
  const [catalog, setCatalog] = useState<any>(emptyCatalog);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [placesPage, setPlacesPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const [placesResult, setPlacesResult] = useState<any>({ items: [], pagination: { ...emptyPagination, pageSize: 10 } });
  const [listingsResult, setListingsResult] = useState<any>({ items: [], pagination: { ...emptyPagination, pageSize: 10 } });
  const [destinationBannersResult, setDestinationBannersResult] = useState<any>({ items: [] });
  const [detailLoading, setDetailLoading] = useState(false);
  const [destinationForm, setDestinationForm] = useState(createEmptyDestinationForm());
  const [placeForm, setPlaceForm] = useState(emptyPlace);
  const [listingForm, setListingForm] = useState(emptyListing);
  const [storeLinkForm, setStoreLinkForm] = useState(emptyStoreLink);
  const [editingDestinationId, setEditingDestinationId] = useState('');
  const [editingPlaceId, setEditingPlaceId] = useState('');
  const [editingListingId, setEditingListingId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cadastroMode, setCadastroMode] = useState<'destination' | 'place' | 'listing' | 'storeLink'>('destination');
  const [placeEditSection, setPlaceEditSection] = useState<'details' | 'services'>('details');
  const [placeListingSearch, setPlaceListingSearch] = useState('');
  const [placeListingsLoading, setPlaceListingsLoading] = useState(false);
  const [placeListings, setPlaceListings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [contentFilter, setContentFilter] = useState<'all' | 'destinations' | 'places' | 'listings'>('all');
  const [listingCategoryFilter, setListingCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [destinationCityOptions, setDestinationCityOptions] = useState<string[]>([]);
  const [destinationCitiesLoading, setDestinationCitiesLoading] = useState(false);
  const [destinationCitiesError, setDestinationCitiesError] = useState('');
  const [destinationZipCode, setDestinationZipCode] = useState('');
  const [destinationZipLookupLoading, setDestinationZipLookupLoading] = useState(false);
  const [destinationZipLookupError, setDestinationZipLookupError] = useState('');
  const [placeZipLookupLoading, setPlaceZipLookupLoading] = useState(false);
  const [placeZipLookupError, setPlaceZipLookupError] = useState('');
  const [listingZipLookupLoading, setListingZipLookupLoading] = useState(false);
  const [listingZipLookupError, setListingZipLookupError] = useState('');
  const [inviteListing, setInviteListing] = useState<any | null>(null);
  const [invitePlace, setInvitePlace] = useState<any | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState('');
  const [inviteBatchLoading, setInviteBatchLoading] = useState('');
  const [partnerInviteLinks, setPartnerInviteLinks] = useState<Record<string, string>>({});

  const load = async () => {
    if (!localStorage.getItem('superAdminToken')) {
      navigate('/superadmin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await destinationService.adminOverview({ lite: true });
      setData(payload || {});
      const firstDestination = payload?.destinations?.[0]?.id || '';
      const firstPlace = payload?.places?.[0]?.id || '';
      const firstStore = payload?.stores?.[0]?.id || '';
      setPlaceForm((current) => ({ ...current, destinationId: current.destinationId || firstDestination }));
      setListingForm((current) => ({ ...current, destinationId: current.destinationId || firstDestination }));
      setStoreLinkForm((current) => ({ ...current, placeId: current.placeId || firstPlace, storeId: current.storeId || firstStore }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar destinos.');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async (page = catalogPage) => {
    if (!localStorage.getItem('superAdminToken')) return;
    setCatalogLoading(true);
    try {
      const payload = await destinationService.adminCatalogSummary({
        page,
        pageSize: 12,
        search,
        state: stateFilter,
        status: statusFilter,
        contentType: contentFilter,
        listingCategory: listingCategoryFilter,
      });
      const nextCatalog = payload || emptyCatalog;
      setCatalog(nextCatalog);
      setCatalogPage(nextCatalog.pagination?.page || page);
      setSelectedDestinationId((current) => {
        const rows = nextCatalog.destinations || [];
        if (rows.some((destination: any) => String(destination.id) === String(current))) return current;
        return rows[0]?.id || '';
      });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar catálogo paginado.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadDestinationDetails = async (destinationId = selectedDestinationId, nextPlacesPage = placesPage, nextListingsPage = listingsPage) => {
    if (!destinationId) {
      setPlacesResult({ items: [], pagination: { ...emptyPagination, pageSize: 10 } });
      setListingsResult({ items: [], pagination: { ...emptyPagination, pageSize: 10 } });
      setDestinationBannersResult({ items: [] });
      return;
    }
    setDetailLoading(true);
    try {
      const [placesPayload, listingsPayload, bannersPayload] = await Promise.all([
        destinationService.adminDestinationPlaces(destinationId, {
          page: nextPlacesPage,
          pageSize: 10,
          search: detailSearch,
          status: statusFilter,
        }),
        destinationService.adminDestinationListings(destinationId, {
          page: nextListingsPage,
          pageSize: 10,
          search: detailSearch,
          status: statusFilter,
          listingCategory: listingCategoryFilter,
        }),
        destinationService.adminDestinationBanners(destinationId),
      ]);
      setPlacesResult(placesPayload || { items: [], pagination: { ...emptyPagination, pageSize: 10 } });
      setListingsResult(listingsPayload || { items: [], pagination: { ...emptyPagination, pageSize: 10 } });
      setDestinationBannersResult(bannersPayload || { items: [] });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar detalhes da cidade.');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadPlaceListings = async (destinationId: string, query = placeListingSearch) => {
    if (!destinationId) {
      setPlaceListings([]);
      return;
    }
    setPlaceListingsLoading(true);
    try {
      const payload = await destinationService.adminDestinationListings(destinationId, {
        page: 1,
        pageSize: 50,
        search: query,
        status: 'all',
        listingCategory: 'all',
      });
      setPlaceListings(payload?.items || []);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar serviços da hospedagem.');
    } finally {
      setPlaceListingsLoading(false);
    }
  };

  const refreshAdminData = async (destinationId = selectedDestinationId) => {
    await Promise.all([
      load(),
      loadCatalog(catalogPage),
      destinationId ? loadDestinationDetails(destinationId, placesPage, listingsPage) : Promise.resolve(),
    ]);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCatalogPage(1);
  }, [search, stateFilter, statusFilter, contentFilter, listingCategoryFilter]);

  useEffect(() => {
    loadCatalog(catalogPage);
  }, [catalogPage, search, stateFilter, statusFilter, contentFilter, listingCategoryFilter]);

  useEffect(() => {
    setPlacesPage(1);
    setListingsPage(1);
  }, [selectedDestinationId, detailSearch, statusFilter, listingCategoryFilter]);

  useEffect(() => {
    loadDestinationDetails(selectedDestinationId, placesPage, listingsPage);
  }, [selectedDestinationId, placesPage, listingsPage, detailSearch, statusFilter, listingCategoryFilter]);

  useEffect(() => {
    const uf = String(destinationForm.state || '').toUpperCase().slice(0, 2);
    if (!uf) {
      setDestinationCityOptions([]);
      setDestinationCitiesError('');
      return;
    }

    let active = true;
    setDestinationCitiesLoading(true);
    setDestinationCitiesError('');
    loadBrazilCitiesByState(uf)
      .then((cities) => {
        if (!active) return;
        setDestinationCityOptions(cities);
        if (!cities.length) setDestinationCitiesError('Não encontramos cidades ou distritos oficiais para esta UF agora.');
      })
      .catch(() => {
        if (active) {
          setDestinationCityOptions([]);
          setDestinationCitiesError('Não conseguimos carregar as cidades e distritos desta UF agora.');
        }
      })
      .finally(() => {
        if (active) setDestinationCitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [destinationForm.state]);

  useEffect(() => {
    const cleanedCep = String(destinationZipCode || '').replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      setDestinationZipLookupError('');
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setDestinationZipLookupLoading(true);
      setDestinationZipLookupError('');
      try {
        const response = await fetch(`https://cep.awesomeapi.com.br/json/${cleanedCep}`);
        if (!response.ok) throw new Error('cep_lookup_failed');
        const data = await response.json();
        if (!active) return;
        const lat = String(data?.lat || '').trim();
        const lng = String(data?.lng || '').trim();
        if (!lat || !lng) throw new Error('missing_coordinates');
        const city = String(data?.city || '').trim();
        const state = String(data?.state || '').toUpperCase().slice(0, 2);
        setDestinationForm((current) => ({
          ...current,
          ...(state ? { state } : {}),
          ...(city ? { city, name: city, slug: slugifyDestinationName(city) } : {}),
          lat,
          lng,
        }));
      } catch {
        if (active) setDestinationZipLookupError('Não conseguimos buscar as coordenadas deste CEP.');
      } finally {
        if (active) setDestinationZipLookupLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [destinationZipCode]);

  useEffect(() => {
    const cleanedCep = String(placeForm.zipCode || '').replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      setPlaceZipLookupError('');
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setPlaceZipLookupLoading(true);
      setPlaceZipLookupError('');
      try {
        const addressData = await addressLookupService.lookupZipCode(cleanedCep);
        if (!active || !addressData) return;
        setPlaceForm((current) => ({
          ...current,
          zipCode: formatCepBr(cleanedCep),
          address: String(addressData?.street || current.address || ''),
          district: String(addressData?.district || current.district || ''),
          city: String(addressData?.city || current.city || ''),
          state: String(addressData?.state || current.state || '').toUpperCase().slice(0, 2),
          lat: current.lat || (addressData?.latitude != null ? String(addressData.latitude) : ''),
          lng: current.lng || (addressData?.longitude != null ? String(addressData.longitude) : ''),
        }));
      } catch {
        if (active) setPlaceZipLookupError('CEP não encontrado. Preencha manualmente.');
      } finally {
        if (active) setPlaceZipLookupLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [placeForm.zipCode]);

  useEffect(() => {
    const cleanedCep = String(listingForm.zipCode || '').replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      setListingZipLookupError('');
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setListingZipLookupLoading(true);
      setListingZipLookupError('');
      try {
        const addressData = await addressLookupService.lookupZipCode(cleanedCep);
        if (!active || !addressData) return;
        setListingForm((current) => ({
          ...current,
          zipCode: formatCepBr(cleanedCep),
          address: String(addressData?.street || current.address || ''),
          district: String(addressData?.district || current.district || ''),
          city: String(addressData?.city || current.city || ''),
          state: String(addressData?.state || current.state || '').toUpperCase().slice(0, 2),
          lat: current.lat || (addressData?.latitude != null ? String(addressData.latitude) : ''),
          lng: current.lng || (addressData?.longitude != null ? String(addressData.longitude) : ''),
        }));
      } catch {
        if (active) setListingZipLookupError('CEP não encontrado. Preencha manualmente.');
      } finally {
        if (active) setListingZipLookupLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [listingForm.zipCode]);

  const metrics = useMemo(() => {
    if (catalog?.metrics) return catalog.metrics;
    const pendingPartner = (data.partnerRequests || []).filter((request: any) => String(request.status || 'pending') === 'pending').length;
    const pendingStores = (data.storeRequests || []).filter((request: any) => String(request.status || 'pending') === 'pending').length;
    return {
      destinations: (data.destinations || []).length,
      places: (data.places || []).length,
      listings: (data.listings || []).length,
      pending: pendingPartner + pendingStores,
    };
  }, [catalog?.metrics, data]);

  const partnerOnboardingMetrics = useMemo(() => {
    const partnerRequests = data.partnerRequests || [];
    const approved = partnerRequests.filter((request: any) => String(request.status || '').toLowerCase() === 'approved');
    return {
      pending: partnerRequests.filter((request: any) => isPendingRequest(request.status)).length,
      claimPending: partnerRequests.filter((request: any) => isPendingRequest(request.status) && isPartnerClaimRequest(request)).length,
      invited: approved.filter((request: any) => request.createdPartnerAccountId && partnerAccountStatus(request) !== 'active').length,
      active: approved.filter((request: any) => partnerAccountStatus(request) === 'active').length,
    };
  }, [data.partnerRequests]);

  const requestBoard = useMemo(() => {
    const destinationById = new Map<string, any>();
    const placeById = new Map<string, any>();
    (data.destinations || []).forEach((destination: any) => {
      if (destination?.id) destinationById.set(String(destination.id), destination);
    });
    (data.places || []).forEach((place: any) => {
      if (place?.id) placeById.set(String(place.id), place);
    });

    const groups = new Map<string, any>();
    const ensureGroup = (key: string, fallback: any = {}) => {
      const normalizedKey = key || 'sem-destino';
      if (!groups.has(normalizedKey)) {
        groups.set(normalizedKey, {
          id: normalizedKey,
          name: fallback.name || fallback.destinationName || 'Destino não informado',
          city: fallback.city || '',
          state: fallback.state || '',
          partnerHospitality: [],
          partnerServices: [],
          storeRequests: [],
        });
      }
      return groups.get(normalizedKey);
    };

    (data.partnerRequests || []).forEach((request: any) => {
      const destination = request.destination || destinationById.get(String(request.destinationId || '')) || {};
      const key = String(destination.id || request.destinationId || destination.name || request.destinationName || request.city || 'sem-destino');
      const group = ensureGroup(key, {
        name: destination.name || request.destinationName || request.city || 'Destino não informado',
        city: destination.city || request.city || '',
        state: destination.state || request.state || '',
      });
      if (String(request.partnerType || '').toUpperCase() === 'SERVICE_PROVIDER') {
        group.partnerServices.push(request);
      } else {
        group.partnerHospitality.push(request);
      }
    });

    (data.storeRequests || []).forEach((request: any) => {
      const place = request.hospitalityPlace || placeById.get(String(request.hospitalityPlaceId || '')) || {};
      const destination = request.destination || place.destination || destinationById.get(String(request.destinationId || place.destinationId || '')) || {};
      const key = String(destination.id || request.destinationId || place.destinationId || destination.name || request.destinationName || place.destination?.name || 'sem-destino');
      const group = ensureGroup(key, {
        name: destination.name || request.destinationName || place.destination?.name || 'Destino não informado',
        city: destination.city || request.city || '',
        state: destination.state || request.state || '',
      });
      group.storeRequests.push({ ...request, hospitalityPlace: request.hospitalityPlace || place });
    });

    const sortRequests = (items: any[]) => [...items].sort((left, right) => {
      const leftPending = isPendingRequest(left.status) ? 0 : 1;
      const rightPending = isPendingRequest(right.status) ? 0 : 1;
      if (leftPending !== rightPending) return leftPending - rightPending;
      return new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime();
    });

    return Array.from(groups.values())
      .map((group) => {
        const partnerHospitality = sortRequests(group.partnerHospitality);
        const partnerServices = sortRequests(group.partnerServices);
        const storeRequests = sortRequests(group.storeRequests);
        const all = [...partnerHospitality, ...partnerServices, ...storeRequests];
        return {
          ...group,
          partnerHospitality,
          partnerServices,
          storeRequests,
          total: all.length,
          pending: all.filter((request) => isPendingRequest(request.status)).length,
        };
      })
      .filter((group) => group.total > 0)
      .sort((left, right) => {
        if (right.pending !== left.pending) return right.pending - left.pending;
        return String(left.name).localeCompare(String(right.name), 'pt-BR');
      });
  }, [data.destinations, data.partnerRequests, data.places, data.storeRequests]);

  const stateOptions = useMemo(() => {
    if (Array.isArray(catalog?.states) && catalog.states.length) return catalog.states;
    const counts = new Map<string, number>();
    (data.destinations || []).forEach((destination: any) => {
      const state = String(destination.state || 'UF').toUpperCase().slice(0, 2);
      counts.set(state, (counts.get(state) || 0) + 1);
    });
    return [
      { id: 'all', label: 'Todas UFs', count: (data.destinations || []).length },
      ...Array.from(counts.entries())
        .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
        .map(([state, count]) => ({ id: state, label: state, count })),
    ];
  }, [catalog?.states, data.destinations]);

  const contentFilterOptions = useMemo(() => [
    { id: 'all', label: 'Tudo', count: metrics.destinations + metrics.places + metrics.listings, icon: Compass },
    { id: 'destinations', label: 'Cidades', count: metrics.destinations, icon: MapTrifold },
    { id: 'places', label: 'Hospedagens', count: metrics.places, icon: Bed },
    { id: 'listings', label: 'Serviços e lugares', count: metrics.listings, icon: Sparkle },
  ], [metrics]);

  const listingCategoryOptions = useMemo(() => {
    if (Array.isArray(catalog?.categories) && catalog.categories.length) {
      return catalog.categories.map((option: any) => ({
        ...option,
        label: option.id === 'all' ? 'Todas categorias' : labelForListingCategory(option.id),
      }));
    }
    return [{ id: 'all', label: 'Todas categorias', count: metrics.listings }];
  }, [catalog?.categories, metrics.listings]);

  const destinationCitySelectOptions = useMemo(() => {
    const currentCity = String(destinationForm.city || '').trim();
    if (!currentCity || destinationCityOptions.includes(currentCity)) return destinationCityOptions;
    return [currentCity, ...destinationCityOptions];
  }, [destinationCityOptions, destinationForm.city]);

  const updateDestination = (key: string, value: any) => setDestinationForm((current) => ({ ...current, [key]: value }));
  const selectDestinationState = (value: string) => {
    const state = String(value || '').toUpperCase().slice(0, 2);
    setDestinationForm((current) => ({
      ...current,
      state,
      city: '',
      name: '',
      slug: '',
    }));
  };
  const selectDestinationCity = (value: string) => {
    const city = String(value || '').trim();
    setDestinationForm((current) => ({
      ...current,
      city,
      name: city,
      slug: slugifyDestinationName(city),
    }));
  };
  const updatePlace = (key: string, value: any) => setPlaceForm((current) => ({ ...current, [key]: value }));
  const updateListing = (key: string, value: any) => setListingForm((current) => ({ ...current, [key]: value }));
  const updateStoreLink = (key: string, value: any) => setStoreLinkForm((current) => ({ ...current, [key]: value }));

  const listingDestinationPlaces = useMemo(
    () => (data.places || []).filter((place: any) => !listingForm.destinationId || place.destinationId === listingForm.destinationId),
    [data.places, listingForm.destinationId]
  );

  const selectedListingPlaceIds = useMemo(
    () => normalizeListingPlaceIds(listingForm.hospitalityPlaceIds, listingForm.hospitalityPlaceId),
    [listingForm.hospitalityPlaceIds, listingForm.hospitalityPlaceId]
  );

  const selectedListingPlaceLinks = useMemo(
    () => normalizeListingPlaceLinks(listingForm.hospitalityPlaceLinks, selectedListingPlaceIds),
    [listingForm.hospitalityPlaceLinks, selectedListingPlaceIds]
  );

  const placeServiceRows = useMemo(() => {
    const placeId = String(editingPlaceId || '');
    if (!placeId) return [];
    return (placeListings || [])
      .filter((listing: any) => listingAppliesToPlace(listing, placeId))
      .sort((left: any, right: any) => {
        const leftLink = listingLinkForPlace(left, placeId);
        const rightLink = listingLinkForPlace(right, placeId);
        const featuredDiff = Number(right.featured === true) - Number(left.featured === true);
        if (featuredDiff !== 0) return featuredDiff;
        const placeSortDiff = Number(leftLink?.sortOrder ?? left.sortOrder ?? 0) - Number(rightLink?.sortOrder ?? right.sortOrder ?? 0);
        if (placeSortDiff !== 0) return placeSortDiff;
        return String(left.title || '').localeCompare(String(right.title || ''), 'pt-BR');
      });
  }, [editingPlaceId, placeListings]);

  const placeAvailableListingRows = useMemo(() => {
    const placeId = String(editingPlaceId || '');
    if (!placeId) return [];
    return (placeListings || [])
      .filter((listing: any) => !listingAppliesToPlace(listing, placeId))
      .slice(0, 12);
  }, [editingPlaceId, placeListings]);

  const updateListingDestination = (destinationId: string) => {
    const allowedPlaceIds = new Set((data.places || [])
      .filter((place: any) => !destinationId || place.destinationId === destinationId)
      .map((place: any) => String(place.id)));
    setListingForm((current) => {
      const nextPlaceIds = normalizeListingPlaceIds(current.hospitalityPlaceIds, current.hospitalityPlaceId)
        .filter((placeId) => allowedPlaceIds.has(placeId));
      const nextPlaceLinks = normalizeListingPlaceLinks(current.hospitalityPlaceLinks, current.hospitalityPlaceIds, current.hospitalityPlaceId)
        .filter((link) => allowedPlaceIds.has(link.hospitalityPlaceId));
      return {
        ...current,
        destinationId,
        hospitalityPlaceIds: nextPlaceIds,
        hospitalityPlaceId: nextPlaceIds[0] || '',
        hospitalityPlaceLinks: nextPlaceLinks,
      };
    });
  };

  const setListingPlaceIds = (placeIds: string[]) => {
    const nextPlaceIds = normalizeListingPlaceIds(placeIds);
    setListingForm((current) => {
      const currentLinks = normalizeListingPlaceLinks(current.hospitalityPlaceLinks, current.hospitalityPlaceIds, current.hospitalityPlaceId);
      const currentLinksByPlace = new Map(currentLinks.map((link) => [link.hospitalityPlaceId, link]));
      const nextPlaceLinks = nextPlaceIds.map((placeId, index) => ({
        hospitalityPlaceId: placeId,
        sortOrder: currentLinksByPlace.get(placeId)?.sortOrder ?? index,
      }));
      return {
        ...current,
        hospitalityPlaceIds: nextPlaceIds,
        hospitalityPlaceId: nextPlaceIds[0] || '',
        hospitalityPlaceLinks: nextPlaceLinks,
      };
    });
  };

  const toggleListingPlace = (placeId: string) => {
    const currentIds = normalizeListingPlaceIds(listingForm.hospitalityPlaceIds, listingForm.hospitalityPlaceId);
    const nextIds = currentIds.includes(placeId)
      ? currentIds.filter((id) => id !== placeId)
      : [ ...currentIds, placeId ];
    setListingPlaceIds(nextIds);
  };

  const updateListingPlaceSortOrder = (placeId: string, value: any) => {
    setListingForm((current) => {
      const selectedIds = normalizeListingPlaceIds(current.hospitalityPlaceIds, current.hospitalityPlaceId);
      const currentLinks = normalizeListingPlaceLinks(current.hospitalityPlaceLinks, selectedIds);
      const currentLinksByPlace = new Map(currentLinks.map((link) => [link.hospitalityPlaceId, link]));
      const sortOrder = Number(value);
      return {
        ...current,
        hospitalityPlaceLinks: selectedIds.map((id, index) => ({
          hospitalityPlaceId: id,
          sortOrder: id === placeId
            ? (Number.isFinite(sortOrder) ? sortOrder : 0)
            : (currentLinksByPlace.get(id)?.sortOrder ?? index),
        })),
      };
    });
  };

  const updateDestinationGallerySlot = (index: number, patch: any) => {
    setDestinationForm((current: any) => {
      const gallery = normalizeDestinationGallerySlots(current.gallery, current.name || 'Destino');
      gallery[index] = { ...gallery[index], ...patch, sortOrder: index };
      const firstSlot = gallery[0] || {};
      return {
        ...current,
        gallery,
        bannerUrl: firstSlot.imageUrl || '',
        bannerFile: firstSlot.imageFile || '',
      };
    });
  };

  const updatePlaceBannerUrl = (index: number, value: string) => {
    setPlaceForm((current) => {
      const bannerUrls = normalizePlaceBannerSlots(current.bannerUrls);
      const bannerFiles = normalizePlaceBannerSlots(current.bannerFiles);
      bannerUrls[index] = value;
      if (value) bannerFiles[index] = '';
      return {
        ...current,
        bannerUrls,
        bannerFiles,
        bannerUrl: bannerUrls[0] || '',
        bannerFile: '',
      };
    });
  };

  const updatePlaceBannerFile = (index: number, value: string) => {
    setPlaceForm((current) => {
      const bannerUrls = normalizePlaceBannerSlots(current.bannerUrls);
      const bannerFiles = normalizePlaceBannerSlots(current.bannerFiles);
      bannerFiles[index] = value;
      if (value) bannerUrls[index] = '';
      return {
        ...current,
        bannerUrls,
        bannerFiles,
        bannerUrl: bannerUrls[0] || '',
        bannerFile: '',
      };
    });
  };

  const startDestinationEdit = async (destination: any) => {
    let loadedBanners = String(destinationBannersResult?.destination?.id || '') === String(destination.id)
      ? destinationBannersResult.items
      : destination.banners;
    if ((!Array.isArray(loadedBanners) || !loadedBanners.length) && destination?.id) {
      try {
        const bannersPayload = await destinationService.adminDestinationBanners(destination.id);
        loadedBanners = bannersPayload?.items || [];
        setDestinationBannersResult(bannersPayload || { items: [] });
      } catch {
        loadedBanners = [];
      }
    }
    const gallerySource = Array.isArray(loadedBanners) && loadedBanners.length
      ? loadedBanners
      : destination.bannerUrl
        ? [{
            title: destination.heroTitle || destination.name,
            subtitle: destination.heroSubtitle || '',
            imageUrl: destination.bannerUrl,
            actionTarget: '',
            active: true,
            sortOrder: 0,
          }]
        : [];
    setEditingDestinationId(destination.id);
    setEditingPlaceId('');
    setEditingListingId('');
    setCadastroMode('destination');
    setDestinationZipCode('');
    setDestinationZipLookupError('');
    setDestinationForm({
      ...createEmptyDestinationForm(),
      ...Object.fromEntries(Object.entries(destination).map(([key, value]) => [key, toFormValue(value)])),
      state: String(destination.state || 'SP').toUpperCase().slice(0, 2),
      logoFile: '',
      bannerFile: '',
      gallery: normalizeDestinationGallerySlots(gallerySource, destination.name || 'Destino'),
      active: destination.active !== false,
      sortOrder: Number(destination.sortOrder || 0),
    });
    setActiveTab('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startPlaceEdit = (place: any) => {
    setEditingDestinationId('');
    setEditingPlaceId(place.id);
    setEditingListingId('');
    setCadastroMode('place');
    setPlaceEditSection('details');
    setPlaceListingSearch('');
    setPlaceListings([]);
    setPlaceForm({
      ...emptyPlace,
      ...Object.fromEntries(Object.entries(place).map(([key, value]) => [key, toFormValue(value)])),
      destinationId: place.destinationId || place.destination?.id || '',
      zipCode: formatCepBr(place.zipCode || ''),
      state: String(place.state || place.destination?.state || '').toUpperCase().slice(0, 2),
      bannerUrl: place.bannerUrl || place.bannerUrls?.[0] || '',
      bannerUrls: normalizePlaceBannerSlots(place.bannerUrls?.length ? place.bannerUrls : [place.bannerUrl]),
      bannerFiles: normalizePlaceBannerSlots([]),
      bannerFile: '',
      active: place.active !== false,
      sortOrder: Number(place.sortOrder || 0),
    });
    loadPlaceListings(place.destinationId || place.destination?.id || selectedDestinationId, '');
    setActiveTab('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startListingEdit = (listing: any) => {
    const hospitalityPlaceIds = normalizeListingPlaceIds(listing.hospitalityPlaceIds, listing.hospitalityPlaceId);
    const hospitalityPlaceLinks = normalizeListingPlaceLinks(listing.hospitalityPlaceLinks, hospitalityPlaceIds);
    setEditingDestinationId('');
    setEditingPlaceId('');
    setEditingListingId(listing.id);
    setCadastroMode('listing');
    setListingForm({
      ...emptyListing,
      ...Object.fromEntries(Object.entries(listing).map(([key, value]) => [key, toFormValue(value)])),
      destinationId: listing.destinationId || listing.destination?.id || '',
      hospitalityPlaceId: hospitalityPlaceIds[0] || '',
      hospitalityPlaceIds,
      hospitalityPlaceLinks,
      storeId: listing.storeId || listing.store?.id || '',
      zipCode: formatCepBr(listing.zipCode || ''),
      state: String(listing.state || listing.destination?.state || '').toUpperCase().slice(0, 2),
      active: listing.active !== false,
      featured: listing.featured === true,
      sortOrder: Number(listing.sortOrder || 0),
    });
    setActiveTab('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelDestinationEdit = () => {
    setEditingDestinationId('');
    setDestinationZipCode('');
    setDestinationZipLookupError('');
    setDestinationForm(createEmptyDestinationForm());
    setActiveTab('dashboard');
  };

  const cancelPlaceEdit = () => {
    setEditingPlaceId('');
    setPlaceEditSection('details');
    setPlaceListingSearch('');
    setPlaceListings([]);
    setPlaceForm((current) => ({ ...emptyPlace, destinationId: current.destinationId }));
    setActiveTab('dashboard');
  };

  const cancelListingEdit = () => {
    setEditingListingId('');
    setListingForm((current) => ({ ...emptyListing, destinationId: current.destinationId }));
    setActiveTab('dashboard');
  };

  const returnToDashboardFromCadastro = () => {
    if (editingDestinationId) return cancelDestinationEdit();
    if (editingPlaceId) return cancelPlaceEdit();
    if (editingListingId) return cancelListingEdit();
    setActiveTab('dashboard');
  };

  const syncDestinationGallery = async (destination: any, rawSlots: any[]) => {
    const destinationId = destination?.id || editingDestinationId;
    if (!destinationId) return;
    const slots = normalizeDestinationGallerySlots(rawSlots, destination?.name || destinationForm.name || 'Destino');
    await Promise.all(slots.map((slot: any, index: number) => {
      const hasImage = Boolean(String(slot.imageUrl || slot.imageFile || '').trim());
      if (!slot.id && !hasImage) return Promise.resolve(null);
      const payload = {
        destinationId,
        title: slot.title || `Foto ${index + 1} de ${destination?.name || destinationForm.name || 'destino'}`,
        subtitle: slot.subtitle || '',
        imageUrl: slot.imageUrl || '',
        imageFile: slot.imageFile || '',
        actionType: slot.actionTarget ? 'EXTERNAL_URL' : '',
        actionTarget: slot.actionTarget || '',
        sortOrder: index,
        active: hasImage && slot.active !== false,
      };
      return slot.id
        ? destinationService.adminUpdateBanner(slot.id, payload)
        : destinationService.adminCreateBanner(payload);
    }));
  };

  const saveDestination = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const wasEditing = Boolean(editingDestinationId);
      const gallerySlots = normalizeDestinationGallerySlots(destinationForm.gallery, destinationForm.name || 'Destino');
      const coverSlot = gallerySlots.find((slot: any) => String(slot.imageUrl || slot.imageFile || '').trim()) || gallerySlots[0] || {};
      const { gallery, ...destinationFields } = destinationForm as any;
      const payload = {
        ...destinationFields,
        bannerUrl: coverSlot.imageUrl || '',
        bannerFile: coverSlot.imageFile || '',
        active: toBool(destinationForm.active),
      };
      let savedDestination: any = null;
      if (editingDestinationId) {
        savedDestination = await destinationService.adminUpdateDestination(editingDestinationId, payload);
      } else {
        savedDestination = await destinationService.adminCreateDestination(payload);
      }
      const syncedSlots = gallerySlots.map((slot: any) =>
        slot.imageFile && savedDestination?.bannerUrl && slot.sortOrder === coverSlot.sortOrder
          ? { ...slot, imageFile: '', imageUrl: savedDestination.bannerUrl }
          : slot
      );
      await syncDestinationGallery(savedDestination, syncedSlots);
      setEditingDestinationId('');
      setDestinationZipCode('');
      setDestinationZipLookupError('');
      setDestinationForm(createEmptyDestinationForm());
      setSelectedDestinationId(savedDestination?.id || editingDestinationId || selectedDestinationId);
      await refreshAdminData(savedDestination?.id || editingDestinationId || selectedDestinationId);
      if (wasEditing) setActiveTab('dashboard');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar destino.');
    } finally {
      setSaving(false);
    }
  };

  const savePlace = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const wasEditing = Boolean(editingPlaceId);
      const payload = { ...placeForm, active: toBool(placeForm.active) };
      if (editingPlaceId) {
        await destinationService.adminUpdateHospitalityPlace(editingPlaceId, payload);
      } else {
        await destinationService.adminCreateHospitalityPlace(payload);
      }
      setEditingPlaceId('');
      setPlaceForm((current) => ({ ...emptyPlace, destinationId: current.destinationId }));
      await refreshAdminData(payload.destinationId || selectedDestinationId);
      if (wasEditing) setActiveTab('dashboard');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar hospedagem.');
    } finally {
      setSaving(false);
    }
  };

  const saveListing = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const wasEditing = Boolean(editingListingId);
      const hospitalityPlaceIds = normalizeListingPlaceIds(listingForm.hospitalityPlaceIds, listingForm.hospitalityPlaceId);
      const hospitalityPlaceLinks = normalizeListingPlaceLinks(listingForm.hospitalityPlaceLinks, hospitalityPlaceIds);
      const payload = {
        ...listingForm,
        hospitalityPlaceIds,
        hospitalityPlaceLinks,
        hospitalityPlaceId: hospitalityPlaceIds[0] || '',
        active: toBool(listingForm.active),
        featured: toBool(listingForm.featured),
      };
      if (editingListingId) {
        await destinationService.adminUpdateListing(editingListingId, payload);
      } else {
        await destinationService.adminCreateListing(payload);
      }
      setEditingListingId('');
      setListingForm((current) => ({ ...emptyListing, destinationId: current.destinationId }));
      await refreshAdminData(payload.destinationId || selectedDestinationId);
      if (wasEditing) setActiveTab('dashboard');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const linkStore = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await destinationService.adminLinkStore(storeLinkForm.placeId, storeLinkForm);
      setStoreLinkForm((current) => ({ ...emptyStoreLink, placeId: current.placeId, storeId: current.storeId }));
      await refreshAdminData(selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível vincular loja.');
    } finally {
      setSaving(false);
    }
  };

  const reviewPartner = async (request: any, status: 'approved' | 'rejected') => {
    const isClaim = isPartnerClaimRequest(request);
    if (status === 'approved' && isClaim) {
      const confirmed = window.confirm(
        `Esta solicitação vai liberar acesso para editar "${claimedResourceLabel(request)}".\n\nAntes de aprovar, confirme por WhatsApp/e-mail oficial do cadastro que esta pessoa é realmente responsável pelo perfil. Deseja continuar?`
      );
      if (!confirmed) return;
    }
    setSaving(true);
    setError('');
    try {
      await destinationService.adminReviewPartnerRequest(request.id, { status, claimVerified: status === 'approved' && isClaim ? true : undefined });
      await refreshAdminData(selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revisar solicitação.');
    } finally {
      setSaving(false);
    }
  };

  const resendPartnerInvite = async (request: any) => {
    setSaving(true);
    setError('');
    try {
      const payload = await destinationService.adminResendPartnerInvite(request.id);
      const activationUrl = payload?.partnerActivationUrl || payload?.activationUrl || '';
      const loginUrl = payload?.partnerLoginUrl || '';
      if (activationUrl) {
        setPartnerInviteLinks((current) => ({ ...current, [request.id]: activationUrl }));
        await copyTextToClipboard(activationUrl, `Link de ativação de ${request.name} copiado.`);
      } else if (loginUrl) {
        await copyTextToClipboard(loginUrl, `${request.name} já ativou a conta. Link do portal copiado.`);
      } else {
        setInviteFeedback('Convite reenviado, mas o link não foi retornado pelo servidor.');
        window.setTimeout(() => setInviteFeedback(''), 2600);
      }
      await refreshAdminData(selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível reenviar o convite do parceiro.');
    } finally {
      setSaving(false);
    }
  };

  const reviewStore = async (requestId: string, status: 'approved' | 'rejected') => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminReviewStoreRequest(requestId, { status });
      await refreshAdminData(selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revisar solicitação da loja.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDestinationActive = async (destination: any) => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminUpdateDestination(destination.id, { ...destination, active: destination.active === false });
      await refreshAdminData(destination.id);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar destino.');
    } finally {
      setSaving(false);
    }
  };

  const togglePlaceActive = async (place: any) => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminUpdateHospitalityPlace(place.id, { ...place, destinationId: place.destinationId || place.destination?.id, active: place.active === false });
      await refreshAdminData(place.destinationId || place.destination?.id || selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar hospedagem.');
    } finally {
      setSaving(false);
    }
  };

  const toggleListingActive = async (listing: any) => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminUpdateListing(listing.id, { ...listing, active: listing.active === false });
      await refreshAdminData(listing.destinationId || listing.destination?.id || selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const updateListingPlaceLinksFromPlace = async (listing: any, nextLinks: Array<{ hospitalityPlaceId: string; sortOrder: number }>) => {
    const hospitalityPlaceIds = nextLinks.map((link) => link.hospitalityPlaceId);
    await destinationService.adminUpdateListing(listing.id, {
      hospitalityPlaceIds,
      hospitalityPlaceId: hospitalityPlaceIds[0] || '',
      hospitalityPlaceLinks: nextLinks,
    });
    await Promise.all([
      loadPlaceListings(placeForm.destinationId || listing.destinationId || selectedDestinationId, placeListingSearch),
      loadDestinationDetails(placeForm.destinationId || listing.destinationId || selectedDestinationId, placesPage, listingsPage),
    ]);
  };

  const addListingToEditingPlace = async (listing: any) => {
    const placeId = String(editingPlaceId || '');
    if (!placeId) return;
    const currentLinks = normalizeListingPlaceLinks(listing.hospitalityPlaceLinks, listing.hospitalityPlaceIds, listing.hospitalityPlaceId);
    if (!currentLinks.length) {
      setError('Este serviço já aparece no destino inteiro. Edite o serviço se quiser restringir para chalés específicos.');
      return;
    }
    if (currentLinks.some((link) => String(link.hospitalityPlaceId) === placeId)) return;
    const maxSortOrder = currentLinks.reduce((max, link) => Math.max(max, Number(link.sortOrder || 0)), 0);
    setSaving(true);
    setError('');
    try {
      await updateListingPlaceLinksFromPlace(listing, [
        ...currentLinks,
        { hospitalityPlaceId: placeId, sortOrder: maxSortOrder + 10 },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível adicionar o serviço neste chalé.');
    } finally {
      setSaving(false);
    }
  };

  const removeListingFromEditingPlace = async (listing: any) => {
    const placeId = String(editingPlaceId || '');
    if (!placeId) return;
    const currentLinks = normalizeListingPlaceLinks(listing.hospitalityPlaceLinks, listing.hospitalityPlaceIds, listing.hospitalityPlaceId);
    if (!currentLinks.length) {
      setError('Este serviço aparece no destino inteiro. Para tirar de um único chalé, primeiro restrinja o serviço na tela de edição dele.');
      return;
    }
    if (currentLinks.length <= 1) {
      setError('Este é o único chalé vinculado ao serviço. Edite o serviço para desativar ou trocar o vínculo sem virar destino inteiro.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateListingPlaceLinksFromPlace(
        listing,
        currentLinks.filter((link) => String(link.hospitalityPlaceId) !== placeId)
      );
    } catch (err: any) {
      setError(err?.message || 'Não foi possível remover o serviço deste chalé.');
    } finally {
      setSaving(false);
    }
  };

  const updateListingSortForEditingPlace = async (listing: any, value: any) => {
    const placeId = String(editingPlaceId || '');
    if (!placeId) return;
    const currentLinks = normalizeListingPlaceLinks(listing.hospitalityPlaceLinks, listing.hospitalityPlaceIds, listing.hospitalityPlaceId);
    if (!currentLinks.length) {
      setError('Serviço do destino inteiro não tem prioridade específica por chalé. Restrinja o serviço se precisar ordenar por hospedagem.');
      return;
    }
    const sortOrder = Number(value);
    setSaving(true);
    setError('');
    try {
      await updateListingPlaceLinksFromPlace(
        listing,
        currentLinks.map((link) => String(link.hospitalityPlaceId) === placeId
          ? { ...link, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 }
          : link
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a ordem do serviço.');
    } finally {
      setSaving(false);
    }
  };

  const createListingForEditingPlace = () => {
    const placeId = String(editingPlaceId || '');
    if (!placeId) return;
    const destinationId = placeForm.destinationId || selectedDestinationId;
    setEditingPlaceId('');
    setEditingListingId('');
    setCadastroMode('listing');
    setListingForm({
      ...emptyListing,
      destinationId,
      hospitalityPlaceId: placeId,
      hospitalityPlaceIds: [placeId],
      hospitalityPlaceLinks: [{ hospitalityPlaceId: placeId, sortOrder: 0 }],
      city: placeForm.city || '',
      state: placeForm.state || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editListingFromPlace = (listing: any) => {
    setEditingPlaceId('');
    startListingEdit(listing);
  };

  const getDestinationForListing = (listing: any) =>
    listing?.destination ||
    selectedDestination ||
    (catalog.destinations || []).find((item: any) => String(item.id) === String(listing?.destinationId)) ||
    {};

  const getDestinationForPlace = (place: any) =>
    place?.destination ||
    selectedDestination ||
    (catalog.destinations || []).find((item: any) => String(item.id) === String(place?.destinationId)) ||
    {};

  const getPublicBaseUrl = () => {
    if (typeof window === 'undefined') return 'https://janocaminho.com.br';
    return window.location.origin || 'https://janocaminho.com.br';
  };

  const getListingInviteContact = (listing: any) =>
    listing?.whatsapp || listing?.phone || (/^https?:\/\//i.test(String(listing?.ctaUrl || '')) ? '' : listing?.ctaUrl);

  const getPlaceInviteContact = (place: any) => place?.whatsapp || place?.phone;

  const buildInvitePayload = (listing: any) => {
    const destination = getDestinationForListing(listing);
    const publicInviteUrl = buildListingPublicInviteUrl(destination, listing, { baseUrl: getPublicBaseUrl() });
    const message = buildListingInviteMessage(destination, listing, publicInviteUrl);
    const rawContact = getListingInviteContact(listing);
    return {
      destination,
      claimUrl: publicInviteUrl,
      publicInviteUrl,
      message,
      whatsappUrl: buildListingInviteWhatsAppUrl(rawContact, message),
    };
  };

  const buildPlaceInvitePayload = (place: any) => {
    const destination = getDestinationForPlace(place);
    const claimUrl = buildHospitalityPlacePublicInviteUrl(destination, place, { baseUrl: getPublicBaseUrl() });
    const message = buildHospitalityPlaceInviteMessage(destination, place, claimUrl);
    const rawContact = getPlaceInviteContact(place);
    return {
      destination,
      claimUrl,
      publicInviteUrl: claimUrl,
      message,
      whatsappUrl: buildListingInviteWhatsAppUrl(rawContact, message),
    };
  };

  const buildInviteBatchEntry = (title: string, payload: any) => [
    `[${title}]`,
    payload.whatsappUrl ? `Enviar pelo WhatsApp: ${payload.whatsappUrl}` : 'WhatsApp: sem número válido cadastrado.',
    '',
    payload.message,
  ].join('\n');

  const getPaginationTotalPages = (pagination: any, fallbackItemsLength = 0) => {
    const total = Number(pagination?.total || fallbackItemsLength || 0);
    const pageSize = Math.max(1, Number(pagination?.pageSize || 50));
    return Math.max(1, Math.ceil(total / pageSize));
  };

  const fetchAllDestinationPlacesForInvite = async () => {
    if (!selectedDestinationId) return [];
    const pageSize = 50;
    let page = 1;
    let totalPages = 1;
    const allItems: any[] = [];
    while (page <= totalPages && page <= 100) {
      const payload = await destinationService.adminDestinationPlaces(selectedDestinationId, {
        page,
        pageSize,
        search: detailSearch,
        status: statusFilter,
      });
      const items = Array.isArray(payload?.items) ? payload.items : [];
      allItems.push(...items);
      totalPages = getPaginationTotalPages(payload?.pagination, items.length);
      page += 1;
    }
    return allItems;
  };

  const fetchAllDestinationListingsForInvite = async () => {
    if (!selectedDestinationId) return [];
    const pageSize = 50;
    let page = 1;
    let totalPages = 1;
    const allItems: any[] = [];
    while (page <= totalPages && page <= 100) {
      const payload = await destinationService.adminDestinationListings(selectedDestinationId, {
        page,
        pageSize,
        search: detailSearch,
        status: statusFilter,
        listingCategory: listingCategoryFilter,
      });
      const items = Array.isArray(payload?.items) ? payload.items : [];
      allItems.push(...items);
      totalPages = getPaginationTotalPages(payload?.pagination, items.length);
      page += 1;
    }
    return allItems.filter((listing: any) => !listing.storeId && !listing.store);
  };

  const copyTextToClipboard = async (text: string, feedback: string) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setInviteFeedback(feedback);
      window.setTimeout(() => setInviteFeedback(''), 2600);
    } catch {
      setError('Não foi possível copiar agora. Copie manualmente pelo painel de convite.');
    }
  };

  const copyListingInvite = (listing: any) => {
    const payload = buildInvitePayload(listing);
    return copyTextToClipboard(payload.message, `Convite de ${listing.title} copiado.`);
  };

  const copyPlaceInvite = (place: any) => {
    const payload = buildPlaceInvitePayload(place);
    return copyTextToClipboard(payload.message, `Convite de ${place.name} copiado.`);
  };

  const copyAllPlaceInvites = async () => {
    if (!selectedDestinationId) {
      setError('Selecione uma cidade antes de copiar convites.');
      return;
    }
    setInviteBatchLoading('places');
    try {
      const places = await fetchAllDestinationPlacesForInvite();
      if (!places.length) {
        setError('Nenhuma hospedagem encontrada nesta cidade/filtro para convidar.');
        return;
      }
      const batch = places
        .map((place: any) => buildInviteBatchEntry(place?.name || 'Hospedagem', buildPlaceInvitePayload(place)))
        .join('\n\n---\n\n');
      return copyTextToClipboard(batch, `${places.length} convite(s) de hospedagem copiado(s) da cidade.`);
    } finally {
      setInviteBatchLoading('');
    }
  };

  const copyAllListingInvites = async () => {
    if (!selectedDestinationId) {
      setError('Selecione uma cidade antes de copiar convites.');
      return;
    }
    setInviteBatchLoading('listings');
    try {
      const listings = await fetchAllDestinationListingsForInvite();
      if (!listings.length) {
        setError('Nenhum serviço sem loja vinculada encontrado nesta cidade/filtro para convidar.');
        return;
      }
      const batch = listings
        .map((listing: any) => buildInviteBatchEntry(listing?.title || 'Serviço local', buildInvitePayload(listing)))
        .join('\n\n---\n\n');
      return copyTextToClipboard(batch, `${listings.length} convite(s) de serviço copiado(s) da cidade.`);
    } finally {
      setInviteBatchLoading('');
    }
  };

  const handleGeneratePlaceQrPoster = (place: any) => {
    if (typeof window === 'undefined') return;

    const destination = selectedDestination ||
      place?.destination ||
      (catalog.destinations || []).find((item: any) => String(item.id) === String(place?.destinationId));
    const placeName = String(place?.name || 'Hospedagem').trim();
    const destinationName = String(destination?.name || destination?.city || place?.city || 'Destino turístico').trim();
    const targetUrl = buildHospitalityPlaceSmartQrUrl({
      destinationSlug: destination?.slug || place?.destination?.slug || '',
      destinationName,
      placeSlug: place?.slug || '',
      placeName,
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=720x720&margin=12&data=${encodeURIComponent(targetUrl)}`;
    const logoUrl = resolveAssetUrl(place?.logoUrl || '');
    const coverUrl = resolveAssetUrl(
      (Array.isArray(place?.bannerUrls) ? place.bannerUrls.find(Boolean) : '') ||
        place?.bannerUrl ||
        destination?.bannerUrl ||
        place?.logoUrl ||
        ''
    );
    const initials = placeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'JC';
    const safePlaceName = escapePosterHtml(placeName);
    const safeDestinationName = escapePosterHtml(destinationName);
    const safeTargetUrl = escapePosterHtml(targetUrl);
    const safeQrUrl = escapePosterHtml(qrUrl);
    const safeLogoUrl = escapePosterHtml(logoUrl || '');
    const safeCoverUrl = escapePosterHtml(coverUrl || '');
    const safeInitials = escapePosterHtml(initials);
    const fileName = buildHospitalityPlacePosterFileName(placeName);

    const printWindow = window.open('', '_blank', 'width=780,height=980');
    if (!printWindow) {
      setError('Não foi possível abrir o material. Libere pop-ups para gerar o QR do chalé.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapePosterHtml(fileName.replace(/\.html$/i, ''))}</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #eaf0f3;
              color: #0f172a;
            }
            .screen-toolbar {
              position: sticky;
              top: 0;
              z-index: 20;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
              padding: 14px 18px;
              border-bottom: 1px solid #dbe5eb;
              background: rgba(255,255,255,0.94);
              backdrop-filter: blur(14px);
            }
            .screen-toolbar strong { display: block; font-size: 13px; }
            .screen-toolbar span { display: block; margin-top: 2px; font-size: 11px; color: #64748b; }
            .screen-toolbar__actions { display: flex; flex-wrap: wrap; gap: 10px; }
            .screen-toolbar button {
              border: 0;
              border-radius: 999px;
              padding: 11px 16px;
              font-size: 12px;
              font-weight: 900;
              cursor: pointer;
              color: #fff;
              background: #153A4C;
            }
            .screen-toolbar button.secondary {
              color: #334155;
              background: #fff;
              box-shadow: inset 0 0 0 1px #cbd5e1;
            }
            .page {
              width: 794px;
              max-width: calc(100% - 24px);
              min-height: 1123px;
              margin: 22px auto;
              padding: 28px;
              border-radius: 34px;
              background:
                radial-gradient(circle at 12% 8%, rgba(236, 169, 53, 0.18), transparent 30%),
                linear-gradient(180deg, #ffffff 0%, #f7fafc 100%);
              box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
            }
            .poster {
              min-height: 1067px;
              overflow: hidden;
              border: 1px solid #dbe5eb;
              border-radius: 30px;
              background: #ffffff;
            }
            .hero {
              position: relative;
              min-height: 350px;
              overflow: hidden;
              color: #fff;
              background: linear-gradient(135deg, #153A4C, #0f172a);
            }
            .hero-cover {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              filter: saturate(1.02);
            }
            .hero-shade {
              position: absolute;
              inset: 0;
              background: linear-gradient(90deg, rgba(7, 18, 28, 0.88), rgba(7, 18, 28, 0.52) 58%, rgba(7, 18, 28, 0.24));
            }
            .hero-content {
              position: relative;
              z-index: 2;
              display: grid;
              min-height: 350px;
              align-content: end;
              gap: 22px;
              padding: 34px;
            }
            .brand-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
            }
            .brand {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              border-radius: 999px;
              background: rgba(255,255,255,0.13);
              padding: 8px 13px;
              font-size: 11px;
              font-weight: 950;
              letter-spacing: 0.16em;
              text-transform: uppercase;
            }
            .brand img { width: 28px; height: 28px; border-radius: 9px; background: #fff; }
            .place-logo {
              width: 84px;
              height: 84px;
              border-radius: 24px;
              object-fit: cover;
              background: #fff;
              border: 3px solid rgba(255,255,255,0.9);
              box-shadow: 0 18px 40px rgba(0,0,0,0.22);
            }
            .place-initials {
              display: grid;
              place-items: center;
              width: 84px;
              height: 84px;
              border-radius: 24px;
              background: #fff;
              color: #153A4C;
              font-size: 24px;
              font-weight: 950;
              border: 3px solid rgba(255,255,255,0.9);
            }
            .eyebrow {
              margin: 0 0 10px;
              font-size: 12px;
              font-weight: 950;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: rgba(255,255,255,0.76);
            }
            h1 {
              max-width: 610px;
              margin: 0;
              font-size: 48px;
              line-height: 1.03;
              letter-spacing: -0.055em;
            }
            .subtitle {
              max-width: 620px;
              margin: 14px 0 0;
              font-size: 19px;
              line-height: 1.38;
              font-weight: 650;
              color: rgba(255,255,255,0.86);
            }
            .body {
              display: grid;
              grid-template-columns: 1.05fr 0.95fr;
              gap: 26px;
              padding: 34px;
            }
            .benefits {
              display: grid;
              gap: 14px;
            }
            .benefit {
              display: flex;
              gap: 13px;
              align-items: flex-start;
              border: 1px solid #e2e8f0;
              border-radius: 20px;
              background: #f8fafc;
              padding: 16px;
            }
            .benefit-icon {
              display: grid;
              place-items: center;
              width: 34px;
              height: 34px;
              flex: 0 0 34px;
              border-radius: 13px;
              background: #e9f4f8;
              color: #153A4C;
              font-weight: 950;
            }
            .benefit strong { display: block; font-size: 15px; }
            .benefit span {
              display: block;
              margin-top: 5px;
              font-size: 12.5px;
              line-height: 1.42;
              color: #334155;
              font-weight: 720;
            }
            .qr-card {
              align-self: start;
              border-radius: 28px;
              background: linear-gradient(180deg, #153A4C, #0f172a);
              padding: 22px;
              color: #fff;
              text-align: center;
              box-shadow: 0 24px 55px rgba(21,58,76,0.28);
            }
            .qr-box {
              margin: 0 auto;
              width: 256px;
              max-width: 100%;
              border-radius: 24px;
              background: #fff;
              padding: 14px;
            }
            .qr-box img {
              display: block;
              width: 100%;
              aspect-ratio: 1;
              object-fit: contain;
            }
            .qr-card h2 {
              margin: 17px 0 5px;
              font-size: 22px;
              line-height: 1.05;
              letter-spacing: -0.035em;
            }
            .qr-card p {
              margin: 0;
              color: rgba(255,255,255,0.86);
              font-size: 12px;
              line-height: 1.4;
              font-weight: 750;
            }
            .play-badge {
              display: inline-flex;
              align-items: center;
              gap: 9px;
              margin: 15px auto 12px;
              border: 1px solid rgba(255,255,255,0.14);
              border-radius: 12px;
              background: #050505;
              padding: 8px 13px;
              color: #fff;
              text-align: left;
              box-shadow: 0 12px 25px rgba(0,0,0,0.22);
            }
            .play-badge svg {
              width: 25px;
              height: 25px;
              flex: 0 0 auto;
            }
            .play-badge small {
              display: block;
              font-size: 7px;
              line-height: 1;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: rgba(255,255,255,0.82);
              font-weight: 800;
            }
            .play-badge strong {
              display: block;
              margin-top: 2px;
              font-size: 16px;
              line-height: 1;
              font-weight: 850;
            }
            .ios-note {
              margin-top: 10px !important;
              border-top: 1px solid rgba(255,255,255,0.14);
              padding-top: 10px;
              color: rgba(255,255,255,0.9) !important;
              font-size: 11.5px !important;
            }
            .footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin: 0 34px 34px;
              border-radius: 22px;
              background: #fff7ed;
              padding: 21px 22px;
              color: #7c2d12;
              font-size: 13px;
              font-weight: 850;
            }
            .footer code {
              color: #153A4C;
              font-family: inherit;
              font-weight: 950;
            }
            @media screen and (max-width: 760px) {
              .screen-toolbar { align-items: stretch; flex-direction: column; }
              .screen-toolbar__actions { width: 100%; }
              .screen-toolbar button { flex: 1 1 0; }
              .page { padding: 12px; border-radius: 24px; }
              .body { grid-template-columns: 1fr; padding: 22px; }
              h1 { font-size: 36px; }
              .hero-content { padding: 24px; }
              .footer { margin: 0 22px 22px; flex-direction: column; align-items: flex-start; }
            }
            @media print {
              body { background: #fff; }
              .screen-toolbar { display: none !important; }
              .page {
                width: 210mm;
                max-width: none;
                min-height: 297mm;
                margin: 0;
                padding: 7mm;
                border-radius: 0;
                box-shadow: none;
                background: #fff;
              }
              .poster { min-height: 283mm; }
            }
          </style>
        </head>
        <body>
          <div class="screen-toolbar">
            <div>
              <strong>Material pronto para ${safePlaceName}</strong>
              <span>Use "Imprimir / salvar PDF" para gerar o arquivo ou mandar para impressão.</span>
            </div>
            <div class="screen-toolbar__actions">
              <button type="button" class="secondary" onclick="window.handleClosePoster()">Fechar</button>
              <button type="button" onclick="window.handlePrintPoster()">Imprimir / salvar PDF</button>
            </div>
          </div>
          <main class="page">
            <article class="poster">
              <section class="hero">
                ${safeCoverUrl ? `<img class="hero-cover" src="${safeCoverUrl}" alt="${safePlaceName}" />` : ''}
                <div class="hero-shade"></div>
                <div class="hero-content">
                  <div class="brand-row">
                    <div class="brand">
                      <img src="/icons/pwa-192x192.png" alt="" />
                      Já no Caminho
                    </div>
                    ${safeLogoUrl ? `<img class="place-logo" src="${safeLogoUrl}" alt="Logo ${safePlaceName}" />` : `<div class="place-initials">${safeInitials}</div>`}
                  </div>
                  <div>
                    <p class="eyebrow">Guia local para hóspedes</p>
                    <h1>Está hospedado no ${safePlaceName}?</h1>
                    <p class="subtitle">Baixe o app e veja quem entrega aqui, serviços locais e lugares próximos para visitar em ${safeDestinationName}.</p>
                  </div>
                </div>
              </section>
              <section class="body">
                <div class="benefits">
                  <div class="benefit">
                    <div class="benefit-icon">1</div>
                    <div>
                      <strong>Comida e delivery para o chalé</strong>
                      <span>Restaurantes, mercados e serviços que atendem esta hospedagem pelo app ou WhatsApp.</span>
                    </div>
                  </div>
                  <div class="benefit">
                    <div class="benefit-icon">2</div>
                    <div>
                      <strong>Passeios e turismo por perto</strong>
                      <span>Atrações, experiências, cafés e lugares para visitar durante a viagem.</span>
                    </div>
                  </div>
                  <div class="benefit">
                    <div class="benefit-icon">3</div>
                    <div>
                      <strong>Tudo organizado por cidade</strong>
                      <span>Abra Destinos no app, escolha a cidade e toque no chalé para ver os serviços certos.</span>
                    </div>
                  </div>
                </div>
                <aside class="qr-card">
                  <div class="qr-box">
                    <img src="${safeQrUrl}" alt="QR Code para instalar o app Já no Caminho" />
                  </div>
                  <h2>Aponte a câmera e instale o app</h2>
                  <div class="play-badge" aria-label="Disponível no Google Play">
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                      <defs>
                        <linearGradient id="playBlue" x1="0" x2="1" y1="0" y2="1">
                          <stop offset="0" stop-color="#00A0FF" />
                          <stop offset="1" stop-color="#00D1FF" />
                        </linearGradient>
                      </defs>
                      <path fill="url(#playBlue)" d="M8 6.4v35.2c0 1.7 1.8 2.8 3.3 1.9L29.5 24 11.3 4.5C9.8 3.6 8 4.7 8 6.4Z" />
                      <path fill="#00F076" d="m29.5 24 5.3-5.7L11.3 4.5 29.5 24Z" />
                      <path fill="#FFEA00" d="m29.5 24-18.2 19.5 23.5-13.8L29.5 24Z" />
                      <path fill="#FF3D00" d="m34.8 18.3-5.3 5.7 5.3 5.7 5.1-3c2.1-1.2 2.1-4.2 0-5.4l-5.1-3Z" />
                    </svg>
                    <span>
                      <small>Disponível no</small>
                      <strong>Google Play</strong>
                    </span>
                  </div>
                  <p>Android: abre a Google Play para baixar o app.</p>
                  <p class="ios-note">iPhone: abre o hub no Safari em <strong>janocaminho.com.br/hub</strong>. App iOS em breve.</p>
                </aside>
              </section>
              <footer class="footer">
                <span>Depois de instalar: abra <strong>Destinos</strong> e escolha <strong>${safePlaceName}</strong>.</span>
                <code>Android: Google Play · iPhone: Safari</code>
              </footer>
            </article>
          </main>
          <script>
            window.handlePrintPoster = () => {
              window.focus();
              window.print();
            };
            window.handleClosePoster = () => {
              if (window.opener && !window.opener.closed) {
                window.close();
                return;
              }
              if (window.history.length > 1) {
                window.history.back();
                return;
              }
              window.location.replace("https://janocaminho.com.br");
            };
            window.onload = () => {
              window.focus();
              window.setTimeout(() => window.handlePrintPoster(), 300);
            };
          </script>
          <!-- QR target: ${safeTargetUrl} -->
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tabs = [
    { id: 'dashboard', label: 'Resumo', icon: Compass },
    { id: 'cadastro', label: 'Cadastro', icon: Plus },
    { id: 'requests', label: 'Solicitações', icon: WarningCircle, badge: metrics.pending },
  ];
  const superAdminGroups = [
    { id: 'operacional', label: 'Operação', subtitle: 'Resumo, lojas e receita', icon: ChartBar, target: 'executive' },
    { id: 'plataforma', label: 'Plataforma', subtitle: 'Push, destinos e segurança', icon: Megaphone, target: 'push' },
    { id: 'tecnico', label: 'Técnico', subtitle: 'Logs, eventos e versões', icon: Cpu, target: 'logs' },
  ];
  const superAdminPlatformSections = [
    { id: 'push', label: 'Push', icon: Megaphone },
    { id: 'destinations', label: 'Destinos', icon: Compass },
    { id: 'kyc', label: 'KYC', icon: CheckCircle },
    { id: 'security', label: 'Segurança', icon: WarningCircle },
  ];
  const openSuperAdminSection = (sectionId: string) => {
    if (sectionId === 'destinations') return;
    sessionStorage.setItem('superadmin:activeSection', sectionId);
    navigate('/superadmin');
  };
  const editingCadastroMode = editingDestinationId ? 'destination' : editingPlaceId ? 'place' : editingListingId ? 'listing' : '';
  const activeCadastroMode = editingCadastroMode || cadastroMode;
  const cadastroModeOptions = [
    { id: 'destination', label: 'Cidade', description: 'Destino turístico e banner principal.', icon: MapTrifold },
    { id: 'place', label: 'Chalé/Pousada', description: 'Hospedagem com logo, banner e instruções.', icon: Bed },
    { id: 'listing', label: 'Serviço/Lugar', description: 'Passeio, atrativo, restaurante ou serviço local.', icon: Sparkle },
    { id: 'storeLink', label: 'Vínculo loja', description: 'Loja que entrega em uma hospedagem.', icon: Buildings },
  ];
  const selectedDestination = (catalog.destinations || []).find((destination: any) => String(destination.id) === String(selectedDestinationId)) || null;
  const invitePayload = inviteListing ? buildInvitePayload(inviteListing) : null;
  const placeInvitePayload = invitePlace ? buildPlaceInvitePayload(invitePlace) : null;
  const activeInviteItem = invitePlace || inviteListing;
  const activeInvitePayload = placeInvitePayload || invitePayload;
  const activeInviteTitle = invitePlace?.name || inviteListing?.title || 'Parceiro';
  const activeInviteKindLabel = invitePlace ? 'Convite para hospedagem' : 'Convite para serviço';
  const pageButtonClass = 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40';
  const renderPagination = (pagination: any, onPageChange: (page: number) => void, label = 'itens') => (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold text-slate-500">
        {pagination?.total || 0} {label} · página {pagination?.page || 1} de {pagination?.totalPages || 1}
      </p>
      <div className="flex gap-2">
        <button type="button" disabled={!pagination?.hasPrevious} onClick={() => onPageChange(Math.max(1, Number(pagination?.page || 1) - 1))} className={pageButtonClass}>
          Anterior
        </button>
        <button type="button" disabled={!pagination?.hasNext} onClick={() => onPageChange(Number(pagination?.page || 1) + 1)} className={pageButtonClass}>
          Próxima
        </button>
      </div>
    </div>
  );
  const renderRequestActions = (request: any, onApprove: () => void, onReject: () => void) => (
    isPendingRequest(request.status) ? (
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" disabled={saving} onClick={onApprove} className={actionButtonClass('success')}>
          <CheckCircle size={13} weight="fill" />
          Aprovar
        </button>
        <button type="button" disabled={saving} onClick={onReject} className={actionButtonClass('danger')}>
          Recusar
        </button>
      </div>
    ) : null
  );
  const renderPartnerRequestCard = (request: any) => (
    <article key={request.id} className={`rounded-[1.35rem] border p-3.5 ${requestTone(request.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{request.name}</p>
          <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.12em] opacity-75">
            {partnerTypeLabel(request)}
          </p>
          <p className="mt-2 line-clamp-2 text-xs font-semibold opacity-85">
            {request.responsibleName || 'Responsável não informado'} · {request.responsibleEmail || request.responsiblePhone || 'Contato pendente'}
          </p>
          {request.message || request.description ? (
            <p className="mt-2 line-clamp-2 text-xs font-semibold opacity-80">{request.message || request.description}</p>
          ) : null}
          {isPartnerClaimRequest(request) ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#336886]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#153A4C]">
              <LinkSimpleHorizontal size={12} weight="bold" />
              Assumir perfil existente
            </div>
          ) : null}
          {isPartnerClaimRequest(request) ? (
            <div className="mt-2 rounded-2xl border border-amber-200 bg-white/72 p-3 text-[11px] font-bold leading-relaxed text-amber-800">
              <span className="mb-1 flex items-center gap-1 font-black uppercase tracking-[0.08em]">
                <ShieldCheck size={13} weight="fill" />
                Verificação obrigatória
              </span>
              Vai liberar edição de <strong>{claimedResourceLabel(request)}</strong>. Confirme titularidade pelo contato oficial do cadastro antes de aprovar.
            </div>
          ) : null}
          {partnerAccessLabel(request) ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/78 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">
              <CheckCircle size={12} weight={partnerAccountStatus(request) === 'active' ? 'fill' : 'duotone'} />
              {partnerAccessLabel(request)}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]">
            {requestStatusLabel(request.status)}
          </span>
          {formatRequestDate(request.createdAt) ? (
            <span className="text-[10px] font-black uppercase tracking-[0.08em] opacity-60">{formatRequestDate(request.createdAt)}</span>
          ) : null}
        </div>
      </div>
      {renderRequestActions(
        request,
        () => reviewPartner(request, 'approved'),
        () => reviewPartner(request, 'rejected')
      )}
      {!isPendingRequest(request.status) && String(request.status || '').toLowerCase() === 'approved' && request.createdPartnerAccountId ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" disabled={saving} onClick={() => resendPartnerInvite(request)} className={actionButtonClass('primary')}>
            <PaperPlaneTilt size={13} weight="bold" />
            Reenviar convite
          </button>
          {partnerInviteLinks[request.id] ? (
            <button type="button" onClick={() => copyTextToClipboard(partnerInviteLinks[request.id], 'Link de ativação copiado.')} className={actionButtonClass('neutral')}>
              <CopySimple size={13} weight="bold" />
              Copiar link
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
  const renderStoreRequestCard = (request: any) => (
    <article key={request.id} className={`rounded-[1.35rem] border p-3.5 ${requestTone(request.status)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{request.store?.name || 'Loja não informada'}</p>
          <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.12em] opacity-75">
            Quer atender {request.hospitalityPlace?.name || 'uma hospedagem'}
          </p>
          <p className="mt-2 line-clamp-2 text-xs font-semibold opacity-85">{request.message || 'Sem mensagem do lojista.'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]">
            {requestStatusLabel(request.status)}
          </span>
          {formatRequestDate(request.createdAt) ? (
            <span className="text-[10px] font-black uppercase tracking-[0.08em] opacity-60">{formatRequestDate(request.createdAt)}</span>
          ) : null}
        </div>
      </div>
      {renderRequestActions(
        request,
        () => reviewStore(request.id, 'approved'),
        () => reviewStore(request.id, 'rejected')
      )}
    </article>
  );
  const renderRequestSection = (title: string, subtitle: string, icon: any, items: any[], renderCard: (request: any) => any) => {
    const Icon = icon;
    const pendingCount = items.filter((request) => isPendingRequest(request.status)).length;
    return (
      <section className="rounded-[1.45rem] border border-slate-100 bg-white/78 p-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#EEF6F4] text-[#336886]">
              <Icon size={18} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">{title}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
            pendingCount ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {pendingCount ? `${pendingCount} pend.` : `${items.length} total`}
          </span>
        </div>
        <div className="mt-3 grid gap-2.5">
          {items.length ? items.map(renderCard) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
              Nenhuma solicitação nesta categoria.
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <AdminLayout contextLabel="Destinos" showHeader={false}>
      <div className="space-y-5">
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/82 backdrop-blur-2xl border-b border-slate-200/70 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]">
          <div className="rounded-[1.7rem] border border-white/80 bg-white/86 p-2.5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.5)] ring-1 ring-slate-100/80 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-2">
              {superAdminGroups.map(({ id, label, subtitle, icon: Icon, target }) => {
                const isActiveGroup = id === 'plataforma';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (isActiveGroup) return;
                      openSuperAdminSection(target);
                    }}
                    className={`min-w-0 rounded-[1.25rem] border px-2.5 py-2.5 text-left transition-all active:scale-[0.985] ${
                      isActiveGroup
                        ? 'border-[#336886]/18 bg-[#336886]/10 text-[#153A4C] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]'
                        : 'border-slate-100 bg-slate-50/72 text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                    aria-pressed={isActiveGroup}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-2xl ${
                        isActiveGroup ? 'bg-[#153A4C] text-white' : 'bg-white text-[#336886]'
                      }`}>
                        <Icon size={17} weight={isActiveGroup ? 'fill' : 'duotone'} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black uppercase tracking-[0.08em] sm:text-xs">{label}</span>
                        <span className="hidden truncate text-[10px] font-semibold text-slate-400 md:block">{subtitle}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {superAdminPlatformSections.map(({ id, label, icon: Icon }) => {
                const isActive = id === 'destinations';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => openSuperAdminSection(id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition-all active:scale-[0.98] ${
                      isActive
                        ? 'border-[#153A4C] bg-[#153A4C] text-white shadow-[0_12px_28px_-20px_rgba(15,23,42,0.65)]'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-[#336886]/20 hover:text-[#153A4C]'
                    }`}
                    aria-pressed={isActive}
                  >
                    <Icon size={14} weight={isActive ? 'fill' : 'duotone'} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#153A4C,#0f172a)] p-5 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
                <MapTrifold size={15} weight="duotone" />
                Destination Hub
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.04em]">Destinos, chalés e serviços</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/72">
                Plataforma cadastra cidades, aprova chalés/prestadores e conecta lojas reais às hospedagens.
              </p>
            </div>
            <Link to="/destinos" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#153A4C]">
              Ver público
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${active ? 'bg-[#153A4C] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                <Icon size={15} weight={active ? 'fill' : 'duotone'} />
                {tab.label}
                {tab.badge ? <span className="rounded-full bg-amber-400 px-1.5 text-[10px] text-slate-950">{tab.badge}</span> : null}
              </button>
            );
          })}
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

        {activeTab === 'dashboard' ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Destinos', value: metrics.destinations, icon: MapTrifold },
                { label: 'Hospedagens', value: metrics.places, icon: Bed },
                { label: 'Serviços', value: metrics.listings, icon: Sparkle },
                { label: 'Pendências', value: metrics.pending, icon: WarningCircle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <Icon size={24} weight="duotone" className="text-[#336886]" />
                    <p className="mt-4 text-3xl font-black text-slate-950">{item.value}</p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="relative">
                <MagnifyingGlass size={18} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Digite cidade, hospedagem, serviço, endereço, WhatsApp ou loja"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-20 text-sm font-bold outline-none focus:border-[#336886]"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200"
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
              <div className="flex rounded-2xl bg-slate-100 p-1">
                {[
                  { id: 'active', label: 'Ativos' },
                  { id: 'all', label: 'Todos' },
                  { id: 'inactive', label: 'Inativos' },
                ].map((item) => {
                  const active = statusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id as any)}
                      className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
              <div className="flex gap-2 overflow-x-auto">
                {contentFilterOptions.map((option: any) => {
                  const Icon = option.icon;
                  const active = contentFilter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setContentFilter(option.id);
                        if (option.id !== 'listings') setListingCategoryFilter('all');
                      }}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition ${active ? 'bg-[#153A4C] text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Icon size={15} weight={active ? 'fill' : 'duotone'} />
                      {option.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/16 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{option.count}</span>
                    </button>
                  );
                })}
              </div>

              {(contentFilter === 'all' || contentFilter === 'listings') ? (
                <div className="flex gap-2 overflow-x-auto border-t border-slate-100 pt-2">
                  {listingCategoryOptions.map((option: any) => {
                    const active = listingCategoryFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setListingCategoryFilter(option.id);
                          if (option.id !== 'all') setContentFilter('listings');
                        }}
                        className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${active ? 'bg-amber-400 text-slate-950' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                      >
                        {option.label} <span className="ml-1 opacity-70">{option.count}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
              {stateOptions.map((option: any) => {
                const active = stateFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStateFilter(option.id)}
                    className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${active ? 'bg-[#153A4C] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {option.label} <span className="ml-1 opacity-70">{option.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 px-1 py-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Cidades</p>
                    <h2 className="text-lg font-black text-slate-950">Catálogo paginado</h2>
                  </div>
                  {catalogLoading ? <span className="rounded-full bg-[#edf5fa] px-2.5 py-1 text-[10px] font-black text-[#336886]">Atualizando</span> : null}
                </div>
                <div className="mt-2 space-y-2">
                  {(catalog.destinations || []).map((destination: any) => {
                    const active = String(selectedDestinationId) === String(destination.id);
                    return (
                      <button
                        key={destination.id}
                        type="button"
                        onClick={() => setSelectedDestinationId(destination.id)}
                        className={`w-full rounded-[1.25rem] border p-3 text-left transition ${active ? 'border-[#153A4C] bg-[#153A4C] text-white shadow-[0_16px_36px_-28px_rgba(21,58,76,0.9)]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                      >
                        <div className="flex gap-3">
                          <img src={imageFor(destination)} alt={destination.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-white/50" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black">{destination.name}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${active ? 'bg-white/14 text-white' : destination.active === false ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                {activeLabel(destination.active)}
                              </span>
                            </div>
                            <p className={`mt-0.5 text-[11px] font-bold ${active ? 'text-white/68' : 'text-slate-500'}`}>{[destination.city, destination.state].filter(Boolean).join(' - ') || 'Sem cidade/UF'}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/12 text-white/80' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{destination.placesCount || 0} hosp.</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/12 text-white/80' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{destination.listingsCount || 0} serv.</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {!catalogLoading && !(catalog.destinations || []).length ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
                      Nenhuma cidade encontrada neste filtro.
                    </p>
                  ) : null}
                </div>
                <div className="mt-3">
                  {renderPagination(catalog.pagination, setCatalogPage, 'cidades')}
                </div>
              </section>

              <section className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                {!selectedDestination ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <MapTrifold size={32} weight="duotone" className="mx-auto text-[#336886]" />
                    <p className="mt-3 text-sm font-black text-slate-700">Selecione uma cidade para gerenciar hospedagens e serviços.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc)]">
                      <div className="grid gap-4 p-4 md:grid-cols-[170px_1fr]">
                        <img src={imageFor(selectedDestination)} alt={selectedDestination.name} className="h-36 w-full rounded-[1.25rem] object-cover ring-1 ring-slate-200 md:h-full" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-2xl font-black leading-tight text-slate-950">{selectedDestination.name}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusPill(selectedDestination.active)}`}>
                              {activeLabel(selectedDestination.active)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-500">{[selectedDestination.city, selectedDestination.state].filter(Boolean).join(' - ') || 'Sem cidade/UF'}</p>
                          <p className="mt-2 line-clamp-3 text-sm font-semibold text-slate-600">{selectedDestination.description || selectedDestination.heroSubtitle || 'Sem descrição pública.'}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => startDestinationEdit(selectedDestination)} className={actionButtonClass('primary')}>
                              <PencilSimple size={13} weight="bold" />
                              Editar destino
                            </button>
                            <Link to={`/destinos/${selectedDestination.slug}`} className={actionButtonClass('neutral')}>
                              <Eye size={13} weight="bold" />
                              Ver público
                            </Link>
                            <button type="button" disabled={saving} onClick={() => toggleDestinationActive(selectedDestination)} className={actionButtonClass(selectedDestination.active === false ? 'success' : 'muted')}>
                              {selectedDestination.active === false ? <Eye size={13} weight="bold" /> : <EyeSlash size={13} weight="bold" />}
                              {selectedDestination.active === false ? 'Ativar' : 'Desativar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>

                    <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="relative">
                        <MagnifyingGlass size={17} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={detailSearch}
                          onChange={(event) => setDetailSearch(event.target.value)}
                          placeholder="Buscar dentro desta cidade: chalé, serviço, WhatsApp, endereço..."
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#336886]"
                        />
                      </div>
                      <button type="button" onClick={() => loadDestinationDetails(selectedDestinationId, placesPage, listingsPage)} className={actionButtonClass('neutral')}>
                        Atualizar detalhe
                      </button>
                      {contentFilter !== 'all' || listingCategoryFilter !== 'all' ? (
                        <p className="md:col-span-2 text-xs font-bold text-slate-500">
                          Os filtros superiores organizam a lista de cidades. O detalhe abaixo sempre mostra hospedagens e serviços da cidade selecionada.
                        </p>
                      ) : null}
                    </div>

                    {detailLoading ? <p className="rounded-2xl bg-[#edf5fa] px-4 py-3 text-sm font-bold text-[#336886]">Carregando detalhes da cidade...</p> : null}

                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]">Hospedagens</p>
                          <h4 className="text-lg font-black text-slate-950">Chalés e pousadas da cidade</h4>
                          <p className="mt-0.5 text-xs font-bold text-slate-500">{placesResult.pagination?.total || 0} hospedagem(ns) nesta cidade</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {inviteFeedback ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">{inviteFeedback}</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={copyAllPlaceInvites}
                            disabled={inviteBatchLoading === 'places'}
                            title="Copia todos os convites desta cidade usando os filtros atuais, não só a página visível."
                            className={actionButtonClass('primary')}
                          >
                            <CopySimple size={13} weight="bold" />
                            {inviteBatchLoading === 'places' ? 'Copiando...' : 'Copiar todos'}
                          </button>
                          <Bed size={24} weight="duotone" className="text-[#336886]" />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {(placesResult.items || []).map((place: any) => {
                          const placeBannerCount = (Array.isArray(place.bannerUrls) ? place.bannerUrls.filter(Boolean).length : 0) || (place.bannerUrl ? 1 : 0);
                          return (
                            <div key={place.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                              <div className="flex items-start gap-3">
                                <img src={logoFor(place)} alt={place.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="break-words text-sm font-black leading-snug text-slate-950">{place.name}</p>
                                      <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500">{place.address || place.description || 'Hospedagem sem endereço'}</p>
                                      {placeBannerCount ? <p className="mt-1 text-[11px] font-black text-[#336886]">{placeBannerCount} banner(s) no carrossel</p> : null}
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusPill(place.active)}`}>{activeLabel(place.active)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => startPlaceEdit(place)} className={actionButtonClass('neutral')}>
                                  <PencilSimple size={13} weight="bold" />
                                  Editar
                                </button>
                                <button type="button" onClick={() => handleGeneratePlaceQrPoster(place)} className={actionButtonClass('amber')}>
                                  <QrCode size={13} weight="bold" />
                                  QR/PDF
                                </button>
                                <button type="button" onClick={() => setInvitePlace(place)} className={actionButtonClass('primary')}>
                                  <ChatCircleText size={13} weight="bold" />
                                  Convite
                                </button>
                                <button type="button" onClick={() => copyPlaceInvite(place)} className={actionButtonClass('neutral')}>
                                  <CopySimple size={13} weight="bold" />
                                  Copiar
                                </button>
                                <button type="button" disabled={saving} onClick={() => togglePlaceActive(place)} className={actionButtonClass(place.active === false ? 'success' : 'muted')}>
                                  {place.active === false ? 'Ativar' : 'Desativar'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!detailLoading && !(placesResult.items || []).length ? (
                          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-bold text-slate-500">Nenhuma hospedagem encontrada nesta busca.</p>
                        ) : null}
                      </div>
                      <div className="mt-3">{renderPagination(placesResult.pagination, setPlacesPage, 'hospedagens')}</div>
                    </section>

                    <section className="rounded-[1.5rem] border border-amber-100 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Serviços e lugares</p>
                          <h4 className="text-lg font-black text-slate-950">Serviços locais e convites</h4>
                          <p className="mt-0.5 text-xs font-bold text-slate-500">{listingsResult.pagination?.total || 0} serviço(s) nesta cidade</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {inviteFeedback ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">{inviteFeedback}</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={copyAllListingInvites}
                            disabled={inviteBatchLoading === 'listings'}
                            title="Copia todos os convites de serviços desta cidade usando os filtros atuais, não só a página visível."
                            className={actionButtonClass('amber')}
                          >
                            <CopySimple size={13} weight="bold" />
                            {inviteBatchLoading === 'listings' ? 'Copiando...' : 'Copiar todos'}
                          </button>
                          <Sparkle size={24} weight="duotone" className="text-amber-700" />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {(listingsResult.items || []).map((listing: any) => {
                          const linkedPlaceIds = normalizeListingPlaceIds(listing.hospitalityPlaceIds, listing.hospitalityPlaceId);
                          const linkedPlaces = listingPlacesForDisplay(listing, data.places || []);
                          const isDestinationWide = linkedPlaceIds.length === 0;
                          const visiblePlaces = linkedPlaces.slice(0, 3);
                          const hiddenPlaceCount = Math.max(0, linkedPlaceIds.length - visiblePlaces.length);
                          const placesSummary = linkedPlaceIds.length === 1 ? '1 hospedagem selecionada' : `${linkedPlaceIds.length} hospedagens selecionadas`;
                          return (
                          <div key={listing.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-3">
                            <div className="flex items-start gap-3">
                              <img src={imageFor(listing)} alt={listing.title} className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-amber-100" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-black leading-snug text-slate-950">{listing.title}</p>
                                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{labelForListingCategory(listing.category)}</p>
                                    {listing.store ? (
                                      <p className="mt-1 line-clamp-2 text-[11px] font-black text-emerald-700">Loja vinculada: {listing.store.name}</p>
                                    ) : (
                                      <p className="mt-1 line-clamp-2 text-[11px] font-black text-amber-700">Aguardando validação de loja</p>
                                    )}
                                  </div>
                                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusPill(listing.active)}`}>{activeLabel(listing.active)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-[1.15rem] border border-white/80 bg-white/75 p-2.5 shadow-[0_14px_34px_rgba(120,53,15,0.06)]">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex shrink-0 -space-x-2">
                                  {isDestinationWide ? (
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#336886] text-white shadow-sm">
                                      <MapTrifold size={16} weight="duotone" />
                                    </span>
                                  ) : linkedPlaces.length ? (
                                    linkedPlaces.slice(0, 4).map((place: any) => {
                                      const placeImage = logoFor(place);
                                      return (
                                        <span key={place.id} className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
                                          {placeImage ? (
                                            <img src={placeImage} alt={place.name} className="h-full w-full object-cover" />
                                          ) : (
                                            <span className="flex h-full w-full items-center justify-center bg-[#EEF6F4] text-[10px] font-black text-[#336886]">
                                              {initialsFor(place.name)}
                                            </span>
                                          )}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-amber-700 shadow-sm">
                                      <Bed size={16} weight="duotone" />
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Aparece em</p>
                                  <p className="truncate text-xs font-black text-slate-900">
                                    {isDestinationWide ? 'Destino inteiro' : placesSummary}
                                  </p>
                                </div>
                              </div>
                              {isDestinationWide ? (
                                <p className="mt-2 rounded-full bg-[#EEF6F4] px-2.5 py-1 text-[11px] font-bold text-[#336886]">
                                  Visível para todos os chalés e pousadas da cidade.
                                </p>
                              ) : (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {visiblePlaces.map((place: any) => (
                                    <span key={place.id} className="max-w-full truncate rounded-full border border-[#336886]/10 bg-[#EEF6F4] px-2.5 py-1 text-[10px] font-black text-[#336886]">
                                      {place.name}
                                    </span>
                                  ))}
                                  {hiddenPlaceCount > 0 ? (
                                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white">
                                      +{hiddenPlaceCount}
                                    </span>
                                  ) : null}
                                  {!visiblePlaces.length ? (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">
                                      Hospedagens selecionadas
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => startListingEdit(listing)} className={actionButtonClass('neutral')}>
                                <PencilSimple size={13} weight="bold" />
                                Editar
                              </button>
                              {!listing.storeId && !listing.store ? (
                                <>
                                  <button type="button" onClick={() => setInviteListing(listing)} className={actionButtonClass('primary')}>
                                    <ChatCircleText size={13} weight="bold" />
                                    Convite
                                  </button>
                                  <button type="button" onClick={() => copyListingInvite(listing)} className={actionButtonClass('neutral')}>
                                    <CopySimple size={13} weight="bold" />
                                    Copiar
                                  </button>
                                </>
                              ) : null}
                              <button type="button" disabled={saving} onClick={() => toggleListingActive(listing)} className={actionButtonClass(listing.active === false ? 'success' : 'muted')}>
                                {listing.active === false ? 'Ativar' : 'Desativar'}
                              </button>
                            </div>
                          </div>
                          );
                        })}
                        {!detailLoading && !(listingsResult.items || []).length ? (
                          <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-4 text-xs font-bold text-slate-500">Nenhum serviço encontrado nesta busca.</p>
                        ) : null}
                      </div>
                      <div className="mt-3">{renderPagination(listingsResult.pagination, setListingsPage, 'serviços')}</div>
                    </section>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'cadastro' ? (
          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">{editingCadastroMode ? 'Edição focada' : 'Cadastro guiado'}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {editingCadastroMode ? 'Mostrando só o formulário do item selecionado' : 'Escolha o que você quer cadastrar'}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {editingCadastroMode ? 'Ao salvar ou cancelar, você volta para o resumo com a lista completa.' : 'Cidade, hospedagem, serviço e vínculo ficam separados para não misturar responsabilidades.'}
                  </p>
                </div>
                {editingCadastroMode ? (
                  <button type="button" onClick={returnToDashboardFromCadastro} className={actionButtonClass('neutral')}>
                    Voltar ao resumo
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-4">
                {cadastroModeOptions.map((option: any) => {
                  const Icon = option.icon;
                  const active = activeCadastroMode === option.id;
                  const disabled = Boolean(editingCadastroMode) && !active;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setCadastroMode(option.id)}
                      className={`rounded-[1.25rem] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-[#153A4C] bg-[#153A4C] text-white shadow-[0_18px_36px_-28px_rgba(21,58,76,0.9)]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <Icon size={22} weight="duotone" />
                      <p className="mt-2 text-sm font-black">{option.label}</p>
                      <p className={`mt-1 text-[11px] font-semibold ${active ? 'text-white/70' : 'text-slate-500'}`}>{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4">
              {activeCadastroMode === 'destination' ? (
            <form onSubmit={saveDestination} className="w-full max-w-4xl min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingDestinationId ? 'Editar destino' : 'Cadastrar destino'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Destino é a cidade/região turística que aparece para o cliente.</p>
                </div>
                {editingDestinationId ? (
                  <button type="button" onClick={cancelDestinationEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 rounded-[1.5rem] border border-[#336886]/15 bg-[linear-gradient(180deg,#f8fbfa,#ffffff)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Cidade do destino</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Selecione UF e cidade ou distrito turístico. O nome público e o link são gerados automaticamente.</p>
                    </div>
                    <span className="rounded-full bg-[#edf5fa] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">
                      sem digitação duplicada
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Estado</span>
                      <select required value={destinationForm.state} onChange={(event) => selectDestinationState(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900 outline-none">
                        {BRAZIL_STATES.map((state) => (
                          <option key={state.value} value={state.value}>{state.value} - {state.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Cidade ou distrito</span>
                      <select
                        required
                        value={destinationForm.city}
                        onChange={(event) => selectDestinationCity(event.target.value)}
                        disabled={destinationCitiesLoading || !destinationForm.state}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{destinationCitiesLoading ? 'Carregando cidades e distritos...' : 'Selecione a cidade ou distrito'}</option>
                        {destinationCitySelectOptions.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      {destinationCitiesError ? <span className="px-1 text-[11px] font-bold text-rose-600">{destinationCitiesError}</span> : null}
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Nome público</span>
                      <input value={destinationForm.name} readOnly placeholder="Gerado após escolher a cidade" className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-600 outline-none" />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Link público</span>
                      <input value={destinationForm.slug} readOnly placeholder="gerado-automaticamente" className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-600 outline-none" />
                    </label>
                  </div>
                </div>
                <input value={destinationForm.heroTitle} onChange={(event) => updateDestination('heroTitle', event.target.value)} placeholder="Título de destaque da página" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={destinationForm.heroSubtitle} onChange={(event) => updateDestination('heroSubtitle', event.target.value)} placeholder="Texto de apoio do banner" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <div className="sm:col-span-2 rounded-[1.5rem] border border-[#336886]/15 bg-[linear-gradient(180deg,#f8fbfa,#ffffff)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Fotos da cidade</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Até 4 imagens para a vitrine pública. A primeira foto preenchida vira a capa do destino.</p>
                    </div>
                    <span className="rounded-full bg-[#edf5fa] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">
                      vitrine 16:9
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {normalizeDestinationGallerySlots(destinationForm.gallery, destinationForm.name || 'Destino').map((slot: any, index: number) => (
                      <div key={`destination-gallery-${index}`} className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm">
                        <MediaUploadField
                          label={`Foto ${index + 1}${index === 0 ? ' · capa sugerida' : ''}`}
                          hint={index === 0 ? 'Boa para paisagem horizontal da cidade.' : 'Use para atrativos, vista ou campanha local.'}
                          urlValue={slot.imageUrl}
                          fileValue={slot.imageFile}
                          onUrlChange={(value: string) => updateDestinationGallerySlot(index, {
                            imageUrl: value,
                            ...(value ? { imageFile: '', active: true } : {}),
                          })}
                          onFileChange={(value: string) => updateDestinationGallerySlot(index, {
                            imageFile: value,
                            ...(value ? { imageUrl: '', active: true } : {}),
                          })}
                          onError={setError}
                          maxEdge={1800}
                          previewMode="wide"
                        />
                        <div className="mt-3 grid gap-2">
                          <input
                            value={slot.title}
                            onChange={(event) => updateDestinationGallerySlot(index, { title: event.target.value })}
                            placeholder="Legenda curta opcional"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none"
                          />
                          <input
                            value={slot.actionTarget}
                            onChange={(event) => updateDestinationGallerySlot(index, { actionTarget: event.target.value })}
                            placeholder="Link ao clicar na foto (opcional)"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none"
                          />
                          <select
                            value={String(slot.active !== false)}
                            onChange={(event) => updateDestinationGallerySlot(index, { active: event.target.value === 'true' })}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none"
                          >
                            <option value="true">Mostrar no carrossel</option>
                            <option value="false">Ocultar esta foto</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <MediaUploadField
                  label="Logo/ícone do destino"
                  hint="Opcional. Ajuda na identidade visual da cidade."
                  urlValue={destinationForm.logoUrl}
                  fileValue={destinationForm.logoFile}
                  onUrlChange={(value: string) => updateDestination('logoUrl', value)}
                  onFileChange={(value: string) => updateDestination('logoFile', value)}
                  onError={setError}
                  maxEdge={900}
                />
                <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[180px_1fr_1fr]">
                  <label className="grid gap-1.5">
                    <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">CEP de referência</span>
                    <input value={destinationZipCode} onChange={(event) => setDestinationZipCode(formatCepBr(event.target.value))} placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                    {destinationZipLookupLoading ? <span className="px-1 text-[11px] font-bold text-[#336886]">Buscando coordenadas...</span> : null}
                    {destinationZipLookupError ? <span className="px-1 text-[11px] font-bold text-rose-600">{destinationZipLookupError}</span> : null}
                  </label>
                  <label className="grid gap-1.5">
                    <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Latitude</span>
                    <input value={destinationForm.lat} readOnly placeholder="Preenchida pelo CEP" className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-600 outline-none" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Longitude</span>
                    <input value={destinationForm.lng} readOnly placeholder="Preenchida pelo CEP" className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-600 outline-none" />
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Ordem na Home</span>
                  <input type="number" min="0" value={destinationForm.sortOrder} onChange={(event) => updateDestination('sortOrder', event.target.value)} placeholder="0" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                </label>
                <select value={String(destinationForm.active !== false)} onChange={(event) => updateDestination('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={destinationForm.description} onChange={(event) => updateDestination('description', event.target.value)} placeholder="Descrição" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingDestinationId ? 'Atualizar destino' : 'Salvar destino'}</button>
            </form>
              ) : null}

              {activeCadastroMode === 'place' ? (
            <form onSubmit={savePlace} className="w-full max-w-4xl min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingPlaceId ? 'Editar chalé/pousada' : 'Cadastrar chalé/pousada'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Hospedagem recebe lojas delivery vinculadas pelo lojista ou SuperAdmin.</p>
                </div>
                {editingPlaceId ? (
                  <button type="button" onClick={cancelPlaceEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              {editingPlaceId ? (
                <div className="mt-4 grid gap-2 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-2">
                  {[
                    { id: 'details', label: 'Dados do chalé', hint: 'Fotos, endereço e prioridade' },
                    { id: 'services', label: 'Serviços vinculados', hint: 'Adicionar, remover e ordenar' },
                  ].map((item: any) => {
                    const active = placeEditSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPlaceEditSection(item.id);
                          if (item.id === 'services') loadPlaceListings(placeForm.destinationId || selectedDestinationId, placeListingSearch);
                        }}
                        className={`rounded-[1.1rem] px-3 py-2.5 text-left transition ${
                          active ? 'bg-white text-slate-950 shadow-[0_14px_34px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:bg-white/70'
                        }`}
                      >
                        <p className="text-sm font-black">{item.label}</p>
                        <p className="mt-0.5 text-[11px] font-bold">{item.hint}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {!editingPlaceId || placeEditSection === 'details' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={placeForm.destinationId} onChange={(event) => updatePlace('destinationId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.destinations || []).map((destination: any) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                </select>
                <input required value={placeForm.name} onChange={(event) => updatePlace('name', event.target.value)} placeholder="Nome" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.slug} onChange={(event) => updatePlace('slug', event.target.value)} placeholder="Slug opcional" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <select value={placeForm.type} onChange={(event) => updatePlace('type', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="CHALE">Chalé</option>
                  <option value="POUSADA">Pousada</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="CABANA">Cabana</option>
                  <option value="CASA_TEMPORADA">Casa temporada</option>
                </select>
                <DestinationAddressFields
                  value={placeForm}
                  update={updatePlace}
                  loading={placeZipLookupLoading}
                  error={placeZipLookupError}
                  title="Endereço da hospedagem"
                  hint="Este é o ponto que será enviado para restaurantes, serviços e motoboys chegarem ao hóspede."
                />
                <div className="sm:col-span-2 rounded-[1.5rem] border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Banners do chalé ou pousada</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Cadastre até 4 fotos para o carrossel público. A primeira vira o destaque principal.</p>
                    </div>
                    <span className="rounded-full bg-[#edf5fa] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">
                      até 4 imagens
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {Array.from({ length: PLACE_BANNER_SLOTS }, (_, index) => {
                      const bannerUrls = normalizePlaceBannerSlots(placeForm.bannerUrls);
                      const bannerFiles = normalizePlaceBannerSlots(placeForm.bannerFiles);
                      return (
                        <MediaUploadField
                          key={`place-banner-${index}`}
                          label={`Banner ${index + 1}${index === 0 ? ' · principal' : ''}`}
                          hint={index === 0 ? 'Imagem principal do topo e dos cards.' : 'Imagem complementar para propaganda no carrossel.'}
                          urlValue={bannerUrls[index]}
                          fileValue={bannerFiles[index]}
                          onUrlChange={(value: string) => updatePlaceBannerUrl(index, value)}
                          onFileChange={(value: string) => updatePlaceBannerFile(index, value)}
                          onError={setError}
                          maxEdge={1800}
                        />
                      );
                    })}
                  </div>
                </div>
                <MediaUploadField
                  label="Logo/foto menor da hospedagem"
                  hint="Opcional. Use quando tiver marca ou foto complementar."
                  urlValue={placeForm.logoUrl}
                  fileValue={placeForm.logoFile}
                  onUrlChange={(value: string) => updatePlace('logoUrl', value)}
                  onFileChange={(value: string) => updatePlace('logoFile', value)}
                  onError={setError}
                  maxEdge={900}
                />
                <input value={placeForm.whatsapp} onChange={(event) => updatePlace('whatsapp', formatPhoneBr(event.target.value))} placeholder="WhatsApp" inputMode="tel" autoComplete="tel" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={placeForm.websiteUrl} onChange={(event) => updatePlace('websiteUrl', event.target.value)} placeholder="Site / Airbnb / Booking" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.instagramUrl} onChange={(event) => updatePlace('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <label className="grid gap-1.5">
                  <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Prioridade na lista</span>
                  <input type="number" min="0" value={placeForm.sortOrder} onChange={(event) => updatePlace('sortOrder', event.target.value)} placeholder="0" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                </label>
                <select value={String(placeForm.active !== false)} onChange={(event) => updatePlace('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={placeForm.description} onChange={(event) => updatePlace('description', event.target.value)} placeholder="Descrição pública da hospedagem" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <textarea value={placeForm.deliveryInstructions} onChange={(event) => updatePlace('deliveryInstructions', event.target.value)} placeholder="Instruções de entrega" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.5rem] border border-[#336886]/10 bg-[linear-gradient(135deg,#ffffff,#f3faf8)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Serviços deste chalé</p>
                        <h3 className="text-lg font-black text-slate-950">{placeForm.name || 'Hospedagem selecionada'}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Essa visão é o inverso da edição do serviço: aqui o chalé é o centro, e você controla o que aparece nele.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={createListingForEditingPlace} className={actionButtonClass('primary')}>
                          <Plus size={13} weight="bold" />
                          Novo serviço neste chalé
                        </button>
                        <button type="button" onClick={() => loadPlaceListings(placeForm.destinationId || selectedDestinationId, placeListingSearch)} className={actionButtonClass('neutral')}>
                          Atualizar
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                      <div className="relative">
                        <MagnifyingGlass size={17} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={placeListingSearch}
                          onChange={(event) => setPlaceListingSearch(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              loadPlaceListings(placeForm.destinationId || selectedDestinationId, placeListingSearch);
                            }
                          }}
                          placeholder="Buscar serviço existente para vincular..."
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#336886]"
                        />
                      </div>
                      <button type="button" onClick={() => loadPlaceListings(placeForm.destinationId || selectedDestinationId, placeListingSearch)} className={actionButtonClass('neutral')}>
                        Buscar
                      </button>
                    </div>
                  </div>

                  {placeListingsLoading ? (
                    <p className="rounded-2xl bg-[#edf5fa] px-4 py-3 text-sm font-bold text-[#336886]">Carregando serviços vinculados...</p>
                  ) : null}

                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-950">Aparecem neste chalé</p>
                        <p className="text-xs font-semibold text-slate-500">{placeServiceRows.length} serviço(s) visível(is), incluindo escopo destino inteiro.</p>
                      </div>
                      <Sparkle size={22} weight="duotone" className="text-[#336886]" />
                    </div>
                    <div className="mt-3 grid gap-2">
                      {placeServiceRows.map((listing: any) => {
                        const placeIds = normalizeListingPlaceIds(listing.hospitalityPlaceIds, listing.hospitalityPlaceId);
                        const globalScope = placeIds.length === 0;
                        const currentLink = listingLinkForPlace(listing, editingPlaceId);
                        const canRemove = !globalScope && placeIds.length > 1;
                        return (
                          <article key={listing.id} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-3">
                            <div className="flex min-w-0 gap-3">
                              <img src={imageFor(listing)} alt={listing.title} className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-black text-slate-950">{listing.title}</p>
                                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{labelForListingCategory(listing.category)}</p>
                                    {listing.store ? (
                                      <p className="mt-1 text-xs font-bold text-emerald-700">Loja: {listing.store.name}</p>
                                    ) : null}
                                  </div>
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${globalScope ? 'bg-[#EEF6F4] text-[#336886]' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
                                    {globalScope ? 'Destino inteiro' : 'Vínculo direto'}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                  {!globalScope ? (
                                    <label className="grid w-24 gap-1">
                                      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Ordem</span>
                                      <input
                                        type="number"
                                        min="0"
                                        defaultValue={Number(currentLink?.sortOrder || 0)}
                                        onBlur={(event) => updateListingSortForEditingPlace(listing, event.target.value)}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            (event.currentTarget as HTMLInputElement).blur();
                                          }
                                        }}
                                        className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-black text-slate-900 outline-none focus:border-[#336886]"
                                      />
                                    </label>
                                  ) : (
                                    <p className="max-w-md text-xs font-semibold text-slate-500">
                                      Serviço global. Para tirar de um chalé específico, primeiro restrinja o escopo na edição do serviço.
                                    </p>
                                  )}
                                  <button type="button" onClick={() => editListingFromPlace(listing)} className={actionButtonClass('neutral')}>
                                    <PencilSimple size={13} weight="bold" />
                                    Editar serviço
                                  </button>
                                  {!globalScope ? (
                                    <button
                                      type="button"
                                      disabled={saving || !canRemove}
                                      title={canRemove ? 'Remove só deste chalé, sem apagar o serviço.' : 'Único vínculo: edite o serviço para trocar ou desativar sem virar destino inteiro.'}
                                      onClick={() => removeListingFromEditingPlace(listing)}
                                      className={actionButtonClass(canRemove ? 'danger' : 'muted')}
                                    >
                                      <Trash size={13} weight="bold" />
                                      Remover vínculo
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                      {!placeListingsLoading && !placeServiceRows.length ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
                          Nenhum serviço aparece neste chalé ainda. Busque um serviço existente ou crie um novo já vinculado.
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-amber-100 bg-amber-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-950">Adicionar serviço existente</p>
                        <p className="text-xs font-semibold text-slate-500">Lista serviços da cidade que ainda não aparecem neste chalé.</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-amber-700">{placeAvailableListingRows.length} disponível(is)</span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {placeAvailableListingRows.map((listing: any) => (
                        <button
                          key={listing.id}
                          type="button"
                          onClick={() => addListingToEditingPlace(listing)}
                          className="flex min-w-0 items-center gap-3 rounded-2xl border border-white bg-white/85 p-2 text-left shadow-[0_12px_30px_rgba(120,53,15,0.06)] transition hover:border-amber-200"
                        >
                          <img src={imageFor(listing)} alt={listing.title} className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-amber-100" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-950">{listing.title}</p>
                            <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{labelForListingCategory(listing.category)}</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <Plus size={15} weight="bold" />
                          </span>
                        </button>
                      ))}
                      {!placeListingsLoading && !placeAvailableListingRows.length ? (
                        <p className="rounded-2xl border border-dashed border-amber-200 bg-white/70 px-3 py-4 text-sm font-bold text-slate-500 md:col-span-2">
                          Nenhum serviço disponível neste filtro. Use a busca ou crie um novo serviço para este chalé.
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>
              )}
              {(!editingPlaceId || placeEditSection === 'details') ? (
                <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingPlaceId ? 'Atualizar hospedagem' : 'Salvar hospedagem'}</button>
              ) : null}
            </form>
              ) : null}

              {activeCadastroMode === 'listing' ? (
            <form onSubmit={saveListing} className="w-full max-w-4xl min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingListingId ? 'Editar serviço/atração' : 'Cadastrar serviço/atração'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Serviço é uma indicação local. Se selecionar uma hospedagem, ele aparece dentro do chalé como atendimento por WhatsApp.</p>
                </div>
                {editingListingId ? (
                  <button type="button" onClick={cancelListingEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={listingForm.destinationId} onChange={(event) => updateListingDestination(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.destinations || []).map((destination: any) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                </select>
                <div className="sm:col-span-2 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Onde esse serviço aparece?</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Selecione um ou mais chalés/pousadas. Sem seleção, o serviço aparece no destino inteiro.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setListingPlaceIds([])}
                      className={`rounded-full px-3 py-2 text-xs font-black transition ${
                        selectedListingPlaceIds.length === 0
                          ? 'bg-[#336886] text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-[#336886]/40'
                      }`}
                    >
                      Destino inteiro
                    </button>
                  </div>
                  {listingDestinationPlaces.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {listingDestinationPlaces.map((place: any) => {
                        const selected = selectedListingPlaceIds.includes(String(place.id));
                        const cover = imageFor(place);
                        return (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => toggleListingPlace(String(place.id))}
                            className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition ${
                              selected
                                ? 'border-[#336886] bg-white shadow-[0_14px_40px_rgba(51,104,134,0.14)]'
                                : 'border-white bg-white/75 hover:border-[#336886]/35 hover:bg-white'
                            }`}
                            aria-pressed={selected}
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                              {cover ? (
                                <img src={cover} alt={place.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <Bed size={22} weight="duotone" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-900">{place.name}</p>
                              <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                {place.type || 'Hospedagem'} · {place.city || place.destination?.city || place.destination?.name || 'Destino'}
                              </p>
                              {place.address ? (
                                <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{place.address}</p>
                              ) : null}
                            </div>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                              selected ? 'border-[#336886] bg-[#336886] text-white' : 'border-slate-200 bg-slate-50 text-transparent'
                            }`}>
                              ✓
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-500">
                      Nenhuma hospedagem cadastrada para este destino ainda. O serviço ficará disponível no destino inteiro.
                    </div>
                  )}
                  {selectedListingPlaceLinks.length ? (
                    <div className="mt-3 rounded-[1.25rem] border border-[#336886]/10 bg-white p-3 shadow-[0_12px_34px_rgba(51,104,134,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#336886]">Prioridade por hospedagem</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Número menor aparece primeiro naquele chalé. Use para destacar parceiros estratégicos sem duplicar serviço.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#EEF6F4] px-3 py-1 text-[10px] font-black text-[#336886]">
                          {selectedListingPlaceLinks.length} selecionada(s)
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {selectedListingPlaceLinks.map((link) => {
                          const place = listingDestinationPlaces.find((item: any) => String(item.id) === String(link.hospitalityPlaceId));
                          if (!place) return null;
                          const cover = imageFor(place);
                          return (
                            <div key={link.hospitalityPlaceId} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-white">
                                {cover ? (
                                  <img src={cover} alt={place.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[#336886]">
                                    <Bed size={18} weight="duotone" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-slate-900">{place.name}</p>
                                <p className="text-[11px] font-bold text-slate-500">Ordem do serviço dentro desta hospedagem</p>
                              </div>
                              <label className="grid w-24 shrink-0 gap-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Ordem</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={link.sortOrder}
                                  onChange={(event) => updateListingPlaceSortOrder(link.hospitalityPlaceId, event.target.value)}
                                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-black text-slate-900 outline-none focus:border-[#336886]"
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                <select value={listingForm.storeId} onChange={(event) => updateListing('storeId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2">
                  <option value="">Sem loja vinculada / aguardando validação</option>
                  {(data.stores || []).map((store: any) => (
                    <option key={store.id} value={store.id}>
                      {store.name}{store.settings?.city ? ` · ${store.settings.city}` : ''}
                    </option>
                  ))}
                </select>
                <select value={listingForm.category} onChange={(event) => updateListing('category', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="PASSEIO">Passeio</option>
                  <option value="MASSAGEM">Massagem</option>
                  <option value="RESTAURANTE_VISITAR">Restaurante / delivery local</option>
                  <option value="NOITE">Noite</option>
                  <option value="ATRATIVO">Atrativo</option>
                  <option value="SERVICO">Serviço</option>
                </select>
                <input required value={listingForm.title} onChange={(event) => updateListing('title', event.target.value)} placeholder="Título" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <MediaUploadField
                  label="Foto do serviço/atração"
                  hint="Escolha a foto do card ou cole uma URL pública."
                  urlValue={listingForm.imageUrl}
                  fileValue={listingForm.imageFile}
                  onUrlChange={(value: string) => updateListing('imageUrl', value)}
                  onFileChange={(value: string) => updateListing('imageFile', value)}
                  onError={setError}
                  maxEdge={1400}
                />
                <DestinationAddressFields
                  value={listingForm}
                  update={updateListing}
                  loading={listingZipLookupLoading}
                  error={listingZipLookupError}
                  title="Endereço do restaurante ou serviço"
                  hint="Com CEP e coordenada, a tela de rota mostra distância do serviço até o chalé com mais precisão."
                />
                <input value={listingForm.whatsapp} onChange={(event) => updateListing('whatsapp', formatPhoneBr(event.target.value))} placeholder="WhatsApp" inputMode="tel" autoComplete="tel" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.websiteUrl} onChange={(event) => updateListing('websiteUrl', event.target.value)} placeholder="Site / cardápio / link externo" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.instagramUrl} onChange={(event) => updateListing('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.ctaUrl} onChange={(event) => updateListing('ctaUrl', event.target.value)} placeholder="Link de contato/CTA" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <label className="grid gap-1.5">
                  <span className="px-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Prioridade geral</span>
                  <input type="number" min="0" value={listingForm.sortOrder} onChange={(event) => updateListing('sortOrder', event.target.value)} placeholder="0" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                </label>
                <select value={String(listingForm.active !== false)} onChange={(event) => updateListing('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={listingForm.description} onChange={(event) => updateListing('description', event.target.value)} placeholder="Descrição" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingListingId ? 'Atualizar serviço' : 'Salvar serviço'}</button>
            </form>
              ) : null}

              {activeCadastroMode === 'storeLink' ? (
            <form onSubmit={linkStore} className="w-full max-w-3xl min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Vincular loja a hospedagem</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={storeLinkForm.placeId} onChange={(event) => updateStoreLink('placeId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.places || []).map((place: any) => <option key={place.id} value={place.id}>{place.name} · {place.destination?.name}</option>)}
                </select>
                <select value={storeLinkForm.storeId} onChange={(event) => updateStoreLink('storeId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.stores || []).map((store: any) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
                <input value={storeLinkForm.deliveryFee} onChange={(event) => updateStoreLink('deliveryFee', event.target.value)} placeholder="Taxa de entrega" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={storeLinkForm.estimatedMinutes} onChange={(event) => updateStoreLink('estimatedMinutes', event.target.value)} placeholder="Tempo estimado" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={storeLinkForm.notes} onChange={(event) => updateStoreLink('notes', event.target.value)} placeholder="Observação" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Vincular loja</button>
            </form>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'requests' ? (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-[radial-gradient(circle_at_0%_0%,rgba(51,104,134,0.14),transparent_34%),linear-gradient(135deg,#ffffff,#f8fafc)] p-5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-[#EEF6F4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]">
                    <WarningCircle size={14} weight="fill" />
                    Central de solicitações
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">Fila por cidade, hospedagem e serviço</h2>
                  <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
                    A aprovação continua usando a regra atual. A tela só organiza a operação para enxergar pendências por destino sem perder contexto.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-[430px] lg:grid-cols-4">
                  {[
                    { label: 'Pendentes', value: partnerOnboardingMetrics.pending, icon: ClockCountdown, tone: 'text-amber-700 bg-amber-50' },
                    { label: 'Assumir perfil', value: partnerOnboardingMetrics.claimPending, icon: ShieldCheck, tone: 'text-[#153A4C] bg-[#336886]/10' },
                    { label: 'Sem ativar', value: partnerOnboardingMetrics.invited, icon: PaperPlaneTilt, tone: 'text-sky-700 bg-sky-50' },
                    { label: 'Ativos', value: partnerOnboardingMetrics.active, icon: CheckCircle, tone: 'text-emerald-700 bg-emerald-50' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-[1.25rem] border border-white bg-white/82 p-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.35)]">
                        <span className={`inline-grid h-8 w-8 place-items-center rounded-xl ${item.tone}`}>
                          <Icon size={17} weight="duotone" />
                        </span>
                        <p className="mt-2 text-xl font-black text-slate-950">{item.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
            {inviteFeedback ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                {inviteFeedback}
              </div>
            ) : null}

            {requestBoard.length ? (
              <div className="grid gap-4">
                {requestBoard.map((group) => (
                  <article key={group.id} className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-3 shadow-[0_22px_56px_-44px_rgba(15,23,42,0.48)]">
                    <div className="rounded-[1.55rem] border border-white bg-white p-4 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.42)]">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.15rem] bg-[#153A4C] text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.68)]">
                            <MapTrifold size={22} weight="duotone" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black tracking-[-0.03em] text-slate-950">{group.name}</p>
                            <p className="text-xs font-bold text-slate-500">
                              {[group.city, group.state].filter(Boolean).join(' · ') || 'Destino aguardando validação'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{group.total} solicitação(ões)</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                            group.pending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {group.pending ? `${group.pending} pendente(s)` : 'Sem pendência'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-3">
                      {renderRequestSection(
                        'Chalés e pousadas',
                        'Solicitações de hospedagem que viram página pública.',
                        Bed,
                        group.partnerHospitality,
                        renderPartnerRequestCard
                      )}
                      {renderRequestSection(
                        'Serviços e lugares',
                        'Prestadores, restaurantes e experiências locais.',
                        Sparkle,
                        group.partnerServices,
                        renderPartnerRequestCard
                      )}
                      {renderRequestSection(
                        'Lojas para chalés',
                        'Lojistas pedindo para atender uma hospedagem.',
                        Buildings,
                        group.storeRequests,
                        renderStoreRequestCard
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                <WarningCircle size={30} weight="duotone" className="mx-auto text-[#336886]" />
                <h3 className="mt-3 text-lg font-black text-slate-950">Nenhuma solicitação cadastrada</h3>
                <p className="mx-auto mt-1 max-w-lg text-sm font-semibold text-slate-500">
                  Quando um chalé, serviço ou loja demonstrar interesse, ele aparecerá aqui já agrupado por cidade.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {activeInviteItem && activeInvitePayload ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.75)]">
            <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_0%_0%,rgba(51,104,134,0.18),transparent_34%),linear-gradient(135deg,#ffffff,#f8fafc)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">{activeInviteKindLabel}</p>
                  <h3 className="mt-1 break-words text-xl font-black tracking-[-0.03em] text-slate-950">{activeInviteTitle}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Copie a mensagem ou abra direto no WhatsApp. O link curto abre o cadastro oficial com dados pré-preenchidos.
                  </p>
                </div>
                <button type="button" onClick={() => { setInviteListing(null); setInvitePlace(null); }} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                  Fechar
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Link curto oficial</p>
                <p className="mt-2 break-all rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#153A4C] ring-1 ring-slate-200">{activeInvitePayload.claimUrl}</p>
              </div>

              <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Mensagem pronta</p>
                <textarea
                  readOnly
                  value={activeInvitePayload.message}
                  rows={10}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold leading-relaxed text-slate-700 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="button" onClick={() => copyTextToClipboard(activeInvitePayload.message, `Convite de ${activeInviteTitle} copiado.`)} className={actionButtonClass('primary')}>
                  <CopySimple size={14} weight="bold" />
                  Copiar mensagem
                </button>
                <button type="button" onClick={() => copyTextToClipboard(activeInvitePayload.claimUrl, 'Link curto copiado.')} className={actionButtonClass('neutral')}>
                  <LinkSimpleHorizontal size={14} weight="bold" />
                  Copiar link
                </button>
                {activeInvitePayload.whatsappUrl ? (
                  <a href={activeInvitePayload.whatsappUrl} target="_blank" rel="noreferrer" className={actionButtonClass('success')}>
                    <PaperPlaneTilt size={14} weight="bold" />
                    Abrir WhatsApp
                  </a>
                ) : (
                  <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                    Sem WhatsApp válido cadastrado
                  </span>
                )}
                <a href={activeInvitePayload.claimUrl} target="_blank" rel="noreferrer" className={actionButtonClass('amber')}>
                  Ver cadastro
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
