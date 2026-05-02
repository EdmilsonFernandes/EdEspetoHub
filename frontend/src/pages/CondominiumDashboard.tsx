// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import {
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  Clock,
  DoorOpen,
  ImageSquare,
  PencilSimple,
  Plus,
  Storefront,
  Trash,
  UploadSimple,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../contexts/ToastContext';
import { condominiumService } from '../services/condominiumService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

const formatDateTimeLocal = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date).replace('.', '');
};

const formatCurrency = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return 'Sem taxa';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Sem taxa';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeric);
};

const describeFulfillmentMode = (link: any) => {
  const pickup = link?.allowPickupAtStall !== false;
  const apartmentDelivery = link?.allowApartmentDelivery === true;
  if (pickup && apartmentDelivery) {
    return `Retirada e entrega no apartamento${link?.apartmentDeliveryFee != null ? ` • ${formatCurrency(link.apartmentDeliveryFee)}` : ''}`;
  }
  if (apartmentDelivery) {
    return `Entrega no apartamento${link?.apartmentDeliveryFee != null ? ` • ${formatCurrency(link.apartmentDeliveryFee)}` : ''}`;
  }
  if (pickup) return 'Retirada na barraca';
  return 'Definir modalidade';
};

const addHoursToLocalDateTime = (value: string, hours: number) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() + hours);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toDateTimeLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toUtcIsoFromDateTimeLocal = (value: string) => {
  if (!value) return value;
  const localDate = new Date(value);
  if (Number.isNaN(localDate.getTime())) return value;
  return localDate.toISOString();
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const requestStatusCopy: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Em análise', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprovada', tone: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Recusada', tone: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelada', tone: 'bg-slate-100 text-slate-600' },
  blocked: { label: 'Bloqueada', tone: 'bg-slate-200 text-slate-700' },
};

