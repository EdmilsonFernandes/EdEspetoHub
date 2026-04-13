import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Buildings, CalendarBlank, CaretRight, CheckCircle, Clock, ImageSquare, Storefront, UploadSimple } from '@phosphor-icons/react';
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

const addHoursToLocalDateTime = (value: string, hours: number) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() + hours);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export function SuperAdminCondominiums() {
  const [data, setData] = useState<any>({ condominiums: [], stores: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [condominiumForm, setCondominiumForm] = useState({
    name: '',
    slug: '',
    city: '',
    state: 'SP',
    address: '',
    logoUrl: '',
    bannerUrl: '',
    logoFile: '',
    bannerFile: '',
  });
  const [eventForm, setEventForm] = useState({
    condominiumId: '',
    startsAt: '',
    endsAt: '',
    pickupLocation: '',
  });
  const [eventFormError, setEventFormError] = useState('');
  const [eventStoreForm, setEventStoreForm] = useState({
    eventId: '',
    storeId: '',
  });

  const load = async () => {
    if (!localStorage.getItem('superAdminToken')) {
      window.location.href = '/superadmin';
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await condominiumService.adminOverview();
      setData(payload || { condominiums: [], stores: [], requests: [] });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar condomínios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const events = useMemo(() => {
    return (data.condominiums || []).flatMap((condominium: any) =>
      (condominium.events || []).map((event: any) => ({ ...event, condominium }))
    );
  }, [data.condominiums]);

  const metrics = useMemo(() => {
    const condominiums = Array.isArray(data.condominiums) ? data.condominiums : [];
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const pendingRequests = requests.filter((request: any) => String(request?.status || 'pending') === 'pending').length;
    const confirmedStores = events.reduce((acc: number, event: any) => acc + (Array.isArray(event?.stores) ? event.stores.length : 0), 0);
    return {
      condominiums: condominiums.length,
      events: events.length,
      pendingRequests,
      confirmedStores,
    };
  }, [data.condominiums, data.requests, events]);

  const createCondominium = async () => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.adminCreate(condominiumForm);
      setCondominiumForm({ name: '', slug: '', city: '', state: 'SP', address: '', logoUrl: '', bannerUrl: '', logoFile: '', bannerFile: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar condomínio.');
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

  const createEvent = async () => {
    if (!eventForm.condominiumId) {
      setEventFormError('Escolha o condomínio antes de criar a feira.');
      return;
    }
    const startsAt = new Date(eventForm.startsAt);
    const endsAt = new Date(eventForm.endsAt);
    if (!eventForm.startsAt || !eventForm.endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setEventFormError('Informe a data e o horário de início e fim da feira.');
      return;
    }
    if (endsAt <= startsAt) {
      setEventFormError('O horário de término precisa ser depois do início. Exemplo: começa 15:00 e termina 22:00.');
      return;
    }
    setSaving(true);
    setError('');
    setEventFormError('');
    try {
      await condominiumService.adminCreateEvent(eventForm.condominiumId, {
        title: `Feira do ${(data.condominiums || []).find((item: any) => item.id === eventForm.condominiumId)?.name || 'condomínio'}`,
        startsAt: eventForm.startsAt,
        endsAt: eventForm.endsAt,
        pickupLocation: eventForm.pickupLocation,
      });
      setEventForm({ condominiumId: eventForm.condominiumId, startsAt: '', endsAt: '', pickupLocation: '' });
      await load();
    } catch (err: any) {
      setEventFormError(err?.message || 'Falha ao criar feira.');
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
    setEventForm((prev) => ({ ...prev, condominiumId: value }));
  };

  const handleEventPickupLocationChange = (value: string) => {
    setEventFormError('');
    setEventForm((prev) => ({ ...prev, pickupLocation: value }));
  };

  const addStoreToEvent = async () => {
    if (!eventStoreForm.eventId || !eventStoreForm.storeId) return;
    setSaving(true);
    setError('');
    try {
      const event = events.find((item: any) => item.id === eventStoreForm.eventId);
      if (event?.condominium?.id) {
        await condominiumService.adminApproveStore(event.condominium.id, eventStoreForm.storeId);
      }
      await condominiumService.adminAddStoreToEvent(eventStoreForm.eventId, eventStoreForm.storeId);
      setEventStoreForm({ eventId: eventStoreForm.eventId, storeId: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar loja à feira.');
    } finally {
      setSaving(false);
    }
  };

  const reviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
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

  const logoPreview = condominiumForm.logoFile || resolveAssetUrl(condominiumForm.logoUrl) || '';
  const bannerPreview = condominiumForm.bannerFile || resolveAssetUrl(condominiumForm.bannerUrl) || '';

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
              <Link
                to="/superadmin"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-black text-slate-700 shadow-sm backdrop-blur"
              >
                Voltar ao Super Admin
              </Link>
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
          </div>
          {error ? <p className="relative mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr_0.95fr]">
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
              <button onClick={createCondominium} disabled={saving || !condominiumForm.name} className="w-full rounded-2xl bg-[#336886] px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(51,104,134,0.8)] disabled:opacity-50">
                Criar condomínio
              </button>
            </div>
          </section>

          <div className="space-y-4">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CalendarBlank size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Nova feira</h2>
                <p className="text-sm font-medium text-slate-500">Defina janela operacional e ponto de retirada.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <select value={eventForm.condominiumId} onChange={(event) => handleEventCondominiumChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
                <option value="">Escolha o condomínio</option>
                {(data.condominiums || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => handleEventStartsAtChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => handleEventEndsAtChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
              </div>
              <input value={eventForm.pickupLocation} onChange={(event) => handleEventPickupLocationChange(event.target.value)} placeholder="Ex: praça central, entrada social, lounge gourmet" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
              {eventFormError ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">{eventFormError}</p> : null}
              <button onClick={createEvent} disabled={saving || !eventForm.condominiumId || !eventForm.startsAt || !eventForm.endsAt} className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(5,150,105,0.75)] disabled:opacity-50">
                Criar feira
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                <Storefront size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-950">Loja na feira</h2>
                <p className="text-sm font-medium text-slate-500">Confirme a presença da loja em um evento ativo.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <select value={eventStoreForm.eventId} onChange={(event) => setEventStoreForm((prev) => ({ ...prev, eventId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white">
                <option value="">Escolha a feira</option>
                {events.map((item: any) => <option key={item.id} value={item.id}>{item.condominium.name} - {formatDateTimeLocal(item.startsAt)}</option>)}
              </select>
              <select value={eventStoreForm.storeId} onChange={(event) => setEventStoreForm((prev) => ({ ...prev, storeId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white">
                <option value="">Escolha a loja</option>
                {(data.stores || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button onClick={addStoreToEvent} disabled={saving || !eventStoreForm.eventId || !eventStoreForm.storeId} className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.8)] disabled:opacity-50">
                Confirmar presença
              </button>
            </div>
          </section>
          </div>
        </div>

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
              <div key={request.id} className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,_#ffffff_0%,_#f8fafc_45%,_#ffffff_100%)] p-4 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.45)]">
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
                  {request.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => reviewRequest(request.id, 'approved')} disabled={saving} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-[0_16px_30px_-22px_rgba(5,150,105,0.85)]">Aprovar</button>
                      <button onClick={() => reviewRequest(request.id, 'rejected')} disabled={saving} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100">Recusar</button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-emerald-700">
                      <CheckCircle size={14} weight="fill" />
                      Revisada
                    </span>
                  )}
                </div>
              </div>
            );})}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">Agenda cadastrada</h2>
              <p className="text-sm font-medium text-slate-500">Visualize os eventos ativos e a densidade de lojas confirmadas.</p>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {metrics.events} feiras
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {loading ? <p className="text-sm font-semibold text-slate-500">Carregando...</p> : events.map((event: any) => {
              const condominiumLogo = resolveAssetUrl(event.condominium?.logoUrl || event.condominium?.bannerUrl || '') || '';
              const eventStores = Array.isArray(event.stores) ? event.stores : [];
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
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lojas confirmadas</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {eventStores.length} lojas
                    </span>
                  </div>
                  {eventStores.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {eventStores.slice(0, 8).map((store: any) => {
                        const logo = resolveAssetUrl(store.logoUrl || store.bannerUrl || '') || getStoreAvatarUrl(store.slug, store.name);
                        return (
                          <span key={store.id} className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-2 text-xs font-bold text-slate-700 ring-1 ring-slate-100">
                            <img src={logo} alt={store.name} className="h-6 w-6 rounded-full object-cover" />
                            <span className="max-w-[140px] truncate">{store.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Nenhuma loja confirmada nessa data.</p>
                  )}
                </div>
              </div>
            );})}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
