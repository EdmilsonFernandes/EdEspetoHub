// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowSquareOut,
  Buildings,
  Camera,
  CheckCircle,
  Compass,
  Crown,
  Eye,
  EyeSlash,
  FloppyDisk,
  HouseLine,
  Image as ImageIcon,
  LockKey,
  Plus,
  SignOut,
  Sparkle,
  Trash,
  TrendUp,
} from '@phosphor-icons/react';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { AppRobotLoader } from '../components/common/AppRobotLoader';
import { DestinationPromotionPanel } from '../components/Destination/DestinationPromotionPanel';
import { canUseNativeImagePicker, pickNativeImageAsDataUrl } from '../utils/nativeImagePicker';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import {
  Button,
  EmptyState,
  IconButton,
  SectionHeader,
  SurfaceCard,
  TextareaField,
  TextField,
} from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';
import {
  destinationPartnerPortalService,
  DestinationPartnerResource,
} from '../services/destinationPartnerPortalService';
import { buildListingClaimUrl } from '../utils/destinationListingClaim';
import { inputAssistProps, textareaAssistProps } from '../utils/inputAssist';

const BANNER_SLOT_COUNT = 4;
const padBannerSlots = (value: any) => {
  const list = Array.isArray(value) ? value : [];
  return Array.from({ length: BANNER_SLOT_COUNT }, (_, index) => String(list[index] || ''));
};

const blankForm = {
  name: '',
  title: '',
  description: '',
  whatsapp: '',
  phone: '',
  instagramUrl: '',
  websiteUrl: '',
  address: '',
  addressNumber: '',
  district: '',
  city: '',
  state: '',
  zipCode: '',
  lat: '',
  lng: '',
  deliveryInstructions: '',
  logoFile: '',
  logoUrl: '',
  bannerFile: '',
  bannerUrl: '',
  bannerUrls: padBannerSlots([]),
  bannerFiles: padBannerSlots([]),
  imageFile: '',
  imageUrl: '',
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const compressImageFileToDataUrl = (file: File, maxEdge = 1600) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) throw new Error('invalid_image');
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no_canvas');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1_200_000 && quality > 0.62) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('invalid_image'));
    };
    image.src = objectUrl;
  });

const prepareImageUpload = async (file: File, maxEdge = 1600) => {
  if (!file.type.startsWith('image/')) throw new Error('invalid_file_type');
  if (file.type === 'image/gif') return fileToBase64(file);
  try {
    return await compressImageFileToDataUrl(file, maxEdge);
  } catch {
    return fileToBase64(file);
  }
};

const hospitalityGalleryCount = (item: any, form: typeof blankForm) =>
  (Array.isArray(item?.bannerUrls) ? item.bannerUrls.filter(Boolean).length : 0) +
  (Array.isArray(form?.bannerFiles) ? form.bannerFiles.filter(Boolean).length : 0);

