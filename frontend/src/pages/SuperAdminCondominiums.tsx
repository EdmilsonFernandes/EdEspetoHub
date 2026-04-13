import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Buildings, CalendarBlank, CaretRight, CheckCircle, Storefront } from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import { condominiumService } from '../services/condominiumService';

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
  });
  const [eventForm, setEventForm] = useState({
    condominiumId: '',
    startsAt: '',
    endsAt: '',
    pickupLocation: '',
  });
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
      setCondominiumForm({ name: '', slug: '', city: '', state: 'SP', address: '', logoUrl: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar condomínio.');
    } finally {
      setSaving(false);
    }
  };

  const createEvent = async () => {
    if (!eventForm.condominiumId) return;
    setSaving(true);
    setError('');
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
      setError(err?.message || 'Falha ao criar feira.');
    } finally {
      setSaving(false);
    }
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
            <div className="mt-4 space-y-2">
              {[
                ['name', 'Nome'],
                ['slug', 'Slug'],
                ['city', 'Cidade'],
                ['state', 'UF'],
                ['address', 'Endereço'],
                ['logoUrl', 'Logo URL'],
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
              <select value={eventForm.condominiumId} onChange={(event) => setEventForm((prev) => ({ ...prev, condominiumId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
                <option value="">Escolha o condomínio</option>
                {(data.condominiums || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => setEventForm((prev) => ({ ...prev, startsAt: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" />
              <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => setEventForm((prev) => ({ ...prev, endsAt: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" />
              <input value={eventForm.pickupLocation} onChange={(event) => setEventForm((prev) => ({ ...prev, pickupLocation: event.target.value }))} placeholder="Local de retirada" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" />
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
            ) : (data.requests || []).map((request: any) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">{request.store?.name || 'Loja'} <CaretRight size={12} className="inline" /> {request.condominium?.name || 'Condomínio'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{request.message || 'Sem mensagem da loja.'}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#336886]">{request.status}</p>
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
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Agenda cadastrada</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {loading ? <p className="text-sm font-semibold text-slate-500">Carregando...</p> : events.map((event: any) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 p-3">
                <p className="text-sm font-black text-slate-950">{event.condominium.name}</p>
                <p className="mt-1 text-xs font-bold text-[#336886]">{formatDateTimeLocal(event.startsAt)} até {formatDateTimeLocal(event.endsAt)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{event.pickupLocation || 'Local de retirada não informado'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
