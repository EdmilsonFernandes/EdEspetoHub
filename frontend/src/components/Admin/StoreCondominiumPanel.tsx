import { useEffect, useState } from 'react';
import { Buildings, CalendarBlank, CheckCircle, Clock } from '@phosphor-icons/react';
import { condominiumService } from '../../services/condominiumService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

const formatEventTime = (event?: any) => {
  if (!event?.startsAt) return '';
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) return '';
  const date = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(startsAt).replace('.', '');
  const start = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(startsAt);
  const end = endsAt && !Number.isNaN(endsAt.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(endsAt)
    : '';
  return end ? `${date}, ${start}-${end}` : `${date}, ${start}`;
};

type Props = {
  storeId?: string;
};

const statusCopy: Record<string, { label: string; tone: string }> = {
  available: { label: 'Disponível', tone: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Em análise', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprovado', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Recusado', tone: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelado', tone: 'bg-slate-100 text-slate-600' },
  blocked: { label: 'Bloqueado', tone: 'bg-slate-200 text-slate-700' },
};

export function StoreCondominiumPanel({ storeId }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [messageById, setMessageById] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const payload = await condominiumService.listStoreOptions(storeId);
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar condomínios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const requestJoin = async (condominiumId: string) => {
    if (!storeId) return;
    setSavingId(condominiumId);
    setError('');
    try {
      await condominiumService.createStoreRequest(storeId, {
        condominiumId,
        message: messageById[condominiumId] || '',
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar solicitação.');
    } finally {
      setSavingId('');
    }
  };

  const removeAssociation = async (condominiumId: string, status: string) => {
    if (!storeId) return;
    const label = status === 'approved' ? 'sair deste condomínio' : 'cancelar esta solicitação';
    if (!window.confirm(`Deseja ${label}?`)) return;
    setSavingId(condominiumId);
    setError('');
    try {
      await condominiumService.removeStoreCondominium(storeId, condominiumId);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a participação.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <Buildings size={22} weight="duotone" className="mt-0.5 text-emerald-700" />
          <div>
            <p className="text-sm font-black text-slate-900">Condomínios e feiras</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
              Solicite participação em condomínios. Após aprovação, sua loja poderá ser confirmada nas próximas feiras pela plataforma.
            </p>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm font-semibold text-slate-500">Carregando condomínios...</p> : null}

      <div className="grid gap-3">
        {items.map((item) => {
          const condominium = item.condominium || {};
          const status = String(item.status || 'available');
          const meta = statusCopy[status] || statusCopy.available;
          const canRequest = status === 'available' || status === 'rejected' || status === 'cancelled';
          const logo = resolveAssetUrl(condominium.logoUrl || condominium.bannerUrl || '');
          const event = condominium.eventSummary || null;
          const eventLabel = event?.state === 'live' ? 'Feira acontecendo agora' : formatEventTime(event) || 'Agenda em breve';
          return (
            <div key={condominium.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-[#336886] to-sky-400" />
              <div className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-100">
                    {logo ? <img src={logo} alt={condominium.name || 'Condomínio'} className="h-full w-full object-contain p-1.5" /> : <Buildings size={24} weight="duotone" className="text-[#336886]" />}
                  </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-black text-slate-950">{condominium.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {[condominium.city, condominium.state].filter(Boolean).join(' - ') || 'Feira local'}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-100">
                    <CalendarBlank size={13} weight="duotone" />
                    {eventLabel}
                  </p>
                  {status === 'approved' ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle size={14} weight="fill" />
                      Sua loja já pode ser escalada em eventos desse condomínio.
                    </p>
                  ) : status === 'pending' ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                      <Clock size={14} weight="fill" />
                      A plataforma está analisando sua solicitação.
                    </p>
                  ) : null}
                </div>
                </div>
                {canRequest ? (
                  <div className="w-full space-y-2 sm:max-w-[260px]">
                    <input
                      value={messageById[condominium.id] || ''}
                      onChange={(event) => setMessageById((prev) => ({ ...prev, [condominium.id]: event.target.value }))}
                      placeholder="Mensagem opcional"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-[#336886]"
                    />
                    <button
                      type="button"
                      onClick={() => requestJoin(condominium.id)}
                      disabled={savingId === condominium.id}
                      className="w-full rounded-xl bg-[#336886] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      {savingId === condominium.id ? 'Enviando...' : 'Solicitar participação'}
                    </button>
                  </div>
                ) : status === 'pending' || status === 'approved' ? (
                  <div className="w-full sm:max-w-[220px]">
                    <button
                      type="button"
                      onClick={() => removeAssociation(condominium.id, status)}
                      disabled={savingId === condominium.id}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {status === 'approved' ? 'Sair do condomínio' : 'Cancelar solicitação'}
                    </button>
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
