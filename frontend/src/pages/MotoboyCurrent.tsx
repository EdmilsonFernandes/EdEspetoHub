import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  CreditCard,
  Copy,
  CurrencyCircleDollar,
  MapPinLine,
  NavigationArrow,
  ShieldCheck,
  Storefront,
  UserCircle,
  WarningCircle,
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
    setLoading(false);
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
        ? 'Chegue na loja e confirme a retirada.'
        : deliveryStatus === 'PICKED_UP'
          ? 'Inicie a rota para o cliente.'
          : deliveryStatus === 'IN_TRANSIT'
            ? paymentIsPaid
              ? 'Peça o código ao cliente para finalizar.'
              : 'Receba o pagamento e finalize com o código.'
            : 'Aguardando informações da entrega.';
    return { current, label };
  }, [deliveryStatus, paymentIsPaid]);

  const activeStop = useMemo(() => {
    if (deliveryStatus === 'ACCEPTED') {
      return {
        eyebrow: 'Retirada na loja',
        title: activeOrder?.store?.name || 'Retirada na loja',
        address: pickupAddress || 'Endereço da loja indisponível',
        actionLabel: 'Abrir rota',
        avatarUrl: storeAvatarUrl,
        avatarAlt: activeOrder?.store?.name || 'Loja',
        avatarBadge: Buildings,
      };
    }
    return {
      eyebrow: 'Destino da entrega',
      title: activeOrder?.customerName || 'Entrega ao cliente',
      address: deliveryAddress || 'Endereço do cliente indisponível',
      actionLabel: 'Abrir rota',
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
    if (!destination || destination.includes('indisponível')) {
      showToast('Endereço indisponível para abrir rota.', 'warning');
      return;
    }
    const params = new URLSearchParams({ api: '1', query: destination });
    window.open(`https://www.google.com/maps/search/?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyAddress = async () => {
    const text = activeStop.address;
    if (!text || text.includes('indisponível')) return;
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
      showToast(error?.message || 'Não foi possível confirmar pagamento.', 'error');
    }
  };

  const handlePickup = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.pickupOrder(activeOrder.id);
      showToast('Pedido retirado. Agora siga para o cliente.', 'success');
      void load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar retirada.', 'error');
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
      showToast(error?.message || 'Não foi possível abrir a confirmação.', 'error');
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
      setCodeError(error?.details?.message || error?.message || 'Código incorreto. Tente novamente.');
    }
  };

  const handleStartDelivery = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.startDelivery(activeOrder.id);
      showToast('Rota iniciada. Siga até o cliente.', 'success');
      void load();
      window.setTimeout(openRoute, 150);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível iniciar a rota.', 'error');
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

  const primaryActionLabel =
    deliveryStatus === 'ACCEPTED'
      ? 'Confirmar retirada'
      : deliveryStatus === 'PICKED_UP'
        ? 'Iniciar rota'
        : paymentIsPaid
          ? 'Confirmar entrega'
          : 'Receber e finalizar';

  const primaryActionHint =
    deliveryStatus === 'ACCEPTED'
      ? 'Avança o pedido para a etapa de saída.'
      : deliveryStatus === 'PICKED_UP'
        ? 'Abre a rota e avisa o sistema.'
        : paymentIsPaid
          ? 'Use o código de 4 dígitos do cliente.'
          : 'Confirme pagamento e código do cliente.';

  const primaryButtonClass =
    deliveryStatus === 'ACCEPTED'
      ? 'bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]'
      : deliveryStatus === 'PICKED_UP'
        ? 'bg-[linear-gradient(120deg,#0284c7,#0f766e)] shadow-[0_22px_48px_-32px_rgba(2,132,199,0.6)]'
        : 'bg-[linear-gradient(120deg,#16a34a,#059669)] shadow-[0_22px_48px_-32px_rgba(5,150,105,0.6)]';

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
      <MotoboyHeader
        title="Entrega"
        subtitle={loading ? 'Atualizando...' : activeOrder ? 'Siga a próxima ação da entrega.' : 'Nenhuma entrega ativa agora.'}
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
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]">Próxima ação</p>
                    <p className="mt-1 text-xl font-black leading-tight text-slate-950">{activeStop.eyebrow}</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-800">{activeStop.title}</p>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
                      <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600">
                        <MapPinLine size={15} weight="duotone" className="mt-0.5 shrink-0 text-[#336886]" />
                        <span className="break-words">{activeStop.address}</span>
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{stepMeta.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-auto sm:min-w-[220px] sm:grid-cols-1">
                  <button
                    type="button"
                    onClick={openRoute}
                    className="btn-press rounded-xl border border-[#d7e7ef] bg-white px-3 py-2.5 text-xs font-black text-[#153A4C]"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <NavigationArrow size={16} weight="fill" />
                      {activeStop.actionLabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="btn-press rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-700"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Copy size={14} weight="bold" />
                      Copiar
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3">
                <div className="grid grid-cols-3 gap-2">
                {STEP_ITEMS.map(({ label, hint, icon: Icon }, index) => {
                  const isCurrent = index === stepMeta.current;
                  const isDone = index < stepMeta.current;
                  return (
                    <div
                      key={label}
                      className={[
                        'relative min-w-0 text-center',
                        isCurrent
                          ? 'text-slate-950'
                          : isDone
                            ? 'text-emerald-800'
                            : 'text-slate-500',
                      ].join(' ')}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={[
                            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                            isCurrent
                              ? 'border-[#336886] bg-[#336886] text-white shadow-[0_14px_26px_-18px_rgba(51,104,134,0.85)]'
                              : isDone
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-500',
                          ].join(' ')}
                        >
                          <Icon size={16} weight={isCurrent ? 'fill' : 'duotone'} />
                        </span>
                        <span className="min-w-0 max-w-full">
                          <span className="block truncate text-[11px] font-extrabold">{label}</span>
                          <span
                            className={[
                              'mt-0.5 hidden truncate text-[10px] font-semibold sm:block',
                              isCurrent ? 'text-slate-600' : isDone ? 'text-emerald-800/80' : 'text-slate-500',
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
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div
                  className={[
                    'rounded-2xl border px-3 py-3',
                    deliveryStatus === 'ACCEPTED' ? 'border-[#cfe0ea] bg-[#f4fafc]' : 'border-emerald-200 bg-emerald-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white bg-slate-50 shadow-sm">
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
                      {deliveryStatus !== 'ACCEPTED' ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/75 text-white">
                          <CheckCircle size={20} weight="fill" />
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">1. Retirada</p>
                      <p className="mt-1 text-sm font-black text-slate-900 break-words">{activeOrder?.store?.name || 'Loja'}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-relaxed text-slate-600">{pickupAddress || '-'}</p>
                    </div>
                  </div>
                </div>
                <div
                  className={[
                    'rounded-2xl border px-3 py-3',
                    deliveryStatus === 'ACCEPTED'
                      ? 'border-slate-200 bg-white'
                      : deliveryStatus === 'PICKED_UP' || deliveryStatus === 'IN_TRANSIT'
                        ? 'border-[#cfe0ea] bg-[#f4fafc]'
                        : 'border-slate-200 bg-white',
                  ].join(' ')}
                >
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
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">2. Entrega</p>
                      <p className="mt-1 text-sm font-black text-slate-900 break-words">{activeOrder?.customerName || 'Cliente'}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-relaxed text-slate-600">{deliveryAddress || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700">Você recebe</p>
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

          <div
            className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 space-y-2 rounded-[1.6rem] border border-white/80 bg-white/95 p-3 shadow-[0_22px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl motoboy-fade-up sm:static sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0"
            style={{ animationDelay: '90ms' }}
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Agora</p>
                <p className="truncate text-xs font-bold text-slate-600">{primaryActionHint}</p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
                Etapa {stepMeta.current + 1}/3
              </span>
            </div>
            <button
              type="button"
              onClick={
                deliveryStatus === 'ACCEPTED'
                  ? handlePickup
                  : deliveryStatus === 'PICKED_UP'
                    ? handleStartDelivery
                    : handleDelivered
              }
              disabled={!['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(deliveryStatus)}
              className={`btn-press flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black text-white disabled:opacity-50 ${primaryButtonClass}`}
            >
              <span>{primaryActionLabel}</span>
              <ArrowRight size={18} weight="bold" />
            </button>

            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              className="btn-press w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600"
            >
              {showDetails ? 'Ocultar itens e valores' : 'Itens e detalhes do pedido'}
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
          <div className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span
                className={[
                  'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                  codeLocked ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#d7e7ef] bg-[#f4fafc] text-[#336886]',
                ].join(' ')}
              >
                {codeLocked ? <WarningCircle size={22} weight="fill" /> : <ShieldCheck size={22} weight="duotone" />}
              </span>
              <div className="min-w-0">
                <p className={['text-[10px] font-black uppercase tracking-[0.18em]', codeLocked ? 'text-rose-600' : 'text-[#336886]'].join(' ')}>
                  {codeLocked ? 'Confirmação bloqueada' : 'Código do cliente'}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-900">
                  {codeLocked ? 'A loja precisa resolver' : 'Confirme a entrega'}
                </h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  {codeLocked
                    ? 'As tentativas de código acabaram. Feche esta tela e peça para a loja registrar o problema da entrega no painel.'
                    : 'Peça ao cliente o código de 4 dígitos antes de concluir.'}
                </p>
              </div>
            </div>
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
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.5em] text-slate-900 focus:border-[#336886] focus:outline-none focus:ring-2 focus:ring-[#336886]/15 disabled:cursor-not-allowed disabled:opacity-60"
              autoFocus
            />
            {codeError ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-relaxed text-rose-700">
                <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                <span>{codeError}</span>
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-800">
                <ShieldCheck size={16} weight="duotone" className="mt-0.5 shrink-0" />
                <span>Essa confirmação evita entrega indevida. Não finalize sem o código do cliente.</span>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="btn-press flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700"
              >
                {codeLocked ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={confirmDeliveryWithCode}
                disabled={codeLocked || deliveryCode.length < 4}
                className="btn-press flex-1 rounded-2xl bg-[#153A4C] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {codeLocked ? 'Bloqueado' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
