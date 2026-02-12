import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { ConfirmPaymentModal } from '../components/Motoboy/ConfirmPaymentModal';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { useToast } from '../contexts/ToastContext';
import { formatAddress, formatCurrency } from '../utils/format';
import { buildPixPayload } from '../utils/pixPayload';

export function MotoboyCurrent() {
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [earningsToday, setEarningsToday] = useState<{ total: number; count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [finalizeAfterPayment, setFinalizeAfterPayment] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [routeMs, setRouteMs] = useState<number>(0);

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

  const routeStartAt = useMemo(() => {
    const d = activeOrder?.delivery;
    const candidates = [d?.inTransitAt, d?.pickedUpAt, d?.acceptedAt, activeOrder?.createdAt].filter(Boolean);
    const v = candidates.length ? new Date(candidates[0]).getTime() : 0;
    return Number.isFinite(v) ? v : 0;
  }, [activeOrder?.delivery?.inTransitAt, activeOrder?.delivery?.pickedUpAt, activeOrder?.delivery?.acceptedAt, activeOrder?.createdAt]);

  useEffect(() => {
    if (!activeOrder || !routeStartAt) return;
    const update = () => setRouteMs(Math.max(0, Date.now() - routeStartAt));
    update();
    const t = window.setInterval(update, 1000);
    return () => window.clearInterval(t);
  }, [activeOrder?.id, routeStartAt]);

  const paymentIsPaid = useMemo(() => {
    return String(activeOrder?.paymentStatus || '').toLowerCase() === 'paid';
  }, [activeOrder?.paymentStatus]);
  const activeOrderAddress = useMemo(
    () => formatAddress(activeOrder?.address || activeOrder?.deliveryAddress),
    [activeOrder?.address, activeOrder?.deliveryAddress]
  );

  const pixInfo = useMemo(() => {
    const method = String(activeOrder?.paymentMethod || '').toLowerCase();
    if (method !== 'pix') return { pixKey: null as string | null, pixPayload: null as string | null };
    const pixKey = String(activeOrder?.store?.settings?.pixKey || '').trim() || null;
    if (!pixKey) return { pixKey: null, pixPayload: null };
    const amount = Number(activeOrder?.total || 0);
    const storeName = String(activeOrder?.store?.name || 'CHAMA NO ESPETO');
    const city = String(activeOrder?.store?.settings?.city || activeOrder?.store?.settings?.cidade || 'BRASIL');
    const txid = activeOrder?.id ? String(activeOrder.id).slice(0, 8) : 'PEDIDO';
    const pixPayload = buildPixPayload({
      key: pixKey,
      name: storeName,
      city,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
      txid,
    });
    return { pixKey, pixPayload };
  }, [activeOrder?.paymentMethod, activeOrder?.store?.settings?.pixKey, activeOrder?.store?.name, activeOrder?.store?.settings?.city, activeOrder?.id, activeOrder?.total]);

  const stepMeta = useMemo(() => {
    const status = deliveryStatus;
    const steps = [ 'Retirar', 'Rota', 'Entregar' ];
    const current =
      status === 'ACCEPTED' ? 0 : status === 'PICKED_UP' ? 1 : status === 'IN_TRANSIT' ? 2 : 0;
    const label =
      status === 'ACCEPTED'
        ? 'Vá até a loja e retire o pedido.'
        : status === 'PICKED_UP'
          ? 'Inicie a rota no GPS.'
          : status === 'IN_TRANSIT'
            ? 'Chegou no cliente? Finalize e confirme o pagamento.'
            : 'Aguardando...';
    return { steps, current, label };
  }, [deliveryStatus]);

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
          const donePayload = {
            orderId: selected.id,
            customerName: selected?.customerName,
            total: Number(selected?.total || 0),
            deliveryFee: Number(selected?.deliveryFee || 0),
            storeName: selected?.store?.name || null,
          };
          load();
          navigate('/motoboy/done', { state: { done: donePayload } });
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
      showToast('Pedido retirado. Rota iniciada.', 'success');
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar retirada.', 'error');
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
      const donePayload = {
        orderId: activeOrder.id,
        customerName: activeOrder?.customerName,
        total: Number(activeOrder?.total || 0),
        deliveryFee: Number(activeOrder?.deliveryFee || 0),
        storeName: activeOrder?.store?.name || null,
      };
      load();
      navigate('/motoboy/done', { state: { done: donePayload } });
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível concluir a entrega.', 'error');
    }
  };

  const buildMapsUrl = (order: any) => {
    const destination = formatAddress(order?.address || order?.deliveryAddress);
    const origin = formatAddress(order?.store?.settings?.address || order?.store?.address);
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

  const buildWazeUrl = (order: any) => {
    const destination = formatAddress(order?.address || order?.deliveryAddress);
    if (!destination) return '';
    const params = new URLSearchParams({ q: destination, navigate: 'yes' });
    return `https://waze.com/ul?${params.toString()}`;
  };

  const handleCopyAddress = async () => {
    const text = activeOrderAddress;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Endereço copiado.', 'success');
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('Endereço copiado.', 'success');
      } catch {
        showToast('Não foi possível copiar o endereço.', 'error');
      }
    }
  };

  const formatRouteTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${String(sec).padStart(2, '0')}s`;
  };

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
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
        <div className="space-y-4">
          <div className="premium-card-glass p-4 motoboy-fade-up" style={{ animationDelay: '40ms' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Entrega ativa</p>
                <p className="text-base font-extrabold text-slate-900 truncate">{activeOrder?.customerName}</p>
                <p className="text-xs text-slate-600 mt-0.5 truncate">{activeOrderAddress || '-'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/70 border border-slate-200 text-slate-800">
                    Total: {formatCurrency(activeOrder?.total || 0)}
                  </span>
                  {activeOrder?.deliveryFee !== null && activeOrder?.deliveryFee !== undefined && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                      Frete: {formatCurrency(Number(activeOrder?.deliveryFee || 0))}
                    </span>
                  )}
                  <span
                    className={[
                      'px-2.5 py-1 rounded-full text-[11px] font-extrabold border',
                      paymentIsPaid
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900',
                    ].join(' ')}
                  >
                    {paymentIsPaid ? 'Pagamento OK' : 'Pagamento pendente'}
                  </span>
                  {routeStartAt > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/70 border border-slate-200 text-slate-800">
                      Tempo: {formatRouteTime(routeMs)}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                {activeOrderAddress && (
                  <a
                    href={buildMapsUrl(activeOrder)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] text-center"
                  >
                    Google Maps
                  </a>
                )}
                {activeOrderAddress && (
                  <a
                    href={buildWazeUrl(activeOrder)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] text-center"
                  >
                    Waze
                  </a>
                )}
                {activeOrderAddress && (
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
                  >
                    Copiar endereço
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] text-slate-600 font-semibold">{stepMeta.label}</p>
              <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {stepMeta.steps.map((s, i) => {
                  const isCurrent = i === stepMeta.current;
                  const isDone = i < stepMeta.current;
                  return (
                    <span
                      key={s}
                      className={[
                        'px-3 py-1 rounded-full text-[11px] font-extrabold border whitespace-nowrap',
                        isCurrent
                          ? 'bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] text-white border-transparent shadow-[0_18px_34px_-26px_rgba(239,68,68,0.8)]'
                          : isDone
                            ? 'bg-slate-50/70 text-slate-700 border-slate-200'
                            : 'bg-white/60 text-slate-500 border-slate-200',
                      ].join(' ')}
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2 motoboy-fade-up" style={{ animationDelay: '90ms' }}>
            {deliveryStatus === 'ACCEPTED' && (
              <button
                onClick={handlePickup}
                className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
              >
                Retirei o pedido e vou sair para entrega
              </button>
            )}
            {deliveryStatus === 'PICKED_UP' && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900 font-semibold">
                Pedido retirado. Iniciando rota...
              </div>
            )}

            {deliveryStatus === 'IN_TRANSIT' && (
              <button
                onClick={handleDelivered}
                className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,#16a34a,#059669)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(5,150,105,0.6)]"
              >
                Finalizar entrega
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="btn-press w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
            >
              {showDetails ? 'Ocultar detalhes do pedido' : 'Ver detalhes do pedido'}
            </button>
          </div>

          {showDetails && (
            <div className="motoboy-fade-up" style={{ animationDelay: '140ms' }}>
              <OrderCard order={activeOrder} />
            </div>
          )}
        </div>
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
        pixKey={pixInfo.pixKey}
        pixPayload={pixInfo.pixPayload}
        defaultCashTendered={selected?.cashTendered ?? null}
      />
    </div>
  );
}
