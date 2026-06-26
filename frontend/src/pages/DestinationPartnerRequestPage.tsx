// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bed, CheckCircle, Compass, Handshake, ImageSquare, LinkSimpleHorizontal, Sparkle, UploadSimple } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { Button, Chip, SectionHeader, SurfaceCard, TextareaField, TextField } from '../components/ui';
import { destinationService } from '../services/destinationService';
import { addressLookupService } from '../services/addressLookupService';
import { identityService } from '../services/identityService';
import { BRAZIL_STATES, loadBrazilCitiesByState, normalizeLocationName } from '../utils/brazilLocations';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { canUseNativeImagePicker, pickNativeImageAsDataUrl } from '../utils/nativeImagePicker';

const initialForm = {
  destinationId: '',
  destinationCity: '',
  destinationState: '',
  partnerType: 'HOSPITALITY',
  placeType: 'CHALE',
  category: 'SERVICO',
  name: '',
  description: '',
  zipCode: '',
  address: '',
  city: '',
  state: '',
  whatsapp: '',
  instagramUrl: '',
  websiteUrl: '',
  logoUrl: '',
  bannerUrl: '',
  imageUrl: '',
  logoFile: '',
  bannerFile: '',
  imageFile: '',
  deliveryInstructions: '',
  requestSource: '',
  claimedHospitalityPlaceId: '',
  claimedListingId: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  message: '',
};

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

const MediaUploadField = ({ label, hint, urlValue, fileValue, onUrlChange, onFileChange, onError, maxEdge = 1600 }: any) => {
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
    <SurfaceCard tone="soft" padding="sm" className="sm:col-span-2 rounded-[1.35rem] border-slate-200 bg-slate-50/80">
      <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageSquare size={34} weight="duotone" className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canUseNativePicker ? (
              <Button type="button" size="sm" onClick={handleNativePicker} leftIcon={<UploadSimple size={14} weight="bold" />} className="rounded-full uppercase tracking-[0.1em]">
                Tirar ou escolher foto
              </Button>
            ) : (
              <label className="jnc-ds-touch jnc-ds-focus-ring relative inline-flex min-h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-[#153A4C] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white">
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
              <Button type="button" variant="secondary" size="sm" onClick={() => { onFileChange(''); onUrlChange(''); }} className="rounded-full uppercase tracking-[0.1em]">
                Limpar
              </Button>
            ) : null}
          </div>
          <TextField
            name={`${String(label || 'imagem').toLowerCase().replace(/\s+/g, '-')}-url`}
            value={urlValue || ''}
            onChange={(event) => {
              onUrlChange(event.target.value);
              if (event.target.value) onFileChange('');
            }}
            placeholder="Ou cole uma URL pública da imagem"
            leftIcon={<LinkSimpleHorizontal size={16} weight="bold" />}
            wrapperClassName="mt-3"
            inputClassName="py-2.5 font-bold shadow-none"
          />
        </div>
      </div>
    </SurfaceCard>
  );
};

