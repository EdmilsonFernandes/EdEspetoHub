import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Buildings, CalendarBlank, CaretRight, Clock, Eye, EyeSlash, ImageSquare, Key, PencilSimple, Storefront, Trash, UploadSimple, UserCircle } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
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

const eventStateCopy: Record<string, { label: string; tone: string }> = {
  live: { label: 'Ao vivo', tone: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  upcoming: { label: 'Próxima', tone: 'bg-sky-100 text-sky-700 ring-sky-200' },
  finished: { label: 'Encerrada', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const statusCopy: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Em análise', tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  approved: { label: 'Aprovado', tone: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  rejected: { label: 'Recusado', tone: 'bg-rose-100 text-rose-700 ring-rose-200' },
  cancelled: { label: 'Cancelado', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  blocked: { label: 'Bloqueado', tone: 'bg-slate-200 text-slate-700 ring-slate-300' },
};

const requestBorderAccent = (status: string) => {
  const s = String(status || 'pending');
  if (s === 'approved') return 'border-l-emerald-400';
  if (s === 'pending') return 'border-l-amber-400';
  if (s === 'rejected' || s === 'blocked') return 'border-l-rose-400';
  return 'border-l-slate-300';
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

export function SuperAdminCondominiums() {
  const [data, setData] = useState<any>({ condominiums: [], stores: [], requests: [], accessRequests: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeWorkspace, setActiveWorkspace] = useState<'dashboard' | 'requests' | 'condos' | 'agenda'>('dashboard');
  const [editingCondominiumId, setEditingCondominiumId] = useState('');
  const [editingEventId, setEditingEventId] = useState('');
  const [condominiumForm, setCondominiumForm] = useState({
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
  const [eventForm, setEventForm] = useState({
    condominiumId: '',
    title: '',
    startsAt: '',
    endsAt: '',
    pickupLocation: '',
    status: 'scheduled',
    bannerUrl: '',
    bannerFile: '',
    bannerTitle: '',
    bannerDescription: '',
    notes: '',
  });
  const [eventFormError, setEventFormError] = useState('');
  const [eventStoreForm, setEventStoreForm] = useState({
    eventId: '',
    storeId: '',
  });
  const [userForm, setUserForm] = useState({
    condominiumId: '',
    name: '',
    email: '',
    password: '',
  });
  const [showUserPasswordInput, setShowUserPasswordInput] = useState(false);
  const [createdPasswordByUserId, setCreatedPasswordByUserId] = useState<Record<string, string>>({});
  const [revealedCondominiumPasswords, setRevealedCondominiumPasswords] = useState<Record<string, boolean>>({});
  const [storeRuleDrafts, setStoreRuleDrafts] = useState<Record<string, { allowPickupAtStall: boolean; allowApartmentDelivery: boolean; apartmentDeliveryFee: string }>>({});
  const [selectedAgendaCondominiumId, setSelectedAgendaCondominiumId] = useState('');
  const [selectedAgendaEventId, setSelectedAgendaEventId] = useState('');

  const load = async () => {
    if (!localStorage.getItem('superAdminToken')) {
      window.location.href = '/superadmin';
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await condominiumService.adminOverview();
      setData(payload || { condominiums: [], stores: [], requests: [], accessRequests: [] });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar condomínios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const condominiums = Array.isArray(data.condominiums) ? data.condominiums : [];

  const events = useMemo(() => {
    return condominiums.flatMap((condominium: any) =>
      (condominium.events || []).map((event: any) => ({ ...event, condominium }))
    );
  }, [condominiums]);

  useEffect(() => {
    if (!condominiums.length) {
      setSelectedAgendaCondominiumId('');
      return;
    }
    setSelectedAgendaCondominiumId((current) => {
      if (current && condominiums.some((condominium: any) => condominium.id === current)) return current;
      if (eventForm.condominiumId && condominiums.some((condominium: any) => condominium.id === eventForm.condominiumId)) {
        return eventForm.condominiumId;
      }
      return condominiums[0]?.id || '';
    });
  }, [condominiums, eventForm.condominiumId]);

  const selectedAgendaCondominium = useMemo(
    () => condominiums.find((condominium: any) => condominium.id === selectedAgendaCondominiumId) || null,
    [condominiums, selectedAgendaCondominiumId]
  );

  const agendaEvents = useMemo(
    () => events.filter((event: any) => event.condominium?.id === selectedAgendaCondominiumId),
    [events, selectedAgendaCondominiumId]
  );

  useEffect(() => {
    if (!agendaEvents.length) {
      setSelectedAgendaEventId('');
      return;
    }
    setSelectedAgendaEventId((current) => {
      if (current && agendaEvents.some((event: any) => event.id === current)) return current;
      return agendaEvents[0]?.id || '';
    });
  }, [agendaEvents]);

  const selectedAgendaEvent = useMemo(
    () => agendaEvents.find((event: any) => event.id === selectedAgendaEventId) || null,
    [agendaEvents, selectedAgendaEventId]
  );

  useEffect(() => {
    setEventStoreForm((current) => {
      const nextEventId = selectedAgendaEvent?.id || '';
      if (current.eventId === nextEventId) return current;
      return { eventId: nextEventId, storeId: '' };
    });
  }, [selectedAgendaEvent?.id]);

  useEffect(() => {
    if (editingEventId && eventForm.condominiumId) {
      setSelectedAgendaCondominiumId(eventForm.condominiumId);
      setSelectedAgendaEventId(editingEventId);
    }
  }, [editingEventId, eventForm.condominiumId]);

  const approvedStoresForAgenda = Array.isArray(selectedAgendaCondominium?.approvedStores) ? selectedAgendaCondominium.approvedStores : [];
  const selectedAgendaEventStoreIds = new Set([
    ...((selectedAgendaEvent?.stores || []).map((store: any) => store.id)),
    ...((selectedAgendaEvent?.storeInvitations || []).map((invite: any) => invite.storeId)),
  ]);
  const availableStoresForAgendaEvent = approvedStoresForAgenda.filter((link: any) => !selectedAgendaEventStoreIds.has(link.storeId));

  const metrics = useMemo(() => {
    const condominiums = Array.isArray(data.condominiums) ? data.condominiums : [];
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const accessRequests = Array.isArray(data.accessRequests) ? data.accessRequests : [];
    const pendingStoreRequests = requests.filter((request: any) => String(request?.status || 'pending') === 'pending').length;
    const pendingAccessRequests = accessRequests.filter((request: any) => String(request?.status || 'pending') === 'pending').length;
    const confirmedStores = events.reduce((acc: number, event: any) => acc + (Array.isArray(event?.stores) ? event.stores.length : 0), 0);
    return {
      condominiums: condominiums.length,
      events: events.length,
      pendingRequests: pendingStoreRequests + pendingAccessRequests,
      pendingAccessRequests,
      confirmedStores,
    };
  }, [data.condominiums, data.requests, data.accessRequests, events]);

  const createCondominium = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingCondominiumId) {
        await condominiumService.adminUpdate(editingCondominiumId, condominiumForm);
      } else {
        await condominiumService.adminCreate(condominiumForm);
      }
      setEditingCondominiumId('');
      setCondominiumForm({
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
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar condomínio.');
    } finally {
      setSaving(false);
    }
  };

  const editCondominium = (condominium: any) => {
    setEditingCondominiumId(condominium.id);
    setCondominiumForm({
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelCondominiumEdit = () => {
    setEditingCondominiumId('');
    setCondominiumForm({
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
  };

  const deactivateCondominium = async (condominiumId: string) => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.adminDeactivate(condominiumId);
      if (editingCondominiumId === condominiumId) cancelCondominiumEdit();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao desativar condomínio.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (field: 'logoFile' | 'bannerFile', file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCondominiumForm((prev) => ({ ...prev, [field]: dataUrl }));
    } catch {
      setError('Não foi possível carregar a imagem selecionada.');
    }
  };

  const handleEventBannerUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEventForm((prev) => ({ ...prev, bannerFile: dataUrl }));
      setEventFormError('');
    } catch {
      setEventFormError('Não foi possível carregar o banner da agenda.');
    }
  };

  const saveEvent = async () => {
    const condominiumId = eventForm.condominiumId || selectedAgendaCondominiumId;
    if (!condominiumId) {
      setEventFormError('Escolha o condomínio antes de salvar a feira.');
      return;
    }
    const startsAt = new Date(eventForm.startsAt);
    const endsAt = new Date(eventForm.endsAt);
    if (!eventForm.startsAt || !eventForm.endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setEventFormError('Informe a data e o horário de início e fim da feira.');
      return;
    }
    if (endsAt <= startsAt) {
      setEventFormError('O horário de término precisa ser depois do início.');
      return;
    }
    setSaving(true);
    setError('');
    setEventFormError('');
    try {
      const payload = {
        ...eventForm,
        condominiumId,
        status: 'scheduled',
      };
      if (editingEventId) {
        await condominiumService.adminUpdateEvent(editingEventId, {
          ...payload,
          startsAt: toUtcIsoFromDateTimeLocal(eventForm.startsAt),
          endsAt: toUtcIsoFromDateTimeLocal(eventForm.endsAt),
        });
      } else {
        await condominiumService.adminCreateEvent(condominiumId, {
          title: eventForm.title || `Feira do ${condominiums.find((item: any) => item.id === condominiumId)?.name || 'condomínio'}`,
          startsAt: toUtcIsoFromDateTimeLocal(eventForm.startsAt),
          endsAt: toUtcIsoFromDateTimeLocal(eventForm.endsAt),
          pickupLocation: eventForm.pickupLocation,
          status: 'scheduled',
          bannerUrl: eventForm.bannerUrl,
          bannerFile: eventForm.bannerFile,
          bannerTitle: eventForm.bannerTitle,
          bannerDescription: eventForm.bannerDescription,
          notes: eventForm.notes,
        });
      }
      setEditingEventId('');
      setEventForm({
        condominiumId,
        title: '',
        startsAt: '',
        endsAt: '',
        pickupLocation: '',
        status: 'scheduled',
        bannerUrl: '',
        bannerFile: '',
        bannerTitle: '',
        bannerDescription: '',
        notes: '',
      });
      await load();
    } catch (err: any) {
      setEventFormError(err?.message || 'Falha ao salvar feira.');
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event: any) => {
    setEditingEventId(event.id);
    setEventForm({
      condominiumId: event.condominium?.id || '',
      title: event.title || '',
      startsAt: toDateTimeLocalInput(event.startsAt),
      endsAt: toDateTimeLocalInput(event.endsAt),
      pickupLocation: event.pickupLocation || '',
      status: event.status || 'scheduled',
      bannerUrl: event.bannerUrl || '',
      bannerFile: '',
      bannerTitle: event.bannerTitle || '',
      bannerDescription: event.bannerDescription || '',
      notes: event.notes || '',
    });
    setEventFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEventEdit = () => {
    setEditingEventId('');
    setEventForm({
      condominiumId: selectedAgendaCondominiumId,
      title: '',
      startsAt: '',
      endsAt: '',
      pickupLocation: '',
      status: 'scheduled',
      bannerUrl: '',
      bannerFile: '',
      bannerTitle: '',
      bannerDescription: '',
      notes: '',
    });
    setEventFormError('');
  };

  const deactivateEvent = async (eventId: string) => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.adminDeactivateEvent(eventId);
      if (editingEventId === eventId) cancelEventEdit();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao encerrar feira.');
    } finally {
      setSaving(false);
    }
  };

  const handleEventStartsAtChange = (value: string) => {
    setEventFormError('');
    setEventForm((prev) => {
      const currentEnd = prev.endsAt ? new Date(prev.endsAt) : null;
      const nextStart = value ? new Date(value) : null;
      const shouldSuggestEnd =
        value &&
        (!prev.endsAt || !currentEnd || Number.isNaN(currentEnd.getTime()) || (nextStart && currentEnd <= nextStart));
      return {
        ...prev,
        startsAt: value,
        endsAt: shouldSuggestEnd ? addHoursToLocalDateTime(value, 5) : prev.endsAt,
      };
    });
  };

  const handleEventEndsAtChange = (value: string) => {
    setEventFormError('');
    setEventForm((prev) => ({ ...prev, endsAt: value }));
  };

  const handleEventCondominiumChange = (value: string) => {
    setEventFormError('');
    setSelectedAgendaCondominiumId(value);
    setSelectedAgendaEventId('');
    setEventStoreForm({ eventId: '', storeId: '' });
    setEventForm((prev) => ({ ...prev, condominiumId: value }));
  };

  const handleEventPickupLocationChange = (value: string) => {
    setEventFormError('');
    setEventForm((prev) => ({ ...prev, pickupLocation: value }));
  };

  const addStoreToEvent = async () => {
    const eventId = eventStoreForm.eventId || selectedAgendaEventId;
    if (!eventId || !eventStoreForm.storeId) return;
    setSaving(true);
    setError('');
    try {
      const event = events.find((item: any) => item.id === eventId);
      if (event?.condominium?.id) {
        await condominiumService.adminApproveStore(event.condominium.id, eventStoreForm.storeId);
      }
      await condominiumService.adminAddStoreToEvent(eventId, eventStoreForm.storeId);
      setEventStoreForm({ eventId, storeId: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar loja à feira.');
    } finally {
      setSaving(false);
    }
  };

  const reviewRequest = async (requestId: string, status: 'pending' | 'approved' | 'rejected' | 'blocked' | 'cancelled') => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.adminReviewRequest(requestId, { status });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao revisar solicitação.');
    } finally {
      setSaving(false);
    }
  };

  const reviewAccessRequest = async (requestId: string, status: 'pending' | 'approved' | 'rejected' | 'cancelled') => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.adminReviewAccessRequest(requestId, { status });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao revisar solicitação de acesso.');
    } finally {
      setSaving(false);
    }
  };

  const logoPreview = condominiumForm.logoFile || resolveAssetUrl(condominiumForm.logoUrl) || '';
  const bannerPreview = condominiumForm.bannerFile || resolveAssetUrl(condominiumForm.bannerUrl) || '';
  const eventBannerPreview = eventForm.bannerFile || resolveAssetUrl(eventForm.bannerUrl) || '';
  const workspaceTabs = [
    { id: 'dashboard', label: 'Início', helper: 'Resumo e atalhos' },
    { id: 'requests', label: 'Solicitações', helper: 'Condomínios e lojas' },
    { id: 'condos', label: 'Gestão', helper: 'Dados, regras e acesso' },
    { id: 'agenda', label: 'Agenda', helper: 'Datas e participantes' },
  ] as const;

  const focusCondominiumAccess = () => {
    setActiveWorkspace('condos');
    window.setTimeout(() => {
      document.getElementById('condominium-access-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const prepareAccessUser = (request: any) => {
    const condominiumId = request?.createdCondominiumId || request?.createdCondominium?.id || '';
    if (!condominiumId) return;
    setUserForm({
      condominiumId,
      name: request.responsibleName || '',
      email: request.responsibleEmail || '',
      password: '',
    });
    focusCondominiumAccess();
  };

  const getStoreRuleDraft = (condominiumId: string, storeLink: any) => {
    const key = `${condominiumId}:${storeLink.storeId}`;
    return storeRuleDrafts[key] || {
      allowPickupAtStall: storeLink.allowPickupAtStall !== false,
      allowApartmentDelivery: storeLink.allowApartmentDelivery === true,
      apartmentDeliveryFee: storeLink.apartmentDeliveryFee != null ? String(storeLink.apartmentDeliveryFee) : '',
    };
  };

  const updateStoreRuleDraft = (condominiumId: string, storeId: string, patch: Partial<{ allowPickupAtStall: boolean; allowApartmentDelivery: boolean; apartmentDeliveryFee: string }>, fallback?: any) => {
    const key = `${condominiumId}:${storeId}`;
    setStoreRuleDrafts((prev) => {
      const base = prev[key] || {
        allowPickupAtStall: fallback?.allowPickupAtStall !== false,
        allowApartmentDelivery: fallback?.allowApartmentDelivery === true,
        apartmentDeliveryFee: fallback?.apartmentDeliveryFee != null ? String(fallback.apartmentDeliveryFee) : '',
      };
      return {
        ...prev,
        [key]: {
          ...base,
          ...patch,
        },
      };
    });
  };

  const saveStoreRule = async (condominiumId: string, storeLink: any) => {
    const draft = getStoreRuleDraft(condominiumId, storeLink);
    setSaving(true);
    setError('');
    try {
      await condominiumService.adminUpdateStoreSettings(condominiumId, storeLink.storeId, {
        allowPickupAtStall: draft.allowPickupAtStall,
        allowApartmentDelivery: draft.allowApartmentDelivery,
        apartmentDeliveryFee: draft.allowApartmentDelivery ? (draft.apartmentDeliveryFee || null) : null,
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar regras da loja no condomínio.');
    } finally {
      setSaving(false);
    }
  };

  const createCondominiumUser = async () => {
    if (!userForm.condominiumId || !userForm.email || !userForm.password) {
      setError('Escolha o condomínio e informe usuário/e-mail e senha do responsável.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const savedUser = await condominiumService.adminCreateUser(userForm.condominiumId, userForm);
      if (savedUser?.id && savedUser?.temporaryPassword) {
        setCreatedPasswordByUserId((prev) => ({ ...prev, [savedUser.id]: savedUser.temporaryPassword }));
        setRevealedCondominiumPasswords((prev) => ({ ...prev, [savedUser.id]: false }));
      }
      if (savedUser?.credentialsEmailSent === false) {
        setError('Acesso criado, mas o e-mail de credenciais não foi enviado. Envie usuário e senha manualmente.');
      }
      setUserForm({ condominiumId: userForm.condominiumId, name: '', email: '', password: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar acesso do condomínio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout contextLabel="Condomínios" showHeader={false}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_34%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_42%,_#eef6ff_100%)] p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.45)] sm:p-7">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-200/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">Hub Imobiliário</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Condomínios e feiras com operação centralizada</h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
                  Organize a agenda dos condomínios, publique novas feiras e confirme as lojas participantes em um painel mais claro para operação no mobile e no desktop.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
                <button
                  type="button"
                  onClick={focusCondominiumAccess}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.8)]"
                >
                  Criar usuário do condomínio
                </button>
                <Link
                  to="/superadmin"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-black text-slate-700 shadow-sm backdrop-blur"
                >
                  Voltar ao Super Admin
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Condomínios ativos', value: metrics.condominiums, tone: 'from-[#0f172a] to-[#1e293b]' },
                { label: 'Feiras na agenda', value: metrics.events, tone: 'from-emerald-600 to-teal-500' },
                { label: 'Solicitações pendentes', value: metrics.pendingRequests, tone: 'from-amber-500 to-orange-500' },
                { label: 'Lojas confirmadas', value: metrics.confirmedStores, tone: 'from-sky-600 to-cyan-500' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)] backdrop-blur">
                  <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white ${item.tone}`}>
                    visão rápida
                  </div>
                  <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              {workspaceTabs.map((tab) => {
                const active = activeWorkspace === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveWorkspace(tab.id)}
                    className={`rounded-[1.4rem] border px-4 py-3 text-left transition-all ${
                      active
                        ? 'border-slate-900 bg-slate-950 text-white shadow-[0_20px_34px_-24px_rgba(15,23,42,0.65)]'
                        : 'border-white/70 bg-white/75 text-slate-700 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)]'
                    }`}
                  >
                    <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${active ? 'text-white/70' : 'text-slate-400'}`}>{tab.label}</p>
                    <p className={`mt-1 text-sm font-bold ${active ? 'text-white' : 'text-slate-600'}`}>{tab.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>
          {error ? <p className="relative mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        </section>

        {activeWorkspace === 'dashboard' && (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.2)] sm:p-8">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-50/50 blur-3xl" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Painel de Operações</h2>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                    Bem-vindo ao hub central. Utilize os atalhos abaixo para gerenciar solicitações pendentes ou navegar pelas abas de gestão e agenda.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveWorkspace('requests')} className="flex items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-100 transition hover:bg-amber-100/50">
                    <div className="text-2xl font-black text-amber-700">{metrics.pendingAccessRequests || 0}</div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Acessos</p>
                      <p className="text-xs font-bold text-amber-900">Pendentes</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveWorkspace('requests')} className="flex items-center gap-3 rounded-2xl bg-sky-50 px-5 py-4 ring-1 ring-sky-100 transition hover:bg-sky-100/50">
                    <div className="text-2xl font-black text-sky-700">{metrics.pendingRequests || 0}</div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-600/70">Lojas</p>
                      <p className="text-xs font-bold text-sky-900">Solicitações</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button onClick={() => setActiveWorkspace('condos')} className="group relative flex items-start gap-4 rounded-3xl border border-slate-100 bg-slate-50/50 p-5 transition hover:bg-white hover:shadow-xl hover:ring-1 hover:ring-slate-200">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#336886] shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                    <Buildings size={24} weight="duotone" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-slate-900">Gerenciar Condomínios</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Cadastre novos prédios, configure regras e usuários.</p>
                  </div>
                </button>
                <button onClick={() => setActiveWorkspace('agenda')} className="group relative flex items-start gap-4 rounded-3xl border border-slate-100 bg-slate-50/50 p-5 transition hover:bg-white hover:shadow-xl hover:ring-1 hover:ring-slate-200">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                    <CalendarBlank size={24} weight="duotone" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-slate-900">Organizar Agenda</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Crie novas feiras e gerencie a participação das lojas.</p>
                  </div>
                </button>
                <button onClick={() => {
                  setActiveWorkspace('agenda');
                  window.setTimeout(() => document.getElementById('fairs-list-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }} className="group relative flex items-start gap-4 rounded-3xl border border-slate-100 bg-slate-50/50 p-5 transition hover:bg-white hover:shadow-xl hover:ring-1 hover:ring-slate-200">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                    <Clock size={24} weight="duotone" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-slate-900">Ver Próximas Feiras</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Confira o calendário completo de eventos confirmados.</p>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeWorkspace === 'condos' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#336886]/10 text-[#336886]">
                <Buildings size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Novo condomínio</h2>
                <p className="text-sm font-medium text-slate-500">Monte a vitrine visual e os dados base do condomínio.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="relative h-32 bg-gradient-to-br from-emerald-50 via-white to-sky-50">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner do condomínio" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <ImageSquare size={32} weight="duotone" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/20 to-transparent" />
                  <div className="absolute -bottom-8 left-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.4rem] border-[5px] border-white bg-white shadow-[0_16px_34px_-20px_rgba(15,23,42,0.45)]">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo do condomínio" className="h-full w-full object-contain p-2" />
                    ) : (
                      <Buildings size={28} weight="duotone" className="text-[#336886]" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 px-5 pb-4 pt-11">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                    <UploadSimple size={14} weight="bold" />
                    Upload logo
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAssetUpload('logoFile', event.target.files?.[0])} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                    <UploadSimple size={14} weight="bold" />
                    Upload banner
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAssetUpload('bannerFile', event.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['name', 'Nome'],
                ['slug', 'Slug'],
                ['city', 'Cidade'],
                ['state', 'UF'],
                ['address', 'Endereço'],
                ['description', 'Descrição'],
                ['zipCode', 'CEP'],
                ['logoUrl', 'Logo URL opcional'],
                ['bannerUrl', 'Banner URL opcional'],
              ].map(([key, label]) => (
                <label key={key} className={`${key === 'address' || key === 'bannerUrl' ? 'sm:col-span-2' : ''} block`}>
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
                <input
                  key={key}
                  value={(condominiumForm as any)[key]}
                  onChange={(event) => setCondominiumForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder={label}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white"
                />
                </label>
              ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={createCondominium} disabled={saving || !condominiumForm.name} className="w-full rounded-2xl bg-[#336886] px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(51,104,134,0.8)] disabled:opacity-50">
                  {editingCondominiumId ? 'Salvar condomínio' : 'Criar condomínio'}
                </button>
                {editingCondominiumId ? (
                  <button onClick={cancelCondominiumEdit} type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700">
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section id="condominium-access-card" className="overflow-hidden rounded-[2rem] border border-[#336886]/15 bg-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="bg-[linear-gradient(135deg,_#153A4C_0%,_#336886_58%,_#0f172a_100%)] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 text-white ring-1 ring-white/18">
                  <Key size={23} weight="duotone" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/62">Usuário responsável</p>
                  <h2 className="text-xl font-black tracking-tight">Acesso do condomínio</h2>
                  <p className="text-sm font-semibold text-white/68">Crie ou redefina o login usado pelo responsável.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Condomínio</span>
                  <select value={userForm.condominiumId} onChange={(event) => setUserForm((prev) => ({ ...prev, condominiumId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white">
                    <option value="">Escolha o condomínio</option>
                    {(data.condominiums || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Nome do responsável</span>
                  <input value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Ex: Portaria Spazio Azuli" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Usuário ou e-mail</span>
                  <input type="text" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} autoComplete="username" placeholder="spazio.azuli" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Senha</span>
                  <div className="relative">
                    <input type={showUserPasswordInput ? 'text' : 'password'} value={userForm.password} onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))} autoComplete="new-password" placeholder="azuli@123" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white" />
                    <button
                      type="button"
                      onClick={() => setShowUserPasswordInput((prev) => !prev)}
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-[#336886]"
                      aria-label={showUserPasswordInput ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showUserPasswordInput ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                    </button>
                  </div>
                </label>
              </div>
              <button onClick={createCondominiumUser} disabled={saving || !userForm.condominiumId || !userForm.email || !userForm.password} className="w-full rounded-2xl bg-[#153A4C] px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(21,58,76,0.8)] transition hover:bg-[#1f5066] disabled:opacity-50">
                Salvar acesso
              </button>
              {(data.condominiumUsers || []).length ? (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {(data.condominiumUsers || []).slice(0, 4).map((user: any) => (
                    <div key={user.id} className="rounded-[1.3rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.45)]">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#336886]/10 text-[#336886]">
                          <UserCircle size={21} weight="duotone" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">{user.name || 'Responsável'}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{user.condominium?.name || 'Condomínio'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${user.active !== false ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                          {user.active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-100">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Usuário</p>
                          <p className="mt-0.5 truncate text-sm font-black text-slate-800">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-100">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Senha</p>
                            <p className="mt-0.5 truncate text-sm font-black text-slate-800">
                              {createdPasswordByUserId[user.id]
                                ? revealedCondominiumPasswords[user.id]
                                  ? createdPasswordByUserId[user.id]
                                  : '••••••••'
                                : 'Protegida'}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!createdPasswordByUserId[user.id]}
                            onClick={() => setRevealedCondominiumPasswords((prev) => ({ ...prev, [user.id]: !prev[user.id] }))}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100 transition hover:text-[#336886] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={revealedCondominiumPasswords[user.id] ? 'Ocultar senha' : 'Mostrar senha'}
                            title={createdPasswordByUserId[user.id] ? 'Mostrar ou ocultar senha recém-definida' : 'Redefina a senha para exibir aqui'}
                          >
                            {revealedCondominiumPasswords[user.id] ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                          </button>
                        </div>
                      </div>
                      {!createdPasswordByUserId[user.id] ? (
                        <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400">
                          Por segurança, senhas antigas não são recuperadas. Para visualizar, salve uma nova senha para este usuário.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                ) : null}
                </div>
                </section>

                <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Condomínios cadastrados</h2>
                <p className="text-sm font-medium text-slate-500">Edite dados principais e configure as regras operacionais por loja.</p>
                </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {(data.condominiums || []).map((condominium: any) => {
                const preview = resolveAssetUrl(condominium.logoUrl || condominium.bannerUrl || '') || '';
                return (
                  <div key={condominium.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.45)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-slate-50 ring-1 ring-slate-100">
                        {preview ? <img src={preview} alt={condominium.name} className="h-full w-full object-contain p-1.5" /> : <Buildings size={24} weight="duotone" className="text-[#336886]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-black text-slate-950">{condominium.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{condominium.slug}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">{condominium.city || 'Cidade não informada'}{condominium.state ? `, ${condominium.state}` : ''}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => editCondominium(condominium)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                        <PencilSimple size={14} weight="bold" />
                        Editar
                      </button>
                      <button onClick={() => deactivateCondominium(condominium.id)} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 disabled:opacity-50">
                        <Trash size={14} weight="bold" />
                        Desativar
                      </button>
                    </div>
                    <div className="mt-4 rounded-[1.3rem] border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Regras por loja</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Defina se a loja aceita retirada e entrega em apartamento nesse condomínio.</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                          {(condominium.approvedStores || []).length} loja{(condominium.approvedStores || []).length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {(condominium.approvedStores || []).length === 0 ? (
                          <p className="rounded-2xl bg-white px-3 py-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">Nenhuma loja aprovada nesse condomínio ainda.</p>
                        ) : (condominium.approvedStores || []).map((storeLink: any) => {
                          const draft = getStoreRuleDraft(condominium.id, storeLink);
                          const storeLogo = resolveAssetUrl(storeLink.store?.logoUrl || storeLink.store?.bannerUrl || '') || getStoreAvatarUrl(storeLink.store?.slug || storeLink.storeId, storeLink.store?.name || 'Loja');
                          return (
                            <div key={storeLink.storeId} className="rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="flex items-start gap-3">
                                <img src={storeLogo} alt={storeLink.store?.name || 'Loja'} className="h-12 w-12 rounded-2xl border border-slate-100 object-cover" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-slate-950">{storeLink.store?.name || 'Loja'}</p>
                                  <p className="truncate text-[11px] font-semibold text-slate-500">{storeLink.store?.slug || storeLink.storeId}</p>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700">
                                  Retirada na barraca
                                  <input
                                    type="checkbox"
                                    checked={draft.allowPickupAtStall}
                                    onChange={(event) => updateStoreRuleDraft(condominium.id, storeLink.storeId, { allowPickupAtStall: event.target.checked }, storeLink)}
                                    className="h-4 w-4"
                                  />
                                </label>
                                <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700">
                                  Entrega em apartamento
                                  <input
                                    type="checkbox"
                                    checked={draft.allowApartmentDelivery}
                                    onChange={(event) => updateStoreRuleDraft(condominium.id, storeLink.storeId, { allowApartmentDelivery: event.target.checked }, storeLink)}
                                    className="h-4 w-4"
                                  />
                                </label>
                              </div>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input
                                  value={draft.apartmentDeliveryFee}
                                  onChange={(event) => updateStoreRuleDraft(condominium.id, storeLink.storeId, { apartmentDeliveryFee: event.target.value }, storeLink)}
                                  placeholder="Taxa apartamento ex: 5.00"
                                  disabled={!draft.allowApartmentDelivery}
                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886] focus:bg-white disabled:opacity-50"
                                />
                                <button
                                  onClick={() => saveStoreRule(condominium.id, storeLink)}
                                  disabled={saving}
                                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50 sm:max-w-[160px]"
                                >
                                  Salvar regras
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
                })}
                </div>
                </section>
                </div>
                )}

        {activeWorkspace === 'agenda' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CalendarBlank size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">{editingEventId ? 'Editar feira' : 'Nova feira'}</h2>
                <p className="text-sm font-medium text-slate-500">Defina a agenda. A feira entra ao vivo automaticamente no horário.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Condomínio da agenda</span>
                <select value={eventForm.condominiumId || selectedAgendaCondominiumId} onChange={(event) => handleEventCondominiumChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold">
                  <option value="">Escolha o condomínio</option>
                  {condominiums.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              {selectedAgendaCondominium ? (
                <div className="rounded-[1.6rem] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_54%,#eff6ff_100%)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                      <Buildings size={22} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-slate-950">{selectedAgendaCondominium.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {selectedAgendaCondominium.city || 'Cidade não informada'}
                        {selectedAgendaCondominium.state ? ` • ${selectedAgendaCondominium.state}` : ''}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
                          {agendaEvents.length} feira{agendaEvents.length === 1 ? '' : 's'} na agenda
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
                          {approvedStoresForAgenda.length} loja{approvedStoresForAgenda.length === 1 ? '' : 's'} aprovadas
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                        A feira já nasce vinculada a este condomínio. Depois você escolhe, entre as lojas aprovadas, quem participa dessa data e com qual modalidade de retirada ou entrega.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={eventForm.title} onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título da feira" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white sm:col-span-2" />
                <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => handleEventStartsAtChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => handleEventEndsAtChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
              </div>
              <input value={eventForm.pickupLocation} onChange={(event) => handleEventPickupLocationChange(event.target.value)} placeholder="Ex: praça central, entrada social, lounge gourmet" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
              <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
                <div className="relative h-36 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)]">
                  {eventBannerPreview ? (
                    <img src={eventBannerPreview} alt="Banner da agenda" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <ImageSquare size={34} weight="duotone" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/18 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/94 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-sm ring-1 ring-white/70">
                    Banner promocional
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                      <UploadSimple size={14} weight="bold" />
                      Upload banner da agenda
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
                  <input value={eventForm.bannerUrl} onChange={(event) => setEventForm((prev) => ({ ...prev, bannerUrl: event.target.value }))} placeholder="URL opcional do banner da agenda" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                  <input value={eventForm.bannerTitle} onChange={(event) => setEventForm((prev) => ({ ...prev, bannerTitle: event.target.value }))} placeholder="Título opcional do banner" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                  <textarea value={eventForm.bannerDescription} onChange={(event) => setEventForm((prev) => ({ ...prev, bannerDescription: event.target.value }))} placeholder="Descrição opcional do banner" className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                </div>
              </div>
              <textarea value={eventForm.notes} onChange={(event) => setEventForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observações da agenda" className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
              {eventFormError ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">{eventFormError}</p> : null}
              <div className="flex flex-col gap-2">
                <button onClick={saveEvent} disabled={saving || !eventForm.condominiumId || !eventForm.startsAt || !eventForm.endsAt} className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(5,150,105,0.75)] disabled:opacity-50">
                  {editingEventId ? 'Salvar feira' : 'Criar feira'}
                </button>
                {editingEventId ? (
                  <button onClick={cancelEventEdit} type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700">
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                <Storefront size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Participação na feira</h2>
                <p className="text-sm font-medium text-slate-500">Escolha primeiro a data da feira e depois confirme quais lojas aprovadas participam daquela operação.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {!selectedAgendaCondominium ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                  Escolha um condomínio no filtro lateral (ou na lista de feiras) para ver quem pode participar.
                </p>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Feira da vez</span>
                    <select
                      value={eventStoreForm.eventId || selectedAgendaEventId}
                      onChange={(event) => {
                        setSelectedAgendaEventId(event.target.value);
                        setEventStoreForm({ eventId: event.target.value, storeId: '' });
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
                    >
                      <option value="">Escolha a feira</option>
                      {agendaEvents.map((item: any) => <option key={item.id} value={item.id}>{formatDateTimeLocal(item.startsAt)} • {item.title}</option>)}
                    </select>
                  </label>
                  {selectedAgendaEvent ? (
                    <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-950">{selectedAgendaEvent.title}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${eventStateCopy[selectedAgendaEvent.state || 'upcoming']?.tone || eventStateCopy.upcoming.tone}`}>
                              {eventStateCopy[selectedAgendaEvent.state || 'upcoming']?.label || 'Próxima'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTimeLocal(selectedAgendaEvent.startsAt)} até {formatDateTimeLocal(selectedAgendaEvent.endsAt)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{selectedAgendaEvent.pickupLocation || 'Local de retirada não informado'}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
                          {(selectedAgendaEvent.stores || []).length} confirmadas
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {Array.isArray(selectedAgendaEvent.stores) && selectedAgendaEvent.stores.length ? selectedAgendaEvent.stores.map((store: any) => {
                          const storeLink = approvedStoresForAgenda.find((link: any) => link.storeId === store.id);
                          const logo = resolveAssetUrl(store.logoUrl || store.bannerUrl || '') || getStoreAvatarUrl(store.slug, store.name);
                          return (
                            <div key={store.id} className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-100">
                              <div className="flex items-center gap-3">
                                <img src={logo} alt={store.name} className="h-10 w-10 rounded-2xl object-cover" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-slate-900">{store.name}</p>
                                  <p className="truncate text-xs font-semibold text-slate-500">{describeFulfillmentMode(storeLink)}</p>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                                  Confirmada
                                </span>
                              </div>
                            </div>
                          );
                        }) : (
                          <p className="rounded-2xl bg-white px-3 py-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                            Nenhuma loja confirmada ainda para essa feira.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Loja elegível</span>
                    <select value={eventStoreForm.storeId} onChange={(event) => setEventStoreForm((prev) => ({ ...prev, storeId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white">
                      <option value="">{selectedAgendaEvent ? 'Escolha a loja aprovada para essa feira' : 'Selecione uma feira primeiro'}</option>
                      {availableStoresForAgendaEvent.map((item: any) => <option key={item.storeId} value={item.storeId}>{item.store?.name || 'Loja aprovada'}</option>)}
                    </select>
                  </label>
                  <button onClick={addStoreToEvent} disabled={saving || !selectedAgendaEvent || !eventStoreForm.storeId} className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.8)] disabled:opacity-50">
                    Confirmar presença na feira
                  </button>
                  <div className="rounded-[1.45rem] border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lojas aprovadas nesse condomínio</p>
                    <div className="mt-3 space-y-2">
                      {approvedStoresForAgenda.length ? approvedStoresForAgenda.map((link: any) => {
                        const logo = resolveAssetUrl(link.store?.logoUrl || link.store?.bannerUrl || '') || getStoreAvatarUrl(link.store?.slug || link.storeId, link.store?.name || 'Loja');
                        const alreadyInEvent = selectedAgendaEventStoreIds.has(link.storeId);
                        return (
                          <div key={link.storeId} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                            <img src={logo} alt={link.store?.name || 'Loja'} className="h-10 w-10 rounded-2xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-900">{link.store?.name || 'Loja aprovada'}</p>
                              <p className="truncate text-xs font-semibold text-slate-500">{describeFulfillmentMode(link)}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${alreadyInEvent ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-white text-slate-600 ring-slate-200'}`}>
                              {alreadyInEvent ? 'Na feira' : 'Disponível'}
                            </span>
                          </div>
                        );
                      }) : (
                        <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">Nenhuma loja aprovada neste condomínio ainda.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
        )}

        {activeWorkspace === 'requests' && (
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Solicitações de condomínios</h2>
                <p className="text-sm font-medium text-slate-500">Analise novos condomínios, aprove o cadastro e depois crie o usuário responsável.</p>
              </div>
              <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-100">
                {metrics.pendingAccessRequests || 0} novas
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {(data.accessRequests || []).length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">Nenhuma solicitação de condomínio por enquanto.</p>
              ) : (data.accessRequests || []).map((request: any) => {
                const preview = resolveAssetUrl(request.logoUrl || request.bannerUrl || '') || '';
                const status = statusCopy[String(request.status || 'pending')] || statusCopy.pending;
                const canPrepareUser = String(request.status || '') === 'approved' && (request.createdCondominiumId || request.createdCondominium?.id);
                return (
                  <article key={request.id} className={`rounded-[1.6rem] border border-l-4 ${requestBorderAccent(request.status)} bg-[linear-gradient(135deg,_#ffffff_0%,_#f8fafc_45%,_#ffffff_100%)] p-4 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.45)]`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-50 ring-1 ring-slate-100">
                          {preview ? <img src={preview} alt={request.condominiumName} className="h-full w-full object-contain p-1.5" /> : <Buildings size={24} weight="duotone" className="text-[#336886]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-black text-slate-950">{request.condominiumName}</h3>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${status.tone}`}>{status.label}</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{[request.city, request.state].filter(Boolean).join(' - ') || 'Local não informado'}</p>
                          <p className="mt-2 text-sm font-bold text-slate-800">{request.responsibleName} <span className="font-semibold text-slate-400">• {request.responsibleRole || 'Responsável'}</span></p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{request.responsibleEmail} • {request.responsiblePhone || 'sem WhatsApp'}</p>
                          {request.message ? <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">{request.message}</p> : null}
                          {request.createdCondominium ? (
                            <p className="mt-2 text-xs font-black text-emerald-700">Cadastro criado: {request.createdCondominium.name}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                        <button onClick={() => reviewAccessRequest(request.id, 'approved')} disabled={saving || request.status === 'approved'} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-[0_16px_30px_-22px_rgba(5,150,105,0.85)] disabled:opacity-50">
                          Aprovar e criar cadastro
                        </button>
                        {canPrepareUser ? (
                          <button onClick={() => prepareAccessUser(request)} disabled={saving} className="rounded-xl bg-[#153A4C] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                            Criar usuário
                          </button>
                        ) : null}
                        <button onClick={() => reviewAccessRequest(request.id, 'rejected')} disabled={saving || request.status === 'rejected'} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 disabled:opacity-50">Recusar</button>
                        <button onClick={() => reviewAccessRequest(request.id, 'pending')} disabled={saving || request.status === 'pending'} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100 disabled:opacity-50">Voltar p/ análise</button>
                        <button onClick={() => reviewAccessRequest(request.id, 'cancelled')} disabled={saving || request.status === 'cancelled'} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:opacity-50">Arquivar</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Solicitações das lojas</h2>
                <p className="text-sm font-medium text-slate-500">Aprove, recuse e acompanhe a entrada de novas operações no hub.</p>
              </div>
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {metrics.pendingRequests} pendentes
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {(data.requests || []).length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">Nenhuma solicitação por enquanto.</p>
              ) : (data.requests || []).map((request: any) => {
                const storeLogo = resolveAssetUrl(request.store?.logoUrl || request.store?.bannerUrl || '') || getStoreAvatarUrl(request.store?.slug || request.storeId, request.store?.name || 'Loja');
                const condominiumLogo = resolveAssetUrl(request.condominium?.logoUrl || request.condominium?.bannerUrl || '') || '';
                const status = statusCopy[String(request.status || 'pending')] || statusCopy.pending;
                return (
                <div key={request.id} className={`rounded-[1.6rem] border border-l-4 ${requestBorderAccent(request.status)} bg-[linear-gradient(135deg,_#ffffff_0%,_#f8fafc_45%,_#ffffff_100%)] p-4 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.45)]`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex -space-x-3">
                        <img src={storeLogo} alt={request.store?.name || 'Loja'} className="h-14 w-14 rounded-[1.2rem] border-2 border-white bg-white object-cover shadow-sm" />
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.2rem] border-2 border-white bg-white shadow-sm">
                          {condominiumLogo ? <img src={condominiumLogo} alt={request.condominium?.name || 'Condomínio'} className="h-full w-full object-contain p-1" /> : <Buildings size={22} weight="duotone" className="text-[#336886]" />}
                        </div>
                      </div>
                      <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{request.store?.name || 'Loja'} <CaretRight size={12} className="inline" /> {request.condominium?.name || 'Condomínio'}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{request.message || 'Sem mensagem da loja.'}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${status.tone}`}>{status.label}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => reviewRequest(request.id, 'approved')} disabled={saving || request.status === 'approved'} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-[0_16px_30px_-22px_rgba(5,150,105,0.85)] disabled:opacity-50">Aprovar</button>
                      <button onClick={() => reviewRequest(request.id, 'rejected')} disabled={saving || request.status === 'rejected'} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 disabled:opacity-50">Recusar</button>
                      <button onClick={() => reviewRequest(request.id, 'blocked')} disabled={saving || request.status === 'blocked'} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Bloquear</button>
                      <button onClick={() => reviewRequest(request.id, 'pending')} disabled={saving || request.status === 'pending'} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100 disabled:opacity-50">Voltar p/ análise</button>
                      <button onClick={() => reviewRequest(request.id, 'cancelled')} disabled={saving || request.status === 'cancelled'} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:opacity-50">Revogar</button>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </section>
        </div>
        )}

        {activeWorkspace === 'agenda' ? (
        <section id="fairs-list-section" className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">Agenda cadastrada</h2>
              <p className="text-sm font-medium text-slate-500">Veja a agenda dentro do contexto do condomínio para não misturar data, loja participante e regra operacional.</p>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {agendaEvents.length} feira{agendaEvents.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[320px_1fr]">
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Condomínio em foco</p>
              <select
                value={selectedAgendaCondominiumId}
                onChange={(event) => {
                  setSelectedAgendaCondominiumId(event.target.value);
                  setEventForm((prev) => ({ ...prev, condominiumId: event.target.value }));
                  setSelectedAgendaEventId('');
                }}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white"
              >
                <option value="">Escolha o condomínio</option>
                {condominiums.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {selectedAgendaCondominium ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-sm font-black text-slate-950">{selectedAgendaCondominium.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {selectedAgendaCondominium.city || 'Cidade não informada'}
                      {selectedAgendaCondominium.state ? ` • ${selectedAgendaCondominium.state}` : ''}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Lojas aprovadas</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{approvedStoresForAgenda.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Feiras deste condomínio</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{agendaEvents.length}</p>
                    </div>
                  </div>
                  <p className="rounded-2xl bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-100">
                    Neste filtro você vê só a agenda desse condomínio. Para criar ou editar, o formulário acima reaproveita o mesmo contexto.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {loading ? <p className="text-sm font-semibold text-slate-500">Carregando...</p> : agendaEvents.map((event: any) => {
              const condominiumLogo = resolveAssetUrl(event.condominium?.logoUrl || event.condominium?.bannerUrl || '') || '';
              const eventStores = Array.isArray(event.stores) ? event.stores : [];
              const invitedStores = Array.isArray(event.storeInvitations) ? event.storeInvitations : [];
              return (
              <div key={event.id} className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_24px_48px_-36px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3 bg-[linear-gradient(135deg,_#f8fafc_0%,_#ffffff_55%,_#f0fdf4_100%)] p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.3rem] bg-white shadow-sm ring-1 ring-slate-100">
                    {condominiumLogo ? <img src={condominiumLogo} alt={event.condominium.name} className="h-full w-full object-contain p-1.5" /> : <Buildings size={24} weight="duotone" className="text-[#336886]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black tracking-tight text-slate-950">{event.condominium.name}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#336886]">
                      <Clock size={13} weight="fill" />
                      {formatDateTimeLocal(event.startsAt)} até {formatDateTimeLocal(event.endsAt)}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{event.pickupLocation || 'Local de retirada não informado'}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Participação da feira</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {eventStores.length} confirmadas
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => editEvent(event)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                      <PencilSimple size={14} weight="bold" />
                      Editar agenda
                    </button>
                    <button onClick={() => deactivateEvent(event.id)} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 disabled:opacity-50">
                      <Trash size={14} weight="bold" />
                      Encerrar
                    </button>
                  </div>
                  {eventStores.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {eventStores.slice(0, 8).map((store: any) => {
                        const logo = resolveAssetUrl(store.logoUrl || store.bannerUrl || '') || getStoreAvatarUrl(store.slug, store.name);
                        const storeLink = approvedStoresForAgenda.find((link: any) => link.storeId === store.id);
                        return (
                          <span key={store.id} className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-2 text-xs font-bold text-slate-700 ring-1 ring-slate-100">
                            <img src={logo} alt={store.name} className="h-6 w-6 rounded-full object-cover" />
                            <span className="max-w-[140px] truncate">{store.name}</span>
                            {storeLink ? <span className="hidden text-[10px] font-black text-slate-400 sm:inline">{describeFulfillmentMode(storeLink)}</span> : null}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Nenhuma loja confirmada nessa data.</p>
                  )}
                  {invitedStores.length ? (
                    <p className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                      {invitedStores.length} loja{invitedStores.length === 1 ? '' : 's'} aguardando confirmação para essa feira.
                    </p>
                  ) : null}
                </div>
              </div>
            );})}
            {!loading && selectedAgendaCondominium && agendaEvents.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500 lg:col-span-2 2xl:col-span-3">
                Ainda não existe feira cadastrada para este condomínio.
              </div>
            ) : null}
            </div>
          </div>
        </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}
