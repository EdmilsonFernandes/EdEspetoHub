import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ListChecks, NavigationArrow, Wallet } from '@phosphor-icons/react';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { motoboyService } from '../services/motoboyService';
import { formatCurrency } from '../utils/format';

export function MotoboyHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [nextOrder, setNextOrder] = useState<any | null>(null);
  const [earningsToday, setEarningsToday] = useState<{ total: number; count: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [current, available, earnings] = await Promise.all([
        motoboyService.getCurrentOrder().catch(() => null),
        motoboyService.listAvailableOrders().catch(() => []),
        motoboyService.getEarningsToday().catch(() => null),
      ]);
      setActiveOrder(current || null);
      const list = Array.isArray(available) ? available : [];
      setQueueCount(list.length);
      setNextOrder(list.length > 0 ? list[0] : null);
      if (earnings) {
        setEarningsToday({ total: Number(earnings?.total || 0), count: Number(earnings?.count || 0) });
      } else {
        setEarningsToday(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deliveryStatus = useMemo(() => String(activeOrder?.delivery?.status || '').toUpperCase(), [activeOrder?.delivery?.status]);
  const hasActive = useMemo(() => Boolean(activeOrder?.id && [ 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT' ].includes(deliveryStatus)), [activeOrder?.id, deliveryStatus]);

  const headline = useMemo(() => {
    if (loading) return 'Atualizando...';
    if (hasActive) return 'Você tem uma entrega ativa. Um toque e você continua.';
    if (queueCount > 0) return 'Tem pedido na fila. Aceite e comece sua rota.';
    return 'Nenhum pedido agora. Quando chegar, a fila atualiza sozinha.';
  }, [loading, hasActive, queueCount]);

  return (
    <div className="min-h-screen motoboy-screen space-y-4">
      <MotoboyHeader
        title="Home"
        subtitle={headline}
        rightAction={
          <button
            type="button"
            onClick={load}
            className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
          >
            Atualizar
          </button>
        }
      />

      {earningsToday && (
        <div className="premium-card-glass p-4 motoboy-fade-up" style={{ animationDelay: '40ms' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Ganhos de hoje</p>
              <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(earningsToday.total)}</p>
              <p className="text-xs text-slate-600 mt-1">
                {earningsToday.count} entrega{earningsToday.count === 1 ? '' : 's'} concluída{earningsToday.count === 1 ? '' : 's'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Wallet size={22} weight="duotone" />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <div className="premium-card-glass p-4 motoboy-fade-up" style={{ animationDelay: '70ms' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {hasActive ? 'Entrega ativa' : 'Fila'}
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">
                {hasActive
                  ? `${activeOrder?.store?.name || 'Loja'} • ${activeOrder?.customerName || 'Cliente'}`
                  : queueCount > 0
                    ? `${queueCount} pedido${queueCount === 1 ? '' : 's'} disponível${queueCount === 1 ? '' : 's'}`
                    : 'Nenhum pedido disponível'}
              </p>
              {hasActive ? (
                <p className="text-xs text-slate-600 mt-1">
                  Status: <span className="font-semibold">{deliveryStatus || '—'}</span>
                </p>
              ) : nextOrder ? (
                <p className="text-xs text-slate-600 mt-1 truncate">
                  Próximo: <span className="font-semibold">{nextOrder.customerName || 'Cliente'}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-600 mt-1">A fila atualiza a cada poucos segundos.</p>
              )}
            </div>
            <div
              className={[
                'h-11 w-11 rounded-2xl flex items-center justify-center border',
                hasActive ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-700 border-slate-200',
              ].join(' ')}
            >
              {hasActive ? <NavigationArrow size={20} weight="duotone" /> : <ListChecks size={20} weight="duotone" />}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {hasActive ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/motoboy/delivery')}
                  className="btn-press col-span-2 rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] flex items-center justify-center gap-2"
                >
                  Continuar entrega <ArrowRight size={18} weight="duotone" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/motoboy/available')}
                  className="btn-press col-span-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] flex items-center justify-center gap-2"
                >
                  Ver fila <ArrowRight size={18} weight="duotone" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/motoboy/available')}
            className="btn-press rounded-2xl border border-slate-200 bg-white/70 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
            style={{ animationDelay: '100ms' }}
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Fila</p>
            <p className="text-lg font-black text-slate-900 mt-2">{queueCount}</p>
            <p className="text-xs text-slate-600 mt-1">Pedidos disponíveis agora</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/motoboy/earnings')}
            className="btn-press rounded-2xl border border-slate-200 bg-white/70 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
            style={{ animationDelay: '120ms' }}
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Ganhos</p>
            <p className="text-lg font-black text-slate-900 mt-2">
              {formatCurrency(Number(earningsToday?.total || 0))}
            </p>
            <p className="text-xs text-slate-600 mt-1">Resumo e histórico</p>
          </button>
        </div>
      </div>
    </div>
  );
}
