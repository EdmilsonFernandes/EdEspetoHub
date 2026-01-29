import React, { useEffect, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';

export function MotoboyHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await motoboyService.listAvailableOrders();
        const history = (Array.isArray(data) ? data : []).filter(
          (order) => order.status === 'delivered' || order.status === 'finished'
        );
        setOrders(history);
      } catch (error: any) {
        showToast(error?.message || 'Não foi possível carregar histórico.', 'error');
      }
    };

    load();
  }, [showToast]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Histórico de entregas</h1>
        <p className="text-sm text-slate-500">Pedidos finalizados recentemente.</p>
      </div>

      {orders.length === 0 ? (
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
