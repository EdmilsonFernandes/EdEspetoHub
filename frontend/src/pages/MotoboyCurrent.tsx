import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { ConfirmPaymentModal } from '../components/Motoboy/ConfirmPaymentModal';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { useToast } from '../contexts/ToastContext';

export function MotoboyCurrent() {
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [earningsToday, setEarningsToday] = useState<{ total: number; count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [finalizeAfterPayment, setFinalizeAfterPayment] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const current = await motoboyService.getCurrentOrder();
      setActiveOrder(current || null);
    } catch {
      setActiveOrder(null);
    }
    try {
      const summary = await motoboyService.getEarningsToday();
      const total = Number(summary?.total || 0);
      const count = Number(summary?.count || 0);
      setEarningsToday({ total, count });
    } catch {
      setEarningsToday(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deliveryStatus = useMemo(() => {
    return String(activeOrder?.delivery?.status || '').toUpperCase();
  }, [activeOrder?.delivery?.status]);

  const canConfirmPayment = (order: any) => {
    const method = (order?.paymentMethod || '').toLowerCase();
    const status = (order?.paymentStatus || '').toLowerCase();
    return (
      status === 'pending' &&
      (method === 'pix' ||
        method === 'cash' ||
        method === 'dinheiro' ||
        method === 'card' ||
        method === 'credit' ||
        method === 'debit')
    );
  };

  const handleConfirmPayment = async (cashTendered?: number | null) => {
    if (!selected) return;
    try {
      await motoboyService.confirmPayment(selected.id, cashTendered ?? null);
      showToast('Pagamento confirmado.', 'success');
      setShowPayment(false);

      if (finalizeAfterPayment) {
        try {
          await motoboyService.markDelivered(selected.id);
          showToast('Entrega finalizada.', 'success');
          setFinalizeAfterPayment(false);
          load();
          navigate('/motoboy/history');
          return;
        } catch (error: any) {
          setFinalizeAfterPayment(false);
          showToast(error?.message || 'Não foi possível concluir a entrega.', 'error');
        }
      }

      setFinalizeAfterPayment(false);
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar pagamento.', 'error');
    }
  };

  const handlePickup = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.pickupOrder(activeOrder.id);
      try {
        // Business: once the motoboy picks up the order, the route can start immediately.
        await motoboyService.startDelivery(activeOrder.id);
        showToast('Pedido retirado. Rota iniciada.', 'success');
      } catch (error: any) {
        showToast(error?.message || 'Pedido retirado. Inicie a rota para continuar.', 'warning');
      }
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar retirada.', 'error');
    }
  };

  const handleStart = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.startDelivery(activeOrder.id);
      showToast('Rota iniciada.', 'success');
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível iniciar a rota.', 'error');
    }
  };

  const handleDelivered = async () => {
    if (!activeOrder) return;
    try {
      const paymentStatus = String(activeOrder?.paymentStatus || '').toLowerCase();
      if (paymentStatus !== 'paid') {
        setSelected(activeOrder);
        setFinalizeAfterPayment(true);
        setShowPayment(true);
        return;
      }

      await motoboyService.markDelivered(activeOrder.id);
      showToast('Entrega finalizada.', 'success');
      load();
      navigate('/motoboy/history');
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível concluir a entrega.', 'error');
    }
  };

  const buildMapsUrl = (order: any) => {
    const destination = String(order?.address || '').trim();
    const origin = String(order?.store?.settings?.address || '').trim();
    if (!destination) return '';
    if (origin) {
      const params = new URLSearchParams({
        api: '1',
        origin,
        destination,
        travelmode: 'driving',
      });
      return `https://www.google.com/maps/dir/?${params.toString()}`;
    }
    const params = new URLSearchParams({ api: '1', query: destination });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <MotoboyHeader
        title="Entrega"
        subtitle={loading ? 'Atualizando...' : activeOrder ? 'Acompanhe e finalize sua entrega.' : 'Nenhuma entrega ativa.'}
        rightAction={
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
          >
            Atualizar
          </button>
        }
      />

      {earningsToday && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">Ganhos de hoje:</span>{' '}
          {earningsToday.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
          <span className="text-xs text-emerald-700">
            ({earningsToday.count} entrega{earningsToday.count === 1 ? '' : 's'})
          </span>
        </div>
      )}

      {!activeOrder ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">
          Nenhum pedido em rota. Vá para a aba <span className="font-semibold">Fila</span> para aceitar uma entrega.
        </div>
      ) : (
        <OrderCard
          order={activeOrder}
          actions={
            <div className="space-y-2">
              {activeOrder?.address && (
                <a
                  href={buildMapsUrl(activeOrder)}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 text-center"
                >
                  Abrir no GPS
                </a>
              )}

              {deliveryStatus === 'ACCEPTED' && (
                <button
                  onClick={handlePickup}
                  className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Retirei o pedido (iniciar rota)
                </button>
              )}

              {deliveryStatus === 'PICKED_UP' && (
                <button
                  onClick={handleStart}
                  className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Iniciar rota
                </button>
              )}

              {canConfirmPayment(activeOrder) && (
                <button
                  onClick={() => {
                    setSelected(activeOrder);
                    setFinalizeAfterPayment(false);
                    setShowPayment(true);
                  }}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                >
                  Confirmar pagamento
                </button>
              )}

              {deliveryStatus === 'IN_TRANSIT' && (
                <button
                  onClick={handleDelivered}
                  className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Finalizar entrega
                </button>
              )}

              {deliveryStatus && deliveryStatus !== 'IN_TRANSIT' && (
                <p className="text-[11px] text-slate-500">
                  Passo a passo: Retirei o pedido -{'>'} Iniciar rota -{'>'} Finalizar entrega.
                </p>
              )}
            </div>
          }
        />
      )}

      <ConfirmPaymentModal
        isOpen={showPayment}
        onClose={() => {
          setShowPayment(false);
          setFinalizeAfterPayment(false);
        }}
        onConfirm={handleConfirmPayment}
        amount={selected?.total || 0}
        paymentMethod={selected?.paymentMethod}
      />
    </div>
  );
}

