import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { formatCurrency } from '../utils/format';

type DonePayload = {
  orderId?: string;
  customerName?: string;
  total?: number;
  deliveryFee?: number;
  storeName?: string;
};

export function MotoboyDone() {
  const navigate = useNavigate();
  const location = useLocation();
  const [payload, setPayload] = useState<DonePayload | null>(null);

  useEffect(() => {
    const statePayload = (location.state as any)?.done as DonePayload | undefined;
    if (statePayload) {
      setPayload(statePayload);
      try {
        localStorage.setItem('motoboy:last_done', JSON.stringify({ ...statePayload, at: Date.now() }));
      } catch {}
      return;
    }
    try {
      const raw = localStorage.getItem('motoboy:last_done');
      if (raw) {
        const parsed = JSON.parse(raw);
        setPayload(parsed);
      }
    } catch {
      setPayload(null);
    }
  }, [location.state]);

  const fee = useMemo(() => {
    const v = Number(payload?.deliveryFee || 0);
    return Number.isFinite(v) ? v : 0;
  }, [payload?.deliveryFee]);

  useEffect(() => {
    const t = window.setTimeout(() => navigate('/motoboy/history'), 2200);
    return () => window.clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen motoboy-screen space-y-4">
      <MotoboyHeader title="Entrega concluída" subtitle="Boa. Mais uma entrega finalizada." />

      <div className="premium-card-glass p-5 motoboy-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Resumo</p>
            <p className="text-xl font-black text-slate-900 mt-1">Parabéns!</p>
            <p className="text-sm text-slate-600 mt-1">
              {payload?.customerName ? `Cliente: ${payload.customerName}` : 'Entrega finalizada com sucesso.'}
            </p>
            {payload?.storeName && <p className="text-xs text-slate-500 mt-1">Loja: {payload.storeName}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-500">Ganho da entrega</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(fee)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Frete</p>
          </div>
        </div>

        {payload?.total !== undefined && payload?.total !== null && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-semibold">Total do pedido</span>
              <span className="text-slate-900 font-extrabold">{formatCurrency(Number(payload.total || 0))}</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.25),transparent_55%)] border border-emerald-200 p-3">
            <p className="text-[11px] text-emerald-800 font-extrabold">Pago</p>
            <p className="text-xs text-emerald-700 mt-1">Confirmado</p>
          </div>
          <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.18),transparent_55%)] border border-amber-200 p-3">
            <p className="text-[11px] text-amber-900 font-extrabold">Status</p>
            <p className="text-xs text-amber-800 mt-1">Entregue</p>
          </div>
          <div className="rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.18),transparent_55%)] border border-sky-200 p-3">
            <p className="text-[11px] text-sky-900 font-extrabold">Próximo</p>
            <p className="text-xs text-sky-800 mt-1">Ver fila</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/motoboy/history')}
        className="btn-press w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] motoboy-fade-up"
        style={{ animationDelay: '140ms' }}
      >
        Ver histórico
      </button>
    </div>
  );
}

