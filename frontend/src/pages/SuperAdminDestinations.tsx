// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bed, Buildings, CheckCircle, Compass, Eye, EyeSlash, ImageSquare, LinkSimpleHorizontal, MagnifyingGlass, MapTrifold, PencilSimple, Plus, Sparkle, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import { destinationService } from '../services/destinationService';
import { addressLookupService } from '../services/addressLookupService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { canUseNativeImagePicker, pickNativeImageAsDataUrl } from '../utils/nativeImagePicker';

const emptyDestination = {
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
};

const emptyPlace = {
  destinationId: '',
  name: '',
  slug: '',
  type: 'CHALE',
  description: '',
  zipCode: '',
  address: '',
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
  storeId: '',
  title: '',
  category: 'SERVICO',
  description: '',
  address: '',
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

const formatCepBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

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
}: any) => {
  const previewUrl = fileValue || resolveAssetUrl(urlValue || '') || '';
  const canUseNativePicker = canUseNativeImagePicker();

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
    <div className="sm:col-span-2 rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-3">
      <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
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
              <button type="button" onClick={handleNativePicker} className="inline-flex items-center gap-2 rounded-full bg-[#153A4C] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white">
                <UploadSimple size={14} weight="bold" />
                Tirar ou escolher foto
              </button>
            ) : (
              <label className="relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-[#153A4C] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white">
                <UploadSimple size={14} weight="bold" />
                Escolher foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFile}
                />
              </label>
            )}
            {(fileValue || urlValue) ? (
              <button type="button" onClick={() => { onFileChange(''); onUrlChange(''); }} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-slate-600">
                Limpar
              </button>
            ) : null}
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
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