export function DestinationPartnerRequestPage() {
  const formStartRef = useRef<HTMLFormElement | null>(null);
  const firstPartnerControlRef = useRef<HTMLSelectElement | null>(null);
  const initialFocusAppliedRef = useRef(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hospitalityClaimKey = searchParams.toString();
  const hospitalityClaim = useMemo(() => {
    if (String(searchParams.get('source') || '').trim() !== 'hospitality_place_claim') return null;
    const read = (key: string) => String(searchParams.get(key) || '').trim();
    return {
      destinationId: read('destinationId'),
      destinationSlug: read('destinationSlug'),
      destinationCity: read('destinationCity'),
      destinationState: read('destinationState').toUpperCase().slice(0, 2),
      partnerType: 'HOSPITALITY',
      placeType: read('placeType') || 'CHALE',
      placeId: read('placeId'),
      name: read('name'),
      description: read('description'),
      zipCode: read('zipCode'),
      address: read('address'),
      city: read('city'),
      state: read('state').toUpperCase().slice(0, 2),
      whatsapp: read('whatsapp'),
      instagramUrl: read('instagramUrl'),
      websiteUrl: read('websiteUrl'),
      logoUrl: read('logoUrl'),
      bannerUrl: read('bannerUrl'),
      message: read('message'),
    };
  }, [hospitalityClaimKey]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [destinationMode, setDestinationMode] = useState<'existing' | 'new'>('existing');
  const [selectedDestinationState, setSelectedDestinationState] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [zipLookupError, setZipLookupError] = useState('');
  const [newDestinationCities, setNewDestinationCities] = useState<string[]>([]);
  const [newDestinationCitiesLoading, setNewDestinationCitiesLoading] = useState(false);
  const [newDestinationCityError, setNewDestinationCityError] = useState('');

  // Deteca se o solicitante está logado como cliente — pra oferecer o vínculo.
  // A sessão pode estar na chave base (customerSession) OU namespaced por loja
  // (customerSession:slug), então escaneamos todas as chaves customerSession*.
  const customerSession = useMemo(() => {
    try {
      let best: { token?: string; user?: any; customer?: any } | null = null;
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith('customerSession')) continue;
        let parsed: any;
        try { parsed = JSON.parse(localStorage.getItem(key) || '{}'); } catch { continue; }
        if (!parsed?.token || !parsed?.user) continue;
        if (!best || (parsed.user.email && !best.user?.email)) {
          best = parsed;
          if (parsed.user.email) break;
        }
      }
      if (!best) return null;
      const profile = best.user || best.customer || {};
      return {
        userId: String(profile.id || '').trim(),
        name: String(profile.fullName || profile.name || '').trim(),
        email: String(profile.email || '').trim(),
      };
    } catch {
      return null;
    }
  }, []);
  const [linkToAccount, setLinkToAccount] = useState(true);
  const [linkSuggestionEmail, setLinkSuggestionEmail] = useState('');
  const [emailLookup, setEmailLookup] = useState<{ exists: boolean; name?: string; roles?: string[]; userId?: string; checking?: boolean } | null>(null);

  // Validador: debounce no email do responsável → "este email já tem conta? integrar?".
  useEffect(() => {
    const email = String(form.responsibleEmail || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailLookup(null); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await identityService.lookup(email);
        if (active) setEmailLookup({ exists: Boolean(result?.exists), name: result?.name, roles: result?.roles, userId: result?.userId });
      } catch {
        if (active) setEmailLookup(null);
      }
    }, 450);
    return () => { active = false; window.clearTimeout(timer); };
  }, [form.responsibleEmail]);

  // O email do responsável bate com outra conta existente (e não é o próprio login)?
  const emailBelongsToOtherAccount = Boolean(
    emailLookup?.exists && emailLookup?.userId && emailLookup.userId !== customerSession?.userId,
  );

  useEffect(() => {
    let active = true;
    destinationService
      .listPublic()
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : [];
        const claimDestination = hospitalityClaim
          ? rows.find((destination: any) => {
              const sameId = hospitalityClaim.destinationId && String(destination.id) === String(hospitalityClaim.destinationId);
              const sameSlug = hospitalityClaim.destinationSlug && String(destination.slug) === String(hospitalityClaim.destinationSlug);
              return sameId || sameSlug;
            })
          : null;
        const firstDestination = claimDestination || rows[0] || null;
        setDestinations(rows);
        setSelectedDestinationState((current) => current || String(firstDestination?.state || hospitalityClaim?.destinationState || '').toUpperCase().slice(0, 2));
        if (!rows.length || (hospitalityClaim && !claimDestination)) setDestinationMode(hospitalityClaim ? 'new' : 'existing');
        setForm((current) => ({
          ...current,
          destinationId: hospitalityClaim ? claimDestination?.id || '' : current.destinationId || firstDestination?.id || '',
          destinationCity: hospitalityClaim?.destinationCity || current.destinationCity || firstDestination?.city || firstDestination?.name || '',
          destinationState: hospitalityClaim?.destinationState || current.destinationState || String(firstDestination?.state || '').toUpperCase().slice(0, 2),
          partnerType: hospitalityClaim?.partnerType || current.partnerType,
          placeType: hospitalityClaim?.placeType || current.placeType,
          name: hospitalityClaim?.name || current.name,
          description: hospitalityClaim?.description || current.description,
          zipCode: hospitalityClaim?.zipCode || current.zipCode,
          address: hospitalityClaim?.address || current.address,
          city: hospitalityClaim?.city || current.city || firstDestination?.city || firstDestination?.name || '',
          state: hospitalityClaim?.state || current.state || String(firstDestination?.state || '').toUpperCase().slice(0, 2),
          whatsapp: hospitalityClaim?.whatsapp || current.whatsapp,
          instagramUrl: hospitalityClaim?.instagramUrl || current.instagramUrl,
          websiteUrl: hospitalityClaim?.websiteUrl || current.websiteUrl,
          logoUrl: hospitalityClaim?.logoUrl || current.logoUrl,
          bannerUrl: hospitalityClaim?.bannerUrl || current.bannerUrl,
          requestSource: hospitalityClaim ? 'hospitality_place_claim' : current.requestSource,
          claimedHospitalityPlaceId: hospitalityClaim?.placeId || current.claimedHospitalityPlaceId,
          message: hospitalityClaim?.message || current.message,
        }));
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar destinos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hospitalityClaim]);

  useEffect(() => {
    if (loading || initialFocusAppliedRef.current) return;
    initialFocusAppliedRef.current = true;
    const timer = window.setTimeout(() => {
      const isCompactViewport = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
      const shouldFocusForm =
        window.location.hash === '#dados-parceiro' ||
        new URLSearchParams(window.location.search || '').get('focus') === 'partner' ||
        isCompactViewport;
      if (!shouldFocusForm) return;
      formStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => firstPartnerControlRef.current?.focus({ preventScroll: true }), 260);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const cleanedCep = String(form.zipCode || '').replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      setZipLookupError('');
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setZipLookupLoading(true);
      setZipLookupError('');
      try {
        const addressData = await addressLookupService.lookupZipCode(cleanedCep);
        if (!active) return;
        if (!addressData) {
          setZipLookupError('Não encontramos esse CEP. Preencha o endereço manualmente.');
          return;
        }
        setForm((current) => ({
          ...current,
          zipCode: formatCepBr(cleanedCep),
          address: String(addressData?.street || current.address || ''),
          city: String(addressData?.city || current.city || ''),
          state: String(addressData?.state || current.state || '').toUpperCase().slice(0, 2),
        }));
      } catch {
        if (active) setZipLookupError('Não encontramos esse CEP. Preencha o endereço manualmente.');
      } finally {
        if (active) setZipLookupLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.zipCode]);

  useEffect(() => {
    if (!success) return;
    formStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [success]);

  useEffect(() => {
    if (destinationMode !== 'new') return;
    const uf = String(form.destinationState || '').toUpperCase().slice(0, 2);
    if (!uf || uf.length !== 2) {
      setNewDestinationCities([]);
      setNewDestinationCityError('');
      return;
    }

    let active = true;
    setNewDestinationCitiesLoading(true);
    setNewDestinationCityError('');
    loadBrazilCitiesByState(uf)
      .then((cities) => {
        if (active) setNewDestinationCities(cities);
      })
      .catch(() => {
        if (!active) return;
        setNewDestinationCities([]);
        setNewDestinationCityError('Não conseguimos carregar a lista de cidades agora. Tente selecionar a UF novamente em alguns instantes.');
      })
      .finally(() => {
        if (active) setNewDestinationCitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [destinationMode, form.destinationState]);

  const update = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const stateOptions = useMemo(() => {
    return Array.from(new Set(destinations.map((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2)).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [destinations]);

  const filteredDestinations = useMemo(() => {
    if (!selectedDestinationState) return destinations;
    return destinations.filter((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2) === selectedDestinationState);
  }, [destinations, selectedDestinationState]);

  const availableNewDestinationCities = useMemo(() => {
    const uf = String(form.destinationState || '').toUpperCase().slice(0, 2);
    const openedCities = new Set(
      destinations
        .filter((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2) === uf)
        .flatMap((destination: any) => [destination.city, destination.name])
        .map(normalizeLocationName)
        .filter(Boolean)
    );
    return newDestinationCities.filter((city) => !openedCities.has(normalizeLocationName(city)));
  }, [destinations, form.destinationState, newDestinationCities]);

  const selectedDestination = useMemo(() => {
    return destinations.find((destination: any) => String(destination.id) === String(form.destinationId)) || null;
  }, [destinations, form.destinationId]);

  const existingDestinationForNewCity = useMemo(() => {
    const uf = String(form.destinationState || '').toUpperCase().slice(0, 2);
    const city = normalizeLocationName(form.destinationCity);
    if (!uf || !city) return null;
    return destinations.find((destination: any) => {
      const sameState = String(destination.state || '').toUpperCase().slice(0, 2) === uf;
      const destinationCity = normalizeLocationName(destination.city || destination.name);
      return sameState && destinationCity === city;
    }) || null;
  }, [destinations, form.destinationCity, form.destinationState]);

  const updateDestinationFromExisting = (destination: any) => {
    const city = String(destination?.city || destination?.name || '').trim();
    const state = String(destination?.state || '').toUpperCase().slice(0, 2);
    setForm((current) => ({
      ...current,
      destinationId: destination?.id || '',
      destinationCity: city,
      destinationState: state,
      city,
      state,
    }));
  };

  const handleDestinationStateChange = (state: string) => {
    const normalizedState = String(state || '').toUpperCase().slice(0, 2);
    setSelectedDestinationState(normalizedState);
    const nextDestination = destinations.find((destination: any) => String(destination.state || '').toUpperCase().slice(0, 2) === normalizedState);
    updateDestinationFromExisting(nextDestination || null);
  };

  const handleDestinationChange = (destinationId: string) => {
    const destination = destinations.find((item: any) => String(item.id) === String(destinationId));
    updateDestinationFromExisting(destination || null);
  };

  const handleNewDestinationStateChange = (state: string) => {
    const normalizedState = String(state || '').toUpperCase().slice(0, 2);
    setForm((current) => ({
      ...current,
      destinationState: normalizedState,
      destinationCity: '',
      state: normalizedState,
      city: '',
    }));
  };

  const handleNewDestinationCityChange = (city: string) => {
    setForm((current) => ({
      ...current,
      destinationCity: city,
      city: current.city && normalizeLocationName(current.city) !== normalizeLocationName(current.destinationCity) ? current.city : city,
    }));
  };

  const useExistingDestinationForNewCity = () => {
    if (!existingDestinationForNewCity) return;
    setDestinationMode('existing');
    setSelectedDestinationState(String(existingDestinationForNewCity.state || '').toUpperCase().slice(0, 2));
    updateDestinationFromExisting(existingDestinationForNewCity);
  };

  const updatePartnerType = (value: string) => setForm((current) => ({
    ...current,
    partnerType: value,
    logoUrl: '',
    bannerUrl: '',
    imageUrl: '',
    logoFile: '',
    bannerFile: '',
    imageFile: '',
  }));

  const submit = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(null);
    try {
      const isNewDestination = destinationMode === 'new';
      const destinationCity = String(isNewDestination ? form.destinationCity : selectedDestination?.city || selectedDestination?.name || form.destinationCity).trim();
      const destinationState = String(isNewDestination ? form.destinationState : selectedDestination?.state || form.destinationState).toUpperCase().slice(0, 2);
      if (!destinationCity || !destinationState || (!isNewDestination && !form.destinationId)) {
        throw new Error('Escolha a cidade do destino ou solicite uma nova cidade.');
      }
      if (isNewDestination && existingDestinationForNewCity) {
        throw new Error('Essa cidade já está aberta no Já no Caminho. Use a opção "Cidade aberta" para cadastrar seu parceiro nela.');
      }

      const payload = await destinationService.createPartnerRequest({
        ...form,
        destinationId: isNewDestination ? '' : form.destinationId,
        destinationCity,
        destinationState,
        city: form.city || destinationCity,
        state: form.state || destinationState,
        requestSource: form.requestSource || (hospitalityClaim ? 'hospitality_place_claim' : ''),
        claimedHospitalityPlaceId: form.claimedHospitalityPlaceId || hospitalityClaim?.placeId || '',
        linkToAccount: customerSession ? linkToAccount : undefined,
      });
      setSuccess(payload);
      setForm((current) => ({
        ...initialForm,
        destinationId: isNewDestination ? '' : current.destinationId,
        destinationCity: isNewDestination ? '' : destinationCity,
        destinationState: isNewDestination ? '' : destinationState,
        city: isNewDestination ? '' : destinationCity,
        state: isNewDestination ? '' : destinationState,
        partnerType: current.partnerType,
      }));
      if (isNewDestination && destinations.length) setDestinationMode('existing');
    } catch (err: any) {
      const code = String(err?.code || '').toUpperCase();
      if (code === 'DEST-014') {
        // E-mail já é de uma conta: orienta a entrar pra vincular (ou trocar e-mail).
        setLinkSuggestionEmail(String(form.responsibleEmail || '').trim());
        setError('Este e-mail já é de uma conta no Já no Caminho. Entre com ele para vincular o chalé a essa conta (sem criar login novo) — ou use outro e-mail abaixo.');
      } else {
        setLinkSuggestionEmail('');
        setError(err?.message || 'Não foi possível enviar cadastro.');
      }
    } finally {
      setSaving(false);
    }
  };

  const canSubmitDestination = destinationMode === 'new'
    ? Boolean(String(form.destinationCity || '').trim() && String(form.destinationState || '').trim() && !existingDestinationForNewCity)
    : Boolean(form.destinationId);

  return (
    <PublicDestinationShell active="register" backTo="/destinos" backLabel="Voltar" contextLabel="Cadastro de parceiro" ctaTo="/destinos" ctaLabel="Ver destinos">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="overflow-hidden rounded-[2rem] bg-[#153A4C] p-5 text-white shadow-[0_24px_70px_-42px_rgba(21,58,76,0.8)] sm:p-6 lg:sticky lg:top-28">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
              <Handshake size={15} weight="duotone" />
              Cadastro real
            </p>
            <h1 className="mt-5 text-3xl font-black leading-none tracking-[-0.04em]">Cadastre sua responsabilidade no destino.</h1>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-white/72">
              {hospitalityClaim
                ? 'Este convite já veio com o perfil preenchido. Confirme seus dados de responsável para assumir e atualizar a página.'
                : 'Leva menos de 1 minuto para pedir entrada. Depois da aprovação você completa fotos, endereço e detalhes no portal.'}
            </p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <Bed size={22} weight="duotone" />
                <p className="mt-2 text-sm font-black">Hospedagem</p>
                <p className="mt-1 text-xs font-semibold text-white/65">Endereço, contato, instruções de entrega e apresentação.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Sparkle size={22} weight="duotone" />
                <p className="mt-2 text-sm font-black">Serviço turístico</p>
                <p className="mt-1 text-xs font-semibold text-white/65">Passeios, massagens, restaurantes para visitar e experiências.</p>
              </div>
            </div>
          </aside>

          <form id="dados-parceiro" ref={formStartRef} onSubmit={submit} className="jnc-ds-surface relative z-10 scroll-mt-[calc(env(safe-area-inset-top)+5rem)] rounded-[2rem] p-5 sm:p-6">
            <SectionHeader
              eyebrow="Solicitação"
              title="Dados do parceiro"
              subtitle="Preencha os dados públicos e informe quem será responsável pelo acesso."
              action={<Compass size={28} weight="duotone" className="text-[#336886]" />}
            />

            {customerSession ? (
              <SurfaceCard tone="brand" padding="md" className="mt-4 rounded-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Vincular ao seu login</p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  Você está logado como <strong>{customerSession.name || customerSession.email}</strong>{customerSession.name ? ` (${customerSession.email})` : ''}.
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Vincular o chalé a esta conta evita criar login e senha novos — você acessa tudo com o mesmo login de cliente.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setLinkToAccount(true)}
                    className={`jnc-ds-touch rounded-2xl border px-3 py-2.5 text-left text-sm font-black transition ${linkToAccount ? 'border-[#336886] bg-[#336886]/10 text-[#153A4C]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <CheckCircle size={16} weight="fill" className="mb-1" />
                    Sim, vincular
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Recomendado · sem conta nova</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkToAccount(false)}
                    className={`jnc-ds-touch rounded-2xl border px-3 py-2.5 text-left text-sm font-black transition ${!linkToAccount ? 'border-[#336886] bg-[#336886]/10 text-[#153A4C]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <LinkSimpleHorizontal size={16} weight="bold" className="mb-1" />
                    Não, outro e-mail
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Conta separada</span>
                  </button>
                </div>
                {!linkToAccount ? (
                  <p className="mt-2 text-[11px] font-bold leading-relaxed text-amber-700">
                    Conta separada não pode usar o mesmo e-mail do seu login. Informe abaixo um e-mail diferente.
                  </p>
                ) : null}
              </SurfaceCard>
            ) : null}

            {error ? (
              <SurfaceCard padding="md" className="mt-4 rounded-2xl border-rose-100 bg-rose-50 text-sm font-bold text-rose-700 shadow-none">
                <p className="leading-relaxed">{error}</p>
                {linkSuggestionEmail ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate(`/cliente?next=${encodeURIComponent('/destinos/cadastrar')}&reason=link_partner`)}
                    >
                      Entrar para vincular o chalé
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => { setLinkSuggestionEmail(''); setError(''); }}
                    >
                      Usar outro e-mail
                    </Button>
                  </div>
                ) : null}
              </SurfaceCard>
            ) : null}
            {success ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white px-6 py-12 text-center">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_18px_42px_-24px_rgba(16,185,129,0.7)]">
                  <CheckCircle size={44} weight="fill" />
                </span>
                <h2 className="text-2xl font-black leading-tight tracking-[-0.03em] text-slate-950">Recebemos sua solicitação!</h2>
                <p className="max-w-md text-sm font-semibold leading-relaxed text-slate-600">
                  O time Já no Caminho vai revisar e entrar em contato quando estiver tudo certo.
                </p>
                <span className="mt-1 max-w-md text-xs font-semibold leading-relaxed text-slate-500">
                  Depois de aprovado, no portal você pode <strong className="text-[#336886]">destacar seu espaço</strong> para aparecer primeiro no destino (opcional, a partir de R$ 19,90).
                </span>
                <Button type="button" size="lg" onClick={() => { setSuccess(null); formStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="mt-3 rounded-full uppercase tracking-[0.1em]">
                  Enviar outra solicitação
                </Button>
              </div>
            ) : null}
            {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Carregando destinos...</p> : null}

            {!success ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SurfaceCard tone="soft" padding="sm" className="sm:col-span-2 rounded-[1.5rem] border-slate-200 bg-slate-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Cidade do destino</span>
                    <p className="mt-1 text-sm font-bold text-slate-800">Destino aqui é a cidade turística onde o parceiro quer aparecer.</p>
                  </div>
                  <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
                    <Chip type="button" size="sm" selected={destinationMode === 'existing'} onClick={() => setDestinationMode('existing')} className="border-transparent shadow-none">
                      Cidade aberta
                    </Chip>
                    <Chip type="button" size="sm" selected={destinationMode === 'new'} onClick={() => setDestinationMode('new')} className="border-transparent shadow-none">
                      Nova cidade
                    </Chip>
                  </div>
                </div>

                {destinationMode === 'existing' ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">UF</span>
                      <select ref={firstPartnerControlRef} value={selectedDestinationState} onChange={(event) => handleDestinationStateChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                        {stateOptions.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Cidade</span>
                      <select value={form.destinationId} onChange={(event) => handleDestinationChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]" required>
                        {filteredDestinations.map((destination) => (
                          <option key={destination.id} value={destination.id}>{destination.city || destination.name}</option>
                        ))}
                      </select>
                    </label>
                    {filteredDestinations.length === 0 ? (
                      <SurfaceCard padding="sm" className="sm:col-span-2 rounded-2xl border-dashed border-slate-300 bg-white text-xs font-bold text-slate-500 shadow-none">
                        Ainda não temos cidade aberta nesta UF. Use “Nova cidade” para sugerir ao time Já no Caminho.
                      </SurfaceCard>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">UF</span>
                      <select ref={firstPartnerControlRef} value={form.destinationState} onChange={(event) => handleNewDestinationStateChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                        <option value="">Selecione</option>
                        {BRAZIL_STATES.map((state) => (
                          <option key={state.value} value={state.value}>{state.value} · {state.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Cidade turística</span>
                      <select
                        value={form.destinationCity}
                        onChange={(event) => handleNewDestinationCityChange(event.target.value)}
                        disabled={!form.destinationState || newDestinationCitiesLoading || availableNewDestinationCities.length === 0}
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]"
                      >
                        <option value="">
                          {!form.destinationState
                            ? 'Selecione a UF primeiro'
                            : newDestinationCitiesLoading
                              ? 'Carregando cidades...'
                              : availableNewDestinationCities.length
                                ? 'Selecione a cidade'
                                : 'Nenhuma cidade disponível nesta UF'}
                        </option>
                        {availableNewDestinationCities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </label>
                    {newDestinationCitiesLoading ? (
                      <p className="sm:col-span-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-slate-500">
                        Carregando cidades oficiais desta UF...
                      </p>
                    ) : null}
                    {newDestinationCityError ? (
                      <SurfaceCard tone="warning" padding="sm" className="sm:col-span-2 rounded-2xl text-xs font-bold leading-relaxed text-amber-800 shadow-none">
                        {newDestinationCityError}
                      </SurfaceCard>
                    ) : null}
                    {existingDestinationForNewCity ? (
                      <SurfaceCard tone="success" padding="sm" className="sm:col-span-2 rounded-2xl border-emerald-200 text-xs font-bold leading-relaxed text-emerald-800 shadow-none">
                        <p>Essa cidade já está disponível no Já no Caminho. Use o destino existente para evitar cadastro duplicado.</p>
                        <Button type="button" variant="success" size="sm" onClick={useExistingDestinationForNewCity} className="mt-2 rounded-full uppercase tracking-[0.1em]">
                          Usar cidade aberta
                        </Button>
                      </SurfaceCard>
                    ) : (
                      <SurfaceCard tone="warning" padding="sm" className="sm:col-span-2 rounded-2xl text-xs font-bold leading-relaxed text-amber-800 shadow-none">
                        Essa cidade ainda não está aberta no app. O time Já no Caminho vai revisar, melhorar fotos e textos e avisar quando o destino estiver pronto para aparecer aos hóspedes.
                      </SurfaceCard>
                    )}
                  </div>
                )}
              </SurfaceCard>

              <label>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Tipo de parceiro</span>
                <select value={form.partnerType} onChange={(event) => updatePartnerType(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                  <option value="HOSPITALITY">Chalé ou pousada</option>
                  <option value="SERVICE_PROVIDER">Serviço turístico</option>
                </select>
              </label>

              {form.partnerType === 'HOSPITALITY' ? (
                <label>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Tipo de hospedagem</span>
                  <select value={form.placeType} onChange={(event) => update('placeType', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                    <option value="CHALE">Chalé</option>
                    <option value="POUSADA">Pousada</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="CABANA">Cabana</option>
                    <option value="CASA_TEMPORADA">Casa de temporada</option>
                  </select>
                </label>
              ) : (
                <label>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Categoria</span>
                  <select value={form.category} onChange={(event) => update('category', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-[#336886]">
                    <option value="PASSEIO">Passeio</option>
                    <option value="MASSAGEM">Massagem</option>
                    <option value="RESTAURANTE_VISITAR">Restaurante para visitar</option>
                    <option value="NOITE">Noite</option>
                    <option value="ATRATIVO">Atrativo</option>
                    <option value="SERVICO">Serviço</option>
                  </select>
                </label>
              )}

              <TextField name="partnerName" required value={form.name} onChange={(event) => update('name', event.target.value)} label="Nome público" placeholder="Nome do chalé, pousada ou serviço" wrapperClassName="sm:col-span-2" />
              <TextareaField name="partnerDescription" value={form.description} onChange={(event) => update('description', event.target.value)} label="Descrição pública" placeholder="Conte o que o hóspede encontra aqui" rows={3} wrapperClassName="sm:col-span-2" />
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[160px_1fr]">
                <div>
                  <TextField name="zipCode" value={form.zipCode} onChange={(event) => update('zipCode', formatCepBr(event.target.value))} label="CEP" placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" rightIcon={zipLookupLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#336886]/30 border-t-[#336886]" /> : undefined} />
                  {zipLookupLoading ? (
                    <p className="mt-1 flex items-center gap-1.5 px-1 text-[11px] font-bold text-[#336886]">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#336886]/30 border-t-[#336886]" />
                      Buscando endereço...
                    </p>
                  ) : null}
                  {zipLookupError ? <p className="mt-1 px-1 text-[11px] font-bold leading-snug text-rose-600">{zipLookupError}</p> : null}
                </div>
                <TextField name="address" value={form.address} onChange={(event) => update('address', event.target.value)} label="Endereço" placeholder="Rua, número e referência" autoComplete="address-line1" />
              </div>
              <SurfaceCard tone="brand" padding="sm" className="sm:col-span-2 rounded-2xl text-xs font-bold leading-relaxed text-[#153A4C] shadow-none">
                Cidade do cadastro: {destinationMode === 'new' ? (form.destinationCity || 'nova cidade') : (selectedDestination?.city || selectedDestination?.name || 'cidade selecionada')}{' '}
                {destinationMode === 'new' ? form.destinationState : selectedDestination?.state ? `- ${selectedDestination.state}` : ''}.
              </SurfaceCard>
              <TextField name="publicWhatsapp" value={form.whatsapp} onChange={(event) => update('whatsapp', formatPhoneBr(event.target.value))} label="WhatsApp público" placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" />
              <TextField name="instagramUrl" value={form.instagramUrl} onChange={(event) => update('instagramUrl', event.target.value)} label="Instagram" placeholder="@perfil ou link" />
              <TextField name="websiteUrl" value={form.websiteUrl} onChange={(event) => update('websiteUrl', event.target.value)} label="Link principal" placeholder="Site, Airbnb, Booking ou cardápio" wrapperClassName="sm:col-span-2" />

              {form.partnerType === 'HOSPITALITY' ? (
                <>
                  <MediaUploadField
                    label="Foto/banner da hospedagem"
                    hint="Imagem principal que aparece no card do chalé ou pousada."
                    urlValue={form.bannerUrl}
                    fileValue={form.bannerFile}
                    onUrlChange={(value: string) => update('bannerUrl', value)}
                    onFileChange={(value: string) => update('bannerFile', value)}
                    onError={setError}
                    maxEdge={1800}
                  />
                  <MediaUploadField
                    label="Logo ou foto complementar"
                    hint="Opcional. Ajuda a identificar sua hospedagem na curadoria."
                    urlValue={form.logoUrl}
                    fileValue={form.logoFile}
                    onUrlChange={(value: string) => update('logoUrl', value)}
                    onFileChange={(value: string) => update('logoFile', value)}
                    onError={setError}
                    maxEdge={900}
                  />
                  <TextareaField name="deliveryInstructions" value={form.deliveryInstructions} onChange={(event) => update('deliveryInstructions', event.target.value)} label="Instruções para entrega" placeholder="Portaria, acesso, referência ou orientação importante" rows={3} wrapperClassName="sm:col-span-2" />
                </>
              ) : (
                <MediaUploadField
                  label="Foto do serviço ou lugar"
                  hint="Imagem usada no card público de experiências e serviços locais."
                  urlValue={form.imageUrl}
                  fileValue={form.imageFile}
                  onUrlChange={(value: string) => update('imageUrl', value)}
                  onFileChange={(value: string) => update('imageFile', value)}
                  onError={setError}
                  maxEdge={1400}
                />
              )}

              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Responsável pelo cadastro</p>
              </div>
              <TextField name="responsibleName" required value={form.responsibleName} onChange={(event) => update('responsibleName', event.target.value)} label="Nome do responsável" placeholder="Nome completo" />
              <TextField name="responsibleEmail" required type="email" value={form.responsibleEmail} onChange={(event) => update('responsibleEmail', event.target.value)} label="E-mail do responsável" placeholder="email@empresa.com.br" autoComplete="email" />
              {emailBelongsToOtherAccount ? (
                <div className="sm:col-span-2 -mt-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm">
                  <p className="font-black text-amber-800">Este e-mail já é de uma conta no Já no Caminho</p>
                  <p className="mt-0.5 text-xs font-semibold leading-relaxed text-amber-700">
                    {emailLookup?.name ? `Pertence a ${emailLookup.name}` : 'Já existe conta'}{emailLookup?.roles?.length ? ` · ${emailLookup.roles.join(', ')}` : ''}. Entre com ele para vincular o chalé a essa conta — sem criar login novo.
                  </p>
                  <Button type="button" size="sm" className="mt-2 rounded-full uppercase tracking-[0.1em]" onClick={() => navigate(`/cliente?next=${encodeURIComponent('/destinos/cadastrar')}&reason=link_partner`)}>
                    Entrar para integrar o chalé
                  </Button>
                </div>
              ) : null}
              <TextField name="responsiblePhone" required value={form.responsiblePhone} onChange={(event) => update('responsiblePhone', formatPhoneBr(event.target.value))} label="WhatsApp do responsável" placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" wrapperClassName="sm:col-span-2" />
              <TextareaField name="message" value={form.message} onChange={(event) => update('message', event.target.value)} label="Mensagem para o time" placeholder="Conte algo importante sobre o cadastro" rows={3} wrapperClassName="sm:col-span-2" />
            </div>
            ) : null}

            {!success ? (
            <Button type="submit" size="lg" fullWidth loading={saving} disabled={!canSubmitDestination || saving} className="mt-5">
              Enviar para aprovação
            </Button>
            ) : null}
          </form>
        </div>
      </div>
    </PublicDestinationShell>
  );
}