const completionScore = (item: any, type: string) => {
  const checks = [
    type === 'HOSPITALITY_PLACE' ? item.logoUrl || item.bannerUrl : item.imageUrl,
    type === 'HOSPITALITY_PLACE' ? hospitalityGalleryCount(item, blankForm) >= 1 : true,
    item.description,
    item.whatsapp || item.phone,
    item.instagramUrl || item.websiteUrl,
    item.address && item.city && item.state,
    item.lat != null && item.lng != null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const onboardingChecklist = (resource: DestinationPartnerResource | null | undefined, form: typeof blankForm) => {
  const item = resource?.item || {};
  const isHospitality = resource?.resourceType === 'HOSPITALITY_PLACE';
  return [
    {
      label: isHospitality ? 'Logo ou capa' : 'Foto do serviço',
      done: Boolean(isHospitality ? (item.logoUrl || item.bannerUrl || form.logoFile || form.bannerFile) : (item.imageUrl || form.imageFile)),
    },
    { label: 'Galeria com fotos', done: isHospitality ? hospitalityGalleryCount(item, form) >= 1 : true },
    { label: 'Descrição clara', done: String(form.description || '').trim().length >= 20 },
    { label: 'WhatsApp ou telefone', done: Boolean(form.whatsapp || form.phone) },
    { label: 'Endereço completo', done: Boolean(form.address && form.city && form.state && form.zipCode) },
    { label: 'Localização no mapa', done: item.lat != null && item.lng != null },
  ];
};

const resourceTitle = (resource?: DestinationPartnerResource | null) => {
  if (!resource) return '';
  return resource.resourceType === 'HOSPITALITY_PLACE'
    ? resource.item?.name || 'Chalé ou pousada'
    : resource.item?.title || 'Serviço ou restaurante';
};

const resourceImage = (resource?: DestinationPartnerResource | null) => {
  if (!resource) return '/janocaminho.jpg';
  return resource.resourceType === 'HOSPITALITY_PLACE'
    ? resource.item?.logoUrl || resource.item?.bannerUrl || '/janocaminho.jpg'
    : resource.item?.imageUrl || '/janocaminho.jpg';
};

const buildForm = (resource?: DestinationPartnerResource | null) => {
  const item = resource?.item || {};
  return {
    ...blankForm,
    name: item.name || '',
    title: item.title || '',
    description: item.description || '',
    whatsapp: item.whatsapp || '',
    phone: item.phone || '',
    instagramUrl: item.instagramUrl || '',
    websiteUrl: item.websiteUrl || '',
    address: item.address || '',
    addressNumber: item.addressNumber || '',
    district: item.district || '',
    city: item.city || '',
    state: item.state || '',
    zipCode: item.zipCode || '',
    lat: item.lat ?? '',
    lng: item.lng ?? '',
    deliveryInstructions: item.deliveryInstructions || '',
    logoUrl: item.logoUrl || '',
    bannerUrl: item.bannerUrl || '',
    bannerUrls: padBannerSlots(item.bannerUrls),
    bannerFiles: padBannerSlots([]),
    imageUrl: item.imageUrl || '',
  };
};

const buildStoreSignupUrl = (resource?: DestinationPartnerResource | null) => {
  if (!resource || resource.resourceType !== 'DESTINATION_LISTING') return '';
  const listing = resource.item || {};
  const destination = listing.destination || {};
  const linkedPlaceIds = [
    ...(Array.isArray(listing.hospitalityPlaceIds) ? listing.hospitalityPlaceIds : []),
    ...(Array.isArray(listing.hospitalityPlaceLinks) ? listing.hospitalityPlaceLinks.map((link: any) => link?.hospitalityPlaceId || link?.hospitalityPlace?.id) : []),
    ...(Array.isArray(listing.hospitalityPlaces) ? listing.hospitalityPlaces.map((place: any) => place?.id) : []),
    listing.hospitalityPlaceId,
  ].map((id) => String(id || '').trim()).filter(Boolean);
  return buildListingClaimUrl(destination, listing, {
    deliveryMode: linkedPlaceIds.length ? 'selected' : 'all',
    placeIds: Array.from(new Set(linkedPlaceIds)),
  });
};

const PartnerMediaSlot = ({ label, hint, previewSrc, onFile, onClear, aspect = 'aspect-[4/3]' }: any) => {
  const hasImage = Boolean(previewSrc);
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_14px_30px_-26px_rgba(15,23,42,0.32)]">
      <div className={`${aspect} w-full bg-slate-100`}>
        {hasImage ? (
          <img src={previewSrc} alt={label} className="h-full w-full object-cover" />
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 px-3 text-center">
            <ImageIcon size={22} weight="duotone" className="text-[#336886]/55" />
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#336886]/70">{label}</span>
            {hint ? <span className="text-[10px] font-semibold text-slate-400">{hint}</span> : null}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => onFile?.(event.target.files?.[0])} />
          </label>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-1.5">
        <label className="jnc-ds-touch inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100">
          <Camera size={12} />
          {hasImage ? 'Trocar' : 'Enviar'}
          <input type="file" accept="image/*" className="hidden" onChange={(event) => onFile?.(event.target.files?.[0])} />
        </label>
        {hasImage && onClear ? (
          <button type="button" onClick={onClear} className="jnc-ds-touch inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-rose-600 transition hover:bg-rose-100">
            <Trash size={12} />
            Remover
          </button>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400">JPG · PNG</span>
        )}
      </div>
    </div>
  );
};

function PartnerLogin({ onLoggedIn }: { onLoggedIn: (session: any) => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: any) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await destinationPartnerPortalService.login(form.email, form.password);
      onLoggedIn(session);
      navigate('/parceiro', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar no portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showHeader title="Portal parceiro" eyebrow="Já no Caminho" subtitle="Destinos, chalés e serviços" backTo="/entrar">
      <form onSubmit={submit} autoComplete="on" className="jnc-ds-surface w-full max-w-[520px] rounded-[2rem] p-5 sm:p-7">
        <div className="mb-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)]">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
          </div>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]/75">Acesso do parceiro</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Entrar no portal do parceiro</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Acesse para atualizar fotos, contatos e informações do seu chalé, pousada ou serviço.</p>
        </div>

        <div className="space-y-3">
          <TextField
            {...inputAssistProps.email}
            name="partnerEmail"
            label="E-mail"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="email@empresa.com.br"
            inputClassName="bg-slate-50 focus:bg-white"
          />
          <TextField
            {...inputAssistProps.currentPassword}
            name="partnerPassword"
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Sua senha"
            inputClassName="bg-slate-50 focus:bg-white"
            rightIcon={(
              <IconButton
                type="button"
                variant="plain"
                size="sm"
                onClick={() => setShowPassword((prev) => !prev)}
                icon={showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="-mr-2"
              />
            )}
          />
        </div>

        {error ? (
          <SurfaceCard padding="md" className="mt-4 rounded-2xl border-rose-100 bg-rose-50 text-sm font-bold text-rose-700 shadow-none">
            {error}
          </SurfaceCard>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!form.email || !form.password}
          leftIcon={<LockKey size={19} weight="duotone" />}
          className="mt-5"
        >
          Entrar no portal
        </Button>
      </form>
    </AuthLayout>
  );
}

export function DestinationPartnerPortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => destinationPartnerPortalService.getSession());
  const [resources, setResources] = useState<DestinationPartnerResource[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(Boolean(session?.token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedResource = useMemo(
    () => resources.find((resource) => resource.permissionId === selectedId) || resources[0] || null,
    [resources, selectedId]
  );
  const storeSignupUrl = useMemo(() => buildStoreSignupUrl(selectedResource), [selectedResource]);
  const checklist = useMemo(() => onboardingChecklist(selectedResource, form), [selectedResource?.permissionId, selectedResource?.item, form]);

  useEffect(() => {
    if (!session?.token) return;
    let active = true;
    setLoading(true);
    destinationPartnerPortalService.me()
      .then((payload) => {
        if (!active) return;
        setSession((prev) => ({ ...(prev || {}), partner: payload.partner, resources: payload.resources }));
        setResources(payload.resources || []);
        setSelectedId((current) => current || payload.resources?.[0]?.permissionId || '');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Não foi possível carregar seu portal.');
        destinationPartnerPortalService.clearSession();
        setSession(null);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [session?.token]);

  useEffect(() => {
    setForm(buildForm(selectedResource));
    setSuccess('');
  }, [selectedResource?.permissionId]);

  if (!session?.token) return <PartnerLogin onLoggedIn={setSession} />;

  const change = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const chooseFile = async (field: string, file?: File | null) => {
    if (!file) return;
    try {
      const encoded = await prepareImageUpload(file);
      change(field, encoded);
    } catch {
      setError('Não foi possível ler essa imagem. Tente outro arquivo.');
    }
  };

  const chooseBannerSlot = async (index: number, file?: File | null) => {
    if (!file) return;
    try {
      const encoded = await prepareImageUpload(file);
      setForm((prev) => {
        const nextFiles = [...prev.bannerFiles];
        nextFiles[index] = encoded;
        return { ...prev, bannerFiles: nextFiles };
      });
    } catch {
      setError('Não foi possível ler essa imagem. Tente outro arquivo.');
    }
  };

  const pickBannerSlotNative = async (index: number) => {
    if (!canUseNativeImagePicker()) return;
    try {
      const dataUrl = await pickNativeImageAsDataUrl({ quality: 82, maxWidth: 1600 });
      if (!dataUrl) return;
      setForm((prev) => {
        const nextFiles = [...prev.bannerFiles];
        nextFiles[index] = dataUrl;
        return { ...prev, bannerFiles: nextFiles };
      });
    } catch {
      setError('Não foi possível abrir a câmera/galeria.');
    }
  };

  const removeBannerSlot = (index: number) => {
    setForm((prev) => {
      const nextFiles = [...prev.bannerFiles];
      const nextUrls = [...prev.bannerUrls];
      nextFiles[index] = '';
      nextUrls[index] = '';
      return { ...prev, bannerFiles: nextFiles, bannerUrls: nextUrls };
    });
  };

  const logout = () => {
    destinationPartnerPortalService.clearSession();
    setSession(null);
    setResources([]);
    navigate('/parceiro', { replace: true });
  };

  const submit = async (event: any) => {
    event.preventDefault();
    if (!selectedResource) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        description: form.description,
        whatsapp: form.whatsapp,
        phone: form.phone,
        instagramUrl: form.instagramUrl,
        websiteUrl: form.websiteUrl,
        address: form.address,
        addressNumber: form.addressNumber,
        district: form.district,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        lat: form.lat,
        lng: form.lng,
      };
      if (selectedResource.resourceType === 'HOSPITALITY_PLACE') {
        payload.name = form.name;
        payload.deliveryInstructions = form.deliveryInstructions;
        if (form.logoFile) payload.logoFile = form.logoFile;
        if (form.bannerFile) payload.bannerFile = form.bannerFile;
        // Galeria de banners: envia sempre (URLs existentes + novos uploads) para
        // que remoções e substituições sejam persistidas.
        payload.bannerUrls = [...form.bannerUrls];
        payload.bannerFiles = [...form.bannerFiles];
        await destinationPartnerPortalService.updateHospitalityPlace(selectedResource.item.id, payload);
      } else {
        payload.title = form.title;
        if (form.imageFile) payload.imageFile = form.imageFile;
        await destinationPartnerPortalService.updateListing(selectedResource.item.id, payload);
      }
      const refreshed = await destinationPartnerPortalService.me();
      setResources(refreshed.resources || []);
      const refreshedSelected = (refreshed.resources || []).find((resource) => resource.permissionId === selectedResource.permissionId) || null;
      setForm(buildForm(refreshedSelected));
      setSuccess('Informações salvas. A página pública já usa esses dados.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#E2EBF2] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+4.8rem)]">
      <AppGlassHeader
        title="Portal do parceiro"
        eyebrow="Já no Caminho"
        subtitle="Destinos, chalés e serviços"
        backTo="/hub"
        right={(
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={logout}
            leftIcon={<SignOut size={15} weight="bold" />}
            className="rounded-full uppercase tracking-[0.12em]"
          >
            Sair
          </Button>
        )}
        maxWidthClassName="max-w-6xl"
      />

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <SurfaceCard as="section" padding="md" className="rounded-[1.8rem]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]/70">Conta</p>
            <h1 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">{session.partner?.name || 'Parceiro'}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{session.partner?.email}</p>
          </SurfaceCard>

          <SurfaceCard as="section" padding="sm" className="rounded-[1.8rem]">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]/70">Cadastros</p>
              <span className="rounded-full bg-[#336886]/10 px-2.5 py-1 text-[10px] font-black text-[#153A4C]">{resources.length}</span>
            </div>
            {loading ? <AppRobotLoader title="Carregando" subtitle="Buscando seus cadastros." /> : null}
            <div className="space-y-2">
              {resources.map((resource) => {
                const active = resource.permissionId === selectedResource?.permissionId;
                const score = completionScore(resource.item, resource.resourceType);
                return (
                  <button
                    key={resource.permissionId}
                    type="button"
                    onClick={() => setSelectedId(resource.permissionId)}
                    className={`jnc-ds-touch jnc-ds-focus-ring flex w-full items-center gap-3 rounded-[1.35rem] border p-2.5 text-left transition ${active ? 'border-[#336886]/24 bg-[#336886]/9 shadow-[0_18px_34px_-26px_rgba(21,58,76,0.45)]' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                  >
                    <img src={resourceImage(resource)} alt="" className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-2xl object-cover ring-1 ring-slate-100" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">{resourceTitle(resource)}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        {resource.resourceType === 'HOSPITALITY_PLACE' ? <HouseLine size={13} weight="duotone" /> : <Compass size={13} weight="duotone" />}
                        {resource.resourceType === 'HOSPITALITY_PLACE' ? 'Hospedagem' : 'Serviço local'}
                      </span>
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{score}%</span>
                  </button>
                );
              })}
            </div>
          </SurfaceCard>
        </aside>

        <div className="space-y-4">
        <SurfaceCard as="section" padding="none" className="overflow-hidden rounded-[2rem] border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-[#eef6f8] shadow-[0_24px_60px_-40px_rgba(180,120,20,0.4)]">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg">
                <Crown size={22} weight="fill" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Destaque opcional</p>
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Apareça primeiro no destino</h2>
                <p className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-slate-500">Seu espaço ganha prioridade de posicionamento. Você só paga se quiser destacar — manter o cadastro é grátis.</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-black text-amber-700 sm:self-auto">
              <TrendUp size={14} weight="bold" /> a partir de R$ 19,90
            </span>
          </div>
          <div className="border-t border-amber-100/80 bg-white/55 p-5">
            <DestinationPromotionPanel />
          </div>
        </SurfaceCard>

        <SurfaceCard as="section" padding="lg" className="rounded-[2rem]">
          {selectedResource ? (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <img src={resourceImage(selectedResource)} alt="" className="h-16 w-16 rounded-[1.35rem] object-cover ring-1 ring-slate-100" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]/70">
                      {selectedResource.resourceType === 'HOSPITALITY_PLACE' ? 'Hospedagem' : 'Serviço local'}
                    </p>
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{resourceTitle(selectedResource)}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Edite somente campos operacionais liberados.</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-2 text-sm font-black text-white">
                  <Sparkle size={17} weight="duotone" />
                  {completionScore(selectedResource.item, selectedResource.resourceType)}% completo
                </div>
              </div>

              <SurfaceCard as="section" tone="brand" padding="md" className="rounded-[1.6rem]">
                <SectionHeader
                  eyebrow="Checklist de publicação"
                  title="Deixe sua página pronta para converter."
                  action={(
                    <span className="rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">
                    {checklist.filter((item) => item.done).length}/{checklist.length} concluídos
                    </span>
                  )}
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  {checklist.map((item) => (
                    <div key={item.label} className={`rounded-2xl border px-3 py-2 text-xs font-black ${item.done ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white/78 text-slate-500'}`}>
                      <CheckCircle size={15} weight={item.done ? 'fill' : 'duotone'} className="mb-1" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  {...inputAssistProps.name}
                  name="publicName"
                  label="Nome público"
                  value={selectedResource.resourceType === 'HOSPITALITY_PLACE' ? form.name : form.title}
                  onChange={(event) => change(selectedResource.resourceType === 'HOSPITALITY_PLACE' ? 'name' : 'title', event.target.value)}
                  wrapperClassName="sm:col-span-2"
                  inputClassName="bg-slate-50 focus:bg-white"
                />

                <TextareaField
                  {...textareaAssistProps.description}
                  name="description"
                  label="Descrição"
                  value={form.description}
                  onChange={(event) => change('description', event.target.value)}
                  rows={4}
                  wrapperClassName="sm:col-span-2"
                  textareaClassName="bg-slate-50 focus:bg-white"
                />

                <TextField {...inputAssistProps.phone} name="whatsapp" label="WhatsApp" value={form.whatsapp} onChange={(event) => change('whatsapp', event.target.value)} inputClassName="bg-slate-50 focus:bg-white" />
                <TextField {...inputAssistProps.phone} name="phone" label="Telefone" value={form.phone} onChange={(event) => change('phone', event.target.value)} inputClassName="bg-slate-50 focus:bg-white" />
                <TextField name="instagramUrl" label="Instagram" value={form.instagramUrl} onChange={(event) => change('instagramUrl', event.target.value)} placeholder="@perfil ou link" inputClassName="bg-slate-50 focus:bg-white" />
                <TextField name="websiteUrl" label="Site" value={form.websiteUrl} onChange={(event) => change('websiteUrl', event.target.value)} placeholder="Site, Airbnb ou Booking" inputClassName="bg-slate-50 focus:bg-white" />
              </div>

              <SurfaceCard tone="soft" padding="sm" className="grid gap-3 rounded-[1.5rem] border-slate-100 bg-slate-50/70 sm:grid-cols-6">
                <TextField {...inputAssistProps.addressLine1} name="address" label="Endereço" value={form.address} onChange={(event) => change('address', event.target.value)} wrapperClassName="sm:col-span-3" inputClassName="bg-white" />
                <TextField name="addressNumber" label="Número" value={form.addressNumber} onChange={(event) => change('addressNumber', event.target.value)} wrapperClassName="sm:col-span-1" inputClassName="bg-white" />
                <TextField {...inputAssistProps.postalCode} name="zipCode" label="CEP" value={form.zipCode} onChange={(event) => change('zipCode', event.target.value)} wrapperClassName="sm:col-span-2" inputClassName="bg-white" />
                <TextField {...inputAssistProps.neighborhood} name="district" label="Bairro" value={form.district} onChange={(event) => change('district', event.target.value)} wrapperClassName="sm:col-span-2" inputClassName="bg-white" />
                <TextField {...inputAssistProps.city} name="city" label="Cidade" value={form.city} onChange={(event) => change('city', event.target.value)} wrapperClassName="sm:col-span-3" inputClassName="bg-white" />
                <TextField {...inputAssistProps.state} name="state" label="UF" value={form.state} onChange={(event) => change('state', event.target.value)} maxLength={2} wrapperClassName="sm:col-span-1" inputClassName="bg-white" />
              </SurfaceCard>

              {selectedResource.resourceType === 'HOSPITALITY_PLACE' ? (
                <SurfaceCard as="section" tone="soft" padding="md" className="space-y-4 rounded-[1.7rem] border-slate-100 bg-slate-50/70">
                  <SectionHeader eyebrow="Fotos do seu espaço" title="Logo, capa e galeria" />
                  <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                    <div className="space-y-1.5">
                      <p className="px-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Logo</p>
                      <PartnerMediaSlot label="Logo" hint="Quadrada" aspect="aspect-square" previewSrc={form.logoFile || resolveAssetUrl(form.logoUrl) || ''} onFile={(file: File) => chooseFile('logoFile', file)} onClear={() => { change('logoFile', ''); change('logoUrl', ''); }} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="px-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Capa</p>
                      <PartnerMediaSlot label="Capa" hint="Formato paisagem" aspect="aspect-[16/9]" previewSrc={form.bannerFile || resolveAssetUrl(form.bannerUrl) || ''} onFile={(file: File) => chooseFile('bannerFile', file)} onClear={() => { change('bannerFile', ''); change('bannerUrl', ''); }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#336886]">Galeria (até {BANNER_SLOT_COUNT} fotos)</p>
                      <span className="text-[10px] font-black text-slate-400">{form.bannerFiles.filter(Boolean).length + form.bannerUrls.filter((u: string) => u).length}/{BANNER_SLOT_COUNT}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Array.from({ length: BANNER_SLOT_COUNT }).map((_, index) => (
                        <PartnerMediaSlot key={index} label={`Foto ${index + 1}`} aspect="aspect-[4/3]" previewSrc={form.bannerFiles[index] || resolveAssetUrl(form.bannerUrls[index]) || ''} onFile={(file: File) => chooseBannerSlot(index, file)} onClear={() => removeBannerSlot(index)} />
                      ))}
                    </div>
                    {canUseNativeImagePicker() ? (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => pickBannerSlotNative(form.bannerFiles.findIndex(Boolean) < 0 ? 0 : form.bannerFiles.length >= BANNER_SLOT_COUNT ? 0 : form.bannerFiles.length)} className="jnc-ds-touch inline-flex items-center gap-1.5 rounded-full bg-[#336886]/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#153A4C]">
                          <Camera size={13} /> Tirar foto / galeria
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <TextareaField
                    {...textareaAssistProps.notes}
                    name="deliveryInstructions"
                    label="Instruções de entrega / chegada"
                    value={form.deliveryInstructions}
                    onChange={(event) => change('deliveryInstructions', event.target.value)}
                    rows={3}
                    textareaClassName="bg-white"
                    hint="Como o cliente/motoboy encontra você (referências, portão, acesso)."
                  />
                </SurfaceCard>
              ) : (
                <SurfaceCard as="section" tone="soft" padding="md" className="space-y-3 rounded-[1.7rem] border-slate-100 bg-slate-50/70">
                  <SectionHeader eyebrow="Foto" title="Imagem do serviço" />
                  <div className="mx-auto max-w-sm">
                    <PartnerMediaSlot label="Foto principal" hint="Formato paisagem" aspect="aspect-[4/3]" previewSrc={form.imageFile || resolveAssetUrl(form.imageUrl) || ''} onFile={(file: File) => chooseFile('imageFile', file)} onClear={() => { change('imageFile', ''); change('imageUrl', ''); }} />
                  </div>
                </SurfaceCard>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <a href={selectedResource.resourceType === 'HOSPITALITY_PLACE' ? `/destinos/${selectedResource.item?.destination?.slug || ''}/chales/${selectedResource.item?.slug || ''}` : `/destinos/${selectedResource.item?.destination?.slug || ''}`} target="_blank" rel="noreferrer" className="jnc-ds-touch jnc-ds-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50">
                  <ArrowSquareOut size={17} weight="bold" />
                  Ver página pública
                </a>
                {storeSignupUrl ? (
                  <a href={storeSignupUrl} className="jnc-ds-touch jnc-ds-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100">
                    <Buildings size={17} weight="duotone" />
                    Quero receber pedidos
                  </a>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  loading={saving}
                  leftIcon={saving ? <Buildings size={17} weight="duotone" /> : <FloppyDisk size={17} weight="duotone" />}
                  className="sm:ml-auto"
                >
                  Salvar alterações
                </Button>
              </div>

              {success ? (
                <SurfaceCard tone="success" padding="md" className="rounded-2xl text-sm font-bold text-emerald-700">
                  <CheckCircle size={16} weight="fill" className="mr-1 inline" />
                  {success}
                </SurfaceCard>
              ) : null}
              {error ? (
                <SurfaceCard padding="md" className="rounded-2xl border-rose-100 bg-rose-50 text-sm font-bold text-rose-700 shadow-none">
                  {error}
                </SurfaceCard>
              ) : null}
            </form>
          ) : (
            <div className="grid min-h-[22rem] place-items-center">
              <EmptyState
                icon={<HouseLine size={32} weight="duotone" />}
                title="Nenhum cadastro liberado ainda"
                description="Quando o Super Admin aprovar sua solicitação, ela aparece aqui."
                className="w-full max-w-lg"
              />
            </div>
          )}
        </SurfaceCard>
        </div>
      </main>
    </div>
  );
}
