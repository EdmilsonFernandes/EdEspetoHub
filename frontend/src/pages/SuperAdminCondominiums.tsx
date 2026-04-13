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
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Já no Caminho</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">Condomínios e feiras</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Cadastre locais, programe datas e confirme as lojas participantes.</p>
            </div>
            <Link to="/superadmin" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
              Voltar ao Super Admin
            </Link>
          </div>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Buildings size={20} weight="duotone" className="text-[#336886]" />
              <h2 className="text-base font-black text-slate-950">Novo condomínio</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="relative h-24 bg-gradient-to-br from-emerald-50 via-white to-sky-50">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner do condomínio" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <ImageSquare size={28} weight="duotone" />
                    </div>
                  )}
                  <div className="absolute -bottom-7 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo do condomínio" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Buildings size={26} weight="duotone" className="text-[#336886]" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 px-4 pb-3 pt-10">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                    <UploadSimple size={14} weight="bold" />
                    Upload logo
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAssetUpload('logoFile', event.target.files?.[0])} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                    <UploadSimple size={14} weight="bold" />
                    Upload banner
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAssetUpload('bannerFile', event.target.files?.[0])} />
                  </label>
                </div>
              </div>
              {[
                ['name', 'Nome'],
                ['slug', 'Slug'],
                ['city', 'Cidade'],
                ['state', 'UF'],
                ['address', 'Endereço'],
                ['logoUrl', 'Logo URL opcional'],
                ['bannerUrl', 'Banner URL opcional'],
              ].map(([key, label]) => (
                <input
                  key={key}
                  value={(condominiumForm as any)[key]}
                  onChange={(event) => setCondominiumForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder={label}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-[#336886]"
                />
              ))}
              <button onClick={createCondominium} disabled={saving || !condominiumForm.name} className="w-full rounded-2xl bg-[#336886] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                Criar condomínio
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarBlank size={20} weight="duotone" className="text-[#336886]" />
              <h2 className="text-base font-black text-slate-950">Nova feira</h2>
            </div>
            <div className="mt-4 space-y-2">
              <select value={eventForm.condominiumId} onChange={(event) => handleEventCondominiumChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
                <option value="">Escolha o condomínio</option>
                {(data.condominiums || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => handleEventStartsAtChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" />
              <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => handleEventEndsAtChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" />
              <input value={eventForm.pickupLocation} onChange={(event) => handleEventPickupLocationChange(event.target.value)} placeholder="Local de retirada" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" />
              {eventFormError ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{eventFormError}</p> : null}
              <button onClick={createEvent} disabled={saving || !eventForm.condominiumId || !eventForm.startsAt || !eventForm.endsAt} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                Criar feira
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Storefront size={20} weight="duotone" className="text-[#336886]" />
              <h2 className="text-base font-black text-slate-950">Loja na feira</h2>
            </div>
            <div className="mt-4 space-y-2">
              <select value={eventStoreForm.eventId} onChange={(event) => setEventStoreForm((prev) => ({ ...prev, eventId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
                <option value="">Escolha a feira</option>
                {events.map((item: any) => <option key={item.id} value={item.id}>{item.condominium.name} - {formatDateTimeLocal(item.startsAt)}</option>)}
              </select>
              <select value={eventStoreForm.storeId} onChange={(event) => setEventStoreForm((prev) => ({ ...prev, storeId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
                <option value="">Escolha a loja</option>
                {(data.stores || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button onClick={addStoreToEvent} disabled={saving || !eventStoreForm.eventId || !eventStoreForm.storeId} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                Confirmar presença
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Solicitações das lojas</h2>
          <div className="mt-4 grid gap-3">
            {(data.requests || []).length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">Nenhuma solicitação por enquanto.</p>
            ) : (data.requests || []).map((request: any) => {
              const storeLogo = resolveAssetUrl(request.store?.logoUrl || request.store?.bannerUrl || '') || getStoreAvatarUrl(request.store?.slug || request.storeId, request.store?.name || 'Loja');
              const condominiumLogo = resolveAssetUrl(request.condominium?.logoUrl || request.condominium?.bannerUrl || '') || '';
              const status = statusCopy[String(request.status || 'pending')] || statusCopy.pending;
              return (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex -space-x-3">
                      <img src={storeLogo} alt={request.store?.name || 'Loja'} className="h-12 w-12 rounded-2xl border-2 border-white bg-white object-cover shadow-sm" />
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
                        {condominiumLogo ? <img src={condominiumLogo} alt={request.condominium?.name || 'Condomínio'} className="h-full w-full object-contain p-1" /> : <Buildings size={22} weight="duotone" className="text-[#336886]" />}
                      </div>
                    </div>
                    <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{request.store?.name || 'Loja'} <CaretRight size={12} className="inline" /> {request.condominium?.name || 'Condomínio'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{request.message || 'Sem mensagem da loja.'}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${status.tone}`}>{status.label}</span>
                    </div>
                  </div>
                  {request.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => reviewRequest(request.id, 'approved')} disabled={saving} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Aprovar</button>
                      <button onClick={() => reviewRequest(request.id, 'rejected')} disabled={saving} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100">Recusar</button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700">
                      <CheckCircle size={14} weight="fill" />
                      Revisada
                    </span>
                  )}
                </div>
              </div>
            );})}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Agenda cadastrada</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {loading ? <p className="text-sm font-semibold text-slate-500">Carregando...</p> : events.map((event: any) => {
              const condominiumLogo = resolveAssetUrl(event.condominium?.logoUrl || event.condominium?.bannerUrl || '') || '';
              const eventStores = Array.isArray(event.stores) ? event.stores : [];
              return (
              <div key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-white p-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                    {condominiumLogo ? <img src={condominiumLogo} alt={event.condominium.name} className="h-full w-full object-contain p-1.5" /> : <Buildings size={24} weight="duotone" className="text-[#336886]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{event.condominium.name}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#336886]">
                      <Clock size={13} weight="fill" />
                      {formatDateTimeLocal(event.startsAt)} até {formatDateTimeLocal(event.endsAt)}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{event.pickupLocation || 'Local de retirada não informado'}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lojas confirmadas</p>
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