export function SuperAdminDestinations() {
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [destinationForm, setDestinationForm] = useState(emptyDestination);
  const [placeForm, setPlaceForm] = useState(emptyPlace);
  const [listingForm, setListingForm] = useState(emptyListing);
  const [storeLinkForm, setStoreLinkForm] = useState(emptyStoreLink);
  const [editingDestinationId, setEditingDestinationId] = useState('');
  const [editingPlaceId, setEditingPlaceId] = useState('');
  const [editingListingId, setEditingListingId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cadastroMode, setCadastroMode] = useState<'destination' | 'place' | 'listing' | 'storeLink'>('destination');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [contentFilter, setContentFilter] = useState<'all' | 'destinations' | 'places' | 'listings'>('all');
  const [listingCategoryFilter, setListingCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [placeZipLookupLoading, setPlaceZipLookupLoading] = useState(false);
  const [placeZipLookupError, setPlaceZipLookupError] = useState('');

  const load = async () => {
    if (!localStorage.getItem('superAdminToken')) {
      window.location.href = '/superadmin';
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
      return;
    }
    setDetailLoading(true);
    try {
      const [placesPayload, listingsPayload] = await Promise.all([
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
      ]);
      setPlacesResult(placesPayload || { items: [], pagination: { ...emptyPagination, pageSize: 10 } });
      setListingsResult(listingsPayload || { items: [], pagination: { ...emptyPagination, pageSize: 10 } });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar detalhes da cidade.');
    } finally {
      setDetailLoading(false);
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
          city: String(addressData?.city || current.city || ''),
          state: String(addressData?.state || current.state || '').toUpperCase().slice(0, 2),
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

  const updateDestination = (key: string, value: any) => setDestinationForm((current) => ({ ...current, [key]: value }));
  const updatePlace = (key: string, value: any) => setPlaceForm((current) => ({ ...current, [key]: value }));
  const updateListing = (key: string, value: any) => setListingForm((current) => ({ ...current, [key]: value }));
  const updateStoreLink = (key: string, value: any) => setStoreLinkForm((current) => ({ ...current, [key]: value }));

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

  const startDestinationEdit = (destination: any) => {
    setEditingDestinationId(destination.id);
    setEditingPlaceId('');
    setEditingListingId('');
    setCadastroMode('destination');
    setDestinationForm({
      ...emptyDestination,
      ...Object.fromEntries(Object.entries(destination).map(([key, value]) => [key, toFormValue(value)])),
      state: String(destination.state || 'SP').toUpperCase().slice(0, 2),
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
    setActiveTab('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startListingEdit = (listing: any) => {
    setEditingDestinationId('');
    setEditingPlaceId('');
    setEditingListingId(listing.id);
    setCadastroMode('listing');
    setListingForm({
      ...emptyListing,
      ...Object.fromEntries(Object.entries(listing).map(([key, value]) => [key, toFormValue(value)])),
      destinationId: listing.destinationId || listing.destination?.id || '',
      hospitalityPlaceId: listing.hospitalityPlaceId || '',
      storeId: listing.storeId || listing.store?.id || '',
      active: listing.active !== false,
      featured: listing.featured === true,
      sortOrder: Number(listing.sortOrder || 0),
    });
    setActiveTab('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelDestinationEdit = () => {
    setEditingDestinationId('');
    setDestinationForm(emptyDestination);
    setActiveTab('dashboard');
  };

  const cancelPlaceEdit = () => {
    setEditingPlaceId('');
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

  const saveDestination = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const wasEditing = Boolean(editingDestinationId);
      const payload = { ...destinationForm, active: toBool(destinationForm.active) };
      if (editingDestinationId) {
        await destinationService.adminUpdateDestination(editingDestinationId, payload);
      } else {
        await destinationService.adminCreateDestination(payload);
      }
      setEditingDestinationId('');
      setDestinationForm(emptyDestination);
      await refreshAdminData(editingDestinationId || selectedDestinationId);
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
      const payload = { ...listingForm, active: toBool(listingForm.active), featured: toBool(listingForm.featured) };
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

  const reviewPartner = async (requestId: string, status: 'approved' | 'rejected') => {
    setSaving(true);
    setError('');
    try {
      await destinationService.adminReviewPartnerRequest(requestId, { status });
      await refreshAdminData(selectedDestinationId);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revisar solicitação.');
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

  const tabs = [
    { id: 'dashboard', label: 'Resumo', icon: Compass },
    { id: 'cadastro', label: 'Cadastro', icon: Plus },
    { id: 'requests', label: 'Solicitações', icon: WarningCircle, badge: metrics.pending },
  ];
  const editingCadastroMode = editingDestinationId ? 'destination' : editingPlaceId ? 'place' : editingListingId ? 'listing' : '';
  const activeCadastroMode = editingCadastroMode || cadastroMode;
  const cadastroModeOptions = [
    { id: 'destination', label: 'Cidade', description: 'Destino turístico e banner principal.', icon: MapTrifold },
    { id: 'place', label: 'Chalé/Pousada', description: 'Hospedagem com logo, banner e instruções.', icon: Bed },
    { id: 'listing', label: 'Serviço/Lugar', description: 'Passeio, atrativo, restaurante ou serviço local.', icon: Sparkle },
    { id: 'storeLink', label: 'Vínculo loja', description: 'Loja que entrega em uma hospedagem.', icon: Buildings },
  ];
  const selectedDestination = (catalog.destinations || []).find((destination: any) => String(destination.id) === String(selectedDestinationId)) || null;
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

  return (
    <AdminLayout contextLabel="Destinos" showHeader={false}>
      <div className="space-y-5">
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
                        <Bed size={24} weight="duotone" className="text-[#336886]" />
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
                          <h4 className="text-lg font-black text-slate-950">Curadoria local e pré-lojas</h4>
                          <p className="mt-0.5 text-xs font-bold text-slate-500">{listingsResult.pagination?.total || 0} serviço(s) nesta cidade</p>
                        </div>
                        <Sparkle size={24} weight="duotone" className="text-amber-700" />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {(listingsResult.items || []).map((listing: any) => (
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
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => startListingEdit(listing)} className={actionButtonClass('neutral')}>
                                <PencilSimple size={13} weight="bold" />
                                Editar
                              </button>
                              <button type="button" disabled={saving} onClick={() => toggleListingActive(listing)} className={actionButtonClass(listing.active === false ? 'success' : 'muted')}>
                                {listing.active === false ? 'Ativar' : 'Desativar'}
                              </button>
                            </div>
                          </div>
                        ))}
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
            <form onSubmit={saveDestination} className="max-w-4xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
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
                <input required value={destinationForm.name} onChange={(event) => updateDestination('name', event.target.value)} placeholder="Nome" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.slug} onChange={(event) => updateDestination('slug', event.target.value)} placeholder="Slug" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.city} onChange={(event) => updateDestination('city', event.target.value)} placeholder="Cidade" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.state} onChange={(event) => updateDestination('state', event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.heroTitle} onChange={(event) => updateDestination('heroTitle', event.target.value)} placeholder="Título hero" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={destinationForm.heroSubtitle} onChange={(event) => updateDestination('heroSubtitle', event.target.value)} placeholder="Subtítulo hero" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <MediaUploadField
                  label="Foto/banner da cidade"
                  hint="Escolha uma imagem horizontal ou cole uma URL pública."
                  urlValue={destinationForm.bannerUrl}
                  fileValue={destinationForm.bannerFile}
                  onUrlChange={(value: string) => updateDestination('bannerUrl', value)}
                  onFileChange={(value: string) => updateDestination('bannerFile', value)}
                  onError={setError}
                  maxEdge={1800}
                />
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
                <input value={destinationForm.lat} onChange={(event) => updateDestination('lat', event.target.value)} placeholder="Latitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.lng} onChange={(event) => updateDestination('lng', event.target.value)} placeholder="Longitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={destinationForm.sortOrder} onChange={(event) => updateDestination('sortOrder', event.target.value)} placeholder="Ordem" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
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
            <form onSubmit={savePlace} className="max-w-4xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
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
                <input value={placeForm.city} onChange={(event) => updatePlace('city', event.target.value)} placeholder="Cidade" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.state} onChange={(event) => updatePlace('state', event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div>
                    <input value={placeForm.zipCode} onChange={(event) => updatePlace('zipCode', formatCepBr(event.target.value))} placeholder="CEP" inputMode="numeric" autoComplete="postal-code" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                    {placeZipLookupLoading ? <p className="mt-1 px-1 text-[11px] font-bold text-[#336886]">Buscando endereço...</p> : null}
                    {placeZipLookupError ? <p className="mt-1 px-1 text-[11px] font-bold text-rose-600">{placeZipLookupError}</p> : null}
                  </div>
                  <input value={placeForm.address} onChange={(event) => updatePlace('address', event.target.value)} placeholder="Endereço" autoComplete="address-line1" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                </div>
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
                <input value={placeForm.lat} onChange={(event) => updatePlace('lat', event.target.value)} placeholder="Latitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.lng} onChange={(event) => updatePlace('lng', event.target.value)} placeholder="Longitude" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={placeForm.sortOrder} onChange={(event) => updatePlace('sortOrder', event.target.value)} placeholder="Ordem" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <select value={String(placeForm.active !== false)} onChange={(event) => updatePlace('active', event.target.value === 'true')} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
                  <option value="true">Ativo no público</option>
                  <option value="false">Inativo/oculto</option>
                </select>
                <textarea value={placeForm.description} onChange={(event) => updatePlace('description', event.target.value)} placeholder="Descrição pública da hospedagem" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <textarea value={placeForm.deliveryInstructions} onChange={(event) => updatePlace('deliveryInstructions', event.target.value)} placeholder="Instruções de entrega" rows={3} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
              </div>
              <button disabled={saving} className="mt-4 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingPlaceId ? 'Atualizar hospedagem' : 'Salvar hospedagem'}</button>
            </form>
              ) : null}

              {activeCadastroMode === 'listing' ? (
            <form onSubmit={saveListing} className="max-w-4xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{editingListingId ? 'Editar serviço/atração' : 'Cadastrar serviço/atração'}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Serviço é curadoria local. Se selecionar uma hospedagem, ele aparece dentro do chalé como atendimento por WhatsApp.</p>
                </div>
                {editingListingId ? (
                  <button type="button" onClick={cancelListingEdit} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                    Cancelar
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={listingForm.destinationId} onChange={(event) => updateListing('destinationId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" required>
                  {(data.destinations || []).map((destination: any) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                </select>
                <select value={listingForm.hospitalityPlaceId} onChange={(event) => updateListing('hospitalityPlaceId', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2">
                  <option value="">Aparece no destino inteiro</option>
                  {(data.places || [])
                    .filter((place: any) => !listingForm.destinationId || place.destinationId === listingForm.destinationId)
                    .map((place: any) => <option key={place.id} value={place.id}>{place.name} · {place.destination?.name}</option>)}
                </select>
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
                <input value={listingForm.address} onChange={(event) => updateListing('address', event.target.value)} placeholder="Endereço/local" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.whatsapp} onChange={(event) => updateListing('whatsapp', formatPhoneBr(event.target.value))} placeholder="WhatsApp" inputMode="tel" autoComplete="tel" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.websiteUrl} onChange={(event) => updateListing('websiteUrl', event.target.value)} placeholder="Site / cardápio / link externo" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.instagramUrl} onChange={(event) => updateListing('instagramUrl', event.target.value)} placeholder="Instagram" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
                <input value={listingForm.ctaUrl} onChange={(event) => updateListing('ctaUrl', event.target.value)} placeholder="Link de contato/CTA" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none sm:col-span-2" />
                <input value={listingForm.sortOrder} onChange={(event) => updateListing('sortOrder', event.target.value)} placeholder="Ordem" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none" />
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
            <form onSubmit={linkStore} className="max-w-3xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
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
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Chalés/prestadores aguardando aprovação</h2>
              <div className="mt-4 space-y-3">
                {(data.partnerRequests || []).map((request: any) => (
                  <article key={request.id} className={`rounded-2xl border p-4 ${requestTone(request.status)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{request.name}</p>
                        <p className="text-xs font-bold text-slate-500">{request.partnerType} · {request.destination?.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">{request.responsibleName} · {request.responsibleEmail}</p>
                      </div>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">{request.status}</span>
                    </div>
                    {String(request.status) === 'pending' ? (
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={saving} onClick={() => reviewPartner(request.id, 'approved')} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">Aprovar</button>
                        <button type="button" disabled={saving} onClick={() => reviewPartner(request.id, 'rejected')} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white">Recusar</button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Lojas solicitando atender chalés</h2>
              <div className="mt-4 space-y-3">
                {(data.storeRequests || []).map((request: any) => (
                  <article key={request.id} className={`rounded-2xl border p-4 ${requestTone(request.status)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{request.store?.name}</p>
                        <p className="text-xs font-bold text-slate-500">{request.hospitalityPlace?.name} · {request.destination?.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">{request.message || 'Sem mensagem'}</p>
                      </div>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">{request.status}</span>
                    </div>
                    {String(request.status) === 'pending' ? (
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={saving} onClick={() => reviewStore(request.id, 'approved')} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">
                          <CheckCircle size={13} weight="fill" />
                          Aprovar
                        </button>
                        <button type="button" disabled={saving} onClick={() => reviewStore(request.id, 'rejected')} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white">Recusar</button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
