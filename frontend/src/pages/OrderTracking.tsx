// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bicycle, ChefHat, CheckCircle, Clock, CircleNotch, MapPin, Star } from '@phosphor-icons/react';
import { orderService } from '../services/orderService';
import { mapsService } from '../services/mapsService';
import { formatAddress, formatCurrency, formatDateTime, formatDuration, formatOrderDisplayId } from '../utils/format';
import { getPaymentMethodMeta } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { applyBrandTheme } from '../utils/brandTheme';
import { buildPixPayload } from '../utils/pixPayload';
import { GoogleRouteMapView } from '../components/GoogleRouteMapView';
import { formatSelectedModifiers } from '../utils/productModifiers';

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

const stepStyles: Record<string, { current: string }> = {
  pending: {
    current: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  preparing: {
    current: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  ready: {
    current: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  in_delivery: {
    current: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  done: {
    current: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  delivered: {
    current: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

const stepIconById: Record<string, any> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  in_delivery: Bicycle,
  done: CheckCircle,
  delivered: CheckCircle,
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

const normalizeAddressForMaps = (address?: unknown) => {
  const normalized = formatAddress(address);
  if (!normalized) return '';
  return normalized
    .replace(/\|/g, ', ')
    .replace(/\bcep\b[:\s-]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const firstName = (fullName?: string | null) => {
  const n = String(fullName || '').trim();
  if (!n) return '';
  return n.split(/\s+/)[0] || n;
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
  const [storeCoords, setStoreCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [deliveryRoute, setDeliveryRoute] = useState(null);
  const [trackingV2, setTrackingV2] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewState, setReviewState] = useState<any>(null);
  const [reviewError, setReviewError] = useState('');
  const [reviewForm, setReviewForm] = useState({
    storeRating: 0,
    deliveryRating: 0,
    comment: '',
    storeTags: [] as string[],
    deliveryTags: [] as string[],
    tipAmount: 0,
  });

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

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setTrackingLoading(true);
    orderService
      .getTrackingV2(orderId)
      .then((data) => {
        if (active) setTrackingV2(data);
      })
      .catch(() => null)
      .finally(() => {
        if (active) setTrackingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const status = order?.status || 'pending';
  const typeLabel = typeLabels[order?.type] || 'Pedido';
  const isDelivery = order?.type === 'delivery';
  const deliveryStatus = String((order as any)?.delivery?.status || '').toUpperCase();
  const motoboyName = String((order as any)?.delivery?.motoboy?.name || '');
  const motoboyFirst = firstName(motoboyName);
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
      navigate('/admin/queue');
      return;
    }
    navigate(storeHomePath);
  };
  const storeLogo =
    resolveAssetUrl(order?.store?.settings?.logoUrl) || '/chama-no-espeto.jpeg';
  const statusLabel = useMemo(() => {
    if (isDelivery && (deliveryStatus === 'DELIVERED' || status === 'delivered' || status === 'finished')) return 'Entregue';
    if (isDelivery && deliveryStatus === 'IN_TRANSIT') return 'Em rota';
    if (isDelivery && (deliveryStatus === 'ACCEPTED' || deliveryStatus === 'PICKED_UP')) return 'Entregador a caminho';
    if (isDelivery && status === 'waiting_for_motoboy') return 'Aguardando entregador';
    if (isDelivery && status === 'ready_for_delivery') return 'Pronto para entrega';
    if (isDelivery && status === 'ready') return 'Aguardando entregador';
    // Legacy delivery orders that still use "done".
    if (isDelivery && status === 'done') return 'Entregue';
    if (order?.type === 'table' && status === 'done') return 'Pronto para servir';
    if (order?.type === 'pickup' && status === 'ready') return 'Pronto para retirada';
    return statusLabels[status] || status;
  }, [isDelivery, order?.type, status, (order as any)?.delivery?.status]);
  const isReady =
    status === 'done' ||
    status === 'delivered' ||
    status === 'finished' ||
    String((order as any)?.delivery?.status || '').toUpperCase() === 'DELIVERED';
  const canRateDelivery = isDelivery;
  const storePhone = order?.store?.phone;
  const customerPhone = order?.phone;
  const paymentValue = order?.paymentMethod || order?.payment;
  const paymentMeta = paymentValue ? getPaymentMethodMeta(paymentValue) : null;
  const pixKey =
    order?.store?.settings?.pixKey ||
    order?.pixKey ||
    '';
  const isPixPayment = (paymentValue || '').toString().trim().toLowerCase() === 'pix';
  const hasDeliveryFee =
    order?.deliveryFee !== null && order?.deliveryFee !== undefined && order?.type === 'delivery';
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
  const etaDetails = trackingV2?.eta || order?.eta || null;
  const etaTotalMinutes = etaDetails?.totalMinutes
    ? Number(etaDetails.totalMinutes)
    : null;
  const etaWindowMin = etaDetails?.windowMin ? Number(etaDetails.windowMin) : null;
  const etaWindowMax = etaDetails?.windowMax ? Number(etaDetails.windowMax) : null;
  const estimateMinutes = etaTotalMinutes;
  const deliveryFeeValue = hasDeliveryFee ? Number(order?.deliveryFee || 0) : null;
  const estimatedReadyAt = useMemo(() => {
    if (!estimateMinutes || !order?.createdAt) return null;
    const base = new Date(order.createdAt).getTime();
    if (!Number.isFinite(base)) return null;
    return new Date(base + estimateMinutes * 60 * 1000);
  }, [estimateMinutes, order?.createdAt]);
  const deliveryEta = useMemo(() => {
    if (!deliveryRoute?.durationMin) return null;
    const base = order?.updatedAt ? new Date(order.updatedAt).getTime() : Date.now();
    return new Date(base + Number(deliveryRoute.durationMin) * 60 * 1000);
  }, [deliveryRoute?.durationMin, order?.updatedAt]);
  const formatItemOptions = (item: any) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar varinha');
    const selected = formatSelectedModifiers(item?.selectedModifiers || []);
    if (selected.length) labels.push(`+ ${selected.join(', ')}`);
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
        selectedModifiers: item.selectedModifiers || [],
      })),
    };
    localStorage.setItem(`reorder:${storeSlug}`, JSON.stringify(payload));
    navigate(storeHomePath);
  };

  useEffect(() => {
    if (!order?.id || !isReady) return;
    let active = true;
    setReviewLoading(true);
    setReviewError('');
    orderService
      .getReviewByOrder(order.id)
      .then((payload) => {
        if (!active) return;
        setReviewState(payload || null);
        if (payload?.review) {
          setReviewForm({
            storeRating: Number(payload.review.storeRating || 0),
            deliveryRating: Number(payload.review.deliveryRating || 0),
            comment: String(payload.review.comment || ''),
            storeTags: Array.isArray(payload.review.storeTags) ? payload.review.storeTags : [],
            deliveryTags: Array.isArray(payload.review.deliveryTags) ? payload.review.deliveryTags : [],
            tipAmount: Number(payload.review.tipAmount || 0),
          });
        }
      })
      .catch((error: any) => {
        if (!active) return;
        setReviewError(error?.message || 'Não foi possível carregar avaliação.');
      })
      .finally(() => {
        if (active) setReviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order?.id, isReady]);

  const storeTagOptions = ['Sabor', 'Temperatura', 'Embalagem', 'Custo-benefício'];
  const deliveryTagOptions = ['Rápido', 'Educado', 'Pedido intacto', 'Boa comunicação'];
  const toggleTag = (type: 'storeTags' | 'deliveryTags', value: string) => {
    setReviewForm((prev) => {
      const current = Array.isArray(prev[type]) ? prev[type] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [type]: exists ? current.filter((item) => item !== value) : [ ...current, value ],
      };
    });
  };
  const submitReview = async () => {
    if (!order?.id || reviewSubmitting) return;
    if (Number(reviewForm.storeRating || 0) < 1) {
      setReviewError('Escolha uma nota para o pedido.');
      return;
    }
    if (canRateDelivery && Number(reviewForm.deliveryRating || 0) < 1) {
      setReviewError('Escolha uma nota para a entrega.');
      return;
    }
    try {
      setReviewSubmitting(true);
      setReviewError('');
      const payload = await orderService.submitReviewByOrder(order.id, {
        storeRating: Number(reviewForm.storeRating || 0),
        deliveryRating: canRateDelivery ? Number(reviewForm.deliveryRating || 0) : null,
        comment: String(reviewForm.comment || ''),
        storeTags: reviewForm.storeTags || [],
        deliveryTags: canRateDelivery ? (reviewForm.deliveryTags || []) : [],
        tipAmount: Number(reviewForm.tipAmount || 0),
      });
      setReviewState({ ...(reviewState || {}), review: payload });
    } catch (error: any) {
      setReviewError(error?.message || 'Não foi possível enviar sua avaliação.');
    } finally {
      setReviewSubmitting(false);
    }
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

  useEffect(() => {
    const isDeliveryOrder = order?.type === 'delivery';
    if (!isDeliveryOrder) {
      setStoreCoords(null);
      setDeliveryCoords(null);
      setDeliveryRoute(null);
      setRouteLoading(false);
      return;
    }

    const rawStoreAddress = order?.store?.settings?.address || order?.store?.owner?.address || '';
    const rawDeliveryAddress = order?.address || '';
    const storeAddress = normalizeAddressForMaps(rawStoreAddress);
    const deliveryAddress = normalizeAddressForMaps(rawDeliveryAddress);
    if (!storeAddress || !deliveryAddress) return;

    const cacheKey = order?.id ? `order-route:${order.id}` : '';
    if (cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.storeCoords && parsed?.deliveryCoords && parsed?.route) {
            setStoreCoords(parsed.storeCoords);
            setDeliveryCoords(parsed.deliveryCoords);
            setDeliveryRoute(parsed.route);
            return;
          }
        } catch (error) {
          console.error('Falha ao ler cache de rota', error);
        }
      }
    }

    let active = true;
    setRouteLoading(true);
    Promise.all([mapsService.geocode(storeAddress), mapsService.geocode(deliveryAddress)])
      .then(async ([storeGeo, deliveryGeo]) => {
        if (!active) return;
        const nextStore = { lat: Number(storeGeo.lat), lng: Number(storeGeo.lng) };
        const nextDelivery = { lat: Number(deliveryGeo.lat), lng: Number(deliveryGeo.lng) };
        setStoreCoords(nextStore);
        setDeliveryCoords(nextDelivery);
        const route = await mapsService.route(nextStore, nextDelivery);
        if (!active) return;
        setDeliveryRoute(route);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify({
            storeCoords: nextStore,
            deliveryCoords: nextDelivery,
            route,
          }));
        }
      })
      .catch((error) => {
        console.error('Falha ao calcular rota', error);
      })
      .finally(() => {
        if (active) setRouteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [order?.address, order?.id, order?.store?.settings?.address, order?.store?.owner?.address, order?.type]);

  const steps = useMemo(() => {
    if (isDelivery) {
      return [
        { id: 'pending', label: 'Recebido' },
        { id: 'preparing', label: 'Em preparo' },
        { id: 'ready', label: 'Aguardando entregador' },
        { id: 'in_delivery', label: 'Em rota' },
        { id: 'delivered', label: 'Entregue' },
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
  const currentStep = (() => {
    if (!isDelivery) return status;
    const deliveryStatus = String((order as any)?.delivery?.status || '').toUpperCase();
    if (deliveryStatus === 'DELIVERED') return 'delivered';
    if (deliveryStatus === 'IN_TRANSIT') return 'in_delivery';
    if (deliveryStatus === 'ACCEPTED' || deliveryStatus === 'PICKED_UP') return 'ready';
    if (status === 'ready_for_delivery' || status === 'waiting_for_motoboy' || status === 'ready') return 'ready';
    if (status === 'in_delivery') return 'ready';
    if (status === 'delivered' || status === 'finished') return 'delivered';
    return status;
  })();
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === currentStep));
  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;
  const completedStepClass = 'bg-slate-100 text-slate-500 border-slate-200';
  const upcomingStepClass = 'bg-white text-slate-400 border-slate-200 opacity-70';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
        <div className="h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <button onClick={handleBack} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-[0_14px_26px_-18px_rgba(239,68,68,0.7)] border border-white bg-white">
                <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-lg font-black text-gray-900">{storeName}</p>
                <p className="text-xs text-gray-500 uppercase tracking-[0.25em]">Acompanhar pedido</p>
              </div>
            </button>
            <button
              onClick={handleBack}
              className="px-3 py-2 sm:px-4 text-sm rounded-full border border-slate-200 text-gray-700 hover:bg-gray-50 transition-colors"
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
              <div className="rounded-3xl premium-card-soft p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                      Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{statusLabel}</h1>
                      {isDelivery && (String((order as any)?.delivery?.status || '').toUpperCase() === 'IN_TRANSIT' || status === 'in_delivery') && (
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

                    {isDelivery && motoboyFirst && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus) ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-800">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                            <Bicycle size={18} weight="duotone" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.28em] text-slate-500 font-extrabold">
                              Entregador
                            </div>
                            <div className="font-extrabold leading-tight truncate">
                              {motoboyFirst} {deliveryStatus === 'IN_TRANSIT' ? 'está a caminho' : deliveryStatus === 'PICKED_UP' ? 'retirou seu pedido' : 'aceitou sua entrega'}
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {deliveryStatus === 'IN_TRANSIT'
                                ? 'Ele está indo até você agora.'
                                : deliveryStatus === 'PICKED_UP'
                                ? 'Agora é só acompanhar o trajeto.'
                                : 'Ele está se preparando para sair da loja.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isReady && elapsedMs > 0 && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-primary text-white text-xs font-semibold px-4 py-2 shadow-sm">
                        Tempo total: {formatDuration(elapsedMs)}
                      </div>
                    )}
                    {estimateMinutes && !isReady && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold animate-pulse">
                        Previsão de entrega: ~{estimateMinutes} min
                      </div>
                    )}
                    {etaWindowMin && etaWindowMax && !isReady && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        Janela prevista: {etaWindowMin}–{etaWindowMax} min
                      </div>
                    )}
                    {estimatedReadyAt && !isReady && (
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
                <div className="flex flex-nowrap gap-2 sm:gap-3 overflow-x-auto overflow-y-visible no-scrollbar py-1 pb-2">
                  {steps.map((step) => {
                    const stepIndex = steps.findIndex((item) => item.id === step.id);
                    const isCompleted = stepIndex >= 0 && stepIndex < currentIndex;
                    const isCurrent = stepIndex === currentIndex;
                    const showBike = isDelivery && step.id === 'in_delivery';
                    const styleKey = step.id === 'ready' ? 'ready' : step.id;
                    const stepTone = stepStyles[styleKey] || stepStyles.pending;
                    const StepIcon = stepIconById[step.id] || Clock;
                    return (
                      <div
                        key={step.id}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={[
                          'rounded-2xl border px-3 py-2.5 sm:px-3.5 flex items-center gap-2.5 text-xs whitespace-nowrap select-none min-w-[132px]',
                          isCurrent
                            ? `${stepTone.current} ring-2 ring-brand-primary/40 shadow-sm`
                            : isCompleted
                              ? completedStepClass
                              : upcomingStepClass,
                        ].join(' ')}
                      >
                        <span
                          className={`h-8 w-8 rounded-xl border grid place-items-center ${
                            isCurrent
                              ? 'bg-white/80 border-white/70'
                              : isCompleted
                                ? 'bg-white/70 border-slate-200'
                                : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {showBike ? (
                            <Bicycle size={16} weight="duotone" />
                          ) : isCurrent && !isReady ? (
                            <CircleNotch size={16} weight="duotone" className="animate-spin" />
                          ) : (
                            <StepIcon size={16} weight="duotone" />
                          )}
                        </span>
                        <span className="leading-tight">
                          <span className={`block text-[12px] sm:text-sm ${isCurrent ? 'font-extrabold' : 'font-semibold'}`}>
                            {step.label}
                          </span>
                          <span className="block text-[10px] uppercase tracking-[0.14em] opacity-75">
                            {isCurrent ? 'Agora' : isCompleted ? 'Concluido' : 'Proximo'}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-3xl premium-card p-5">
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
                          {item.imageUrl || item.image || item.product?.imageUrl ? (
                            <img
                              src={resolveAssetUrl(item.imageUrl || item.image || item.product?.imageUrl)}
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
                              {formatSelectedModifiers(item?.selectedModifiers || []).map((modifierName) => (
                                <span
                                  key={`${item.id || item.productId}-${modifierName}`}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  + {modifierName}
                                </span>
                              ))}
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
                  {hasDeliveryFee ? (
                    <div className="mt-5 flex items-center justify-between text-xs font-semibold text-slate-600 border-t border-gray-100 pt-4">
                      <span>Frete</span>
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {formatCurrency(order.deliveryFee)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-sm font-semibold text-gray-800">
                    <span>Total</span>
                    <span className="text-base px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </div>
                <div className="rounded-3xl premium-card p-5 space-y-3">
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
                      <>
                        <p>
                          <span className="font-semibold">Cliente paga com:</span>{' '}
                          {formatCurrency(Number(order.cashTendered))}
                        </p>
                        {Number(order.cashTendered) > Number(order.total || 0) ? (
                          <p>
                            <span className="font-semibold">Troco:</span>{' '}
                            {formatCurrency(Number(order.cashTendered) - Number(order.total || 0))}
                          </p>
                        ) : (
                          <p className="text-[12px] text-slate-500 font-semibold">Sem troco</p>
                        )}
                      </>
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
                    {order.type === 'delivery' && formatAddress(order.address || order.deliveryAddress) && (
                      <p className="flex items-start gap-2">
                        <MapPin size={16} weight="duotone" className="text-gray-400 mt-0.5" />
                        <span>{formatAddress(order.address || order.deliveryAddress)}</span>
                      </p>
                    )}
                    {hasDeliveryFee ? (
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">Frete:</span>
                        <span className="text-emerald-700 font-semibold">{formatCurrency(order.deliveryFee)}</span>
                      </p>
                    ) : null}
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
                  {order.type === 'delivery' && storeCoords?.lat && deliveryCoords?.lat && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Rota da entrega</span>
                        {deliveryRoute?.distanceKm ? (
                          <span className="text-xs font-semibold text-emerald-600">
                            {deliveryRoute.distanceKm.toFixed(1)} km
                          </span>
                        ) : null}
                      </div>
                      <GoogleRouteMapView
                        origin={{ lat: Number(storeCoords.lat), lng: Number(storeCoords.lng) }}
                        destination={{ lat: Number(deliveryCoords.lat), lng: Number(deliveryCoords.lng) }}
                        compact
                      />
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Tempo estimado</span>
                        <span className="font-semibold text-slate-800">
                          {deliveryRoute?.durationMin ? `${deliveryRoute.durationMin} min` : routeLoading ? 'Calculando...' : '-'}
                        </span>
                      </div>
                      {deliveryEta && (
                        <div className="text-xs font-semibold text-emerald-700">
                          Previsão de chegada: {deliveryEta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {etaDetails && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>Tempo total estimado</span>
                            <span className="text-slate-900">
                              {etaTotalMinutes ? `~${etaTotalMinutes} min` : '-'}
                            </span>
                          </div>
                          {(etaDetails.prepMinutes !== undefined || etaDetails.queueMinutes !== undefined) && (
                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                              {etaDetails.prepMinutes !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Preparo: {etaDetails.prepMinutes} min
                                </span>
                              )}
                              {etaDetails.queueMinutes !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Fila: {etaDetails.queueMinutes} min
                                </span>
                              )}
                              {etaDetails.travelMinutes !== undefined && etaDetails.travelMinutes !== null && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Rota: {etaDetails.travelMinutes} min
                                </span>
                              )}
                              {etaDetails.bufferMinutes !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Buffer: {etaDetails.bufferMinutes} min
                                </span>
                              )}
                            </div>
                          )}
                          {etaWindowMin && etaWindowMax && (
                            <div className="text-[11px] text-slate-500">
                              Janela prevista: {etaWindowMin}–{etaWindowMax} min
                            </div>
                          )}
                          {trackingLoading && (
                            <div className="text-[11px] text-slate-400">Atualizando ETA...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {order?.items?.length && (
                    <button
                      type="button"
                      onClick={() => {
                        setCtaPulse(true);
                        window.setTimeout(() => setCtaPulse(false), 220);
                        handleRepeatOrder();
                      }}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                      style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
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
                    {estimateMinutes && !isReady && (
                      <p>
                        <span className="font-semibold">Previsão total:</span> ~{estimateMinutes} min
                      </p>
                    )}
                  {etaWindowMin && etaWindowMax && !isReady && (
                    <p>
                      <span className="font-semibold">Janela prevista:</span> {etaWindowMin}–{etaWindowMax} min
                    </p>
                  )}
                  {deliveryFeeValue !== null && (
                    <p>
                      <span className="font-semibold">Frete:</span> {formatCurrency(deliveryFeeValue)}
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
                  {isReady && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Avaliar pedido</p>
                      {reviewLoading ? (
                        <p className="text-xs text-slate-500">Carregando avaliação...</p>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-600 mb-1">Nota da loja</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={`store-${n}`}
                                  type="button"
                                  onClick={() => setReviewForm((prev) => ({ ...prev, storeRating: n }))}
                                  className={`h-8 w-8 rounded-lg border grid place-items-center ${
                                    Number(reviewForm.storeRating || 0) >= n
                                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                                      : 'bg-white border-slate-200 text-slate-400'
                                  }`}
                                  disabled={Boolean(reviewState?.review)}
                                >
                                  <Star size={16} weight={Number(reviewForm.storeRating || 0) >= n ? 'fill' : 'duotone'} />
                                </button>
                              ))}
                            </div>
                          </div>

                          {canRateDelivery && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-1">Nota do entregador</p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={`delivery-${n}`}
                                    type="button"
                                    onClick={() => setReviewForm((prev) => ({ ...prev, deliveryRating: n }))}
                                    className={`h-8 w-8 rounded-lg border grid place-items-center ${
                                      Number(reviewForm.deliveryRating || 0) >= n
                                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                                        : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                    disabled={Boolean(reviewState?.review)}
                                  >
                                    <Star size={16} weight={Number(reviewForm.deliveryRating || 0) >= n ? 'fill' : 'duotone'} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-semibold text-slate-600 mb-1">Pontos da loja</p>
                            <div className="flex flex-wrap gap-1.5">
                              {storeTagOptions.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTag('storeTags', tag)}
                                  disabled={Boolean(reviewState?.review)}
                                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                                    reviewForm.storeTags.includes(tag)
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>

                          {canRateDelivery && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-1">Pontos da entrega</p>
                              <div className="flex flex-wrap gap-1.5">
                                {deliveryTagOptions.map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag('deliveryTags', tag)}
                                    disabled={Boolean(reviewState?.review)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                                      reviewForm.deliveryTags.includes(tag)
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {canRateDelivery && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-1">Gorjeta</p>
                              <div className="flex flex-wrap gap-1.5">
                                {[0, 2, 5, 10].map((value) => (
                                  <button
                                    key={`tip-${value}`}
                                    type="button"
                                    onClick={() => setReviewForm((prev) => ({ ...prev, tipAmount: value }))}
                                    disabled={Boolean(reviewState?.review)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                                      Number(reviewForm.tipAmount || 0) === value
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-white text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {value === 0 ? 'Sem gorjeta' : `R$ ${value}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <textarea
                            rows={3}
                            maxLength={240}
                            value={reviewForm.comment}
                            onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                            placeholder="Conte como foi seu pedido (opcional)"
                            disabled={Boolean(reviewState?.review)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-primary"
                          />

                          {reviewError ? <p className="text-xs text-rose-600 font-semibold">{reviewError}</p> : null}
                          {reviewState?.review ? (
                            <p className="text-xs text-emerald-700 font-semibold">Avaliação registrada. Obrigado!</p>
                          ) : (
                            <button
                              type="button"
                              onClick={submitReview}
                              disabled={reviewSubmitting}
                              className="w-full rounded-xl bg-slate-900 text-white text-xs font-extrabold px-3 py-2 disabled:opacity-60"
                            >
                              {reviewSubmitting ? 'Enviando...' : 'Enviar avaliação'}
                            </button>
                          )}
                        </>
                      )}
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
