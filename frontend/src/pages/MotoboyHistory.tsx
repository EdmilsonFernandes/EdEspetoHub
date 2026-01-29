import { useEffect, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';

export function MotoboyHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await motoboyService.listHistory(30);
        setOrders(Array.isArray(data) ? data : []);
      } catch (error: any) {
        showToast(error?.message || 'Não foi possível carregar histórico.', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [showToast]);

  const todayKey = new Date().toDateString();
  const totalToday = orders.reduce((acc, order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt).toDateString() : '';
    if (createdAt !== todayKey) return acc;
    return acc + Number(order.deliveryFee || 0);
  }, 0);

  const totalMonth = orders.reduce((acc, order) => acc + Number(order.deliveryFee || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Histórico de entregas</h1>
        <p className="text-sm text-slate-500">Pedidos finalizados recentemente.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total do dia</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {totalToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Somatório do frete entregue hoje</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Últimos 30 dias</p>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {totalMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{orders.length} entregas concluídas</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-500">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-sm text-slate-500">Nenhum pedido finalizado ainda.</div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} compact />
          ))}
        </div>
      )}
    </div>
  );
}
