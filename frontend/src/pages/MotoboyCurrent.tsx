import React, { useEffect, useMemo, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { ConfirmPaymentModal } from '../components/Motoboy/ConfirmPaymentModal';
import { useToast } from '../contexts/ToastContext';

export function MotoboyCurrent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    try {
      const data = await motoboyService.listAvailableOrders();
      const parsed = Array.isArray(data) ? data : [];
      const stored = (() => {
        try {
          const raw = localStorage.getItem('motoboy:currentOrder');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      if (stored && !parsed.find((order) => order.id === stored.id)) {
        parsed.unshift(stored);
      }
      setOrders(parsed);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar pedidos.', 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeOrder = useMemo(() => {
    return (
      orders.find((order) => ['in_delivery', 'ready_for_delivery', 'waiting_for_motoboy'].includes(order.status)) ||
      null
    );
  }, [orders]);

  const canConfirmPayment = (order: any) => {
    const method = (order?.paymentMethod || '').toLowerCase();
    const status = (order?.paymentStatus || '').toLowerCase();
    return status === 'pending' && (method === 'cash' || method === 'dinheiro' || method === 'card' || method === 'credit' || method === 'debit');
  };

  const handleConfirmPayment = async (cashTendered?: number | null) => {
    if (!selected) return;
    try {
      await motoboyService.confirmPayment(selected.id, cashTendered ?? null);
      showToast('Pagamento confirmado.', 'success');
      try {
        localStorage.setItem('motoboy:currentOrder', JSON.stringify({ ...selected, paymentStatus: 'PAID' }));
      } catch {}
      setShowPayment(false);
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar pagamento.', 'error');
    }
  };

  const handleDelivered = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.markDelivered(activeOrder.id);
      showToast('Pedido marcado como entregue.', 'success');
      try {
        localStorage.setItem('motoboy:currentOrder', JSON.stringify({ ...activeOrder, status: 'delivered' }));
      } catch {}
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível concluir a entrega.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Entrega atual</h1>
        <p className="text-sm text-slate-500">Acompanhe o pedido em rota.</p>
      </div>

      {!activeOrder ? (
        <div className="text-center text-sm text-slate-500">Nenhum pedido em rota.</div>
      ) : (
        <OrderCard
          order={activeOrder}
          actions={
            <div className="space-y-2">
              {activeOrder.status === 'waiting_for_motoboy' && (
                <p className="text-xs text-slate-500">Aceite o pedido em “Disponíveis” para iniciar a rota.</p>
              )}
              {canConfirmPayment(activeOrder) && (
                <button
                  onClick={() => {
                    setSelected(activeOrder);
                    setShowPayment(true);
                  }}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                >
                  Confirmar pagamento
                </button>
              )}
              <button
                onClick={handleDelivered}
                className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Marcar como entregue
              </button>
            </div>
          }
        />
      )}

      <ConfirmPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handleConfirmPayment}
        amount={selected?.total || 0}
        paymentMethod={selected?.paymentMethod}
      />
    </div>
  );
}
