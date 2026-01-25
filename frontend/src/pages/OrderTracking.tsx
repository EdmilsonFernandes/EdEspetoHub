// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bicycle, ChefHat, CheckCircle, Clock, CircleNotch, MapPin } from '@phosphor-icons/react';
import { orderService } from '../services/orderService';
import { formatCurrency, formatDateTime, formatDuration, formatOrderDisplayId } from '../utils/format';
import { getPaymentMethodMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { applyBrandTheme } from '../utils/brandTheme';
import { buildPixPayload } from '../utils/pixPayload';

const statusLabels: Record<string, string> = {
  pending: 'Recebido',
  preparing: 'Em preparo',
  ready: 'Pronto para retirada',
  done: 'Pronto',
  delivered: 'Entregue',
};

const typeLabels: Record<string, string> = {
  delivery: 'Entrega',
  pickup: 'Retirar',
  table: 'Comer no local',
};

const normalizeWhatsApp = (value?: string) => {
  if (!value) return '';
  const digits = value.toString().replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const buildDemoStatus = (createdAt: number) => {
  const diff = Date.now() - createdAt;
  if (diff > 8 * 60 * 1000) return 'done';
  if (diff > 3 * 60 * 1000) return 'preparing';
  return 'pending';
};

export function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [prepStart, setPrepStart] = useState<number | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let interval: number | undefined;

    const loadOrder = async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }

      if (orderId.startsWith('demo-')) {
        const raw = sessionStorage.getItem(`demo:order:${orderId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const status = buildDemoStatus(parsed.createdAt);
          const next = {
            ...parsed,
            status,
            queuePosition: parsed.queuePosition ?? 1,
            queueSize: parsed.queueSize ?? 4,
          };
          setOrder(next);
        } else {
        setError('Pedido de demonstração não encontrado.');
        }
        setLoading(false);
        return;
      }

      try {
        const data = await orderService.getPublicById(orderId);
        setOrder(data);
        if (data?.status === 'done' || data?.status === 'delivered') {
          setPolling(false);
        }
      } catch (err: any) {
        setError(err.message || 'Não foi possível carregar o pedido agora.');
      } finally {
        if (!silent) setLoading(false);
      }
    };

    loadOrder(false);
    if (polling) {
      interval = window.setInterval(() => loadOrder(true), 5000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [orderId, polling]);

  const status = order?.status || 'pending';
  const typeLabel = typeLabels[order?.type] || 'Pedido';
  const isDelivery = order?.type === 'delivery';
  const storeName = order?.store?.name || 'Chama no Espeto';
  const storeSlug = order?.store?.slug;
  const storeHomePath = storeSlug ? `/${storeSlug}` : '/';
  const isAdminForStore = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem('adminSession');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      const adminStoreSlug = parsed?.store?.slug;
      return Boolean(parsed?.token && adminStoreSlug && storeSlug && adminStoreSlug === storeSlug);
    } catch {
      return false;
    }
  }, [storeSlug]);
  const handleBack = () => {
    if (isAdminForStore) {
      navigate('/admin/dashboard', { state: { activeTab: 'fila' } });
      return;
    }
    navigate(storeHomePath);
  };
  const storeLogo =
    resolveAssetUrl(order?.store?.settings?.logoUrl) || '/chama-no-espeto.jpeg';
  const statusLabel = useMemo(() => {
    if (isDelivery && (status === 'done' || status === 'delivered')) return 'Saiu para entrega';
    if (order?.type === 'table' && status === 'done') return 'Pronto para servir';
    if (order?.type === 'pickup' && status === 'ready') return 'Pronto para retirada';
    return statusLabels[status] || status;
  }, [isDelivery, order?.type, status]);
  const isReady = status === 'done' || status === 'delivered';
  const queuePosition = order?.queuePosition;
  const queueSize = order?.queueSize;
  const storePhone = order?.store?.phone;
  const customerPhone = order?.phone;
  const paymentValue = order?.paymentMethod || order?.payment;
  const paymentMeta = paymentValue ? getPaymentMethodMeta(paymentValue) : null;
  const pixKey =
    order?.store?.settings?.pixKey ||
    order?.pixKey ||
    '';
  const isPixPayment = (paymentValue || '').toString().trim().toLowerCase() === 'pix';
  const pixPayload = pixKey
    ? buildPixPayload({
        key: pixKey,
        name: storeName,
        amount: Number(order?.total || 0),
        txid: order?.id ? `PEDIDO${order.id.slice(0, 8)}` : 'PEDIDO',
      })
    : '';
  const pixQrUrl = pixPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixPayload)}`
    : '';
  const estimateMinutes =
    typeof queuePosition === 'number' && queuePosition > 0 ? Math.max(15, queuePosition * 15) : null;
  const estimatedReadyAt = useMemo(() => {
    if (status !== 'preparing' || !estimateMinutes || !prepStart) return null;
    return new Date(prepStart + estimateMinutes * 60 * 1000);
  }, [estimateMinutes, prepStart, status]);
  const formatItemOptions = (item: any) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar varinha');
    return labels.length ? labels.join(' • ') : '';
  };
  const trackingLink = typeof window !== 'undefined' && order?.id
    ? `${window.location.origin}/pedido/${order.id}`
    : '';
  const orderItemsText = (order?.items || [])
    .map((item: any) => {
      const options = formatItemOptions(item);
      return `- ${item.quantity}x ${item.name}${options ? ` (${options})` : ''}`;
    })
    .join('\n');
  const whatsappMessage = [
    `Pedido #${formatOrderDisplayId(order?.id, storeSlug)} - ${storeName}`,
    orderItemsText ? `Itens:\n${orderItemsText}` : '',
    `Total: ${formatCurrency(order?.total || 0)}`,
    isPixPayment && pixKey ? `Pix: ${pixKey}` : '',
    trackingLink ? `Acompanhar: ${trackingLink}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const customerWhatsappLink = customerPhone
    ? `https://wa.me/${normalizeWhatsApp(customerPhone)}?text=${encodeURIComponent(whatsappMessage)}`
    : '';
  const storeWhatsappLink = storePhone
    ? `https://wa.me/${normalizeWhatsApp(storePhone)}`
    : '';
  const handleRepeatOrder = () => {
    if (!storeSlug || !order?.items?.length) return;
    const payload = {
      items: order.items.map((item: any) => ({
        productId: item.productId || item.product?.id,
        name: item.name,
        quantity: item.quantity ?? item.qty ?? 1,
        cookingPoint: item.cookingPoint || '',
        passSkewer: Boolean(item.passSkewer),
      })),
    };
    localStorage.setItem(`reorder:${storeSlug}`, JSON.stringify(payload));
    navigate(storeHomePath);
  };

  useEffect(() => {
    const settings = order?.store?.settings;
    applyBrandTheme(
      settings
        ? {
            primaryColor: settings.primaryColor,
            accentColor: settings.secondaryColor,
          }
        : {}
    );
    const title = storeName ? `Pedido | ${storeName}` : 'Acompanhar pedido';
    document.title = title;
    const favicon =
      document.querySelector('link[rel="icon"]') || document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    favicon.setAttribute('href', storeLogo);
    document.head.appendChild(favicon);
  }, [order?.store?.settings, storeLogo, storeName]);

  useEffect(() => {
    if (!order?.id) return;
    setPixCopied(false);
  }, [order?.id]);

  useEffect(() => {
    if (!order?.createdAt) return;
    const start = new Date(order.createdAt).getTime();
    if (!Number.isFinite(start)) return;
    const update = () => setElapsedMs(Date.now() - start);
    update();
    if (isReady) return;
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [order?.createdAt, isReady]);

  useEffect(() => {
    if (!order?.id) return;
    if (status !== 'preparing') return;
    const storageKey = `prepStart:${order.id}`;
    const existing = sessionStorage.getItem(storageKey);
    if (existing) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed)) {
        setPrepStart(parsed);
        return;
      }
    }
    const now = Date.now();
    sessionStorage.setItem(storageKey, String(now));
    setPrepStart(now);
  }, [order?.id, status]);

  const steps = useMemo(() => {
    if (isDelivery) {
      return [
        { id: 'pending', label: 'Recebido' },
        { id: 'preparing', label: 'Em preparo' },
        { id: 'done', label: 'Saiu para entrega' },
      ];
    }
    if (order?.type === 'pickup') {
      return [
        { id: 'pending', label: 'Recebido' },
        { id: 'preparing', label: 'Em preparo' },
        { id: 'ready', label: 'Pronto para retirada' },
        { id: 'done', label: 'Pago' },
      ];
    }
    return [
      { id: 'pending', label: 'Recebido' },
      { id: 'preparing', label: 'Em preparo' },
      { id: 'done', label: order?.type === 'table' ? 'Pronto para servir' : 'Pronto' },
    ];
  }, [isDelivery, order?.type]);
  const currentStep = isDelivery && status === 'delivered' ? 'done' : status;
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === currentStep));
  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={handleBack} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-white bg-white">
                <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-lg font-bold text-gray-900">{storeName}</p>
                <p className="text-sm text-gray-500">Acompanhar pedido</p>
              </div>
            </button>
            <button
              onClick={handleBack}
              className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <CircleNotch className="animate-spin" weight="duotone" />
              Carregando seu pedido...
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {!loading && !error && order && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-gray-50 to-white p-5 sm:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                      Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{statusLabel}</h1>
                      {isDelivery && (status === 'done' || status === 'delivered') && (
                        <span
                          className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1"
                          title="Saiu para entrega"
                          aria-label="Saiu para entrega"
                        >
                        <Bicycle size={14} weight="duotone" />
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isReady
                            ? 'bg-brand-primary text-white'
                            : 'bg-brand-primary-soft text-brand-primary animate-pulse'
                        }`}
                      >
                        {isReady ? 'Finalizado' : 'Em andamento'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {storeName} • {typeLabel}
                    </p>
                    {isReady && elapsedMs > 0 && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-primary text-white text-xs font-semibold px-4 py-2 shadow-sm">
                        Tempo total: {formatDuration(elapsedMs)}
                      </div>
                    )}
                    {estimateMinutes && !isReady && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold animate-pulse">
                        Estimativa: ~{estimateMinutes} min
                      </div>
                    )}
                    {estimatedReadyAt && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                        Previsão de entrega: {estimatedReadyAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} weight="duotone" />
                    {order.createdAt ? formatDateTime(order.createdAt) : 'Agora'}
                    {elapsedMs > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Tempo corrido: {formatDuration(elapsedMs)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-4">
                  <ChefHat className="text-red-500" weight="duotone" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Andamento do preparo</p>
                    <p className="text-xs text-gray-500">
                      {polling ? 'Atualizando automaticamente' : 'Status finalizado'}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${progress}%`,
                        backgroundImage:
                          'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{progress}% completo</div>
                </div>
                <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-1 sm:grid sm:gap-3 sm:grid-cols-4 sm:overflow-visible">
                  {steps.map((step) => {
                    const isDone =
                      steps.findIndex((item) => item.id === step.id) <=
                      steps.findIndex((item) => item.id === currentStep);
                    const showBike = isDelivery && step.id === 'done';
                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-3 py-2 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap ${
                          isDone
                            ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
                            : 'border-gray-200 text-gray-500'
                        } ${step.id === currentStep && !isReady ? 'ring-2 ring-brand-primary animate-pulse' : ''}`}
                      >
                        {showBike ? (
                          <Bicycle size={18} weight="duotone" />
                        ) : isDone ? (
                          <CheckCircle size={18} weight="duotone" />
                        ) : (
                          <Clock size={18} weight="duotone" />
                        )}
                        <span className="text-sm font-semibold">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-gray-100 p-5 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-sm font-semibold text-gray-900">Resumo do pedido</p>
                    {paymentMeta?.label && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-2">
                        {paymentMeta.icon && (
                          <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                        )}
                        {paymentMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 text-sm text-gray-600">
                    {(order.items || []).map((item) => (
                      <div key={item.id || item.productId} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={resolveAssetUrl(item.imageUrl)}
                              alt={item.name}
                              className="w-11 h-11 rounded-xl object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                              🍖
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{item.quantity}x {item.name}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item?.cookingPoint && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  {item.cookingPoint}
                                </span>
                              )}
                              {item?.passSkewer && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
                                  passar varinha
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                          <span className="flex flex-col items-end gap-0.5">
                            <span className="text-[11px] line-through text-gray-400">
                              {formatCurrency(Number(item.originalPrice) * (item.quantity || 1))}
                            </span>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(Number(item.price))}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-800">R$ {Number(item.price).toFixed(2)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm font-semibold text-gray-800 border-t border-gray-100 pt-4">
                    <span>Total</span>
                    <span className="text-base px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-100 p-5 space-y-3 bg-white shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">Informações</p>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      <span className="font-semibold">Cliente:</span> {order.customerName || 'Cliente'}
                    </p>
                    {paymentMeta?.label && (
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">Pagamento:</span>
                        {paymentMeta.icon && (
                          <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                        )}
                        <span>{paymentMeta.label}</span>
                      </p>
                    )}
                    {order.payment?.toString().toLowerCase() === 'dinheiro' && order.cashTendered ? (
                      <p>
                        <span className="font-semibold">Troco para:</span>{' '}
                        {formatCurrency(Number(order.cashTendered))}
                      </p>
                    ) : null}
                    {order.phone && (
                      <p>
                        <span className="font-semibold">Telefone:</span> {order.phone}
                      </p>
                    )}
                    {order.type === 'table' && (
                      <p>
                        <span className="font-semibold">Mesa:</span> {order.table || '-'}
                      </p>
                    )}
                    {order.type === 'delivery' && order.address && (
                      <p className="flex items-start gap-2">
                        <MapPin size={16} weight="duotone" className="text-gray-400 mt-0.5" />
                        <span>{order.address}</span>
                      </p>
                    )}
                    {isPixPayment && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Pagamento via Pix</span>
                          <span className="text-xs text-slate-400">Use o QR Code ou chave</span>
                        </div>
                        {pixKey ? (
                          <>
                            <div className="flex items-center justify-center">
                              <img
                                src={pixQrUrl}
                                alt="QR Code Pix"
                                className="w-40 h-40 rounded-xl bg-white border border-slate-200 object-contain"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(pixPayload || pixKey);
                                  setPixCopied(true);
                                  window.setTimeout(() => setPixCopied(false), 2000);
                                } catch (err) {
                                  console.error('Falha ao copiar Pix', err);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                            >
                              {pixCopied ? 'Copiado!' : 'Copiar codigo Pix'}
                            </button>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500">
                            A chave Pix da loja ainda não foi cadastrada.
                          </div>
                        )}
                      </div>
                    )}
                  {(customerWhatsappLink || storeWhatsappLink) && (
                    <div className="flex flex-col gap-2">
                      {customerWhatsappLink && (
                        <a
                          href={customerWhatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:opacity-90"
                        >
                          Enviar detalhes para meu WhatsApp
                        </a>
                      )}
                      {storeWhatsappLink && (
                        <a
                          href={storeWhatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-green-600 text-green-700 text-xs font-semibold hover:bg-green-50"
                        >
                          Falar com a loja no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {order?.items?.length && (
                    <button
                      type="button"
                      onClick={handleRepeatOrder}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      Pedir novamente
                    </button>
                  )}
                    <p>
                      <span className="font-semibold">Status:</span> {statusLabel}
                    </p>
                    {isReady && elapsedMs > 0 && (
                      <p>
                        <span className="font-semibold">Tempo total:</span> {formatDuration(elapsedMs)}
                      </p>
                    )}
                    {typeof queuePosition === 'number' && typeof queueSize === 'number' && (
                      <p>
                        <span className="font-semibold">Posicao na fila:</span> {queuePosition} de {queueSize}
                      </p>
                    )}
                    {estimateMinutes && !isReady && (
                      <p>
                        <span className="font-semibold">Estimativa:</span> ~{estimateMinutes} min
                      </p>
                    )}
                  </div>
                  {isReady && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                      {isDelivery
                        ? 'Seu pedido saiu para entrega. Se precisar, mande uma referencia do endereco. Bom apetite!'
                        : order?.type === 'table'
                        ? 'Seu pedido esta pronto. Aguarde o atendimento na sua mesa.'
                        : 'Seu pedido esta pronto! Pode ir retirar. Bom apetite!'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
