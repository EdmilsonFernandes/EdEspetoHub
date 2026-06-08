import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Buildings,
  CheckCircle,
  CreditCard,
  Copy,
  CurrencyCircleDollar,
  NavigationArrow,
  Package,
  Storefront,
  UserCircle,
} from '@phosphor-icons/react';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { ConfirmPaymentModal } from '../components/Motoboy/ConfirmPaymentModal';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { useToast } from '../contexts/ToastContext';
import { formatAddress, formatCurrency } from '../utils/format';
import { buildPixPayload } from '../utils/pixPayload';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

const STEP_ITEMS = [
  { label: 'Retirar', hint: 'Loja', icon: Storefront },
  { label: 'Rota', hint: 'Deslocamento', icon: NavigationArrow },
  { label: 'Entregar', hint: 'Cliente', icon: CheckCircle },
];

const normalizeAvatarSeed = (value?: string | null) =>
  String(value || 'janocaminho')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

const getPersonAvatarUrl = (name?: string | null) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    normalizeAvatarSeed(name || 'cliente')
  )}&backgroundType=gradientLinear&radius=24`;

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
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLocked, setCodeLocked] = useState(false);

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
      setEarningsToday({
        total: Number(summary?.total || 0),
        count: Number(summary?.count || 0),
      });
    } catch {
      setEarningsToday(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const deliveryStatus = useMemo(
    () => String(activeOrder?.delivery?.status || '').toUpperCase(),
    [activeOrder?.delivery?.status]
  );

  const routeStartAt = useMemo(() => {
    const delivery = activeOrder?.delivery;
    const candidates = [delivery?.inTransitAt, delivery?.pickedUpAt, delivery?.acceptedAt, activeOrder?.createdAt].filter(Boolean);
    const timestamp = candidates.length ? new Date(candidates[0]).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
  }, [activeOrder?.createdAt, activeOrder?.delivery?.acceptedAt, activeOrder?.delivery?.inTransitAt, activeOrder?.delivery?.pickedUpAt]);

  useEffect(() => {
    if (!activeOrder || !routeStartAt) return;
    const update = () => setRouteMs(Math.max(0, Date.now() - routeStartAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeOrder?.id, routeStartAt]);

  const paymentIsPaid = useMemo(
    () => String(activeOrder?.paymentStatus || '').toLowerCase() === 'paid',
    [activeOrder?.paymentStatus]
  );

  const deliveryAddress = useMemo(
    () => formatAddress(activeOrder?.address || activeOrder?.deliveryAddress),
    [activeOrder?.address, activeOrder?.deliveryAddress]
  );
  const pickupAddress = useMemo(
    () => formatAddress(activeOrder?.store?.settings?.address || activeOrder?.store?.address),
    [activeOrder?.store?.address, activeOrder?.store?.settings?.address]
  );
  const storeAvatarUrl = useMemo(() => {
    const storeLogo =
      resolveAssetUrl(
        activeOrder?.store?.settings?.logoUrl ||
          activeOrder?.store?.settings?.logo_url ||
          activeOrder?.store?.logoUrl ||
          ''
      ) || '';

    return (
      storeLogo ||
      getStoreAvatarUrl(
        activeOrder?.store?.id || activeOrder?.store?.slug || activeOrder?.id,
        activeOrder?.store?.name
      )
    );
  }, [
    activeOrder?.id,
    activeOrder?.store?.id,
    activeOrder?.store?.logoUrl,
    activeOrder?.store?.name,
    activeOrder?.store?.settings?.logoUrl,
    activeOrder?.store?.settings?.logo_url,
    activeOrder?.store?.slug,
  ]);
  const customerAvatarUrl = useMemo(
    () =>
      resolveAssetUrl(
        activeOrder?.customerProfileImageUrl ||
          activeOrder?.customer?.profileImageUrl ||
          ''
      ) || getPersonAvatarUrl(activeOrder?.customerName),
    [activeOrder?.customer?.profileImageUrl, activeOrder?.customerName, activeOrder?.customerProfileImageUrl]
  );

  const pixInfo = useMemo(() => {
    const method = String(activeOrder?.paymentMethod || '').toLowerCase();
    const isManualPix = method === 'pix_loja' || method === 'pix_presencial';
    if (method !== 'pix' && !isManualPix) return { pixKey: null as string | null, pixPayload: null as string | null };
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
  }, [activeOrder?.id, activeOrder?.paymentMethod, activeOrder?.store?.name, activeOrder?.store?.settings?.city, activeOrder?.store?.settings?.pixKey, activeOrder?.total]);

  const stepMeta = useMemo(() => {
    const current = deliveryStatus === 'ACCEPTED' ? 0 : deliveryStatus === 'PICKED_UP' ? 1 : deliveryStatus === 'IN_TRANSIT' ? 2 : 0;
    const label =
      deliveryStatus === 'ACCEPTED'
        ? 'Vá até a loja, retire o pedido e confirme quando estiver com ele.'
        : deliveryStatus === 'PICKED_UP'
          ? 'Abra a rota para o cliente e siga com a entrega.'
          : deliveryStatus === 'IN_TRANSIT'
            ? paymentIsPaid
              ? 'Chegou no cliente? Confirme a entrega com o codigo.'
              : 'Receba o pagamento e finalize a entrega com o codigo do cliente.'
            : 'Aguardando informacoes da entrega.';
    return { current, label };
  }, [deliveryStatus, paymentIsPaid]);

  const activeStop = useMemo(() => {
    if (deliveryStatus === 'ACCEPTED') {
      return {
        eyebrow: 'Retirada na loja',
        title: activeOrder?.store?.name || 'Retirada na loja',
        address: pickupAddress || 'Endereco da loja indisponivel',
        actionLabel: 'Abrir rota para a loja',
        avatarUrl: storeAvatarUrl,
        avatarAlt: activeOrder?.store?.name || 'Loja',
        avatarBadge: Buildings,
      };
    }
    return {
      eyebrow: 'Destino da entrega',
      title: activeOrder?.customerName || 'Entrega ao cliente',
      address: deliveryAddress || 'Endereco do cliente indisponivel',
      actionLabel: 'Abrir rota para o cliente',
      avatarUrl: customerAvatarUrl,
      avatarAlt: activeOrder?.customerName || 'Cliente',
      avatarBadge: UserCircle,
    };
  }, [
    activeOrder?.customerName,
    activeOrder?.store?.name,
    customerAvatarUrl,
    deliveryAddress,
    deliveryStatus,
    pickupAddress,
    storeAvatarUrl,
  ]);

  const openRoute = () => {
    const destination = activeStop.address;
    if (!destination || destination.includes('indisponivel')) {
      showToast('Endereco indisponivel para abrir rota.', 'warning');
      return;
    }
    const params = new URLSearchParams({ api: '1', query: destination });
    window.open(`https://www.google.com/maps/search/?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyAddress = async () => {
    const text = activeStop.address;
    if (!text || text.includes('indisponivel')) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Endereco copiado.', 'success');
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('Endereco copiado.', 'success');
      } catch {
        showToast('Nao foi possivel copiar o endereco.', 'error');
      }
    }
  };

  const handleConfirmPayment = async (cashTendered?: number | null) => {
    if (!selected) return;
    try {
      await motoboyService.confirmPayment(selected.id, cashTendered ?? null);
      showToast('Pagamento confirmado.', 'success');
      setShowPayment(false);

      if (finalizeAfterPayment) {
        setFinalizeAfterPayment(false);
        setDeliveryCode('');
        setCodeError('');
        setCodeLocked(false);
        setShowCodeModal(true);
      }
      setFinalizeAfterPayment(false);
      void load();
    } catch (error: any) {
      showToast(error?.message || 'Nao foi possivel confirmar pagamento.', 'error');
    }
  };

  const handlePickup = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.pickupOrder(activeOrder.id);
      showToast('Pedido retirado. Agora siga para o cliente.', 'success');
      void load();
    } catch (error: any) {
      showToast(error?.message || 'Nao foi possivel confirmar retirada.', 'error');
    }
  };

  const handleDelivered = async () => {
    if (!activeOrder) return;
    try {
      if (!paymentIsPaid) {
        setSelected(activeOrder);
        setFinalizeAfterPayment(true);
        setShowPayment(true);
        return;
      }
      setDeliveryCode('');
      setCodeError('');
      setCodeLocked(false);
      setShowCodeModal(true);
    } catch (error: any) {
      showToast(error?.message || 'Nao foi possivel abrir a confirmacao.', 'error');
    }
  };

  const confirmDeliveryWithCode = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.markDelivered(activeOrder.id, deliveryCode.trim() || undefined);
      setShowCodeModal(false);
      showToast('Entrega finalizada.', 'success');
      void load();
      navigate('/motoboy/done', {
        state: {
          done: {
            orderId: activeOrder.id,
            customerName: activeOrder?.customerName,
            total: Number(activeOrder?.total || 0),
            deliveryFee: Number(activeOrder?.deliveryFee || 0),
            storeName: activeOrder?.store?.name || null,
          },
        },
      });
    } catch (error: any) {
      const blocked = Boolean(error?.details?.blocked) || String(error?.code || '') === 'MOTO-035';
      setCodeLocked(blocked);
      setCodeError(error?.details?.message || error?.message || 'Codigo incorreto. Tente novamente.');
    }
  };

  const formatRouteTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${String(sec).padStart(2, '0')}s`;
  };
  const handleAvatarError = (event: SyntheticEvent<HTMLImageElement>, fallbackUrl: string) => {
    const target = event.currentTarget;
    if (target.dataset.fallbackApplied === 'true') return;
    target.dataset.fallbackApplied = 'true';
    target.src = fallbackUrl;
  };

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
      <MotoboyHeader
        title="Entrega"
        subtitle={loading ? 'Atualizando...' : activeOrder ? 'Foque na etapa atual e avance sem duvida.' : 'Nenhuma entrega ativa agora.'}
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

      {earningsToday ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">Ganhos de hoje:</span>{' '}
          {earningsToday.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
          <span className="text-xs text-emerald-700">
            ({earningsToday.count} entrega{earningsToday.count === 1 ? '' : 's'})
          </span>
        </div>
      ) : null}

      {!activeOrder ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600 space-y-3">
          <p>Nenhum pedido em rota agora.</p>
          <button
            type="button"
            onClick={() => navigate('/motoboy/available')}
            className="btn-press w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-800"
          >
            Ir para fila
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="premium-card-glass p-4 motoboy-fade-up overflow-x-hidden" style={{ animationDelay: '40ms' }}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.5)] ring-1 ring-slate-100">
                      <img
                        src={activeStop.avatarUrl}
                        alt={activeStop.avatarAlt}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) =>
                          handleAvatarError(
                            event,
                            activeStop.avatarBadge === Buildings
                              ? getStoreAvatarUrl(activeOrder?.store?.id || activeOrder?.id, activeOrder?.store?.name)
                              : getPersonAvatarUrl(activeOrder?.customerName)
                          )
                        }
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-2xl border border-white bg-slate-900 text-white shadow-lg">
                      <activeStop.avatarBadge size={14} weight="fill" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">O que fazer agora</p>
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                      <Package size={13} weight="duotone" />
                      {activeStop.eyebrow}
                    </span>
                    <p className="mt-2 text-lg font-extrabold text-slate-900">{activeStop.title}</p>
                    <p className="text-sm text-slate-600 mt-1 break-words">{activeStop.address}</p>
                    <p className="text-[11px] text-slate-500 mt-3">{stepMeta.label}</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openRoute}
                    className="btn-press w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900"
                  >
                    <span className="inline-flex items-center gap-2">
                      <NavigationArrow size={16} weight="fill" />
                      {activeStop.actionLabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="btn-press w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-extrabold text-slate-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Copy size={14} weight="bold" />
                      Copiar endereco
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {STEP_ITEMS.map(({ label, hint, icon: Icon }, index) => {
                  const isCurrent = index === stepMeta.current;
                  const isDone = index < stepMeta.current;
                  return (
                    <div
                      key={label}
                      className={[
                        'rounded-2xl border px-3 py-3 text-left transition-all',
                        isCurrent
                          ? 'border-transparent bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] text-white shadow-[0_18px_34px_-26px_rgba(239,68,68,0.8)]'
                          : isDone
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-500',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
                            isCurrent
                              ? 'border-white/25 bg-white/15 text-white'
                              : isDone
                                ? 'border-emerald-200 bg-white text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-500',
                          ].join(' ')}
                        >
                          <Icon size={20} weight={isCurrent ? 'fill' : 'duotone'} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold">{label}</span>
                          <span
                            className={[
                              'mt-0.5 block text-[11px] font-semibold',
                              isCurrent ? 'text-white/85' : isDone ? 'text-emerald-800/80' : 'text-slate-500',
                            ].join(' ')}
                          >
                            {hint}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                      <img
                        src={storeAvatarUrl}
                        alt={activeOrder?.store?.name || 'Loja'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) =>
                          handleAvatarError(
                            event,
                            getStoreAvatarUrl(activeOrder?.store?.id || activeOrder?.id, activeOrder?.store?.name)
                          )
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Loja</p>
                      <p className="mt-1 text-sm font-black text-slate-900 break-words">{activeOrder?.store?.name || 'Loja'}</p>
                      <p className="mt-1 text-[11px] text-slate-600 break-words">{pickupAddress || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                      <img
                        src={customerAvatarUrl}
                        alt={activeOrder?.customerName || 'Cliente'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) => handleAvatarError(event, getPersonAvatarUrl(activeOrder?.customerName))}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Cliente</p>
                      <p className="mt-1 text-sm font-black text-slate-900 break-words">{activeOrder?.customerName || 'Cliente'}</p>
                      <p className="mt-1 text-[11px] text-slate-600 break-words">{deliveryAddress || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700">Voce recebe</p>
                      <p className="mt-1 text-lg font-black text-emerald-800">{formatCurrency(Number(activeOrder?.deliveryFee || 0))}</p>
                      <p className="mt-1 text-[11px] text-emerald-800/80">Frete desta entrega</p>
                    </div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white/80 text-emerald-700">
                      <CurrencyCircleDollar size={20} weight="duotone" />
                    </span>
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-3 ${paymentIsPaid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[10px] uppercase tracking-[0.14em] ${paymentIsPaid ? 'text-emerald-700' : 'text-amber-700'}`}>Pagamento</p>
                      <p className={`mt-1 text-lg font-black ${paymentIsPaid ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {paymentIsPaid ? 'Pago' : 'A receber'}
                      </p>
                      {routeStartAt > 0 ? (
                        <p className={`mt-1 text-[11px] ${paymentIsPaid ? 'text-emerald-800/80' : 'text-amber-800/80'}`}>Tempo em rota: {formatRouteTime(routeMs)}</p>
                      ) : null}
                    </div>
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${paymentIsPaid ? 'border-emerald-200 bg-white/80 text-emerald-700' : 'border-amber-200 bg-white/80 text-amber-700'}`}>
                      <CreditCard size={20} weight="duotone" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 motoboy-fade-up" style={{ animationDelay: '90ms' }}>
            {deliveryStatus === 'ACCEPTED' ? (
              <button
                onClick={handlePickup}
                className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
              >
                Confirmar retirada do pedido
              </button>
            ) : null}

            {deliveryStatus === 'PICKED_UP' ? (
              <button
                type="button"
                onClick={openRoute}
                className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,#0284c7,#0f766e)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(2,132,199,0.6)]"
              >
                Abrir rota para o cliente
              </button>
            ) : null}

            {deliveryStatus === 'IN_TRANSIT' ? (
              <button
                onClick={handleDelivered}
                className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,#16a34a,#059669)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(5,150,105,0.6)]"
              >
                {paymentIsPaid ? 'Confirmar entrega' : 'Receber e finalizar entrega'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              className="btn-press w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
            >
              {showDetails ? 'Ocultar detalhes do pedido' : 'Ver detalhes do pedido'}
            </button>
          </div>

          {showDetails ? (
            <div className="motoboy-fade-up" style={{ animationDelay: '140ms' }}>
              <OrderCard order={activeOrder} />
            </div>
          ) : null}
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

      {showCodeModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Codigo do cliente</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">Confirme a entrega</h3>
            <p className="mt-1 text-xs text-slate-500">Peça o codigo de 4 digitos ao cliente para concluir.</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={deliveryCode}
              onChange={(event) => {
                if (codeLocked) return;
                setDeliveryCode(event.target.value.replace(/\D/g, '').slice(0, 4));
                setCodeError('');
              }}
              placeholder="0000"
              disabled={codeLocked}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.5em] text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              autoFocus
            />
            {codeError ? <p className="mt-2 text-center text-xs font-semibold text-rose-600">{codeError}</p> : null}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowCodeModal(false)} className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 active:scale-95">Cancelar</button>
              <button type="button" onClick={confirmDeliveryWithCode} disabled={codeLocked || deliveryCode.length < 4} className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95">{codeLocked ? 'Bloqueado' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