export function CondominiumDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<any>({ condominium: null, events: [], stores: [], requests: [], approvedStores: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'agenda' | 'lojas' | 'solicitacoes' | 'perfil'>('agenda');
  const [eventForm, setEventForm] = useState({
    title: '',
    startsAt: '',
    endsAt: '',
    pickupLocation: '',
    bannerUrl: '',
    bannerFile: '',
    bannerTitle: '',
    bannerDescription: '',
    notes: '',
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    slug: '',
    city: '',
    state: 'SP',
    address: '',
    description: '',
    zipCode: '',
    logoUrl: '',
    bannerUrl: '',
    logoFile: '',
    bannerFile: '',
  });
  const [editingEventId, setEditingEventId] = useState('');
  const [selectedStoreByEvent, setSelectedStoreByEvent] = useState<Record<string, string>>({});
  const [selectedAgendaEventId, setSelectedAgendaEventId] = useState('');
  const [storeRuleDrafts, setStoreRuleDrafts] = useState<Record<string, { allowPickupAtStall: boolean; allowApartmentDelivery: boolean; apartmentDeliveryFee: string }>>({});
  const [confirmModal, setConfirmModal] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    icon?: React.ReactNode;
    onConfirm: () => Promise<void>;
  }>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await condominiumService.organizerOverview();
      setData(payload || { condominium: null, events: [], stores: [], requests: [], approvedStores: [] });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        localStorage.removeItem('condominiumSession');
        navigate('/condominio/login', { replace: true });
        return;
      }
      setError(err?.message || 'Não foi possível carregar o painel do condomínio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('condominiumSession');
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.token) {
        navigate('/condominio/login', { replace: true });
        return;
      }
      setSession(parsed);
      load();
    } catch {
      localStorage.removeItem('condominiumSession');
      navigate('/condominio/login', { replace: true });
    }
  }, [navigate]);

  const condominium = data.condominium || session?.condominium || {};
  const events = Array.isArray(data.events) ? data.events : [];
  const stores = Array.isArray(data.stores) ? data.stores : [];
  const requests = Array.isArray(data.requests) ? data.requests : [];
  const approvedStores = Array.isArray(data.approvedStores) ? data.approvedStores : [];
  const approvedStoreLinksById = useMemo(
    () => new Map(approvedStores.map((link: any) => [link.storeId || link.store?.id, link])),
    [approvedStores]
  );
  const pendingRequests = requests.filter((request: any) => String(request?.status || 'pending') === 'pending');
  const nextEvent = events.find((event: any) => event.state === 'live') || events.find((event: any) => event.state === 'upcoming') || events[0];
  const fairStoresCount = events.reduce((acc: number, event: any) => acc + (Array.isArray(event?.stores) ? event.stores.length : 0), 0);
  const profileLogoPreview = profileForm.logoFile || resolveAssetUrl(profileForm.logoUrl) || '';
  const profileBannerPreview = profileForm.bannerFile || resolveAssetUrl(profileForm.bannerUrl) || '';
  const eventBannerPreview = eventForm.bannerFile || resolveAssetUrl(eventForm.bannerUrl) || '';

  const metrics = [
    { label: 'Feiras na agenda', value: events.length, tone: 'bg-[#153A4C] text-white' },
    { label: 'Lojas aprovadas', value: approvedStores.length, tone: 'bg-emerald-600 text-white' },
    { label: 'Lojas em feiras', value: fairStoresCount, tone: 'bg-sky-600 text-white' },
    { label: 'Solicitações pendentes', value: pendingRequests.length, tone: 'bg-amber-500 text-white' },
  ];

  useEffect(() => {
    if (!events.length) {
      setSelectedAgendaEventId('');
      return;
    }
    setSelectedAgendaEventId((current) => {
      if (current && events.some((event: any) => event.id === current)) return current;
      return nextEvent?.id || events[0]?.id || '';
    });
  }, [events, nextEvent?.id]);

  const selectedAgendaEvent = useMemo(
    () => events.find((event: any) => event.id === selectedAgendaEventId) || nextEvent || null,
    [events, nextEvent, selectedAgendaEventId]
  );

  const selectedAgendaEventStoreIds = new Set([
    ...((selectedAgendaEvent?.stores || []).map((store: any) => store.id)),
    ...((selectedAgendaEvent?.storeInvitations || []).map((invite: any) => invite.storeId)),
  ]);
  const selectableApprovedStores = approvedStores.filter((link: any) => !selectedAgendaEventStoreIds.has(link.storeId || link.store?.id));

  const logout = () => {
    localStorage.removeItem('condominiumSession');
    navigate('/condominio/login', { replace: true });
  };

  useEffect(() => {
    setProfileForm({
      name: condominium.name || '',
      slug: condominium.slug || '',
      city: condominium.city || '',
      state: condominium.state || 'SP',
      address: condominium.address || '',
      description: condominium.description || '',
      zipCode: condominium.zipCode || '',
      logoUrl: condominium.logoUrl || '',
      bannerUrl: condominium.bannerUrl || '',
      logoFile: '',
      bannerFile: '',
    });
  }, [
    condominium.address,
    condominium.bannerUrl,
    condominium.city,
    condominium.description,
    condominium.logoUrl,
    condominium.name,
    condominium.slug,
    condominium.state,
    condominium.zipCode,
  ]);

  const handleProfileAssetUpload = async (field: 'logoFile' | 'bannerFile', file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProfileForm((prev) => ({ ...prev, [field]: dataUrl }));
    } catch {
      setError('Não foi possível carregar a imagem selecionada.');
    }
  };

  const handleEventBannerUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEventForm((prev) => ({ ...prev, bannerFile: dataUrl }));
      setError('');
    } catch {
      setError('Não foi possível carregar o banner da agenda.');
    }
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.slug.trim()) {
      setError('Nome e slug do condomínio são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updatedCondominium = await condominiumService.organizerUpdate(profileForm);
      setData((prev: any) => ({ ...prev, condominium: updatedCondominium }));
      setSession((prev: any) => {
        const nextSession = prev ? { ...prev, condominium: { ...(prev.condominium || {}), ...updatedCondominium } } : prev;
        if (nextSession) {
          localStorage.setItem('condominiumSession', JSON.stringify(nextSession));
        }
        return nextSession;
      });
      setProfileForm((prev) => ({
        ...prev,
        logoUrl: updatedCondominium.logoUrl || prev.logoUrl,
        bannerUrl: updatedCondominium.bannerUrl || prev.bannerUrl,
        logoFile: '',
        bannerFile: '',
      }));
      await load();
      showToast('Dados do condomínio atualizados.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar dados do condomínio.');
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async () => {
    const startsAt = new Date(eventForm.startsAt);
    const endsAt = new Date(eventForm.endsAt);
    if (!eventForm.startsAt || !eventForm.endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setError('Informe data e horário válidos para a feira.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: eventForm.title || `Feira do ${condominium.name || 'condomínio'}`,
        startsAt: toUtcIsoFromDateTimeLocal(eventForm.startsAt),
        endsAt: toUtcIsoFromDateTimeLocal(eventForm.endsAt),
        pickupLocation: eventForm.pickupLocation,
        status: 'scheduled',
        bannerUrl: eventForm.bannerUrl,
        bannerFile: eventForm.bannerFile,
        bannerTitle: eventForm.bannerTitle,
        bannerDescription: eventForm.bannerDescription,
        notes: eventForm.notes,
      };
      if (editingEventId) {
        await condominiumService.organizerUpdateEvent(editingEventId, payload);
      } else {
        await condominiumService.organizerCreateEvent(payload);
      }
      const wasEditing = Boolean(editingEventId);
      setEditingEventId('');
      setEventForm({
        title: '',
        startsAt: '',
        endsAt: '',
        pickupLocation: '',
        bannerUrl: '',
        bannerFile: '',
        bannerTitle: '',
        bannerDescription: '',
        notes: '',
      });
      await load();
      showToast(wasEditing ? 'Feira atualizada com sucesso.' : 'Feira criada com sucesso.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar feira.');
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event: any) => {
    setEditingEventId(event.id);
    setSelectedAgendaEventId(event.id);
    setEventForm({
      title: event.title || '',
      startsAt: toDateTimeLocalInput(event.startsAt),
      endsAt: toDateTimeLocalInput(event.endsAt),
      pickupLocation: event.pickupLocation || '',
      bannerUrl: event.bannerUrl || '',
      bannerFile: '',
      bannerTitle: event.bannerTitle || '',
      bannerDescription: event.bannerDescription || '',
      notes: event.notes || '',
    });
    setActiveTab('agenda');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEventEdit = () => {
    setEditingEventId('');
    setEventForm({
      title: '',
      startsAt: '',
      endsAt: '',
      pickupLocation: '',
      bannerUrl: '',
      bannerFile: '',
      bannerTitle: '',
      bannerDescription: '',
      notes: '',
    });
  };

  const deactivateEvent = async (eventId: string) => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerDeactivateEvent(eventId);
      if (editingEventId === eventId) cancelEventEdit();
      await load();
      showToast('Feira encerrada.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao encerrar feira.');
    } finally {
      setSaving(false);
      setConfirmModal(null);
    }
  };

  const handleStartsAt = (value: string) => {
    setEventForm((prev) => ({
      ...prev,
      startsAt: value,
      endsAt: prev.endsAt || addHoursToLocalDateTime(value, 5),
    }));
  };

  const confirmStore = async (eventId: string, storeId: string) => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerConfirmStore(eventId, { storeId });
      setSelectedAgendaEventId(eventId);
      await load();
      showToast('Loja adicionada à feira.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao confirmar loja na feira.');
    } finally {
      setSaving(false);
    }
  };

  const getStoreRuleDraft = (storeLink: any) => {
    const key = storeLink.storeId || storeLink.store?.id;
    return storeRuleDrafts[key] || {
      allowPickupAtStall: storeLink.allowPickupAtStall !== false,
      allowApartmentDelivery: storeLink.allowApartmentDelivery === true,
      apartmentDeliveryFee: storeLink.apartmentDeliveryFee != null ? String(storeLink.apartmentDeliveryFee) : '',
    };
  };

  const updateStoreRuleDraft = (
    storeLink: any,
    patch: Partial<{ allowPickupAtStall: boolean; allowApartmentDelivery: boolean; apartmentDeliveryFee: string }>
  ) => {
    const key = storeLink.storeId || storeLink.store?.id;
    setStoreRuleDrafts((prev) => {
      const current = prev[key] || getStoreRuleDraft(storeLink);
      return {
        ...prev,
        [key]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const saveStoreRule = async (storeLink: any) => {
    const key = storeLink.storeId || storeLink.store?.id;
    const draft = getStoreRuleDraft(storeLink);
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerUpdateStoreSettings(key, {
        allowPickupAtStall: draft.allowPickupAtStall,
        allowApartmentDelivery: draft.allowApartmentDelivery,
        apartmentDeliveryFee: draft.allowApartmentDelivery ? (draft.apartmentDeliveryFee || null) : null,
      });
      await load();
      showToast('Regras de atendimento da loja atualizadas.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar regras da loja.');
    } finally {
      setSaving(false);
    }
  };

  const reviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerReviewRequest(requestId, { status });
      await load();
      showToast(status === 'approved' ? 'Solicitação aprovada.' : 'Solicitação recusada.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao revisar solicitação.');
    } finally {
      setSaving(false);
    }
  };

  const removeApprovedStore = async (storeId: string, storeName?: string) => {
    if (!storeId) return;
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerRemoveStore(storeId);
      await load();
      showToast(`${storeName || 'Loja'} removida do condomínio.`, 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao remover loja do condomínio.');
    } finally {
      setSaving(false);
      setConfirmModal(null);
    }
  };

  const logoUrl = resolveAssetUrl(condominium.logoUrl || '') || '/janocaminho.jpg';
  const bannerUrl = resolveAssetUrl(condominium.bannerUrl || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-40 animate-pulse rounded-[2rem] bg-white" />
          <div className="grid gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-3xl bg-white" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef5f7_0%,#f8fafc_12rem,#f8fafc_100%)] px-4 py-[max(1.2rem,env(safe-area-inset-top))] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => navigate('/hub')} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-95">
            <ArrowLeft size={18} weight="bold" />
          </button>
          <div className="flex items-center gap-1.5">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-5 w-5 rounded-[0.45rem] object-cover shadow-sm" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Condomínio</p>
          </div>
        </div>
        <header className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_80px_-52px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-0">
            {bannerUrl ? (
              <img src={bannerUrl} alt={condominium.name || 'Condomínio'} className="h-full w-full object-cover opacity-20" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.18),transparent_34%),linear-gradient(135deg,#ffffff_0%,#eef6ff_100%)]" />
            )}
          </div>
          <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] border-[5px] border-white bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)]">
                <img src={logoUrl} alt={condominium.name || 'Condomínio'} className="h-full w-full object-contain p-1.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#336886]">Painel do condomínio</p>
                <h1 className="mt-1 truncate text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  {condominium.name || 'Condomínio'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Organize feiras, aprove solicitações de lojistas e escale lojas aprovadas sem depender do Super Admin.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {condominium.slug ? (
                <button
                  type="button"
                  onClick={() => navigate(`/hub?condominio=${encodeURIComponent(condominium.slug)}`)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/86 px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
                >
                  Ver no Hub <ArrowSquareOut size={15} weight="bold" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.65)]"
              >
                Sair <DoorOpen size={15} weight="bold" />
              </button>
            </div>
          </div>
        </header>

        {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)]">
              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${metric.tone}`}>visão rápida</span>
              <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{metric.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{metric.label}</p>
            </div>
          ))}
        </section>

        {nextEvent ? (
          <section className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_58%,#eff6ff_100%)] p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.5)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-[0_14px_26px_-18px_rgba(5,150,105,0.65)]">
                  <CalendarBlank size={22} weight="duotone" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Próxima operação</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{nextEvent.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {formatDateTimeLocal(nextEvent.startsAt)} até {formatDateTimeLocal(nextEvent.endsAt)}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveTab('solicitacoes')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white">
                Ver solicitações <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </section>
        ) : null}

        <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { id: 'agenda', label: 'Agenda', helper: 'Criar e acompanhar feiras' },
            { id: 'lojas', label: 'Lojas', helper: 'Aprovadas e disponíveis' },
            { id: 'solicitacoes', label: 'Solicitações', helper: 'Aprovar pedidos de lojistas' },
            { id: 'perfil', label: 'Perfil', helper: 'Editar dados e identidade visual' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${
                  active ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.65)]' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${active ? 'text-white/70' : 'text-slate-400'}`}>{tab.label}</p>
                <p className={`mt-1 text-sm font-bold ${active ? 'text-white' : 'text-slate-600'}`}>{tab.helper}</p>
              </button>
            );
          })}
        </nav>

        {activeTab === 'agenda' ? (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#336886]/10 text-[#336886]">
                  <Plus size={22} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">{editingEventId ? 'Editar feira' : 'Nova feira'}</h2>
                  <p className="text-sm font-semibold text-slate-500">Defina a agenda. A feira entra ao vivo automaticamente no horário.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-[1.5rem] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_56%,#eff6ff_100%)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Contexto da agenda</p>
                  <p className="mt-2 text-sm font-black text-slate-950">A feira já nasce vinculada ao {condominium.name || 'condomínio'}.</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                    Depois de salvar a data e o horário, você escolhe entre as lojas já aprovadas quem participa dessa edição e quais modalidades de atendimento aquela loja pode usar dentro do condomínio.
                  </p>
                </div>
                <input value={eventForm.title} onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título da feira" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => handleStartsAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                  <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => setEventForm((prev) => ({ ...prev, endsAt: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                </div>
                <input value={eventForm.pickupLocation} onChange={(event) => setEventForm((prev) => ({ ...prev, pickupLocation: event.target.value }))} placeholder="Local: praça, salão, entrada social..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
                  <div className="relative h-36 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_56%,#f8fafc_100%)]">
                    {eventBannerPreview ? (
                      <img src={eventBannerPreview} alt="Banner da agenda" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageSquare size={34} weight="duotone" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/18 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/94 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-sm ring-1 ring-white/70">
                      Banner da feira
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                        <UploadSimple size={14} weight="bold" />
                        Upload do banner
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleEventBannerUpload(event.target.files?.[0])} />
                      </label>
                      {eventBannerPreview ? (
                        <button
                          type="button"
                          onClick={() => setEventForm((prev) => ({ ...prev, bannerUrl: '', bannerFile: '' }))}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm"
                        >
                          <Trash size={14} weight="bold" />
                          Remover banner
                        </button>
                      ) : null}
                    </div>
                    <input value={eventForm.bannerUrl} onChange={(event) => setEventForm((prev) => ({ ...prev, bannerUrl: event.target.value }))} placeholder="URL opcional do banner" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                    <input value={eventForm.bannerTitle} onChange={(event) => setEventForm((prev) => ({ ...prev, bannerTitle: event.target.value }))} placeholder="Título opcional do banner" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                    <textarea value={eventForm.bannerDescription} onChange={(event) => setEventForm((prev) => ({ ...prev, bannerDescription: event.target.value }))} placeholder="Descrição opcional do banner" className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                  </div>
                </div>
                <textarea value={eventForm.notes} onChange={(event) => setEventForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observações para operação" className="min-h-[92px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <button onClick={saveEvent} disabled={saving || !eventForm.startsAt || !eventForm.endsAt} className="w-full rounded-2xl bg-[#153A4C] px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
                    {editingEventId ? 'Salvar feira' : 'Criar feira'}
                  </button>
                  {editingEventId ? (
                    <button type="button" onClick={cancelEventEdit} disabled={saving} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-600 disabled:opacity-50">
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {selectedAgendaEvent ? (
                <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Feira em foco</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">{selectedAgendaEvent.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatDateTimeLocal(selectedAgendaEvent.startsAt)} até {formatDateTimeLocal(selectedAgendaEvent.endsAt)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{selectedAgendaEvent.pickupLocation || 'Local de retirada não informado'}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Lojas confirmadas</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{(selectedAgendaEvent.stores || []).length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Ainda disponíveis</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{selectableApprovedStores.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {events.length ? events.map((event: any) => (
                <article key={event.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          <Clock size={12} weight="bold" />
                          {event.state === 'live' ? 'Ao vivo agora' : event.state === 'upcoming' ? 'Próxima' : 'Encerrada'}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-black text-slate-950">{event.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{formatDateTimeLocal(event.startsAt)} até {formatDateTimeLocal(event.endsAt)}</p>
                      {event.pickupLocation ? <p className="mt-2 text-sm font-bold text-[#336886]">{event.pickupLocation}</p> : null}
                    </div>
                    <div className="min-w-[260px] space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAgendaEventId(event.id)}
                        className={`w-full rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
                          selectedAgendaEventId === event.id
                            ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.8)]'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Usar esta feira no seletor
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => editEvent(event)} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50">
                          <PencilSimple size={15} weight="bold" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmModal({
                            title: 'Encerrar esta feira?',
                            description: 'A feira será finalizada para este condomínio e deixará de aparecer como ativa.',
                            confirmLabel: 'Encerrar feira',
                            variant: 'danger',
                            icon: <WarningCircle size={32} weight="duotone" />,
                            onConfirm: () => deactivateEvent(event.id),
                          })}
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 ring-1 ring-rose-100 disabled:opacity-50"
                        >
                          <Trash size={15} weight="bold" /> Encerrar
                        </button>
                      </div>
                      <select value={selectedStoreByEvent[event.id] || ''} onChange={(e) => setSelectedStoreByEvent((prev) => ({ ...prev, [event.id]: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold">
                        <option value="">Escolher loja aprovada</option>
                        {approvedStores
                          .filter((link: any) => {
                            const linkStoreId = link.storeId || link.store?.id;
                            const alreadyInEvent = new Set([
                              ...((event.stores || []).map((store: any) => store.id)),
                              ...((event.storeInvitations || []).map((invite: any) => invite.storeId)),
                            ]);
                            return !alreadyInEvent.has(linkStoreId);
                          })
                          .map((link: any) => {
                          const store = link.store || {};
                          return <option key={store.id || link.storeId} value={store.id || link.storeId}>{store.name || 'Loja aprovada'}</option>;
                        })}
                      </select>
                      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                        As lojas aparecem aqui depois que o lojista solicita participação e você aprova em Solicitações.
                      </p>
                      <button onClick={() => confirmStore(event.id, selectedStoreByEvent[event.id])} disabled={saving || !selectedStoreByEvent[event.id]} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                        Adicionar à feira
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Lojas confirmadas nesta feira</p>
                      <div className="mt-3 space-y-2">
                        {Array.isArray(event.stores) && event.stores.length ? event.stores.map((store: any) => (
                          <div key={store.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                            <img src={resolveAssetUrl(store.logoUrl || '') || getStoreAvatarUrl(store.slug, store.name)} alt={store.name} className="h-8 w-8 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-slate-800">{store.name}</span>
                              <span className="block truncate text-[11px] font-semibold text-slate-500">{describeFulfillmentMode(approvedStoreLinksById.get(store.id))}</span>
                            </div>
                            <CheckCircle size={17} weight="fill" className="text-emerald-500" />
                          </div>
                        )) : <p className="text-sm font-semibold text-slate-400">Nenhuma loja confirmada.</p>}
                      </div>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
                  <CalendarBlank size={34} weight="duotone" className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">Crie a primeira feira deste condomínio.</p>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === 'lojas' ? (
          <div className="space-y-4">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Regras de atendimento por loja</h2>
                  <p className="text-sm font-semibold text-slate-500">Defina com clareza se a loja pode retirar na barraca, entregar no apartamento e qual taxa vale neste condomínio.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {approvedStores.length} aprovadas
                </span>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {approvedStores.length ? approvedStores.map((storeLink: any) => {
                  const draft = getStoreRuleDraft(storeLink);
                  const store = storeLink.store || {};
                  const logo = resolveAssetUrl(store.logoUrl || store.bannerUrl || '') || getStoreAvatarUrl(store.slug || storeLink.storeId, store.name || 'Loja');
                  return (
                    <article key={storeLink.storeId} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-3">
                        <img src={logo} alt={store.name || 'Loja'} className="h-12 w-12 rounded-2xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black text-slate-950">{store.name || 'Loja aprovada'}</h3>
                          <p className="truncate text-xs font-semibold text-slate-500">{describeFulfillmentMode(storeLink)}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Aprovada</span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700">
                          Retirada na barraca
                          <input
                            type="checkbox"
                            checked={draft.allowPickupAtStall}
                            onChange={(event) => updateStoreRuleDraft(storeLink, { allowPickupAtStall: event.target.checked })}
                            className="h-4 w-4"
                          />
                        </label>
                        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700">
                          Entrega em apartamento
                          <input
                            type="checkbox"
                            checked={draft.allowApartmentDelivery}
                            onChange={(event) => updateStoreRuleDraft(storeLink, { allowApartmentDelivery: event.target.checked })}
                            className="h-4 w-4"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={draft.apartmentDeliveryFee}
                          onChange={(event) => updateStoreRuleDraft(storeLink, { apartmentDeliveryFee: event.target.value })}
                          placeholder="Taxa apartamento ex: 5.00"
                          disabled={!draft.allowApartmentDelivery}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => saveStoreRule(storeLink)}
                          disabled={saving}
                          className="w-full rounded-2xl bg-[#153A4C] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50 sm:max-w-[168px]"
                        >
                          Salvar regras
                        </button>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500 xl:col-span-2">
                    Nenhuma loja aprovada neste condomínio ainda.
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store: any) => (
                <article key={store.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)]">
                  <div className="flex items-center gap-3">
                    <img src={resolveAssetUrl(store.logoUrl || '') || getStoreAvatarUrl(store.slug, store.name)} alt={store.name} className="h-12 w-12 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-slate-950">{store.name}</h3>
                      <p className="text-xs font-semibold text-slate-500">{store.city || 'Cidade'} {store.state ? `• ${store.state}` : ''}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      store.condominiumStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      store.condominiumStatus === 'invited' ? 'bg-sky-100 text-sky-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {store.condominiumStatus === 'approved' ? 'Aprovada' : store.condominiumStatus === 'invited' ? 'Pendente' : 'Disponível'}
                    </span>
                  </div>
                  {store.condominiumStatus === 'approved' ? (
                    <button
                      type="button"
                      onClick={() => setConfirmModal({
                        title: 'Remover loja do condomínio?',
                        description: `${store.name || 'Esta loja'} perderá a associação atual e não poderá mais ser escalada nas próximas feiras até nova aprovação.`,
                        confirmLabel: 'Remover loja',
                        variant: 'danger',
                        icon: <WarningCircle size={32} weight="duotone" />,
                        onConfirm: () => removeApprovedStore(store.id, store.name),
                      })}
                      disabled={saving}
                      className="mt-4 w-full rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      Remover do condomínio
                    </button>
                  ) : null}
                </article>
              ))}
            </section>
          </div>
        ) : null}

        {activeTab === 'solicitacoes' ? (
          <section className="space-y-3">
            {requests.length ? requests.map((request: any) => {
              const statusMeta = requestStatusCopy[String(request.status || 'pending')] || { label: 'Atualizada', tone: 'bg-slate-100 text-slate-600' };
              return (
              <article key={request.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={resolveAssetUrl(request.store?.logoUrl || '') || getStoreAvatarUrl(request.store?.slug, request.store?.name)} alt={request.store?.name || 'Loja'} className="h-12 w-12 rounded-2xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{request.store?.name || 'Loja'}</p>
                      <p className="text-xs font-semibold text-slate-500">{request.message || 'Solicitou participação no condomínio.'}</p>
                    </div>
                  </div>
                  {String(request.status || '') === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => reviewRequest(request.id, 'approved')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white">
                        <CheckCircle size={15} weight="fill" /> Aprovar
                      </button>
                      <button onClick={() => reviewRequest(request.id, 'rejected')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                        <XCircle size={15} weight="fill" /> Recusar
                      </button>
                    </div>
                  ) : (
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusMeta.tone}`}>{statusMeta.label}</span>
                  )}
                </div>
              </article>
            )}) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
                <Storefront size={34} weight="duotone" className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">Nenhuma solicitação de loja no momento.</p>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'perfil' ? (
          <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#336886]/10 text-[#336886]">
                  <PencilSimple size={22} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Perfil do condomínio</h2>
                  <p className="text-sm font-semibold text-slate-500">Atualize a identidade visual e os dados usados no Hub e nas feiras.</p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
                <div className="relative h-36 bg-gradient-to-br from-emerald-50 via-white to-sky-50">
                  {profileBannerPreview ? (
                    <img src={profileBannerPreview} alt="Banner do condomínio" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <ImageSquare size={34} weight="duotone" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/20 to-transparent" />
                  <div className="absolute -bottom-9 left-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] border-[5px] border-white bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)]">
                    {profileLogoPreview ? (
                      <img src={profileLogoPreview} alt="Logo do condomínio" className="h-full w-full object-contain p-2" />
                    ) : (
                      <Buildings size={30} weight="duotone" className="text-[#336886]" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 px-5 pb-5 pt-12">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                    <UploadSimple size={14} weight="bold" />
                    Upload logo
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleProfileAssetUpload('logoFile', event.target.files?.[0])} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                    <UploadSimple size={14} weight="bold" />
                    Upload banner
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleProfileAssetUpload('bannerFile', event.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)]">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['name', 'Nome do condomínio'],
                  ['slug', 'Slug'],
                  ['city', 'Cidade'],
                  ['state', 'UF'],
                  ['address', 'Endereço'],
                  ['description', 'Descrição'],
                  ['zipCode', 'CEP'],
                  ['logoUrl', 'Logo URL opcional'],
                  ['bannerUrl', 'Banner URL opcional'],
                ].map(([key, label]) => (
                  <label key={key} className={`${key === 'address' || key === 'bannerUrl' || key === 'description' ? 'sm:col-span-2' : ''} block`}>
                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
                    {key === 'description' ? (
                      <textarea
                        value={(profileForm as any)[key]}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        placeholder={label}
                        className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white"
                      />
                    ) : (
                      <input
                        value={(profileForm as any)[key]}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        placeholder={label}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white"
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || !profileForm.name.trim() || !profileForm.slug.trim()}
                  className="w-full rounded-2xl bg-[#153A4C] px-4 py-3.5 text-sm font-black text-white disabled:opacity-50"
                >
                  Salvar dados do condomínio
                </button>
                <button
                  type="button"
                  onClick={() => setProfileForm({
                    name: condominium.name || '',
                    slug: condominium.slug || '',
                    city: condominium.city || '',
                    state: condominium.state || 'SP',
                    address: condominium.address || '',
                    description: condominium.description || '',
                    zipCode: condominium.zipCode || '',
                    logoUrl: condominium.logoUrl || '',
                    bannerUrl: condominium.bannerUrl || '',
                    logoFile: '',
                    bannerFile: '',
                  })}
                  disabled={saving}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 disabled:opacity-50"
                >
                  Descartar alterações
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <ConfirmationModal
          isOpen={!!confirmModal}
          onClose={() => !saving && setConfirmModal(null)}
          onConfirm={() => confirmModal?.onConfirm()}
          title={confirmModal?.title || ''}
          description={confirmModal?.description || ''}
          confirmLabel={confirmModal?.confirmLabel || 'Confirmar'}
          variant={confirmModal?.variant || 'warning'}
          icon={confirmModal?.icon}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
