// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { usePollingPaymentStatus } from '../hooks/usePollingPaymentStatus';

const statusLabels: Record<string, string> = {
  pending: 'Recebido',
  preparing: 'Em atendimento',
  ready: 'Pronto para retirada',
  ready_for_delivery: 'Pronto para entrega',
  waiting_for_motoboy: 'Aguardando entregador',
  in_delivery: 'Em rota',
  done: 'Pronto',
  delivered: 'Entregue',
  finished: 'Finalizado',
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
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [frozenElapsedMs, setFrozenElapsedMs] = useState<number | null>(null);
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
  const [reviewAccessDenied, setReviewAccessDenied] = useState(false);
  const [orderAccessToken, setOrderAccessToken] = useState('');
  const [tipPixCopied, setTipPixCopied] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    storeRating: 0,
    deliveryRating: 0,
    comment: '',
    storeTags: [] as string[],
    deliveryTags: [] as string[],
    tipAmount: 0,
  });

  useEffect(() => {
    if (!orderId || typeof window === 'undefined') return;
    const params = new URLSearchParams(location.search || '');
    const queryToken = String(params.get('ot') || '').trim();
    const storageKey = `orderAccess:${orderId}`;
    if (queryToken) {
      localStorage.setItem(storageKey, queryToken);
      setOrderAccessToken(queryToken);
      return;
    }
    setOrderAccessToken(String(localStorage.getItem(storageKey) || '').trim());
  }, [orderId, location.search]);

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
        const orderStatus = String(data?.status || '').toLowerCase();
        const deliveryStatus = String((data as any)?.delivery?.status || '').toUpperCase();
        const isTerminal =
          orderStatus === 'done' ||
          orderStatus === 'delivered' ||
          orderStatus === 'finished' ||
          deliveryStatus === 'DELIVERED';
        if (isTerminal) {
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
    let timer: number | undefined;
    const loadTracking = async (silent = false) => {
      if (!silent) setTrackingLoading(true);
      try {
        const data = await orderService.getTrackingV2(orderId);
        if (active) setTrackingV2(data);
      } catch {
        // Silencioso para não quebrar UX do acompanhamento.
      } finally {
        if (!silent && active) setTrackingLoading(false);
      }
    };
    loadTracking(false);
    const orderStatus = String(order?.status || '').toLowerCase();
    const dStatus = String((order as any)?.delivery?.status || '').toUpperCase();
    const terminal =
      orderStatus === 'done' ||
      orderStatus === 'delivered' ||
      orderStatus === 'finished' ||
      dStatus === 'DELIVERED';
    if (polling && !terminal) {
      timer = window.setInterval(() => loadTracking(true), 15000);
    }
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [orderId, polling, order?.status, (order as any)?.delivery?.status]);

  const status = order?.status || 'pending';
  const normalizedOrderType = String(order?.type || '').toLowerCase();
  const isDelivery = normalizedOrderType === 'delivery' || Boolean((order as any)?.delivery);
  const typeLabel = typeLabels[normalizedOrderType] || (isDelivery ? 'Entrega' : 'Pedido');
  const deliveryStatus = String((order as any)?.delivery?.status || '').toUpperCase();
  const motoboyName = String((order as any)?.delivery?.motoboy?.name || '');
  const motoboyFirst = firstName(motoboyName);
  const motoboyProfileImageUrl = resolveAssetUrl(
    (order as any)?.delivery?.motoboy?.profileImageUrl ||
    (order as any)?.delivery?.motoboy?.imageUrl ||
    ''
  );
  const storeName = order?.store?.name || 'Já no Caminho';
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
    resolveAssetUrl(order?.store?.settings?.logoUrl) || '/janocaminho.jpg';
  const statusLabel = useMemo(() => {
    if (isDelivery && (deliveryStatus === 'DELIVERED' || status === 'delivered' || status === 'finished')) return 'Entregue';
    if (isDelivery && (deliveryStatus === 'IN_TRANSIT' || status === 'in_delivery')) return 'Em rota';
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
  const canRateDelivery = Boolean(reviewState?.features?.deliveryFeedbackEnabled ?? reviewState?.isDelivery ?? isDelivery);
  const canUseTipFlow = Boolean(reviewState?.features?.tipEnabled ?? canRateDelivery);
  const storePhone = order?.store?.phone;
  const paymentValue = order?.paymentMethod || order?.payment;
  const paymentMeta = paymentValue ? getPaymentMethodMeta(paymentValue) : null;
  const pixKey =
    order?.store?.settings?.pixKey ||
    order?.pixKey ||
    '';
  const isPixPayment = (paymentValue || '').toString().trim().toLowerCase() === 'pix';
  const paymentStatusNormalized = String(order?.paymentStatus || '').toUpperCase();
  const shouldHidePixPaymentBlockBase =
    isPixPayment &&
    (
      paymentStatusNormalized === 'PAID' ||
      [ 'ready', 'ready_for_delivery', 'done', 'delivered', 'finished' ].includes(status) ||
      isReady
    );
  const isReadyStageForMobileBase =
    [ 'ready', 'ready_for_delivery', 'done', 'delivered', 'finished' ].includes(status) ||
    isReady;
  const hasDeliveryFee =
    order?.deliveryFee !== null && order?.deliveryFee !== undefined && isDelivery;
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
  const hasAnyEtaTotal = Boolean(Number((etaDetails as any)?.totalMinutes) > 0);
  const etaTotalMinutes = etaDetails?.totalMinutes
    ? Number(etaDetails.totalMinutes)
    : null;
  const etaWindowMin = etaDetails?.windowMin ? Number(etaDetails.windowMin) : null;
  const etaWindowMax = etaDetails?.windowMax ? Number(etaDetails.windowMax) : null;
  const estimateMinutes = etaTotalMinutes;
  const deliveryFeeValue = hasDeliveryFee ? Number(order?.deliveryFee || 0) : null;
  const routeDurationMinutes = useMemo(() => {
    const routeDuration = Number(deliveryRoute?.durationMin || 0);
    if (Number.isFinite(routeDuration) && routeDuration > 0) return Math.round(routeDuration);
    const etaTravel = Number((etaDetails as any)?.travelMinutes || 0);
    if (Number.isFinite(etaTravel) && etaTravel > 0) return Math.round(etaTravel);
    const etaMax = Number(etaWindowMax || 0);
    if (Number.isFinite(etaMax) && etaMax > 0) return Math.round(etaMax);
    return null;
  }, [deliveryRoute?.durationMin, (etaDetails as any)?.travelMinutes, etaWindowMax]);
  const routeEtaRemainingMinutes = useMemo(() => {
    if (!isDelivery) return null;
    const deliveryInRoute = deliveryStatus === 'IN_TRANSIT' || status === 'in_delivery';
    if (!deliveryInRoute) return null;
    if (!routeDurationMinutes || routeDurationMinutes <= 0) return null;
    const startCandidates = [
      (order as any)?.delivery?.inTransitAt,
      (order as any)?.delivery?.pickedUpAt,
    ];
    for (const candidate of startCandidates) {
      if (!candidate) continue;
      const parsed = new Date(candidate).getTime();
      if (!Number.isFinite(parsed)) continue;
      const elapsedMin = Math.max(0, (Date.now() - parsed) / 60000);
      return Math.max(0, Math.round(routeDurationMinutes - elapsedMin));
    }
    return Math.max(0, Math.round(routeDurationMinutes));
  }, [isDelivery, deliveryStatus, status, routeDurationMinutes, (order as any)?.delivery?.inTransitAt, (order as any)?.delivery?.pickedUpAt]);
  const isInTransitPhase = isDelivery && (deliveryStatus === 'IN_TRANSIT' || status === 'in_delivery');
  const etaPhaseLabel = isInTransitPhase ? 'Tempo de trajeto' : 'Tempo de preparo';
  const etaForecastLabel = isInTransitPhase ? 'Previsão de chegada' : 'Previsão de entrega';
  const remainingEstimateMinutes = useMemo(() => {
    if (isReady) return null;
    if (routeEtaRemainingMinutes !== null) return routeEtaRemainingMinutes;
    if (!estimateMinutes) return null;
    // ETA já vem calculada pelo backend (trackingV2 ou order.eta); não descontar elapsed no frontend.
    if (hasAnyEtaTotal) return Math.max(0, Math.round(estimateMinutes));
    const elapsedMin = Math.max(0, elapsedMs / 60000);
    return Math.max(0, Math.round(estimateMinutes - elapsedMin));
  }, [isReady, routeEtaRemainingMinutes, estimateMinutes, elapsedMs, hasAnyEtaTotal]);
  const isEstimateDelayed = useMemo(() => {
    if (isReady || !estimateMinutes) return false;
    const elapsedMin = Math.max(0, elapsedMs / 60000);
    return elapsedMin > estimateMinutes + 2 && remainingEstimateMinutes === 0;
  }, [isReady, estimateMinutes, elapsedMs, remainingEstimateMinutes]);
  const estimatedReadyAt = useMemo(() => {
    if (isReady) return null;
    if (remainingEstimateMinutes !== null) {
      return new Date(Date.now() + remainingEstimateMinutes * 60 * 1000);
    }
    if (!estimateMinutes || !order?.createdAt) return null;
    const base = new Date(order.createdAt).getTime();
    if (!Number.isFinite(base)) return null;
    return new Date(base + estimateMinutes * 60 * 1000);
  }, [isReady, remainingEstimateMinutes, estimateMinutes, order?.createdAt]);
  const deliveryEta = useMemo(() => {
    if (!isDelivery || isReady) return null;
    if (routeEtaRemainingMinutes !== null) {
      return new Date(Date.now() + routeEtaRemainingMinutes * 60 * 1000);
    }
    if (remainingEstimateMinutes !== null) {
      return new Date(Date.now() + remainingEstimateMinutes * 60 * 1000);
    }
    return null;
  }, [isDelivery, isReady, routeEtaRemainingMinutes, remainingEstimateMinutes]);
  const storeWhatsappLink = storePhone
    ? `https://wa.me/55${String(storePhone || '').replace(/\D/g, '').replace(/^55/, '')}`
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
  const scrollToBlock = (blockId: string) => {
    if (typeof window === 'undefined') return;
    const block = document.getElementById(blockId);
    if (block) {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!order?.id || !isReady) return;
    let active = true;
    setReviewLoading(true);
    setReviewError('');
    setReviewAccessDenied(false);
    orderService
      .getReviewByOrder(order.id, orderAccessToken)
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
            tipAmount: Number(payload?.features?.tipEnabled ? payload.review.tipAmount || 0 : 0),
          });
        }
      })
      .catch((error: any) => {
        if (!active) return;
        if (Number(error?.status || 0) === 403) {
          setReviewAccessDenied(true);
          setReviewState(null);
          setReviewError('');
          return;
        }
        setReviewError(error?.message || 'Não foi possível carregar avaliação.');
      })
      .finally(() => {
        if (active) setReviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order?.id, isReady, orderAccessToken]);

  const storeTagOptions = ['Sabor', 'Temperatura', 'Embalagem', 'Custo-benefício'];
  const deliveryTagOptions = ['Rápido', 'Educado', 'Pedido intacto', 'Boa comunicação'];
  const reviewTip = reviewState?.review || null;
  const tipStatus = String(reviewTip?.tipStatus || 'NONE').toUpperCase();
  const tipExpiresAtMs = reviewTip?.tipExpiresAt ? new Date(reviewTip.tipExpiresAt).getTime() : null;
  const isTipExpired = Boolean(
    tipExpiresAtMs &&
      Number.isFinite(tipExpiresAtMs) &&
      tipExpiresAtMs <= Date.now() &&
      tipStatus !== 'PAID' &&
      tipStatus !== 'NONE'
  );
  const tipUiStatus = isTipExpired && tipStatus === 'PENDING' ? 'EXPIRED' : tipStatus;
  const tipAmount = Number(reviewTip?.tipAmount || 0);
  const hasTip = canUseTipFlow && tipAmount > 0;
  const canShowTipPayment = hasTip && (reviewTip?.tipQrCodeBase64 || reviewTip?.tipQrCodeText || reviewTip?.tipPaymentLink);
  const tipPollingStatus =
    canShowTipPayment && tipUiStatus !== 'PAID' && tipUiStatus !== 'NONE'
      ? 'PENDING'
      : tipUiStatus;
  const tipStatusLabel =
    tipUiStatus === 'PAID'
      ? 'Pago'
      : tipUiStatus === 'FAILED'
      ? 'Não confirmado'
      : tipUiStatus === 'EXPIRED'
      ? 'Expirado'
      : tipUiStatus === 'PENDING'
      ? 'Pendente'
      : 'Sem gorjeta';
  const tipStatusClass =
    tipUiStatus === 'PAID'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tipUiStatus === 'FAILED' || tipUiStatus === 'EXPIRED'
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : tipUiStatus === 'PENDING'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-500 border-slate-200';

  const refreshReviewStatus = async ({ silent = true }: { silent?: boolean } = {}) => {
    if (!order?.id) return;
    try {
      if (!silent) setReviewLoading(true);
      const payload = await orderService.getReviewByOrder(order.id, orderAccessToken);
      setReviewState(payload || null);
      return String(payload?.review?.tipStatus || '').toUpperCase();
    } catch (error: any) {
      return null;
    } finally {
      if (!silent) setReviewLoading(false);
    }
  };

  const tipPolling = usePollingPaymentStatus({
    id: reviewTip?.id || order?.id,
    enabled: Boolean(order?.id && isReady && canShowTipPayment),
    status: tipPollingStatus,
    intervalMs: 5000,
    timeoutMs: 5 * 60 * 1000,
    checkStatus: async () => {
      const nextStatus = await refreshReviewStatus({ silent: true });
      return nextStatus || tipUiStatus;
    },
  });
  const tipProgressPct = Math.max(0, Math.min(100, (tipPolling.remainingMs / (5 * 60 * 1000)) * 100));
  const showTipPendingUi = tipUiStatus !== 'PAID';

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
        tipAmount: canUseTipFlow ? Number(reviewForm.tipAmount || 0) : 0,
      }, orderAccessToken);
      setReviewState({ ...(reviewState || {}), review: payload });
    } catch (error: any) {
      if (Number(error?.status || 0) === 403) {
        setReviewAccessDenied(true);
        setReviewError('');
        return;
      }
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
    setFrozenElapsedMs(null);
  }, [order?.id]);

  useEffect(() => {
    if (!order?.createdAt) return;
    const start = new Date(order.createdAt).getTime();
    if (!Number.isFinite(start)) return;

    const resolveFinishedAtMs = () => {
      if (!isReady) return null;
      const candidates = [
        (order as any)?.delivery?.deliveredAt,
        (order as any)?.deliveredAt,
        (order as any)?.finishedAt,
        (order as any)?.completedAt,
        (order as any)?.doneAt,
        (order as any)?.delivery?.updatedAt,
        (order as any)?.updatedAt,
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = new Date(candidate).getTime();
        if (Number.isFinite(parsed) && parsed >= start) return parsed;
      }
      return Date.now();
    };

    const update = () => {
      const finishedAt = resolveFinishedAtMs();
      const end = finishedAt ?? Date.now();
      const total = Math.max(0, end - start);
      setElapsedMs(total);
      if (finishedAt !== null) {
        setFrozenElapsedMs(total);
      }
    };

    update();
    if (isReady || frozenElapsedMs !== null) return;
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [order?.createdAt, order?.updatedAt, (order as any)?.delivery?.updatedAt, (order as any)?.delivery?.deliveredAt, isReady, frozenElapsedMs]);

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
    const isDeliveryOrder = isDelivery;
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
  }, [isDelivery, order?.address, order?.id, order?.store?.settings?.address, order?.store?.owner?.address]);

  const steps = useMemo(() => {
    if (isDelivery) {
      return [
        { id: 'pending', label: 'Recebido' },
        { id: 'preparing', label: 'Em atendimento' },
        { id: 'ready', label: 'Aguardando entregador' },
        { id: 'in_delivery', label: 'Em rota' },
        { id: 'delivered', label: 'Entregue' },
      ];
    }
    if (order?.type === 'pickup') {
      return [
        { id: 'pending', label: 'Recebido' },
        { id: 'preparing', label: 'Em atendimento' },
        { id: 'ready', label: 'Pronto para retirada' },
        { id: 'done', label: 'Pago' },
      ];
    }
    return [
      { id: 'pending', label: 'Recebido' },
      { id: 'preparing', label: 'Em atendimento' },
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
    if (status === 'in_delivery') return 'in_delivery';
    if (status === 'delivered' || status === 'finished') return 'delivered';
    return status;
  })();
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === currentStep));
  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;
  const completedStepClass = 'bg-slate-100 text-slate-500 border-slate-200';
  const upcomingStepClass = 'bg-white text-slate-400 border-slate-200 opacity-70';
  const currentStepItem = steps[currentIndex] || steps[0];
  const nextStepItem = currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  const CurrentStepIcon = stepIconById[currentStepItem?.id] || CheckCircle;
  const totalItems = Array.isArray(order?.items)
    ? order.items.reduce((acc: number, item: any) => acc + Number(item?.quantity || 1), 0)
    : 0;
  const itemsToRender = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
        <div className="h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 sm:py-4">
            <button onClick={handleBack} className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-[0_14px_26px_-18px_rgba(239,68,68,0.7)] border border-white bg-white shrink-0">
                <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
              </div>
              <div className="text-left leading-tight min-w-0">
                <p className="text-sm sm:text-lg font-black text-gray-900 truncate">{storeName}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-[0.22em]">Acompanhar pedido</p>
              </div>
            </button>
            <button
              onClick={handleBack}
              className="px-3 py-2 sm:px-4 text-xs sm:text-sm rounded-full border border-slate-200 text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-32 sm:pb-12 sm:py-12">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8">
          {loading && (
            <div className="py-6 space-y-4">
              <div className="ds-skeleton h-24 w-full" />
              <div className="ds-skeleton h-28 w-full" />
              <div className="ds-skeleton h-20 w-full" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {!loading && !error && order && (
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl sm:rounded-3xl premium-card-soft p-5 sm:p-6 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                      Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <h1 className="text-[26px] leading-none sm:text-3xl font-black text-gray-900">{statusLabel}</h1>
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
                    <p className="text-sm text-gray-500 mt-1.5">{typeLabel}</p>

                    {isDelivery && motoboyFirst && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus) ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-800">
                        <div className="flex items-start gap-3">
                          {motoboyProfileImageUrl ? (
                            <img
                              src={motoboyProfileImageUrl}
                              alt={motoboyFirst}
                              className="h-10 w-10 rounded-2xl border border-slate-200 object-cover shrink-0 bg-white"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                              <Bicycle size={18} weight="duotone" />
                            </div>
                          )}
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

                    {(isReady && elapsedMs > 0) || (remainingEstimateMinutes !== null && !isReady) || (etaWindowMin && etaWindowMax && !isReady) || (estimatedReadyAt && !isReady) || isEstimateDelayed ? (
                      <div className="mt-3 space-y-1.5">
                        {isReady && elapsedMs > 0 && (
                          <div className="inline-flex items-center gap-2 text-xs text-slate-700">
                            <Clock size={13} weight="duotone" className="text-slate-400" />
                            <span className="font-medium">Tempo total: {formatDuration(elapsedMs)}</span>
                          </div>
                        )}
                        {remainingEstimateMinutes !== null && !isReady && (
                          <div className="inline-flex items-center gap-2 text-xs text-slate-700">
                            <Clock size={13} weight="duotone" className="text-slate-400" />
                            <span className="font-medium">{etaPhaseLabel} restante: ~{remainingEstimateMinutes} min</span>
                          </div>
                        )}
                        {etaWindowMin && etaWindowMax && !isReady && (
                          <div className="inline-flex items-center gap-2 text-xs text-slate-700">
                            <Clock size={13} weight="duotone" className="text-slate-400" />
                            <span className="font-medium">Janela prevista: {etaWindowMin}–{etaWindowMax} min</span>
                          </div>
                        )}
                        {estimatedReadyAt && !isReady && (
                          <div className="inline-flex items-center gap-2 text-xs text-slate-700">
                            <Clock size={13} weight="duotone" className="text-slate-400" />
                            <span className="font-medium">
                              {etaForecastLabel}: {estimatedReadyAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {isEstimateDelayed && (
                          <div className="inline-flex items-center gap-2 text-xs text-slate-600">
                            <Clock size={13} weight="duotone" className="text-slate-400" />
                            <span className="font-medium">Pedido em atraso. Atualizando automaticamente.</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <Clock size={16} weight="duotone" />
                    {order.createdAt ? formatDateTime(order.createdAt) : 'Agora'}
                    {elapsedMs > 0 && (
                      <span className="hidden sm:inline-flex ml-2 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Tempo corrido: {formatDuration(elapsedMs)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isReady && !reviewState?.review && !reviewAccessDenied && (
                <div className="sm:hidden rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-800">Pedido finalizado. Falta sua avaliação.</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Role até a seção <span className="font-bold">Avaliar pedido</span> para avaliar e
                    {canUseTipFlow ? ' deixar gorjeta para o entregador.' : ' concluir sua avaliação.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => scrollToBlock('order-review-section')}
                    className="mt-2 inline-flex items-center rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Avaliar agora
                  </button>
                </div>
              )}

              <div id="order-status-section" className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                <div className="flex items-center gap-3 mb-4">
                  <ChefHat className="text-red-500" weight="duotone" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Acompanhe seu pedido</p>
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
                <div className="sm:hidden space-y-2 py-1 pb-2">
                  <div className="rounded-2xl border border-brand-primary/25 bg-brand-primary-soft px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brand-primary/80 font-bold">Etapa atual</p>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <span className="h-8 w-8 rounded-xl border border-brand-primary/20 bg-white grid place-items-center text-brand-primary">
                        {isDelivery && currentStepItem?.id === 'in_delivery' ? (
                          <Bicycle size={16} weight="duotone" />
                        ) : !isReady ? (
                          <CircleNotch size={16} weight="duotone" className="animate-spin" />
                        ) : (
                          <CurrentStepIcon size={16} weight="duotone" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          {isReadyStageForMobileBase || progress >= 100 ? 'Pronto para Retirada' : (currentStepItem?.label || statusLabel)}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {isReadyStageForMobileBase || progress >= 100 ? 'Status finalizado' : 'Atualizando automaticamente'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isReady && nextStepItem ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">Próximo passo</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{nextStepItem.label}</p>
                    </div>
                  ) : null}

                  {!isReady ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold">Linha do pedido</p>
                      <div className="relative mt-2 pl-0.5">
                        <span className="pointer-events-none absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
                        <div className="space-y-2">
                        {steps.map((step) => {
                          const stepIndex = steps.findIndex((item) => item.id === step.id);
                          const isCompleted = stepIndex >= 0 && stepIndex < currentIndex;
                          const isCurrent = stepIndex === currentIndex;
                          return (
                            <div key={`mobile-line-${step.id}`} className="relative z-[1] flex items-center gap-2">
                              <span
                                className={`h-5 w-5 rounded-full border grid place-items-center ${
                                  isCurrent
                                    ? 'border-brand-primary bg-brand-primary text-white'
                                    : isCompleted
                                      ? 'border-slate-300 bg-slate-200 text-slate-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-400'
                                }`}
                              >
                                {isCompleted ? <CheckCircle size={12} weight="fill" /> : <span className="text-[9px] font-bold">{stepIndex + 1}</span>}
                              </span>
                              <span className={`text-[12px] ${isCurrent ? 'font-extrabold text-brand-primary' : isCompleted ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="hidden sm:flex flex-nowrap gap-2 sm:gap-3 overflow-x-auto overflow-y-visible no-scrollbar py-1 pb-2">
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
                            {isCurrent ? 'Agora' : isCompleted ? 'Concluído' : 'Próximo'}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div
                  id="order-items-section"
                  className="rounded-3xl premium-card p-6"
                >
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
                    {itemsToRender.map((item) => (
                      <div key={item.id || item.productId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.imageUrl || item.image || item.product?.imageUrl ? (
                            <img
                              src={resolveAssetUrl(item.imageUrl || item.image || item.product?.imageUrl)}
                              alt={item.name}
                              className="w-11 h-11 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                              🍖
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-800 break-words">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 mr-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                                {item.quantity}x
                              </span>
                              {item.name}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item?.cookingPoint && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.cookingPoint}
                                </span>
                              )}
                              {item?.passSkewer && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  passar farinha
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
                          <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-[11px] line-through text-gray-400">
                              {formatCurrency(Number(item.originalPrice) * (item.quantity || 1))}
                            </span>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(Number(item.price))}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-800 flex-shrink-0">R$ {Number(item.price).toFixed(2)}</span>
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
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </div>
                <div id="order-info-section" className="rounded-3xl premium-card p-6 space-y-3">
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
                    {isDelivery && formatAddress(order.address || order.deliveryAddress) && (
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
                    {isPixPayment ? (
                      shouldHidePixPaymentBlockBase || progress >= 100 ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                            Pagamento confirmado
                          </span>
                        </div>
                      ) : (
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
                                {pixCopied ? 'Copiado!' : 'Copiar código Pix'}
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-slate-500">
                              A chave Pix da loja ainda não foi cadastrada.
                            </div>
                          )}
                        </div>
                      )
                    ) : null}
                  {storeWhatsappLink && (
                    <div className="flex flex-col gap-2">
                      {storeWhatsappLink && (
                        <a
                          href={storeWhatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full min-h-[48px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50"
                        >
                          Falar com a loja no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {isDelivery && storeCoords?.lat && deliveryCoords?.lat && (
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
                        <span>Tempo de trajeto</span>
                        <span className="font-semibold text-slate-800">
                          {routeDurationMinutes !== null ? `${routeDurationMinutes} min` : routeLoading ? 'Calculando...' : '-'}
                        </span>
                      </div>
                      {deliveryEta && (
                        <div className="text-xs font-semibold text-emerald-700">
                          {etaForecastLabel}: {deliveryEta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {etaDetails && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>{isInTransitPhase ? 'Tempo de trajeto estimado' : 'Tempo de preparo estimado'}</span>
                            <span className="text-slate-900">
                              {etaTotalMinutes ? `~${etaTotalMinutes} min` : '-'}
                            </span>
                          </div>
                          {(etaDetails.prepMinutes !== undefined || etaDetails.queueMinutes !== undefined) && (
                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                              {etaDetails.prepMinutes !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Tempo de preparo: {etaDetails.prepMinutes} min
                                </span>
                              )}
                              {etaDetails.queueMinutes !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Fila: {etaDetails.queueMinutes} min
                                </span>
                              )}
                              {etaDetails.travelMinutes !== undefined && etaDetails.travelMinutes !== null && (
                                <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                                  Tempo de trajeto: {etaDetails.travelMinutes} min
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
                      className="w-full min-h-[48px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
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
                    {remainingEstimateMinutes !== null && !isReady && (
                      <p>
                        <span className="font-semibold">{etaPhaseLabel} restante:</span> ~{remainingEstimateMinutes} min
                      </p>
                    )}
                    {isEstimateDelayed && (
                      <p>
                        <span className="font-semibold">Status da previsão:</span> Em atraso (acompanhamento em tempo real)
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
                  {isReady && !isDelivery && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                      {order?.type === 'table'
                        ? 'Seu pedido está pronto. Aguarde o atendimento na sua mesa.'
                        : 'Seu pedido está pronto! Pode ir retirar. Bom apetite!'}
                    </div>
                  )}
                  {isReady && (
                    <div id="order-review-section" className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Avaliar pedido</p>
                      {reviewAccessDenied ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          Avaliação disponível somente no dispositivo em que o pedido foi criado.
                        </div>
                      ) : null}
                      {reviewLoading ? (
                        <p className="text-xs text-slate-500">Carregando avaliação...</p>
                      ) : reviewAccessDenied ? null : (
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

                          {canUseTipFlow && (
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
                            <div className="space-y-2">
                              <p className="text-xs text-emerald-700 font-semibold">Avaliação registrada. Obrigado!</p>
                              {canShowTipPayment ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-700">
                                      Gorjeta: {formatCurrency(tipAmount)}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${tipStatusClass}`}>
                                      {tipStatusLabel}
                                    </span>
                                  </div>
                                  {showTipPendingUi && reviewTip?.tipQrCodeBase64 ? (
                                    <div className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5)] px-3 py-2.5 shadow-[0_12px_26px_-22px_rgba(234,88,12,0.9)]">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700">Tempo limite para pagar a gorjeta</p>
                                      <div className="mt-1.5 flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-semibold text-amber-900">Você tem até o fim do contador</p>
                                        <span className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-black text-white animate-pulse">
                                          {tipPolling.remainingLabel}
                                        </span>
                                      </div>
                                    </div>
                                  ) : null}
                                  {reviewTip?.tipQrCodeBase64 ? (
                                    <div className="flex items-center justify-center">
                                      <img
                                        src={reviewTip.tipQrCodeBase64}
                                        alt="QR Code da gorjeta"
                                        className="w-40 h-40 rounded-xl bg-white border border-slate-200 object-contain"
                                      />
                                    </div>
                                  ) : null}
                                  {reviewTip?.tipQrCodeText ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(String(reviewTip.tipQrCodeText || ''));
                                          setTipPixCopied(true);
                                          window.setTimeout(() => setTipPixCopied(false), 2000);
                                        } catch (error) {
                                          console.error('Falha ao copiar PIX da gorjeta', error);
                                        }
                                      }}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      {tipPixCopied ? 'Copiado!' : 'Copiar Pix da gorjeta'}
                                    </button>
                                  ) : null}
                                  {reviewTip?.tipPaymentLink ? (
                                    <a
                                      href={String(reviewTip.tipPaymentLink)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Abrir link de pagamento
                                    </a>
                                  ) : null}
                                  {tipUiStatus === 'PAID' ? (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                      <p className="font-semibold">Pagamento confirmado. Obrigado!</p>
                                    </div>
                                  ) : showTipPendingUi ? (
                                    <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white px-3 py-2 space-y-2 shadow-[0_10px_24px_-22px_rgba(234,88,12,0.85)]">
                                      <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/80 px-2.5 py-2">
                                        <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-[0.2em]">Tempo restante</span>
                                        <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-black text-white animate-pulse">
                                          {tipPolling.remainingLabel}
                                        </span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-700"
                                          style={{ width: `${tipProgressPct}%` }}
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-700">
                                        <CircleNotch
                                          size={14}
                                          weight="bold"
                                          className={tipPolling.isChecking || tipPolling.isPolling ? 'animate-spin text-sky-600' : 'text-slate-400'}
                                        />
                                        <span className="font-semibold">
                                          {tipUiStatus === 'PENDING'
                                            ? 'Aguardando confirmação do pagamento via Pix. Isso pode levar alguns segundos.'
                                            : 'Não conseguimos confirmar ainda. Você pode tentar novamente.'}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 space-y-1">
                                        <p>{tipPolling.isChecking ? 'Verificando...' : 'Monitoramento automático ativo.'}</p>
                                        {tipPolling.connectionUnstable ? (
                                          <p className="text-amber-700">Conexão instável, tentando novamente.</p>
                                        ) : null}
                                        {tipPolling.lastCheckedAgoSec !== null ? (
                                          <p>Última verificação há {tipPolling.lastCheckedAgoSec}s</p>
                                        ) : null}
                                        {tipPolling.timedOut ? (
                                          <p>Tempo de verificação automática finalizado. Você pode verificar novamente agora.</p>
                                        ) : null}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={tipPolling.verifyNow}
                                        disabled={tipPolling.isChecking}
                                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                                      >
                                        {tipPolling.isChecking ? 'Verificando...' : 'Já paguei, verificar agora'}
                                      </button>
                                    </div>
                                  ) : null}
                                  {tipUiStatus === 'PAID' && reviewTip?.tipPaidAt ? (
                                    <p className="text-[11px] text-emerald-700 font-semibold">
                                      Confirmado em {new Date(reviewTip.tipPaidAt).toLocaleString('pt-BR')}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
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

      {!loading && !error && order ? (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur px-4 py-2.5 shadow-[0_-2px_24px_-16px_rgba(15,23,42,0.7)]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200">
                <span className={`h-1.5 w-1.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-brand-primary'}`} />
                {statusLabel}
              </span>
              <span className="text-base font-black text-slate-900">{formatCurrency(order?.total || 0)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



