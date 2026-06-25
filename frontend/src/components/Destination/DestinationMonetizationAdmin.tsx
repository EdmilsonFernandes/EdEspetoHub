import { useCallback, useEffect, useState } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { destinationPromotionService } from '../../services/destinationPromotionService';

const formatBRL = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const fmtDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
};

const STATUS_TONE: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  PAID_WAITING_SLOT: 'bg-sky-100 text-sky-700',
  EXPIRED: 'bg-slate-100 text-slate-500',
  REJECTED: 'bg-rose-100 text-rose-700',
  PAYMENT_FAILED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const RESOURCE_LABEL: Record<string, string> = {
  HOSPITALITY_PLACE: 'Hospedagem',
  DESTINATION_LISTING: 'Serviço/Lugar',
  DESTINATION: 'Destino',
};

/**
 * Aba "Monetização" do SuperAdmin > Destinos.
 * Lista as promoções de destaque de destino pagas pelos parceiros e permite
 * reverter (rejeitar) o destaque de uma promoção já ativa.
 */
export function DestinationMonetizationAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await destinationPromotionService.listForAdmin(filter || undefined);
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar promoções.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const revert = async (id: string) => {
    if (!confirm('Reverter este destaque? O recurso perde o posicionamento patrocinado.')) return;
    setActing(id);
    try {
      await destinationPromotionService.reviewByAdmin(id, { status: 'REJECTED', adminNote: 'Destaque revertido pelo Super Admin.' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao reverter.');
    } finally {
      setActing(null);
    }
  };

  const totalApproved = items.filter((i) => String(i.status).toUpperCase() === 'APPROVED').length;
  const totalRevenue = items
    .filter((i) => String(i.paymentStatus).toUpperCase() === 'PAID')
    .reduce((sum, i) => sum + Number(i.priceAmount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkle size={18} weight="duotone" className="text-amber-500" />
          <h3 className="text-base font-black text-slate-900">Monetização de destinos</h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{totalApproved} ativos</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Receita {formatBRL(totalRevenue)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {['', 'APPROVED', 'PENDING_PAYMENT', 'EXPIRED', 'REJECTED'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-[11px] font-black transition ${
              filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s || 'Todos'}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}

      {loading ? (
        <p className="text-xs text-slate-400">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          Nenhuma promoção de destaque ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Recurso</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Janela</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => {
                const status = String(p.status || '').toUpperCase();
                const paid = String(p.paymentStatus || '').toUpperCase() === 'PAID';
                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-900">{p.resourceName || '—'}</p>
                      <p className="text-[10px] text-slate-400">{RESOURCE_LABEL[p.resourceType] || p.resourceType}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.durationUnit} ({p.durationDays}d)</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{formatBRL(Number(p.priceAmount || 0))}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONE[status] || 'bg-slate-100 text-slate-600'}`}>
                        {paid ? 'Pago · ' : ''}{status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-slate-500">
                      {fmtDate(p.startsAt)} → {fmtDate(p.endsAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {status === 'APPROVED' ? (
                        <button
                          type="button"
                          disabled={acting === p.id}
                          onClick={() => revert(p.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          Reverter
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
