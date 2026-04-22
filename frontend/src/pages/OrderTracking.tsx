// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bicycle, CheckCircle, Clock, CircleNotch, CreditCard, MapPin, Package, Phone, SealCheck, Star, User } from '@phosphor-icons/react';
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
  awaiting_payment: 'Aguardando pagamento',
  pending: 'Pedido Recebido',
  preparing: 'Em Preparação',
  ready: 'Pronto para retirada',
  ready_for_pickup: 'Pronto para retirada',
  ready_for_delivery: 'Pronto para entrega',
  waiting_for_motoboy: 'Aguardando entregador',
  in_delivery: 'Em rota',
  dispatched: 'Despachado',
  done: 'Pronto',
  paid: 'Pago',
  delivered: 'Entregue',
  finished: 'Finalizado',
};

const typeLabels: Record<string, string> = {
  delivery: 'Entrega',
  pickup: 'Retirar',
  table: 'Comer no local',
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

const addBusinessDays = (startDate: Date, businessDays: number) => {
  const result = new Date(startDate);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
};

export function OrderTracking() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNativePlatform = Capacitor.isNativePlatform();
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
  const mobileStatusDockBottom = isNativePlatform
    ? 'calc(env(safe-area-inset-bottom) + 5.25rem)'
    : '0.75rem';

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
          orderStatus === 'cancelled' ||
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
      orderStatus === 'cancelled' ||
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
  const normalizedStatus = String(status || '').toLowerCase().trim();
  const normalizedOrderType = String(order?.type || '').toLowerCase();
  const condominiumOrder = (order as any)?.condominiumOrder || ((order as any)?.condominiumId ? {
    condominiumName: (order as any)?.condominiumName,
    fulfillmentMode: (order as any)?.condominiumFulfillmentMode,
    unit: (order as any)?.condominiumUnit,
  } : null);
  const isCondominiumOrder = Boolean(condominiumOrder?.condominiumName || (order as any)?.condominiumName);
  const condominiumUnit = condominiumOrder?.unit || (order as any)?.condominiumUnit || {};
  const condominiumFulfillment = String(condominiumOrder?.fulfillmentMode || (order as any)?.condominiumFulfillmentMode || '').toLowerCase();
  const condominiumFulfillmentLabel =
    condominiumFulfillment === 'apartment_delivery' || condominiumFulfillment === 'condominium_apartment'
      ? 'Entrega no apartamento'
      : 'Retirada na barraca';
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
    resolveAssetUrl(order?.store?.settings?.logoUrl) || '/janocaminho-logo.png';
  const isPostalDelivery = isDelivery && String((order as any)?.fulfillmentMode || '').toLowerCase() === 'postal';
  const statusLabel = useMemo(() => {
    if (normalizedStatus === 'cancelled') return 'Cancelado';
    if (isPostalDelivery && (normalizedStatus === 'delivered' || normalizedStatus === 'finished')) return 'Entregue';
    if (isPostalDelivery && (normalizedStatus === 'dispatched' || normalizedStatus === 'waiting_for_motoboy' || normalizedStatus === 'in_delivery')) return 'Despachado';
    if (isPostalDelivery && (normalizedStatus === 'ready' || normalizedStatus === 'ready_for_delivery')) return 'Pronto para postagem';
    if (isDelivery && (deliveryStatus === 'DELIVERED' || normalizedStatus === 'delivered' || normalizedStatus === 'finished')) return 'Entregue';
    if (isDelivery && (deliveryStatus === 'IN_TRANSIT' || normalizedStatus === 'in_delivery')) return 'Em rota';
    if (isDelivery && deliveryStatus === 'ACCEPTED') return 'Entregador a caminho';
    if (isDelivery && deliveryStatus === 'PICKED_UP') return 'Pedido retirado';
    if (isDelivery && normalizedStatus === 'dispatched') return 'Despachado';
    if (isDelivery && normalizedStatus === 'waiting_for_motoboy') return 'Aguardando entregador';
    if (isDelivery && normalizedStatus === 'ready_for_delivery') return 'Pronto para entrega';
    if (isDelivery && normalizedStatus === 'ready') return 'Aguardando entregador';
    // Legacy delivery orders that still use "done".
    if (isDelivery && normalizedStatus === 'done') return 'Entregue';
    if (order?.type === 'table' && normalizedStatus === 'done') return 'Pedido Pronto';
    if (order?.type === 'pickup' && (normalizedStatus === 'ready' || normalizedStatus === 'ready_for_pickup')) return 'Pronto para retirada';
    return statusLabels[normalizedStatus] || statusLabels[status] || status;
  }, [isDelivery, isPostalDelivery, order?.type, status, normalizedStatus, (order as any)?.delivery?.status]);
  const isCancelled = normalizedStatus === 'cancelled';
  const isReady =
    status === 'done' ||
    status === 'delivered' ||
    status === 'finished' ||
    String((order as any)?.delivery?.status || '').toUpperCase() === 'DELIVERED';
  const isTerminal = isReady || isCancelled;
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
  const showMercadoPagoApproved = paymentStatusNormalized === 'PAID';
  const shouldHidePixPaymentBlockBase =
    isPixPayment &&
    (
      paymentStatusNormalized === 'PAID' ||
      [ 'ready', 'ready_for_delivery', 'done', 'delivered', 'finished' ].includes(status) ||
      isReady
    );
  const hasDeliveryFee =
    order?.deliveryFee !== null && order?.deliveryFee !== undefined && isDelivery;
  const shipment = (order as any)?.shipment || (trackingV2 as any)?.shipment || null;
  const shipmentServiceCode = String(shipment?.serviceCode || '').trim().toUpperCase();
  const shipmentServiceName = String(shipment?.serviceName || '').trim();
  const shipmentTrackingCode = String(shipment?.trackingCode || '').trim();
  const shipmentTrackingUrl = String(shipment?.trackingUrl || '').trim();
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
  const postalEstimatedDays = useMemo(() => {
    if (!isPostalDelivery) return null;
    const explicitCandidates = [
      Number((trackingV2 as any)?.shipment?.estimatedDays || 0),
      Number((shipment as any)?.estimatedDays || 0),
      Number((shipment as any)?.quotePayload?.estimatedDays || 0),
    ].filter((value) => Number.isFinite(value) && value > 0);
    if (explicitCandidates.length) return Math.ceil(explicitCandidates[0]);

    if (shipmentServiceCode.includes('SEDEX') || shipmentServiceName.toUpperCase().includes('SEDEX')) {
      return 4;
    }
    if (shipmentServiceCode.includes('PAC') || shipmentServiceName.toUpperCase().includes('PAC')) {
      return 8;
    }
    return null;
  }, [isPostalDelivery, trackingV2, shipment, shipmentServiceCode, shipmentServiceName]);
  const postalPostedAtMs = shipment?.postedAt ? new Date(shipment.postedAt).getTime() : null;
  const postalBaseMs = postalPostedAtMs && Number.isFinite(postalPostedAtMs)
    ? postalPostedAtMs
    : order?.createdAt;
  const postalExpectedDeliveryDate = useMemo(() => {
    if (!isPostalDelivery || !postalEstimatedDays || !postalBaseMs) return null;
    const start = new Date(postalBaseMs);
    if (!Number.isFinite(start.getTime())) return null;
    return addBusinessDays(start, postalEstimatedDays);
  }, [isPostalDelivery, postalEstimatedDays, postalBaseMs]);
  const postalRemainingDays = useMemo(() => {
    if (!isPostalDelivery || isReady || !postalExpectedDeliveryDate) return null;
    const diffMs = postalExpectedDeliveryDate.getTime() - Date.now();
    if (!Number.isFinite(diffMs)) return null;
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  }, [isPostalDelivery, isReady, postalExpectedDeliveryDate]);
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
    if (!isDelivery || isPostalDelivery) return null;
    const deliveryInRoute =
      deliveryStatus === 'IN_TRANSIT' ||
      status === 'in_delivery';
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
  }, [isDelivery, isPostalDelivery, deliveryStatus, status, routeDurationMinutes, (order as any)?.delivery?.inTransitAt, (order as any)?.delivery?.pickedUpAt]);
  const isInTransitPhase =
    isDelivery &&
    !isPostalDelivery &&
    (deliveryStatus === 'IN_TRANSIT' || status === 'in_delivery');
  const etaPhaseLabel = isPostalDelivery ? 'Prazo de entrega' : (isInTransitPhase ? 'Tempo de trajeto' : 'Tempo de preparo');
  const etaForecastLabel = isPostalDelivery
    ? 'Previsão dos Correios'
    : isDelivery
    ? (isInTransitPhase ? 'Previsão de chegada' : 'Previsão de entrega')
    : 'Previsão de preparo';
  const etaForecastPrefix = isPostalDelivery ? 'Entrega estimada até' : isDelivery ? 'Chega por volta de' : 'Pronto por volta de';
  const remainingEstimateMinutes = useMemo(() => {
    if (isPostalDelivery) return null;
    if (isReady) return null;
    if (routeEtaRemainingMinutes !== null) return routeEtaRemainingMinutes;
    if (!estimateMinutes) return null;
    // ETA já vem calculada pelo backend (trackingV2 ou order.eta); não descontar elapsed no frontend.
    if (hasAnyEtaTotal) return Math.max(0, Math.round(estimateMinutes));
    const elapsedMin = Math.max(0, elapsedMs / 60000);
    return Math.max(0, Math.round(estimateMinutes - elapsedMin));
  }, [isPostalDelivery, isReady, routeEtaRemainingMinutes, estimateMinutes, elapsedMs, hasAnyEtaTotal]);
  const isEstimateDelayed = useMemo(() => {
    if (isPostalDelivery) {
      if (isReady || !postalExpectedDeliveryDate) return false;
      return Date.now() > postalExpectedDeliveryDate.getTime();
    }
    if (isReady || !estimateMinutes) return false;
    const elapsedMin = Math.max(0, elapsedMs / 60000);
    return elapsedMin > estimateMinutes + 2 && remainingEstimateMinutes === 0;
  }, [isPostalDelivery, isReady, estimateMinutes, elapsedMs, remainingEstimateMinutes, postalExpectedDeliveryDate]);
  const estimatedReadyAt = useMemo(() => {
    if (isReady) return null;
    if (isPostalDelivery) return postalExpectedDeliveryDate;
    if (remainingEstimateMinutes !== null) {
      return new Date(Date.now() + remainingEstimateMinutes * 60 * 1000);
    }
    if (!estimateMinutes || !order?.createdAt) return null;
    const base = new Date(order.createdAt).getTime();
    if (!Number.isFinite(base)) return null;
    return new Date(base + estimateMinutes * 60 * 1000);
  }, [isReady, isPostalDelivery, postalExpectedDeliveryDate, remainingEstimateMinutes, estimateMinutes, order?.createdAt]);
  const deliveryEta = useMemo(() => {
    if (!isDelivery || isReady) return null;
    if (isPostalDelivery) return postalExpectedDeliveryDate;
    if (routeEtaRemainingMinutes !== null) {
      return new Date(Date.now() + routeEtaRemainingMinutes * 60 * 1000);
    }
    if (remainingEstimateMinutes !== null) {
      return new Date(Date.now() + remainingEstimateMinutes * 60 * 1000);
    }
    return null;
  }, [isDelivery, isReady, isPostalDelivery, postalExpectedDeliveryDate, routeEtaRemainingMinutes, remainingEstimateMinutes]);
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
    if (normalizedStatus === 'cancelled') {
      return [
        { id: 'pending', label: 'Pedido Recebido' },
        { id: 'cancelled', label: 'Pedido Cancelado' },
      ];
    }
    if (isDelivery) {
      if (isPostalDelivery) {
        return [
          { id: 'pending', label: 'Pedido Recebido' },
          { id: 'preparing', label: 'Em Preparação' },
          { id: 'ready', label: 'Pronto para postagem' },
          { id: 'in_delivery', label: 'Despachado' },
          { id: 'delivered', label: 'Entregue' },
        ];
      }
      return [
        { id: 'pending', label: 'Pedido Recebido' },
        { id: 'preparing', label: 'Em Preparação' },
        { id: 'ready', label: 'Aguardando entregador' },
        { id: 'in_delivery', label: 'Em rota' },
        { id: 'delivered', label: 'Entregue' },
      ];
    }
    if (order?.type === 'pickup') {
      return [
        { id: 'pending', label: 'Pedido Recebido' },
        { id: 'preparing', label: 'Em Preparação' },
        { id: 'ready', label: 'Pronto para retirada' },
        { id: 'done', label: 'Pago' },
      ];
    }
    return [
      { id: 'pending', label: 'Pedido Recebido' },
      { id: 'preparing', label: 'Em Preparação' },
      { id: 'done', label: order?.type === 'table' ? 'Pedido Pronto' : 'Pronto' },
    ];
  }, [isDelivery, isPostalDelivery, order?.type, normalizedStatus]);
  const currentStep = (() => {
    if (normalizedStatus === 'cancelled') return 'cancelled';
    if (!isDelivery) {
      const st = normalizedStatus;
      const known = new Set(steps.map((item) => item.id));
      if (known.has(st)) return st;
      if (order?.type === 'pickup') {
        if ([ 'ready_for_pickup', 'ready_for_delivery', 'waiting_for_motoboy', 'ready' ].includes(st)) return 'ready';
        if ([ 'paid', 'done', 'finished', 'delivered' ].includes(st)) return 'done';
      }
      if (order?.type === 'table') {
        if ([ 'ready', 'ready_for_pickup', 'paid', 'done', 'finished' ].includes(st)) return 'done';
      }
      if (st.includes('prepar')) return 'preparing';
      if (st.includes('pend')) return 'pending';
      return steps[0]?.id || 'pending';
    }
    const deliveryStatus = String((order as any)?.delivery?.status || '').toUpperCase();
    if (isPostalDelivery) {
      if (normalizedStatus === 'delivered' || normalizedStatus === 'finished') return 'delivered';
      if (normalizedStatus === 'dispatched' || normalizedStatus === 'waiting_for_motoboy' || normalizedStatus === 'in_delivery') return 'in_delivery';
      if (normalizedStatus === 'ready_for_delivery' || normalizedStatus === 'ready') return 'ready';
      if (normalizedStatus === 'preparing') return 'preparing';
      return 'pending';
    }
    if (deliveryStatus === 'DELIVERED') return 'delivered';
    if (deliveryStatus === 'IN_TRANSIT') return 'in_delivery';
    if (deliveryStatus === 'ACCEPTED' || deliveryStatus === 'PICKED_UP') return 'ready';
    if (normalizedStatus === 'ready_for_delivery' || normalizedStatus === 'waiting_for_motoboy' || normalizedStatus === 'ready') return 'ready';
    if (normalizedStatus === 'in_delivery') return 'in_delivery';
    if (normalizedStatus === 'delivered' || normalizedStatus === 'finished') return 'delivered';
    return normalizedStatus || status;
  })();
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === currentStep));
  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;
  const itemsToRender = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="min-h-screen bg-[#EEF2F7] pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none fixed top-[-12%] right-[-8%] h-[42%] w-[50%] rounded-full bg-[#153A4C]/14 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[10%] left-[-6%] h-[28%] w-[36%] rounded-full bg-[#336886]/8 blur-[100px] -z-10" />
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-[#EEF2F7]/95 backdrop-blur-xl shadow-[0_8px_28px_-20px_rgba(15,23,42,0.18)]">
        {/* Barra de progresso dinâmica do pedido */}
        <div className="h-[2.5px] w-full bg-slate-100 overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%`, background: isCancelled ? '#f43f5e' : 'linear-gradient(90deg,#336886,#10b981)' }}
          />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3 sm:py-3.5">
            {/* Store identity — also back button */}
            <button onClick={handleBack} className="flex min-w-0 items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[0.75rem] border border-white bg-white shadow-[0_8px_18px_-10px_rgba(51,104,134,0.35)]">
                <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 text-left leading-tight">
                <p className="truncate text-[13px] font-black text-slate-900 sm:text-[15px]">{storeName}</p>
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <img src="/janocaminho.jpg" alt="" className="h-[10px] w-[10px] rounded-[0.2rem] object-cover" />
                  Já no Caminho
                </p>
              </div>
            </button>
            {/* Voltar */}
            <button
              onClick={handleBack}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            >
              <ArrowLeft size={13} weight="bold" />
              Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-32 sm:pb-10 sm:py-6">
        <div>
          {loading && (
            <div className="space-y-3 py-4">
              <div className="ds-skeleton h-28 w-full rounded-3xl" />
              <div className="ds-skeleton h-32 w-full rounded-3xl" />
              <div className="ds-skeleton h-24 w-full rounded-3xl" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && order && (
            <div className="space-y-3 sm:space-y-4">
              <div className={`relative overflow-hidden rounded-[1.65rem] border p-5 sm:p-6 ${
                isCancelled
                  ? 'border-rose-100 bg-[linear-gradient(145deg,#fff5f5,#fff)]'
                  : isReady
                  ? 'border-emerald-100 bg-[linear-gradient(145deg,#f0fdf4,#fff)]'
                  : 'border-[#336886]/10 bg-[linear-gradient(145deg,rgba(51,104,134,0.05),#fff)]'
              }`}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl opacity-40" style={{ background: isCancelled ? '#fecdd3' : isReady ? '#bbf7d0' : '#bfdbfe' }} />
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 shadow-sm">
                      Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                    </p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <h1 className="text-[1.65rem] leading-none sm:text-3xl font-black text-slate-900">{statusLabel}</h1>
                      {isDelivery && (
                        String((order as any)?.delivery?.status || '').toUpperCase() === 'IN_TRANSIT' ||
                        status === 'in_delivery' ||
                        (isPostalDelivery && normalizedStatus === 'dispatched')
                      ) && (
                        <span
                          className="inline-flex items-center rounded-full bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1"
                          title="Saiu para entrega"
                          aria-label="Saiu para entrega"
                        >
                        {isPostalDelivery ? <Package size={14} weight="duotone" /> : <Bicycle size={14} weight="duotone" />}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : isReady
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-orange-50 text-orange-600 border-orange-200'
                        }`}
                      >
                      {isCancelled ? 'Cancelado' : isReady ? 'Finalizado' : 'Em andamento'}
                    </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1.5">{typeLabel}</p>
                    {isCancelled && order?.canceledReason ? (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Motivo do cancelamento</p>
                        <p className="mt-1 text-sm text-rose-900">{order.canceledReason}</p>
                      </div>
                    ) : null}

                    {estimatedReadyAt && !isTerminal ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 font-semibold">{etaForecastLabel}</p>
                        <p className="mt-1 text-xl font-extrabold text-slate-900">
                          {etaForecastPrefix}{' '}
                          {isPostalDelivery
                            ? estimatedReadyAt.toLocaleDateString('pt-BR')
                            : estimatedReadyAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isPostalDelivery ? (
                          <p className="mt-1 text-xs text-slate-600">
                            {shipmentServiceName || shipmentServiceCode || 'Serviço postal'}{postalEstimatedDays ? ` • ${postalEstimatedDays} dia(s) úteis` : ''}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {isDelivery && !isPostalDelivery && motoboyFirst && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus) ? (
                      <div className="mt-3 rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                        <div className="flex items-start gap-3">
                          {motoboyProfileImageUrl ? (
                            <img
                              src={motoboyProfileImageUrl}
                              alt={motoboyFirst}
                              className="h-10 w-10 rounded-2xl border border-slate-200 object-cover shrink-0 bg-white"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 shrink-0">
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

              <div id="order-status-section" className="rounded-2xl border border-slate-100 p-5 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="mb-4">
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundImage:
                          'linear-gradient(90deg, #f97316, #ea580c)',
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{progress}% completo</div>
                </div>
                {(isReady && elapsedMs > 0) ||
                (remainingEstimateMinutes !== null && !isTerminal) ||
                (!isPostalDelivery && etaWindowMin && etaWindowMax && !isTerminal) ||
                (isPostalDelivery && !isTerminal && (postalRemainingDays !== null || Boolean(postalExpectedDeliveryDate))) ||
                isEstimateDelayed ? (
                  <div className="mb-4 space-y-1.5">
                    {isReady && elapsedMs > 0 && (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={13} weight="duotone" className="text-slate-400" />
                        <span className="font-medium">Tempo total: {formatDuration(elapsedMs)}</span>
                      </div>
                    )}
                    {isPostalDelivery && !isReady && postalRemainingDays !== null && (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={13} weight="duotone" className="text-slate-400" />
                        <span className="font-medium">Prazo restante: ~{postalRemainingDays} dia(s)</span>
                      </div>
                    )}
                    {remainingEstimateMinutes !== null && !isReady && (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={13} weight="duotone" className="text-slate-400" />
                        <span className="font-medium">{etaPhaseLabel} restante: ~{remainingEstimateMinutes} min</span>
                      </div>
                    )}
                    {!isPostalDelivery && etaWindowMin && etaWindowMax && !isReady && (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={13} weight="duotone" className="text-slate-400" />
                        <span className="font-medium">Janela prevista: {etaWindowMin}–{etaWindowMax} min</span>
                      </div>
                    )}
                    {isEstimateDelayed && (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={13} weight="duotone" className="text-slate-400" />
                        <span className="font-medium">Pedido em atraso. Atualizando automaticamente.</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.08)]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Linha do pedido</p>
                  <div className="relative pl-1">
                    {/* Trilho de fundo */}
                    <span className="pointer-events-none absolute left-[10px] top-3 bottom-3 w-[2px] rounded-full bg-slate-100" />
                    {/* Trilho preenchido (concluído) */}
                    {currentIndex > 0 && (
                      <span
                        className="pointer-events-none absolute left-[10px] top-3 w-[2px] rounded-full transition-all duration-700"
                        style={{
                          height: `${(currentIndex / Math.max(steps.length - 1, 1)) * 100}%`,
                          background: isCancelled ? '#fda4af' : 'linear-gradient(180deg,#336886,#10b981)',
                        }}
                      />
                    )}
                    <div className="space-y-3">
                    {steps.map((step) => {
                      const stepIndex = steps.findIndex((item) => item.id === step.id);
                      const isCompleted = stepIndex >= 0 && stepIndex < currentIndex;
                      const isCurrent = stepIndex === currentIndex;
                      return (
                        <div key={`mobile-line-${step.id}`} className="relative z-[1] flex items-center gap-3">
                          <span
                            className={`h-[22px] w-[22px] shrink-0 rounded-full border-2 grid place-items-center transition-all duration-300 ${
                              isCurrent
                                ? isCancelled
                                  ? 'border-rose-500 bg-rose-500 text-white shadow-[0_0_0_3px_rgba(244,63,94,0.15)]'
                                  : 'border-[#336886] bg-[#336886] text-white shadow-[0_0_0_3px_rgba(51,104,134,0.18)] animate-pulse'
                                : isCompleted
                                  ? isCancelled
                                    ? 'border-rose-200 bg-rose-100 text-rose-600'
                                    : 'border-emerald-200 bg-emerald-100 text-emerald-600'
                                  : 'border-slate-200 bg-slate-50 text-slate-300'
                            }`}
                          >
                            {isCompleted
                              ? <CheckCircle size={13} weight="fill" />
                              : <span className="text-[8px] font-black">{stepIndex + 1}</span>
                            }
                          </span>
                          <span className={`text-[12.5px] leading-tight ${
                            isCurrent
                              ? isCancelled
                                ? 'font-black text-rose-600'
                                : 'font-black text-slate-900'
                              : isCompleted
                                ? isCancelled
                                  ? 'font-semibold text-rose-500'
                                  : 'font-semibold text-slate-500'
                                : 'text-slate-300'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div
                  id="order-items-section"
                  className="rounded-3xl premium-card border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-sm font-semibold text-slate-900">Resumo do pedido</p>
                    {paymentMeta?.label && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-2">
                        {paymentMeta.icon && (
                          <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                        )}
                        {paymentMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    {itemsToRender.map((item) => (
                      <div key={item.id || item.productId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.imageUrl || item.image || item.product?.imageUrl ? (
                            <img
                              src={resolveAssetUrl(item.imageUrl || item.image || item.product?.imageUrl)}
                              alt={item.name}
                              className="w-11 h-11 rounded-full object-cover border border-gray-200 transition-opacity duration-300"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                              🍖
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 break-words">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 mr-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                                {item.quantity}x
                              </span>
                              {item.name}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item?.cookingPoint && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                                  {item.cookingPoint}
                                </span>
                              )}
                              {item?.passSkewer && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                                  passar farinha
                                </span>
                              )}
                              {formatSelectedModifiers(item?.selectedModifiers || []).map((modifierName) => (
                                <span
                                  key={`${item.id || item.productId}-${modifierName}`}
                                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200"
                                >
                                  + {modifierName}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                          <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-[11px] line-through text-slate-400">
                              {formatCurrency(Number(item.originalPrice) * (item.quantity || 1))}
                            </span>
                            <span className="font-semibold text-emerald-600 tracking-tight">
                              {formatCurrency(Number(item.price))}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800 tracking-tight flex-shrink-0">R$ {Number(item.price).toFixed(2)}</span>
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
                    <span className="text-lg font-bold tracking-tight text-slate-900">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </div>
                <div id="order-info-section" className="rounded-3xl premium-card border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 space-y-4">
                  <p className="text-sm font-semibold text-slate-900">Informações</p>
                  <div className="text-sm text-slate-600 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <User size={16} weight="duotone" className="text-slate-400 mt-0.5 shrink-0" />
                      <p>
                        <span className="font-semibold text-slate-700">Cliente:</span> {order.customerName || 'Cliente'}
                      </p>
                    </div>
                    {paymentMeta?.label && (
                      <p className="flex items-center gap-2.5">
                        <CreditCard size={16} weight="duotone" className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">Pagamento:</span>
                        {paymentMeta.icon && (
                          <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                        )}
                        <span>{paymentMeta.label}</span>
                      </p>
                    )}
                    {showMercadoPagoApproved && (
                      <div className="overflow-hidden rounded-[22px] border border-[#009ee3]/20 bg-[linear-gradient(135deg,#f8fdff_0%,#ffffff_52%,#eefaff_100%)] p-[1px] shadow-[0_18px_34px_-30px_rgba(0,158,227,0.68)]">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[21px] bg-white/94 px-3 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                              <SealCheck size={21} weight="fill" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-black leading-tight text-slate-950">
                                Pagamento aprovado
                              </span>
                              <span className="mt-0.5 block text-[11px] font-semibold leading-tight text-slate-500">
                                Confirmado pelo Mercado Pago
                              </span>
                            </span>
                          </div>
                          <span className="ml-auto flex h-11 w-[142px] shrink-0 items-center justify-center rounded-[16px] border border-slate-200/85 bg-white px-2.5 shadow-[0_10px_24px_-20px_rgba(10,0,128,0.42)]">
                            <img src="/mercado-pago-horizontal.png" alt="Mercado Pago" className="h-8 w-[118px] object-contain" />
                          </span>
                        </div>
                      </div>
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
                      <p className="flex items-center gap-2.5">
                        <Phone size={16} weight="duotone" className="text-slate-400 shrink-0" />
                        <span><span className="font-semibold text-slate-700">Telefone:</span> {order.phone}</span>
                      </p>
                    )}
                    {order.type === 'table' && (
                      <p>
                        <span className="font-semibold">Mesa:</span> {order.table || '-'}
                      </p>
                    )}
                    {isCondominiumOrder && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">Feira no condomínio</p>
                        <p className="mt-1 font-bold">{condominiumOrder?.condominiumName || (order as any)?.condominiumName}</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">{condominiumFulfillmentLabel}</p>
                        {(condominiumUnit?.block || condominiumUnit?.tower || condominiumUnit?.apartment || condominiumUnit?.reference) && (
                          <p className="mt-1 text-xs text-emerald-800">
                            {[condominiumUnit?.block && `Bloco/Torre ${condominiumUnit.block}`, condominiumUnit?.apartment && `Apto ${condominiumUnit.apartment}`, condominiumUnit?.reference].filter(Boolean).join(' | ')}
                          </p>
                        )}
                      </div>
                    )}
                    {isDelivery && formatAddress(order.address || order.deliveryAddress) && (
                      <p className="flex items-start gap-2">
                        <MapPin size={16} weight="duotone" className="text-slate-400 mt-0.5" />
                        <span>{formatAddress(order.address || order.deliveryAddress)}</span>
                      </p>
                    )}
                    {isPostalDelivery && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                          Envio postal
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold">Status:</span>{' '}
                          {shipment?.shipmentStatus === 'posted' ? 'Postado' : 'Aguardando postagem'}
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold">Serviço:</span>{' '}
                          {shipmentServiceName || shipmentServiceCode || 'A confirmar'}
                        </p>
                        {postalEstimatedDays ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Prazo estimado:</span> {postalEstimatedDays} dia(s) úteis
                          </p>
                        ) : null}
                        {postalExpectedDeliveryDate ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Previsão de entrega:</span>{' '}
                            {postalExpectedDeliveryDate.toLocaleDateString('pt-BR')}
                          </p>
                        ) : null}
                        {shipmentTrackingCode ? (
                          <p className="text-sm text-slate-700 break-all">
                            <span className="font-semibold">Código:</span> {shipmentTrackingCode}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">Código de rastreio ainda não informado.</p>
                        )}
                        {shipmentTrackingUrl ? (
                          <a
                            href={shipmentTrackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Acompanhar entrega
                          </a>
                        ) : null}
                      </div>
                    )}
                    {hasDeliveryFee ? (
                      <p className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Frete:</span>
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
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-all duration-200 active:scale-[0.97] active:opacity-80"
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
                          className="w-full min-h-[48px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 text-sm font-semibold hover:bg-emerald-100 transition-all duration-200 active:scale-[0.98]"
                        >
                          Falar com a loja no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {isDelivery && !isPostalDelivery && storeCoords?.lat && deliveryCoords?.lat && (
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
                      className="w-full min-h-[48px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all duration-200 active:scale-[0.98]"
                      style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
                    >
                      Pedir novamente
                    </button>
                  )}
                    {order.createdAt ? (
                      <p className="text-slate-500">
                        <span className="font-semibold">Pedido feito em:</span> {formatDateTime(order.createdAt)}
                      </p>
                    ) : null}
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
                    {isPostalDelivery && !isReady && postalRemainingDays !== null && (
                      <p>
                        <span className="font-semibold">Prazo restante:</span> ~{postalRemainingDays} dia(s)
                      </p>
                    )}
                    {isEstimateDelayed && (
                      <p>
                        <span className="font-semibold">Status da previsão:</span> Em atraso (acompanhamento em tempo real)
                      </p>
                    )}
                  {!isPostalDelivery && etaWindowMin && etaWindowMax && !isReady && (
                    <p>
                      <span className="font-semibold">Janela prevista:</span> {etaWindowMin}–{etaWindowMax} min
                    </p>
                  )}
                  {isPostalDelivery && postalExpectedDeliveryDate && !isReady && (
                    <p>
                      <span className="font-semibold">Previsão de entrega:</span> {postalExpectedDeliveryDate.toLocaleDateString('pt-BR')}
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
                      {'Seu pedido está pronto! Você já pode retirá-lo ou aguardar a entrega/atendimento.'}
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
                              className="w-full rounded-xl bg-slate-900 text-white text-xs font-extrabold px-3 py-2 disabled:opacity-60 transition-all duration-200 active:scale-[0.97] active:opacity-90"
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
        <div
          className="sm:hidden fixed inset-x-0 z-30 px-3"
          style={{ bottom: mobileStatusDockBottom }}
        >
          <div className={`overflow-hidden rounded-[1.4rem] border backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(15,23,42,0.3)] ${
            isCancelled
              ? 'border-rose-200/60 bg-white/92'
              : isReady
              ? 'border-emerald-200/60 bg-white/92'
              : 'border-[#336886]/15 bg-white/92'
          }`}>
            <div
              className="h-[3px] w-full transition-all duration-700"
              style={{ width: `${progress}%`, background: isCancelled ? '#f43f5e' : isReady ? '#10b981' : 'linear-gradient(90deg,#336886,#10b981)' }}
            />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-2 w-2 shrink-0 rounded-full ${
                  isCancelled ? 'bg-rose-500' : isReady ? 'bg-emerald-500' : 'animate-pulse bg-[#336886]'
                }`} />
                <span className="truncate text-[12.5px] font-black text-slate-900">{statusLabel}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isCancelled
                    ? 'bg-rose-50 text-rose-600'
                    : isReady
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-[#336886]/8 text-[#336886]'
                }`}>{typeLabel}</span>
              </div>
              <span className="shrink-0 text-[15px] font-black tracking-tight text-slate-900">
                {formatCurrency(order?.total || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}




