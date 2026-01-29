import { useEffect, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';

export function MotoboyAvailable() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await motoboyService.listAvailableOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar pedidos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleAccept = async (orderId: string) => {
    try {
      await motoboyService.acceptOrder(orderId);
      const selected = orders.find((order) => order.id === orderId) || null;
      if (selected) {
        try {
          localStorage.setItem(
            'motoboy:currentOrder',
            JSON.stringify({ ...selected, status: 'in_delivery', acceptedAt: new Date().toISOString() })
          );
        } catch {}
      }
      showToast('Pedido aceito. Boa entrega!', 'success');
      loadOrders();
    } catch (error: any) {
      if (error?.status === 409) {
        showToast('Pedido já foi aceito por outro motoboy.', 'warning');
      } else {
        showToast(error?.message || 'Não foi possível aceitar o pedido.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Pedidos disponíveis</h1>
          <p className="text-sm text-slate-500">Aceite e inicie sua rota.</p>
        </div>
        <button
          onClick={loadOrders}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-500">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-sm text-slate-500">Nenhum pedido aguardando entregador.</div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              actions={
                <button
                  onClick={() => handleAccept(order.id)}
                  className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Aceitar entrega
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
