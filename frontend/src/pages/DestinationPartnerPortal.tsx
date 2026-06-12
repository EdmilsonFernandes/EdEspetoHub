// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowSquareOut,
  Buildings,
  Camera,
  CheckCircle,
  Compass,
  Eye,
  EyeSlash,
  FloppyDisk,
  HouseLine,
  LockKey,
  SignOut,
  Sparkle,
} from '@phosphor-icons/react';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { AppRobotLoader } from '../components/common/AppRobotLoader';
import { Button, IconButton, SurfaceCard, TextField } from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';
import {
  destinationPartnerPortalService,
  DestinationPartnerResource,
} from '../services/destinationPartnerPortalService';
import { buildListingClaimUrl } from '../utils/destinationListingClaim';
import { inputAssistProps, textareaAssistProps } from '../utils/inputAssist';

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
  bannerFile: '',
  imageFile: '',
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const completionScore = (item: any, type: string) => {
  const checks = [
    type === 'HOSPITALITY_PLACE' ? item.logoUrl || item.bannerUrl : item.imageUrl,
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
      label: isHospitality ? 'Logo ou banner' : 'Foto do serviço',
      done: Boolean(isHospitality ? (item.logoUrl || item.bannerUrl || form.logoFile || form.bannerFile) : (item.imageUrl || form.imageFile)),
    },
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
          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Atualize sua presença no app</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Gerencie fotos, contatos e informações permitidas pelo Super Admin.</p>
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
    const encoded = await fileToBase64(file);
    change(field, encoded);
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
        await destinationPartnerPortalService.updateHospitalityPlace(selectedResource.item.id, payload);
      } else {
        payload.title = form.title;
        if (form.imageFile) payload.imageFile = form.imageFile;
        await destinationPartnerPortalService.updateListing(selectedResource.item.id, payload);
      }
      const refreshed = await destinationPartnerPortalService.me();
      setResources(refreshed.resources || []);
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
          <button type="button" onClick={logout} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-sm">
            <SignOut size={15} weight="bold" />
            Sair
          </button>
        )}
        maxWidthClassName="max-w-6xl"
      />

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-[1.8rem] border border-white/70 bg-white/86 p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#336886]/70">Conta</p>
            <h1 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">{session.partner?.name || 'Parceiro'}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{session.partner?.email}</p>
          </section>

          <section className="rounded-[1.8rem] border border-white/70 bg-white/86 p-3 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl">
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
                    className={`flex w-full items-center gap-3 rounded-[1.35rem] border p-2.5 text-left transition active:scale-[0.99] ${active ? 'border-[#336886]/24 bg-[#336886]/9 shadow-[0_18px_34px_-26px_rgba(21,58,76,0.45)]' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
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
          </section>
        </aside>

        <section className="rounded-[2rem] border border-white/70 bg-white/88 p-4 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.60)] backdrop-blur-xl sm:p-6">
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

              <section className="rounded-[1.6rem] border border-[#336886]/10 bg-[linear-gradient(135deg,rgba(51,104,134,0.08),rgba(255,255,255,0.82))] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Checklist de publicação</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">Deixe sua página pronta para converter.</h3>
                  </div>
                  <span className="rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">
                    {checklist.filter((item) => item.done).length}/{checklist.length} concluídos
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  {checklist.map((item) => (
                    <div key={item.label} className={`rounded-2xl border px-3 py-2 text-xs font-black ${item.done ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white/78 text-slate-500'}`}>
                      <CheckCircle size={15} weight={item.done ? 'fill' : 'duotone'} className="mb-1" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Nome público</span>
                  <input
                    {...inputAssistProps.name}
                    value={selectedResource.resourceType === 'HOSPITALITY_PLACE' ? form.name : form.title}
                    onChange={(event) => change(selectedResource.resourceType === 'HOSPITALITY_PLACE' ? 'name' : 'title', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Descrição</span>
                  <textarea
                    {...textareaAssistProps.description}
                    value={form.description}
                    onChange={(event) => change('description', event.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">WhatsApp</span>
                  <input {...inputAssistProps.phone} value={form.whatsapp} onChange={(event) => change('whatsapp', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Telefone</span>
                  <input {...inputAssistProps.phone} value={form.phone} onChange={(event) => change('phone', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Instagram</span>
                  <input type="url" value={form.instagramUrl} onChange={(event) => change('instagramUrl', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Site</span>
                  <input type="url" value={form.websiteUrl} onChange={(event) => change('websiteUrl', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white" />
                </label>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-6">
                <label className="block sm:col-span-3">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Endereço</span>
                  <input {...inputAssistProps.addressLine1} value={form.address} onChange={(event) => change('address', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886]" />
                </label>
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Número</span>
                  <input value={form.addressNumber} onChange={(event) => change('addressNumber', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">CEP</span>
                  <input {...inputAssistProps.postalCode} value={form.zipCode} onChange={(event) => change('zipCode', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Bairro</span>
                  <input {...inputAssistProps.neighborhood} value={form.district} onChange={(event) => change('district', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886]" />
                </label>
                <label className="block sm:col-span-3">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Cidade</span>
                  <input {...inputAssistProps.city} value={form.city} onChange={(event) => change('city', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886]" />
                </label>
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">UF</span>
                  <input {...inputAssistProps.state} value={form.state} onChange={(event) => change('state', event.target.value)} maxLength={2} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886]" />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedResource.resourceType === 'HOSPITALITY_PLACE' ? (
                  <>
                    <label className="block rounded-[1.4rem] border border-dashed border-[#336886]/25 bg-[#336886]/6 p-4">
                      <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]"><Camera size={16} /> Logo</span>
                      <input type="file" accept="image/*" onChange={(event) => chooseFile('logoFile', event.target.files?.[0])} className="text-sm font-semibold text-slate-600" />
                    </label>
                    <label className="block rounded-[1.4rem] border border-dashed border-[#336886]/25 bg-[#336886]/6 p-4">
                      <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]"><Camera size={16} /> Banner</span>
                      <input type="file" accept="image/*" onChange={(event) => chooseFile('bannerFile', event.target.files?.[0])} className="text-sm font-semibold text-slate-600" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Instruções de entrega</span>
                      <textarea {...textareaAssistProps.notes} value={form.deliveryInstructions} onChange={(event) => change('deliveryInstructions', event.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white" />
                    </label>
                  </>
                ) : (
                  <label className="block rounded-[1.4rem] border border-dashed border-[#336886]/25 bg-[#336886]/6 p-4 sm:col-span-2">
                    <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]"><Camera size={16} /> Imagem do serviço</span>
                    <input type="file" accept="image/*" onChange={(event) => chooseFile('imageFile', event.target.files?.[0])} className="text-sm font-semibold text-slate-600" />
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <a href={selectedResource.resourceType === 'HOSPITALITY_PLACE' ? `/destinos/${selectedResource.item?.destination?.slug || ''}/chales/${selectedResource.item?.slug || ''}` : `/destinos/${selectedResource.item?.destination?.slug || ''}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50">
                  <ArrowSquareOut size={17} weight="bold" />
                  Ver página pública
                </a>
                {storeSignupUrl ? (
                  <a href={storeSignupUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100">
                    <Buildings size={17} weight="duotone" />
                    Quero receber pedidos
                  </a>
                ) : null}
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(21,58,76,0.65)] transition active:scale-[0.98] disabled:opacity-60">
                  {saving ? <Buildings size={17} weight="duotone" /> : <FloppyDisk size={17} weight="duotone" />}
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>

              {success ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle size={16} weight="fill" className="mr-1 inline" />{success}</p> : null}
              {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
            </form>
          ) : (
            <div className="grid min-h-[22rem] place-items-center text-center">
              <div>
                <HouseLine size={44} weight="duotone" className="mx-auto text-[#336886]" />
                <h2 className="mt-3 text-xl font-black text-slate-950">Nenhum cadastro liberado ainda</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">Quando o Super Admin aprovar sua solicitação, ela aparece aqui.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
