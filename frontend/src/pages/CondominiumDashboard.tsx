// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  Clock,
  DoorOpen,
  Plus,
  Storefront,
  XCircle,
} from '@phosphor-icons/react';
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

const addHoursToLocalDateTime = (value: string, hours: number) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() + hours);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const statusLabel = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'live') return 'Ao vivo';
  if (normalized === 'finished') return 'Finalizada';
  if (normalized === 'cancelled') return 'Cancelada';
  return 'Agendada';
};

export function CondominiumDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<any>({ condominium: null, events: [], stores: [], requests: [], approvedStores: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'agenda' | 'lojas' | 'solicitacoes'>('agenda');
  const [eventForm, setEventForm] = useState({
    title: '',
    startsAt: '',
    endsAt: '',
    pickupLocation: '',
    status: 'scheduled',
    notes: '',
  });
  const [selectedStoreByEvent, setSelectedStoreByEvent] = useState<Record<string, string>>({});
  const [inviteNoteByEvent, setInviteNoteByEvent] = useState<Record<string, string>>({});

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
  const pendingRequests = requests.filter((request: any) => String(request?.status || 'pending') === 'pending');
  const nextEvent = events.find((event: any) => event.state === 'live') || events.find((event: any) => event.state === 'upcoming') || events[0];
  const invitedCount = events.reduce((acc: number, event: any) => acc + (Array.isArray(event?.storeInvitations) ? event.storeInvitations.length : 0), 0);

  const metrics = [
    { label: 'Feiras na agenda', value: events.length, tone: 'bg-[#153A4C] text-white' },
    { label: 'Lojas aprovadas', value: approvedStores.length, tone: 'bg-emerald-600 text-white' },
    { label: 'Convites enviados', value: invitedCount, tone: 'bg-sky-600 text-white' },
    { label: 'Solicitações pendentes', value: pendingRequests.length, tone: 'bg-amber-500 text-white' },
  ];

  const availableStores = useMemo(() => {
    return stores.filter((store: any) => String(store?.condominiumStatus || '') !== 'approved');
  }, [stores]);

  const logout = () => {
    localStorage.removeItem('condominiumSession');
    navigate('/condominio/login', { replace: true });
  };

  const createEvent = async () => {
    const startsAt = new Date(eventForm.startsAt);
    const endsAt = new Date(eventForm.endsAt);
    if (!eventForm.startsAt || !eventForm.endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setError('Informe data e horário válidos para a feira.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerCreateEvent({
        title: eventForm.title || `Feira do ${condominium.name || 'condomínio'}`,
        startsAt: eventForm.startsAt,
        endsAt: eventForm.endsAt,
        pickupLocation: eventForm.pickupLocation,
        status: eventForm.status,
        notes: eventForm.notes,
      });
      setEventForm({ title: '', startsAt: '', endsAt: '', pickupLocation: '', status: 'scheduled', notes: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar feira.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartsAt = (value: string) => {
    setEventForm((prev) => ({
      ...prev,
      startsAt: value,
      endsAt: prev.endsAt || addHoursToLocalDateTime(value, 5),
    }));
  };

  const inviteStore = async (eventId: string) => {
    const storeId = selectedStoreByEvent[eventId];
    if (!storeId) return;
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerInviteStore(eventId, {
        storeId,
        inviteNote: inviteNoteByEvent[eventId] || '',
      });
      setSelectedStoreByEvent((prev) => ({ ...prev, [eventId]: '' }));
      setInviteNoteByEvent((prev) => ({ ...prev, [eventId]: '' }));
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao convidar loja.');
    } finally {
      setSaving(false);
    }
  };

  const confirmStore = async (eventId: string, storeId: string) => {
    setSaving(true);
    setError('');
    try {
      await condominiumService.organizerConfirmStore(eventId, { storeId });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao confirmar loja na feira.');
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
    } catch (err: any) {
      setError(err?.message || 'Falha ao revisar solicitação.');
    } finally {
      setSaving(false);
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
                  Organize feiras, convide comerciantes e acompanhe as solicitações sem depender do Super Admin.
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
              <button onClick={() => setActiveTab('lojas')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-5 py-3 text-sm font-black text-white">
                Convidar lojas <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </section>
        ) : null}

        <nav className="grid gap-2 sm:grid-cols-3">
          {[
            { id: 'agenda', label: 'Agenda', helper: 'Criar e acompanhar feiras' },
            { id: 'lojas', label: 'Lojas', helper: 'Convidar e confirmar presença' },
            { id: 'solicitacoes', label: 'Solicitações', helper: 'Aprovar pedidos de lojistas' },
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
                  <h2 className="text-lg font-black text-slate-950">Nova feira</h2>
                  <p className="text-sm font-semibold text-slate-500">O condomínio já vem definido pelo seu acesso.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <input value={eventForm.title} onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título da feira" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => handleStartsAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                  <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => setEventForm((prev) => ({ ...prev, endsAt: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                </div>
                <input value={eventForm.pickupLocation} onChange={(event) => setEventForm((prev) => ({ ...prev, pickupLocation: event.target.value }))} placeholder="Local: praça, salão, entrada social..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                <select value={eventForm.status} onChange={(event) => setEventForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white">
                  <option value="scheduled">Agendada</option>
                  <option value="live">Ao vivo</option>
                  <option value="finished">Finalizada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <textarea value={eventForm.notes} onChange={(event) => setEventForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observações para operação" className="min-h-[92px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#336886] focus:bg-white" />
                <button onClick={createEvent} disabled={saving || !eventForm.startsAt || !eventForm.endsAt} className="w-full rounded-2xl bg-[#153A4C] px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
                  Criar feira
                </button>
              </div>
            </section>

            <section className="space-y-3">
              {events.length ? events.map((event: any) => (
                <article key={event.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{statusLabel(event.status)}</span>
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
                      <select value={selectedStoreByEvent[event.id] || ''} onChange={(e) => setSelectedStoreByEvent((prev) => ({ ...prev, [event.id]: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold">
                        <option value="">Escolher loja para convidar</option>
                        {availableStores.map((store: any) => <option key={store.id} value={store.id}>{store.name}</option>)}
                      </select>
                      <input value={inviteNoteByEvent[event.id] || ''} onChange={(e) => setInviteNoteByEvent((prev) => ({ ...prev, [event.id]: e.target.value }))} placeholder="Mensagem opcional" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold" />
                      <button onClick={() => inviteStore(event.id)} disabled={saving || !selectedStoreByEvent[event.id]} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                        Enviar convite
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Confirmadas</p>
                      <div className="mt-3 space-y-2">
                        {Array.isArray(event.stores) && event.stores.length ? event.stores.map((store: any) => (
                          <div key={store.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                            <img src={resolveAssetUrl(store.logoUrl || '') || getStoreAvatarUrl(store.slug, store.name)} alt={store.name} className="h-8 w-8 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{store.name}</span>
                            <CheckCircle size={17} weight="fill" className="text-emerald-500" />
                          </div>
                        )) : <p className="text-sm font-semibold text-slate-400">Nenhuma loja confirmada.</p>}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Convites</p>
                      <div className="mt-3 space-y-2">
                        {Array.isArray(event.storeInvitations) && event.storeInvitations.length ? event.storeInvitations.map((invite: any) => (
                          <div key={invite.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                            <img src={resolveAssetUrl(invite.logoUrl || '') || getStoreAvatarUrl(invite.storeSlug, invite.storeName)} alt={invite.storeName} className="h-8 w-8 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{invite.storeName}</span>
                            <button onClick={() => confirmStore(event.id, invite.storeId)} disabled={saving} className="rounded-xl bg-[#153A4C] px-3 py-2 text-[11px] font-black text-white">
                              Confirmar
                            </button>
                          </div>
                        )) : <p className="text-sm font-semibold text-slate-400">Nenhum convite pendente.</p>}
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
                    {store.condominiumStatus === 'approved' ? 'Aprovada' : store.condominiumStatus === 'invited' ? 'Convidada' : 'Disponível'}
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === 'solicitacoes' ? (
          <section className="space-y-3">
            {requests.length ? requests.map((request: any) => (
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
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">{request.status}</span>
                  )}
                </div>
              </article>
            )) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
                <Storefront size={34} weight="duotone" className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">Nenhuma solicitação de loja no momento.</p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
