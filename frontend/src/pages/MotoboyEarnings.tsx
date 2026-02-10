import { useEffect, useState } from 'react';
import { ChartLineUp, Wallet } from '@phosphor-icons/react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

export function MotoboyEarnings() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const data = await motoboyService.listHistory(30);
      setOrders(Array.isArray(data) ? data : []);
      setBlocked(false);
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
      } else {
        showToast(error?.message || 'Não foi possível carregar ganhos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [showToast]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await motoboyService.listStoreRequests();
        const requests = Array.isArray(data) ? data : [];
        setPendingCount(requests.filter((req) => req.status === 'PENDING').length);
      } catch {
        setPendingCount(0);
      }
    };
    loadRequests();
  }, []);

  const todayKey = new Date().toDateString();
  const totalToday = orders.reduce((acc, order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt).toDateString() : '';
    if (createdAt !== todayKey) return acc;
    return acc + Number(order.deliveryFee || 0);
  }, 0);

  const totalMonth = orders.reduce((acc, order) => acc + Number(order.deliveryFee || 0), 0);

  return (
    <div className="min-h-screen motoboy-screen space-y-4">
      <MotoboyHeader
        title="Ganhos"
        subtitle="Resumo e histórico das suas entregas."
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
      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro está em análise. Aguarde aprovação para visualizar ganhos.
        </div>
      )}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/motoboy/profile')}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700"
        >
          {pendingCount} solicitação{pendingCount === 1 ? '' : 'es'} pendente{pendingCount === 1 ? '' : 's'} de vínculo
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total do dia</p>
            <p className="text-2xl font-black text-emerald-600 mt-2">
              {totalToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Somatório do frete entregue hoje</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet size={22} weight="duotone" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Últimos 30 dias</p>
            <p className="text-2xl font-black text-slate-800 mt-2">
              {totalMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-slate-500 mt-1">{orders.length} entregas concluídas</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <ChartLineUp size={22} weight="duotone" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-500">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-sm text-slate-500">Nenhuma entrega finalizada ainda.</div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const isOpen = expanded.has(order.id);
            return (
              <OrderCard
                key={order.id}
                order={order}
                compact={!isOpen}
                actions={
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(order.id)) next.delete(order.id);
                        else next.add(order.id);
                        return next;
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
                  >
                    {isOpen ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
