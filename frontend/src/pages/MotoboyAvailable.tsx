import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';

export function MotoboyAvailable() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await motoboyService.listAvailableOrders();
      setOrders(Array.isArray(data) ? data : []);
      setBlocked(false);
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
      } else {
        showToast(error?.message || 'Não foi possível carregar pedidos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

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
      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro está em análise. Envie os documentos obrigatórios e aguarde a aprovação.
        </div>
      )}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/motoboy/current')}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700"
        >
          {pendingCount} solicitação{pendingCount === 1 ? '' : 'es'} pendente{pendingCount === 1 ? '' : 's'} de vínculo
        </button>
      )}

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
