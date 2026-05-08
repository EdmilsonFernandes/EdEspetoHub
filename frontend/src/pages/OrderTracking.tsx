// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowClockwise, Bicycle, CheckCircle, Clock, CircleNotch, CopySimple, MapPin, Package, Phone, SealCheck, Star, User, WhatsappLogo } from '@phosphor-icons/react';
import { Capacitor } from '@capacitor/core';
import { customerAccountService } from '../services/customerAccountService';
import { orderService } from '../services/orderService';
import { mapsService } from '../services/mapsService';
import { formatAddress, formatCurrency, formatDateTime, formatDuration, formatOrderDisplayId, formatTimeOfDay } from '../utils/format';
import { getPaymentMethodMeta, getPaymentProviderMeta, mercadoPagoHorizontal } from '../utils/paymentAssets';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { applyBrandTheme } from '../utils/brandTheme';
import { buildPixPayload } from '../utils/pixPayload';
import { RouteMapView } from '../components/RouteMapView';
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

const ONLINE_PAYMENT_METHODS = new Set([
  'pix',
  'credito',
  'crédito',
  'debito',
  'débito',
  'credit_card',
  'debit_card',
]);

const normalizePaymentProvider = (value?: string | null) =>
  String(value || '').trim().toLowerCase();

const getCustomerReceiptConfirmedAt = (order: any) =>
  order?.customerReceivedAt || order?.customer_received_at || null;

const STEP_STATUS_ALIASES: Record<string, string[]> = {
  payment: ['payment'],
  pending: ['pending'],
  preparing: ['preparing'],
  ready: ['ready', 'ready_for_pickup', 'ready_for_delivery', 'waiting_for_motoboy'],
  in_delivery: ['in_delivery', 'dispatched'],
  delivered: ['delivered'],
  finished: ['finished'],
  done: ['done', 'paid'],
  cancelled: ['cancelled'],
};

const getLastTimelineEntry = (order: any, stepId: string) => {
  const aliases = STEP_STATUS_ALIASES[stepId] || [stepId];
  const entries = Array.isArray(order?.statusTimeline) ? order.statusTimeline : [];
  const matches = entries.filter((entry: any) => aliases.includes(String(entry?.status || '')));
  return matches.length ? matches[matches.length - 1] : null;
};

const getStepTimestamp = (
  order: any,
  stepId: string,
  options?: { hasOnlinePayment?: boolean; isPaymentApproved?: boolean }
) => {
  const timelineEntry = getLastTimelineEntry(order, stepId);
  if (timelineEntry?.at) return timelineEntry.at;

  if (stepId === 'payment') {
    return order?.payment?.paidAt || order?.onlinePayment?.paidAt || null;
  }
  if (stepId === 'pending') {
    if (options?.hasOnlinePayment && options?.isPaymentApproved) {
      return order?.payment?.paidAt || order?.onlinePayment?.paidAt || order?.createdAt || null;
    }
    return order?.createdAt || null;
  }
  if (stepId === 'in_delivery') {
    return order?.delivery?.inTransitAt || null;
  }
  if (stepId === 'delivered') {
    return order?.delivery?.deliveredAt || order?.shipment?.deliveredAt || null;
  }
  if (stepId === 'finished') {
    return getCustomerReceiptConfirmedAt(order) || null;
  }
  if (stepId === 'done') {
    return order?.updatedAt || null;
  }
  if (stepId === 'cancelled') {
    return order?.canceledAt || order?.cancelledAt || order?.updatedAt || null;
  }
  return null;
};

const shouldStopOrderPolling = (order: any) => {
  const orderStatus = String(order?.status || '').toLowerCase();
  const deliveryStatus = String(order?.delivery?.status || '').toUpperCase();
  const isDeliveryOrder = String(order?.type || '').toLowerCase() === 'delivery' || Boolean(order?.delivery);
  const isPostalOrder = isDeliveryOrder && String(order?.fulfillmentMode || '').toLowerCase() === 'postal';
  const requiresCustomerReceipt = isDeliveryOrder && !isPostalOrder;
  const customerReceiptConfirmedAt = getCustomerReceiptConfirmedAt(order);
  const deliveredByCourier =
    deliveryStatus === 'DELIVERED' ||
    orderStatus === 'delivered' ||
    orderStatus === 'finished';

  return (
    orderStatus === 'done' ||
    orderStatus === 'cancelled' ||
    orderStatus === 'finished' ||
    (deliveredByCourier && (!requiresCustomerReceipt || Boolean(customerReceiptConfirmedAt)))
  );
};

const formatEtaMoment = (value: Date | string | number | null | undefined) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
  const timeLabel = formatTimeOfDay(parsed, { padHour: true });

  if (diffDays === 0) return timeLabel;
  if (diffDays === 1) return `amanhã às ${timeLabel}`;
  if (diffDays === -1) return `ontem às ${timeLabel}`;

  const dateLabel = parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(parsed.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });

  return `${dateLabel} às ${timeLabel}`;
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

const normalizeWhatsAppPhone = (phone?: string | null) =>
  String(phone || '').replace(/\D/g, '').replace(/^55/, '');

const buildWhatsAppContactUrl = (phone?: string | null, native = false, message?: string) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return '';

  const encodedMessage = String(message || '').trim()
    ? encodeURIComponent(String(message || '').trim())
    : '';

  if (native) {
    return encodedMessage
      ? `whatsapp://send?phone=55${normalizedPhone}&text=${encodedMessage}`
      : `whatsapp://send?phone=55${normalizedPhone}`;
  }

  return encodedMessage
    ? `https://wa.me/55${normalizedPhone}?text=${encodedMessage}`
    : `https://wa.me/55${normalizedPhone}`;
};

const RECEIPT_LINE_WIDTH = 32;

const sanitizeReceiptText = (value: unknown) =>
  String(value ?? '')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .trim();

const wrapReceiptWords = (value: unknown, width = RECEIPT_LINE_WIDTH) => {
  const text = sanitizeReceiptText(value);
  if (!text) return [''];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word.slice(0, width);
  }

  if (current) lines.push(current);
  return lines;
};

const centerReceiptText = (value: unknown, width = RECEIPT_LINE_WIDTH) =>
  wrapReceiptWords(value, width).map((line) => {
    if (line.length >= width) return line;
    const left = Math.floor((width - line.length) / 2);
    const right = width - line.length - left;
    return `${' '.repeat(left)}${line}${' '.repeat(right)}`;
  });

const receiptSeparator = (char = '-', width = RECEIPT_LINE_WIDTH) => char.repeat(width);

const fitReceiptColumns = (left: unknown, right: unknown, width = RECEIPT_LINE_WIDTH) => {
  const safeLeft = sanitizeReceiptText(left);
  const safeRight = sanitizeReceiptText(right);
  if (!safeRight) return safeLeft.slice(0, width);

  const rightWidth = Math.min(12, Math.max(8, safeRight.length));
  const leftWidth = Math.max(8, width - rightWidth);
  return `${safeLeft.slice(0, leftWidth).padEnd(leftWidth, '.')} ${safeRight.padStart(rightWidth - 1, ' ')}`;
};

const buildOrderWhatsappHighlightItemLines = (item: any) => {
  const quantity = Math.max(1, Number(item?.quantity ?? item?.qty ?? 1));
  const name = String(item?.name || item?.product?.name || 'Item do pedido').trim();
  const detailParts = [];

  if (item?.cookingPoint) detailParts.push(String(item.cookingPoint).trim());
  if (item?.passSkewer) detailParts.push('passar farinha');

  const modifiers = formatSelectedModifiers(item?.selectedModifiers || []);
  if (modifiers.length) detailParts.push(`+ ${modifiers.join(', ')}`);

  const lineTotalValue = Number(item?.lineTotal ?? item?.price ?? 0);
  const lineTotalLabel =
    Number.isFinite(lineTotalValue) && lineTotalValue > 0
      ? formatCurrency(lineTotalValue)
      : '';

  const lines = [
    `• *${quantity}x ${name}*${lineTotalLabel ? ` - ${lineTotalLabel}` : ''}`,
  ];

  if (detailParts.length) {
    lines.push(`  ${detailParts.join(' | ')}`);
  }

  return lines;
};

const buildOrderWhatsappReceiptMessage = ({
  storeName,
  customerName,
  orderDisplayId,
  orderCreatedAtLabel,
  statusLabel,
  typeLabel,
  paymentLabel,
  items,
  totalLabel,
  deliveryFeeLabel,
  addressLabel,
  condominiumLabel,
}: {
  storeName: string;
  customerName: string;
  orderDisplayId: string;
  orderCreatedAtLabel?: string;
  statusLabel: string;
  typeLabel: string;
  paymentLabel?: string;
  items: any[];
  totalLabel: string;
  deliveryFeeLabel?: string;
  addressLabel?: string;
  condominiumLabel?: string;
}) => {
  const receiptLines = [
    receiptSeparator('='),
    ...centerReceiptText('COMPROVANTE DO PEDIDO'),
    ...centerReceiptText(String(storeName || '').toUpperCase()),
    receiptSeparator('='),
    ...wrapReceiptWords(`PEDIDO: #${orderDisplayId}`),
    ...wrapReceiptWords(`CLIENTE: ${customerName}`),
    ...wrapReceiptWords(`DATA: ${orderCreatedAtLabel || '-'}`),
    ...wrapReceiptWords(`STATUS: ${statusLabel}`),
    ...wrapReceiptWords(`ATENDIMENTO: ${typeLabel}`),
    ...(paymentLabel ? wrapReceiptWords(`PAGAMENTO: ${paymentLabel}`) : []),
    ...(condominiumLabel ? wrapReceiptWords(`LOCAL: ${condominiumLabel}`) : []),
    ...(addressLabel ? wrapReceiptWords(`ENDERECO: ${addressLabel}`) : []),
    receiptSeparator(),
    ...wrapReceiptWords(`ITENS: ${Array.isArray(items) ? items.length : 0}`),
    ...wrapReceiptWords('DETALHES COMPLETOS LOGO ABAIXO'),
  ];

  receiptLines.push(receiptSeparator());

  if (deliveryFeeLabel) {
    receiptLines.push(fitReceiptColumns('FRETE:', deliveryFeeLabel));
  }

  receiptLines.push(
    fitReceiptColumns('TOTAL:', totalLabel),
    receiptSeparator('=')
  );

  const lines = [
    `Ola, ${storeName}!`,
    '',
    'Segue o cupom do meu pedido para facilitar o atendimento:',
    '',
    '```',
    ...receiptLines,
    '```',
  ];

  lines.push('', '*ITENS DO PEDIDO*');

  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      lines.push(...buildOrderWhatsappHighlightItemLines(item));
    });
  } else {
    lines.push('• *Itens indisponiveis no momento*');
  }

  lines.push('', 'Pode me ajudar com esse pedido?');

  return lines.filter(Boolean).join('\n');
};

function TrackingMetaCard({
  label,
  value,
  detail,
  accent = 'default',
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  accent?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const accentClass =
    accent === 'success'
      ? 'text-emerald-700'
      : accent === 'warning'
      ? 'text-amber-700'
      : accent === 'primary'
      ? 'text-[#153A4C]'
      : 'text-slate-900';

  return (
    <div className="rounded-[1.2rem] border border-[#d6e4ed] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9fc_100%)] px-4 py-3 shadow-[0_18px_36px_-30px_rgba(51,104,134,0.16)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className={`mt-1.5 text-sm font-black leading-tight ${accentClass}`}>{value}</div>
      {detail ? <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{detail}</div> : null}
    </div>
  );
}

function TrackingInfoRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-[#d6e4ed] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9fc_100%)] px-4 py-3 shadow-[0_18px_36px_-30px_rgba(51,104,134,0.14)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#cfe0ea] bg-[linear-gradient(135deg,#f8fbfd,#e7f1f7)] text-[#336886] shadow-[0_12px_24px_-20px_rgba(51,104,134,0.28)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <div className="mt-1 text-[13px] font-black leading-5 text-slate-950">{value}</div>
        {detail ? <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{detail}</div> : null}
      </div>
    </div>
  );
}

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
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmReceiptLoading, setConfirmReceiptLoading] = useState(false);
  const [confirmReceiptError, setConfirmReceiptError] = useState('');
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
    let active = true;

    const loadOrder = async (silent = false) => {
      const cachedSnapshot = orderService.peekPublicById(orderId);
      if (!active) return;
      if (!silent) {
        setError('');
        if (cachedSnapshot) {
          setOrder(cachedSnapshot);
          setLoading(false);
          if (shouldStopOrderPolling(cachedSnapshot)) {
            setPolling(false);
          }
        } else {
          setLoading(true);
        }
      } else {
        setTrackingLoading(true);
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
        if (!active) return;
        setOrder(data);
        setError('');
        if (shouldStopOrderPolling(data)) {
          setPolling(false);
        }
      } catch (err: any) {
        if (!active) return;
        if (!cachedSnapshot) {
          setError(err.message || 'Não foi possível carregar o pedido agora.');
        }
      } finally {
        if (!active) return;
        if (!silent) {
          setLoading(false);
        } else {
          setTrackingLoading(false);
        }
      }
    };

    loadOrder(false);
    if (polling) {
      interval = window.setInterval(() => loadOrder(true), 5000);
    }

    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, [orderId, polling]);

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
  const customerReceivedAtValue = getCustomerReceiptConfirmedAt(order);
  const hasCustomerReceiptConfirmation = Boolean(customerReceivedAtValue);
  const deliveredAtValue =
    (order as any)?.delivery?.deliveredAt ||
    (order as any)?.deliveredAt ||
    null;
  const hasCourierDeliveryConfirmation =
    Boolean(deliveredAtValue) ||
    deliveryStatus === 'DELIVERED' ||
    normalizedStatus === 'delivered' ||
    normalizedStatus === 'finished';
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
    // Se veio do histórico do cliente, volta para lá
    const customerSession = typeof window !== 'undefined' ? localStorage.getItem('customerSession') : null;
    if (customerSession) {
      navigate('/cliente/pedidos', { replace: true });
      return;
    }
    navigate(storeHomePath);
  };
  const storeLogo =
    resolveAssetUrl(order?.store?.settings?.logoUrl) || '/janocaminho.jpg';
  const isPostalDelivery = isDelivery && String((order as any)?.fulfillmentMode || '').toLowerCase() === 'postal';
  const hasCustomerSession = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('customerSession');
      const parsed = raw ? JSON.parse(raw) : null;
      return Boolean(parsed?.token);
    } catch {
      return false;
    }
  }, []);
  const statusLabel = useMemo(() => {
    if (normalizedStatus === 'cancelled') return 'Cancelado';
    if (isDelivery && !isPostalDelivery && hasCustomerReceiptConfirmation) return 'Recebido pelo cliente';
    if (isPostalDelivery && (normalizedStatus === 'delivered' || normalizedStatus === 'finished')) return 'Entregue';
    if (isDelivery && !isPostalDelivery && hasCourierDeliveryConfirmation) return 'Entregue';
    if (isPostalDelivery && (normalizedStatus === 'dispatched' || normalizedStatus === 'waiting_for_motoboy' || normalizedStatus === 'in_delivery')) return 'Despachado';
    if (isPostalDelivery && (normalizedStatus === 'ready' || normalizedStatus === 'ready_for_delivery')) return 'Pronto para postagem';
    if (isDelivery && (deliveryStatus === 'IN_TRANSIT' || normalizedStatus === 'in_delivery')) return 'Em rota';
    if (isDelivery && deliveryStatus === 'PICKED_UP') return 'Pedido retirado';
    if (isDelivery && deliveryStatus === 'ACCEPTED') return 'Entregador a caminho';
    if (isDelivery && normalizedStatus === 'dispatched') return 'Despachado';
    if (isDelivery && normalizedStatus === 'waiting_for_motoboy') return 'Aguardando entregador';
    if (isDelivery && normalizedStatus === 'ready_for_delivery') return 'Pronto para entrega';
    if (isDelivery && normalizedStatus === 'ready') return 'Aguardando entregador';
    // Legacy delivery orders that still use "done".
    if (isDelivery && normalizedStatus === 'done') return 'Entregue';
    if (order?.type === 'table' && normalizedStatus === 'done') return 'Pedido Pronto';
    if (order?.type === 'pickup' && (normalizedStatus === 'ready' || normalizedStatus === 'ready_for_pickup')) return 'Pronto para retirada';
    return statusLabels[normalizedStatus] || statusLabels[status] || status;
  }, [isDelivery, isPostalDelivery, order?.type, status, normalizedStatus, deliveryStatus, hasCustomerReceiptConfirmation, hasCourierDeliveryConfirmation]);
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
  const customerName = String(order?.customerName || order?.customer?.name || order?.customer?.fullName || 'Cliente').trim();
  const paymentValue = order?.paymentMethod || order?.payment;
  const paymentMeta = paymentValue ? getPaymentMethodMeta(paymentValue) : null;
  const paymentProviderValue = String(order?.payment?.provider || '').trim();
  const paymentProviderMeta = paymentProviderValue ? getPaymentProviderMeta(paymentProviderValue) : null;
  const normalizedPaymentProvider = normalizePaymentProvider(paymentProviderValue);
  const normalizedPaymentMethod = String(paymentValue || '').trim().toLowerCase();
  const orderDisplayId = formatOrderDisplayId(order?.id, storeSlug) || String(order?.id || '-');
  const orderCreatedAtLabel = order?.createdAt ? formatDateTime(order.createdAt) : '';
  const deliveryAddressLabel = isDelivery ? formatAddress(order.address || order.deliveryAddress) : '';
  const pixKey =
    order?.store?.settings?.pixKey ||
    order?.pixKey ||
    '';
  const isPixPayment = normalizedPaymentMethod === 'pix';
  const paymentStatusNormalized = (() => {
    const direct = String(order?.paymentStatus || '').trim().toUpperCase();
    const nested = String(order?.payment?.status || '').trim().toUpperCase();
    if (direct === 'PAID' || nested === 'PAID') return 'PAID';
    if (direct === 'FAILED' || nested === 'FAILED') return 'FAILED';
    return direct || nested;
  })();
  const hasOnlinePayment = ONLINE_PAYMENT_METHODS.has(normalizedPaymentMethod);
  const isPaymentApproved = paymentStatusNormalized === 'PAID';
  const showMercadoPagoApproved = isPaymentApproved && [ 'mercado_pago', 'mercadopago' ].includes(normalizedPaymentProvider);
  const shouldHidePixPaymentBlockBase =
    isPixPayment &&
    (
      paymentStatusNormalized === 'PAID' ||
      [ 'ready', 'ready_for_delivery', 'done', 'delivered', 'finished' ].includes(status) ||
      isReady
    );
  const hasDeliveryFee =
    order?.deliveryFee !== null && order?.deliveryFee !== undefined && isDelivery;
  const shipment = (order as any)?.shipment || null;
  const shipmentServiceCode = String(shipment?.serviceCode || '').trim().toUpperCase();
  const shipmentServiceName = String(shipment?.serviceName || '').trim();
  const shipmentTrackingCode = String(shipment?.trackingCode || '').trim();
  const shipmentTrackingUrl = String(shipment?.trackingUrl || '').trim();
  const shipmentStatusNormalized = String(shipment?.shipmentStatus || '').trim().toLowerCase();
  const isShipmentPosted =
    shipmentStatusNormalized === 'posted' ||
    Boolean(shipmentTrackingCode) ||
    Boolean(shipment?.postedAt);
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
  const canConfirmReceipt =
    hasCustomerSession &&
    !isAdminForStore &&
    isDelivery &&
    !isPostalDelivery &&
    [ 'delivered', 'finished', 'done' ].includes(normalizedStatus) &&
    !hasCustomerReceiptConfirmation && normalizedStatus !== 'finished';

  const handleConfirmReceipt = async () => {
    if (!orderId || confirmReceiptLoading || !canConfirmReceipt) return;
    setConfirmReceiptError('');
    setConfirmReceiptLoading(true);
    try {
      const result = await customerAccountService.confirmOrderReceived(orderId);
      const customerReceivedAt = result?.customerReceivedAt || new Date().toISOString();
      setOrder((prev: any) => (
        prev
          ? {
              ...prev,
              status: 'finished',
              customerReceivedAt,
            }
          : prev
      ));
      setPolling(false);
    } catch (err: any) {
      setConfirmReceiptError(err?.message || 'Não foi possível confirmar o recebimento agora.');
    } finally {
      setConfirmReceiptLoading(false);
    }
  };
  const etaDetails = order?.eta || null;
  const hasAnyEtaTotal = Boolean(Number((etaDetails as any)?.totalMinutes) > 0);
  const etaTotalMinutes = etaDetails?.totalMinutes
    ? Number(etaDetails.totalMinutes)
    : null;
  const etaWindowMin = etaDetails?.windowMin ? Number(etaDetails.windowMin) : null;
  const etaWindowMax = etaDetails?.windowMax ? Number(etaDetails.windowMax) : null;
  const postalEstimatedDays = useMemo(() => {
    if (!isPostalDelivery) return null;
    const explicitCandidates = [
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
  }, [isPostalDelivery, shipment, shipmentServiceCode, shipmentServiceName]);
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
  const cancelledFlowDetail = useMemo(() => {
    if (!isCancelled) return '';
    if (isPostalDelivery) {
      return isShipmentPosted ? 'Pedido cancelado após a postagem' : 'Pedido cancelado antes da postagem';
    }
    if (isDelivery) {
      if (deliveryStatus === 'IN_TRANSIT') return 'Pedido cancelado durante a entrega';
      return 'Pedido cancelado antes da entrega';
    }
    if (order?.type === 'pickup') return 'Pedido cancelado antes da retirada';
    if (order?.type === 'table') return 'Pedido cancelado antes da finalização';
    return 'Pedido cancelado';
  }, [deliveryStatus, isCancelled, isDelivery, isPostalDelivery, isShipmentPosted, order?.type]);
  const orderLifecycleLabel = isCancelled ? cancelledFlowDetail || 'Pedido cancelado' : isReady ? 'Pedido concluido' : 'Pedido em andamento';
  const mercadoPagoApprovalDetail = isCancelled
    ? 'Pago via Mercado Pago antes do cancelamento'
    : 'Confirmado pelo Mercado Pago';
  const paymentSummaryDetail = isCancelled && showMercadoPagoApproved
    ? mercadoPagoApprovalDetail
    : isCancelled && isPaymentApproved && paymentProviderMeta?.label
    ? `Pago via ${paymentProviderMeta.label} antes do cancelamento`
    : isCancelled && isPaymentApproved
    ? 'Pagamento confirmado antes do cancelamento'
    : showMercadoPagoApproved
    ? 'Confirmado pelo Mercado Pago'
    : isPaymentApproved && paymentProviderMeta?.label
    ? `Confirmado por ${paymentProviderMeta.label}`
    : isPaymentApproved
    ? 'Pagamento confirmado'
    : normalizedPaymentMethod === 'dinheiro'
    ? 'Pagamento combinado no atendimento'
    : hasOnlinePayment
    ? 'Forma usada na compra online'
    : 'Forma escolhida para este pedido';
  const postalStatusLabel = isCancelled
    ? 'Cancelado'
    : isShipmentPosted
    ? 'Postado'
    : 'Aguardando postagem';
  const postalStatusDetail = isCancelled
    ? (isShipmentPosted ? 'Pedido cancelado após a postagem.' : 'Pedido cancelado antes da postagem.')
    : isShipmentPosted
    ? 'Objeto entregue aos Correios e aguardando movimentação.'
    : 'Pedido aguardando despacho da loja.';
  const cashTenderedValue =
    normalizedPaymentMethod === 'dinheiro' && order?.cashTendered !== null && order?.cashTendered !== undefined
      ? Number(order.cashTendered)
      : null;
  const cashChangeValue =
    cashTenderedValue !== null
      ? Math.max(0, Number(cashTenderedValue) - Number(order?.total || 0))
      : null;
  const whatsappPaymentLabel = paymentMeta?.label
    ? `${paymentMeta.label}${isPaymentApproved ? ' (confirmado)' : ''}`
    : '';
  const whatsappCondominiumLabel = isCondominiumOrder
    ? [
        condominiumOrder?.condominiumName || (order as any)?.condominiumName,
        condominiumFulfillmentLabel,
      ].filter(Boolean).join(' - ')
    : '';
  const whatsappReceiptMessage = useMemo(() => {
    return buildOrderWhatsappReceiptMessage({
      storeName,
      customerName,
      orderDisplayId,
      orderCreatedAtLabel,
      statusLabel,
      typeLabel,
      paymentLabel: whatsappPaymentLabel,
      items: Array.isArray(order?.items) ? order.items : [],
      totalLabel: formatCurrency(order?.total || 0),
      deliveryFeeLabel: deliveryFeeValue !== null ? formatCurrency(deliveryFeeValue) : '',
      addressLabel: deliveryAddressLabel,
      condominiumLabel: whatsappCondominiumLabel,
    });
  }, [
    customerName,
    deliveryAddressLabel,
    deliveryFeeValue,
    order?.items,
    order?.total,
    orderCreatedAtLabel,
    orderDisplayId,
    statusLabel,
    storeName,
    typeLabel,
    whatsappCondominiumLabel,
    whatsappPaymentLabel,
  ]);
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
    // ETA já vem calculada pelo backend no pedido público; não descontar elapsed no frontend.
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
  const storeWhatsappLink = buildWhatsAppContactUrl(storePhone, false, whatsappReceiptMessage);
  const storeWhatsappNativeLink = buildWhatsAppContactUrl(storePhone, true, whatsappReceiptMessage);
  const openWhatsApp = () => {
    if (!storeWhatsappLink) return;
    if (Capacitor.isNativePlatform() && storeWhatsappNativeLink) {
      window.location.href = storeWhatsappNativeLink;
      return;
    }
    window.open(storeWhatsappLink, '_blank', 'noopener,noreferrer');
  };
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
  const tipSettlementMode = String(reviewTip?.tipSettlementMode || 'STORE_PAYOUT').toUpperCase();
  const tipDirectToMotoboy = tipSettlementMode === 'DIRECT_MOTOBOY';
  const tipExpiresAtMs = reviewTip?.tipExpiresAt ? new Date(reviewTip.tipExpiresAt).getTime() : null;
  const tipStartedAtMs = reviewTip?.updatedAt
    ? new Date(reviewTip.updatedAt).getTime()
    : reviewTip?.createdAt
    ? new Date(reviewTip.createdAt).getTime()
    : null;
  const isTipExpired = Boolean(
    tipExpiresAtMs &&
      Number.isFinite(tipExpiresAtMs) &&
      tipExpiresAtMs <= Date.now() &&
      tipStatus !== 'PAID' &&
      tipStatus !== 'NONE'
  );
  const tipUiStatus = isTipExpired ? 'EXPIRED' : tipStatus;
  const tipAmount = Number(reviewTip?.tipAmount || 0);
  const hasTip = canUseTipFlow && tipAmount > 0;
  const canShowTipPayment = hasTip && (reviewTip?.tipQrCodeBase64 || reviewTip?.tipQrCodeText || reviewTip?.tipPaymentLink);
  const shouldPollTipStatus = canShowTipPayment && tipUiStatus === 'PENDING';
  const tipPollingStatus = shouldPollTipStatus ? 'PENDING' : tipUiStatus;
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
    enabled: Boolean(order?.id && isReady && shouldPollTipStatus),
    status: tipPollingStatus,
    intervalMs: 5000,
    timeoutMs:
      tipExpiresAtMs && Number.isFinite(tipExpiresAtMs)
        ? Math.max(5000, tipExpiresAtMs - Date.now())
        : 5 * 60 * 1000,
    checkStatus: async () => {
      const nextStatus = await refreshReviewStatus({ silent: true });
      return nextStatus || tipUiStatus;
    },
  });
  const tipCountdownMs =
    tipExpiresAtMs && Number.isFinite(tipExpiresAtMs)
      ? Math.max(0, tipExpiresAtMs - Date.now())
      : tipPolling.remainingMs;
  const tipCountdownTotalMs =
    tipExpiresAtMs &&
    Number.isFinite(tipExpiresAtMs) &&
    tipStartedAtMs &&
    Number.isFinite(tipStartedAtMs) &&
    tipExpiresAtMs > tipStartedAtMs
      ? Math.max(60 * 1000, tipExpiresAtMs - tipStartedAtMs)
      : 5 * 60 * 1000;
  const tipCountdownLabel = (() => {
    const remainingSec = Math.max(0, Math.ceil(tipCountdownMs / 1000));
    const remainingMin = Math.floor(remainingSec / 60);
    const remainingSecPart = remainingSec % 60;
    return `${String(remainingMin).padStart(2, '0')}:${String(remainingSecPart).padStart(2, '0')}`;
  })();
  const tipProgressPct = Math.max(0, Math.min(100, (tipCountdownMs / tipCountdownTotalMs) * 100));
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
      // Optimistic update then refresh full state from server
      setReviewState({ ...(reviewState || {}), review: payload });
      await refreshReviewStatus({ silent: true });
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
    const shouldShowLiveRoute =
      isDeliveryOrder &&
      !isPostalDelivery &&
      (deliveryStatus === 'IN_TRANSIT' || normalizedStatus === 'in_delivery');
    if (!shouldShowLiveRoute) {
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
  }, [isDelivery, isPostalDelivery, deliveryStatus, normalizedStatus, order?.address, order?.id, order?.store?.settings?.address, order?.store?.owner?.address]);

  const steps = useMemo(() => {
    if (normalizedStatus === 'cancelled') {
      return [
        ...(hasOnlinePayment ? [{ id: 'payment', label: isPaymentApproved ? 'Pagamento confirmado' : 'Aguardando pagamento' }] : []),
        { id: 'pending', label: 'Pedido Recebido' },
        { id: 'cancelled', label: 'Cancelado' },
      ];
    }
    if (isDelivery) {
      if (isPostalDelivery) {
        return [
          ...(hasOnlinePayment ? [{ id: 'payment', label: isPaymentApproved ? 'Pagamento confirmado' : 'Aguardando pagamento' }] : []),
          { id: 'pending', label: 'Pedido Recebido' },
          { id: 'preparing', label: 'Em Preparação' },
          { id: 'ready', label: 'Pronto para postagem' },
          { id: 'in_delivery', label: 'Despachado' },
          { id: 'delivered', label: 'Entregue' },
        ];
      }
      return [
        ...(hasOnlinePayment ? [{ id: 'payment', label: isPaymentApproved ? 'Pagamento confirmado' : 'Aguardando pagamento' }] : []),
        { id: 'pending', label: 'Pedido Recebido' },
        { id: 'preparing', label: 'Em Preparação' },
        { id: 'ready', label: 'Aguardando entregador' },
        { id: 'in_delivery', label: 'Em rota' },
        { id: 'delivered', label: 'Entregue' },
        { id: 'finished', label: 'Recebido pelo cliente' },
      ];
    }
    if (order?.type === 'pickup') {
      return [
        ...(hasOnlinePayment ? [{ id: 'payment', label: isPaymentApproved ? 'Pagamento confirmado' : 'Aguardando pagamento' }] : []),
        { id: 'pending', label: 'Pedido Recebido' },
        { id: 'preparing', label: 'Em Preparação' },
        { id: 'ready', label: 'Pronto para retirada' },
        { id: 'done', label: hasOnlinePayment ? 'Retirada concluída' : 'Pago' },
      ];
    }
    return [
      ...(hasOnlinePayment ? [{ id: 'payment', label: isPaymentApproved ? 'Pagamento confirmado' : 'Aguardando pagamento' }] : []),
      { id: 'pending', label: 'Pedido Recebido' },
      { id: 'preparing', label: 'Em Preparação' },
      { id: 'done', label: order?.type === 'table' ? 'Pedido Pronto' : 'Pronto' },
    ];
  }, [hasOnlinePayment, isDelivery, isPaymentApproved, isPostalDelivery, order?.type, normalizedStatus]);
  const currentStep = (() => {
    if (normalizedStatus === 'cancelled') return 'cancelled';
    if (hasOnlinePayment && !isPaymentApproved) return 'payment';
    if (!isDelivery) {
      const st = normalizedStatus;
      const known = new Set(steps.map((item) => item.id));
      if (st === 'awaiting_payment' && hasOnlinePayment && isPaymentApproved) return 'pending';
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
      if (normalizedStatus === 'awaiting_payment' && hasOnlinePayment && isPaymentApproved) return 'pending';
      if (normalizedStatus === 'delivered' || normalizedStatus === 'finished') return 'delivered';
      if (normalizedStatus === 'dispatched' || normalizedStatus === 'waiting_for_motoboy' || normalizedStatus === 'in_delivery') return 'in_delivery';
      if (normalizedStatus === 'ready_for_delivery' || normalizedStatus === 'ready') return 'ready';
      if (normalizedStatus === 'preparing') return 'preparing';
      return 'pending';
    }
    if (hasCustomerReceiptConfirmation || normalizedStatus === 'finished') return 'finished';
    if (deliveryStatus === 'DELIVERED' || normalizedStatus === 'delivered') return 'delivered';
    if (deliveryStatus === 'IN_TRANSIT') return 'in_delivery';
    if (deliveryStatus === 'ACCEPTED' || deliveryStatus === 'PICKED_UP') return 'ready';
    if (normalizedStatus === 'awaiting_payment' && hasOnlinePayment && isPaymentApproved) return 'pending';
    if (normalizedStatus === 'ready_for_delivery' || normalizedStatus === 'waiting_for_motoboy' || normalizedStatus === 'ready') return 'ready';
    if (normalizedStatus === 'in_delivery') return 'in_delivery';
    return normalizedStatus || status;
  })();
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === currentStep));
  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;
  const itemsToRender = Array.isArray(order?.items) ? order.items : [];
  const [itemsExpanded, setItemsExpanded] = useState(itemsToRender.length <= 3);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f8fb_0%,#ebf2f7_100%)] pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none fixed top-[-12%] right-[-8%] h-[42%] w-[50%] rounded-full bg-[#336886]/14 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[10%] left-[-6%] h-[28%] w-[36%] rounded-full bg-sky-300/16 blur-[100px] -z-10" />
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <header className="sticky top-0 z-50 border-b border-[#d5e3ec]/90 bg-[rgba(244,248,251,0.94)] backdrop-blur-xl shadow-[0_12px_30px_-24px_rgba(51,104,134,0.18)]">
        {/* Barra de progresso dinâmica do pedido */}
        <div className="h-[2.5px] w-full bg-[#dce9f1]/80 overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%`, background: isCancelled ? '#f43f5e' : 'linear-gradient(90deg,#336886,#009ee3)' }}
          />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3">
            <button onClick={handleBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#c9dbe7]/80 bg-white/90 text-stone-700 shadow-[0_12px_24px_-22px_rgba(51,104,134,0.25)] transition-all active:scale-95">
              <ArrowLeft size={18} weight="bold" />
            </button>
            <button onClick={handleBack} className="flex min-w-0 items-center gap-2 text-left">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-[#c9dbe7]/80 bg-white shadow-[0_12px_24px_-22px_rgba(51,104,134,0.22)]">
                <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-black text-stone-950">{storeName}</p>
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#336886]">
                  <img src="/janocaminho.jpg" alt="" className="h-[9px] w-[9px] rounded-[0.2rem] object-cover" />
                  Já no Caminho
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}/pedido/${orderId}`;
                try {
                  if (navigator.share) {
                    await navigator.share({ title: `Pedido — ${storeName}`, url });
                  } else {
                    await navigator.clipboard.writeText(url);
                    setLinkCopied(true);
                    window.setTimeout(() => setLinkCopied(false), 2200);
                  }
                } catch { /* usuário cancelou share */ }
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#c9dbe7]/80 bg-white/90 text-stone-700 shadow-[0_12px_24px_-22px_rgba(51,104,134,0.25)] transition-all active:scale-95"
              title="Compartilhar pedido"
            >
              {linkCopied ? <CheckCircle size={16} weight="fill" className="text-emerald-600" /> : <CopySimple size={16} weight="bold" />}
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
              <div className={`relative overflow-hidden rounded-[1.6rem] border p-4 shadow-[0_24px_52px_-40px_rgba(51,104,134,0.22)] ring-1 ring-white/80 sm:p-5 ${
                isCancelled
                  ? 'border-rose-100 bg-[linear-gradient(145deg,#fff6f7,#fff)]'
                  : isReady
                  ? 'border-emerald-100 bg-[linear-gradient(145deg,#f5fbf7,#ffffff)]'
                  : 'border-[#d5e3ec] bg-[linear-gradient(145deg,#f8fbfd,#eef5fa_52%,#ffffff_100%)]'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0ea]/90 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#336886] shadow-[0_12px_22px_-20px_rgba(51,104,134,0.18)]">
                        Pedido #{orderDisplayId}
                    </p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <div className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${isCancelled ? "bg-rose-100 text-rose-500" : isReady ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"} ${!isTerminal ? "animate-bounce" : ""}`} style={!isTerminal ? { animationDuration: "2s" } : undefined}>
                        {isCancelled ? <CircleNotch size={24} weight="bold" /> : isReady ? <CheckCircle size={24} weight="fill" /> : <Clock size={24} weight="duotone" className="animate-spin" style={{ animationDuration: "3s" }} />}
                      </div>
                      <h1 className="text-[1.45rem] font-black leading-none text-slate-950 sm:text-[2rem]">{statusLabel}</h1>
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
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                      {isCancelled ? 'Cancelado' : isReady ? 'Finalizado' : 'Em andamento'}
                    </span>
                    {!isTerminal && polling && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 ring-1 ring-emerald-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ao vivo
                      </span>
                    )}
                    </div>
                    {isCancelled && (
                      <div className="mt-3 rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3">
                        <p className="text-sm font-medium text-rose-900 leading-relaxed">
                          {order?.canceledReason || "Sentimos muito! Este pedido foi cancelado."}
                        </p>
                      </div>
                    )}
                    {storePhone && (
                      <a href={storeWhatsappNativeLink || storeWhatsappLink} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 active:scale-95 transition-transform">
                        <WhatsappLogo size={15} weight="fill" />
                        Falar com a loja
                      </a>
                    )}

                    {normalizedStatus === "in_delivery" && (order as any)?.delivery?.confirmationCode && (
                      <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Código de entrega</p>
                        <p className="mt-2 text-3xl font-black tracking-[0.3em] text-indigo-900">{(order as any).delivery.confirmationCode}</p>
                        <p className="mt-2 text-[11px] font-medium text-indigo-600/80">Informe este código ao entregador para confirmar o recebimento.</p>
                      </div>
                    )}
                    {estimatedReadyAt && !isTerminal ? (
                      <div className="mt-3 rounded-2xl border border-[#d5e3ec] bg-white/80 px-4 py-3 shadow-[0_16px_30px_-26px_rgba(51,104,134,0.18)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#336886]">{etaForecastLabel}</p>
                        <p className="mt-1 text-xl font-extrabold text-stone-950">
                          {etaForecastPrefix}{' '}
                          {isPostalDelivery
                            ? estimatedReadyAt.toLocaleDateString('pt-BR')
                            : formatEtaMoment(estimatedReadyAt)}
                        </p>
                        {isPostalDelivery ? (
                          <p className="mt-1 text-xs text-stone-600">
                            {shipmentServiceName || shipmentServiceCode || 'Serviço postal'}{postalEstimatedDays ? ` • ${postalEstimatedDays} dia(s) úteis` : ''}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {isDelivery && !isPostalDelivery && motoboyFirst && (['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus) || hasCustomerReceiptConfirmation) ? (
                      <div className="mt-3 rounded-2xl border border-[#d5e3ec] bg-[linear-gradient(135deg,#f9fcfe,#eef5fa)] px-4 py-3 text-sm text-stone-800 shadow-[0_18px_32px_-28px_rgba(51,104,134,0.16)]">
                        <div className="flex items-start gap-3">
                          {motoboyProfileImageUrl ? (
                            <img
                              src={motoboyProfileImageUrl}
                              alt={motoboyFirst}
                              className="h-10 w-10 rounded-2xl border border-amber-200/70 object-cover shrink-0 bg-white"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200/70 bg-white text-amber-800">
                              <Bicycle size={18} weight="duotone" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-amber-700">
                              Entregador
                            </div>
                            <div className="font-extrabold leading-tight truncate">
                              {motoboyFirst}{' '}
                              {hasCustomerReceiptConfirmation
                                ? 'concluiu sua entrega'
                                : hasCourierDeliveryConfirmation
                                ? 'entregou seu pedido'
                                : deliveryStatus === 'IN_TRANSIT'
                                ? 'está a caminho'
                                : deliveryStatus === 'PICKED_UP'
                                ? 'retirou seu pedido'
                                : 'aceitou sua entrega'}
                            </div>
                            <div className="mt-0.5 text-xs text-stone-600">
                              {hasCustomerReceiptConfirmation
                                ? 'Recebimento confirmado pelo cliente. Pedido concluído.'
                                : hasCourierDeliveryConfirmation
                                ? 'A entrega foi concluída e o sistema aguarda a confirmação final do cliente.'
                                : deliveryStatus === 'IN_TRANSIT'
                                ? 'A caminho do seu endereço.'
                                : deliveryStatus === 'PICKED_UP'
                                ? 'Agora é só acompanhar o trajeto.'
                                : 'Ele está se preparando para sair da loja.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isDelivery && !isPostalDelivery && (hasCourierDeliveryConfirmation || hasCustomerReceiptConfirmation) ? (
                      <div className={`mt-3 rounded-2xl border px-4 py-3 shadow-[0_18px_32px_-28px_rgba(16,185,129,0.22)] ${
                        hasCustomerReceiptConfirmation
                          ? 'border-emerald-200 bg-[linear-gradient(135deg,#f4fbf6,#ffffff)]'
                          : 'border-[#d5e3ec] bg-[linear-gradient(135deg,#f9fcfe,#ffffff)]'
                      }`}>
                        <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                          hasCustomerReceiptConfirmation ? 'text-emerald-700' : 'text-[#336886]'
                        }`}>
                          {hasCustomerReceiptConfirmation ? 'Recebimento confirmado' : 'Entrega concluída'}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {hasCustomerReceiptConfirmation ? 'Recebido pelo cliente' : 'Entregue pelo entregador'}
                        </p>
                        <div className="mt-1 space-y-1 text-xs text-slate-600">
                          {deliveredAtValue ? (
                            <p>Entregador marcou a entrega em {formatDateTime(deliveredAtValue)}.</p>
                          ) : null}
                          {hasCustomerReceiptConfirmation ? (
                            <p>Cliente confirmou o recebimento em {formatDateTime(customerReceivedAtValue)}.</p>
                          ) : (
                            <p>Agora falta apenas a confirmação final do cliente para encerrar o pedido.</p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {canConfirmReceipt ? (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#f6fdf8,#ffffff)] px-4 py-3 shadow-[0_18px_32px_-28px_rgba(16,185,129,0.22)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Recebimento</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">Seu pedido chegou certinho?</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Confirme o recebimento para finalizar o pedido e avisar a loja que a entrega foi concluída.
                        </p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <button
                            type="button"
                            onClick={handleConfirmReceipt}
                            disabled={confirmReceiptLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_18px_32px_-24px_rgba(5,150,105,0.5)] transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {confirmReceiptLoading ? <CircleNotch size={16} className="animate-spin" /> : <SealCheck size={16} weight="fill" />}
                            Confirmar recebimento
                          </button>
                          {confirmReceiptError ? (
                            <p className="text-xs font-medium text-rose-600">{confirmReceiptError}</p>
                          ) : null}
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

              <div id="order-status-section" className="rounded-[1.55rem] border border-[#d5e3ec] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,251,0.96))] p-4 shadow-[0_20px_40px_-34px_rgba(51,104,134,0.18)]">
                <div className="mb-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#dce9f1]/80">
                    <div
                      className="h-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundImage:
                          'linear-gradient(90deg, #336886, #009ee3)',
                      }}
                    />
                  </div>
                </div>
                {(isReady && elapsedMs > 0) ||
                (remainingEstimateMinutes !== null && !isTerminal) ||
                (!isPostalDelivery && etaWindowMin && etaWindowMax && !isTerminal) ||
                (isPostalDelivery && !isTerminal && (postalRemainingDays !== null || Boolean(postalExpectedDeliveryDate))) ||
                isEstimateDelayed ? (
                  <div className="mb-4 space-y-1.5">
                    {isReady && elapsedMs > 0 && (
                      <div className="inline-flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={13} weight="duotone" className="text-amber-600" />
                        <span className="font-medium">Tempo total: {formatDuration(elapsedMs)}</span>
                      </div>
                    )}
                    {isPostalDelivery && !isReady && postalRemainingDays !== null && (
                      <div className="inline-flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={13} weight="duotone" className="text-amber-600" />
                        <span className="font-medium">Prazo restante: ~{postalRemainingDays} dia(s)</span>
                      </div>
                    )}
                    {remainingEstimateMinutes !== null && !isReady && (
                      <div className="inline-flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={13} weight="duotone" className="text-amber-600" />
                        <span className="font-medium">{etaPhaseLabel} restante: ~{remainingEstimateMinutes} min</span>
                      </div>
                    )}
                    {!isPostalDelivery && etaWindowMin && etaWindowMax && !isReady && (
                      <div className="inline-flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={13} weight="duotone" className="text-amber-600" />
                        <span className="font-medium">Janela prevista: {etaWindowMin}–{etaWindowMax} min</span>
                      </div>
                    )}
                    {isEstimateDelayed && (
                      <div className="inline-flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={13} weight="duotone" className="text-amber-600" />
                        <span className="font-medium">Seu pedido está demorando mais que o previsto.</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[#d9e6ee] bg-white/92 px-4 py-4 shadow-[0_12px_28px_-24px_rgba(51,104,134,0.14)]">
                  <div className="relative pl-1">
                    {/* Trilho de fundo */}
                    <span className="pointer-events-none absolute left-[10px] top-3 bottom-6 w-[2px] rounded-full bg-[#dce9f1]/85" />
                    {/* Trilho preenchido (concluído) */}
                    {currentIndex > 0 && (
                      <span
                        className="pointer-events-none absolute left-[10px] top-3 w-[2px] rounded-full transition-all duration-700"
                        style={{
                          height: `${(currentIndex / Math.max(steps.length - 1, 1)) * 100}%`,
                          background: isCancelled ? '#fda4af' : 'linear-gradient(180deg,#336886,#009ee3)',
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
                            className={`h-[22px] w-[22px] shrink-0 rounded-full border-2 grid place-items-center transition-all duration-300 ${isCurrent && !isTerminal ? 'animate-pulse' : ''} ${
                              isCurrent
                                ? isCancelled
                                  ? 'border-rose-500 bg-rose-500 text-white shadow-[0_0_0_3px_rgba(244,63,94,0.15)]'
                                  : 'border-[#336886] bg-[#336886] text-white shadow-[0_0_0_3px_rgba(51,104,134,0.2)]'
                                : isCompleted
                                  ? isCancelled
                                    ? 'border-rose-200 bg-rose-100 text-rose-600'
                                    : 'border-emerald-200 bg-emerald-100 text-emerald-600'
                                  : 'border-stone-200 bg-stone-50 text-stone-300'
                            }`}
                          >
                            {isCompleted
                              ? <CheckCircle size={13} weight="fill" />
                              : <span className="text-[8px] font-black">{stepIndex + 1}</span>
                            }
                          </span>
                          <div className="min-w-0">
                            <span className={`text-[12.5px] leading-tight ${
                              isCurrent
                                ? isCancelled
                                  ? "font-black text-rose-600"
                                  : "font-black text-stone-950"
                                : isCompleted
                                  ? isCancelled
                                    ? "font-semibold text-rose-500"
                                    : "font-semibold text-stone-600"
                                  : "text-stone-300"
                            }`}>
                              {step.label}
                            </span>
                            {(isCompleted || isCurrent) && (() => {
                              const timestampValue = getStepTimestamp(order, step.id, {
                                hasOnlinePayment,
                                isPaymentApproved,
                              });
                              if (!timestampValue) return null;
                              const t = new Date(timestampValue);
                              if (Number.isNaN(t.getTime())) return null;
                              return <p className="mt-1 flex w-fit items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"><Clock size={9} weight="bold" />{formatTimeOfDay(t, { padHour: true })}</p>;
                            })()}
                          </div>
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
                  className="rounded-3xl border border-[#d5e3ec] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,251,0.98))] p-5 shadow-[0_22px_42px_-34px_rgba(51,104,134,0.18)]"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-sm font-semibold text-stone-950">Resumo do pedido</p>
                    {paymentMeta?.label && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e4ed] bg-[linear-gradient(135deg,#ffffff,#edf5fa)] px-3 py-1 text-[11px] font-semibold text-[#336886]">
                        {paymentMeta.icon && (
                          <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                        )}
                        {paymentMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    {(itemsExpanded ? itemsToRender : itemsToRender.slice(0, 2)).map((item) => (
                      <div key={item.id || item.productId} className="flex items-start gap-3 rounded-2xl border border-[#dce9f1] bg-white/92 px-3 py-3 shadow-[0_12px_24px_-24px_rgba(51,104,134,0.12)]">
                        {/* Imagem */}
                        {item.imageUrl || item.image || item.product?.imageUrl ? (
                          <img
                            src={resolveAssetUrl(item.imageUrl || item.image || item.product?.imageUrl)}
                            alt={item.name}
                            className="h-10 w-10 shrink-0 rounded-xl border border-[#dce9f1] object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dce9f1] bg-[#edf5fa] text-base">
                            🍖
                          </div>
                        )}

                        {/* Nome + badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="shrink-0 rounded-md border border-[#dce9f1] bg-[#edf5fa] px-1.5 py-0.5 text-[11px] font-black text-[#336886]">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold leading-snug text-slate-900">{item.name}</span>
                          </div>
                          {(item?.cookingPoint || item?.passSkewer || formatSelectedModifiers(item?.selectedModifiers || []).length > 0) && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item?.cookingPoint && (
                                <span className="rounded-full border border-[#dce9f1] bg-[#f4f8fb] px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                  {item.cookingPoint}
                                </span>
                              )}
                              {item?.passSkewer && (
                                <span className="rounded-full border border-[#dce9f1] bg-[#f4f8fb] px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                  passar farinha
                                </span>
                              )}
                              {formatSelectedModifiers(item?.selectedModifiers || []).map((modifierName) => (
                                <span
                                  key={`${item.id || item.productId}-${modifierName}`}
                                  className="rounded-full border border-[#dce9f1] bg-[#f4f8fb] px-2 py-0.5 text-[11px] font-medium text-slate-500"
                                >
                                  + {modifierName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Preço */}
                        <div className="shrink-0 text-right">
                          {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                            <>
                              <p className="text-[11px] leading-none line-through text-slate-400">
                                {formatCurrency(Number(item.originalPrice) * (item.quantity || 1))}
                              </p>
                              <p className="mt-0.5 text-sm font-black text-[#336886]">
                                {formatCurrency(Number(item.price))}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-black text-slate-800">
                              {formatCurrency(Number(item.price) * (item.quantity || 1))}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                    {!itemsExpanded && itemsToRender.length > 2 && (
                      <button type="button" onClick={() => setItemsExpanded(true)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 active:scale-[0.98] transition-transform">
                        Ver todos os {itemsToRender.length} itens
                      </button>
                    )}
                  {hasDeliveryFee ? (
                    <div className="mt-5 flex items-center justify-between border-t border-[#dce9f1] pt-4 text-xs font-semibold text-slate-600">
                      <span>Frete</span>
                      <span className="rounded-full border border-[#dce9f1] bg-[#edf5fa] px-2 py-1 text-[#336886]">
                        {formatCurrency(order.deliveryFee)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between border-t border-[#dce9f1] pt-4">
                    <span className="text-lg font-bold text-slate-950">Total</span>
                    <span className="text-lg font-bold tracking-tight text-[#153A4C]">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </div>
                <div id="order-info-section" className="overflow-hidden rounded-3xl border border-[#d5e3ec] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,251,0.98))] shadow-[0_22px_42px_-34px_rgba(51,104,134,0.18)]">
                  <div className="border-b border-[#dce9f1] px-5 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">Informações do pedido</p>
                  </div>
                  <div className="space-y-4 px-4 py-4 sm:px-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TrackingMetaCard
                        label="Pagamento"
                        value={paymentMeta?.label || 'A confirmar'}
                        detail={paymentSummaryDetail}
                      />
                      {isCancelled && hasOnlinePayment && isPaymentApproved && !order?.refundStatus && (
                        <TrackingMetaCard label="Reembolso" value="Em análise" detail="O estabelecimento está processando a devolução" accent="default" />
                      )}
                      {isCancelled && order?.refundStatus === 'REFUNDED' && (
                        <TrackingMetaCard label="Reembolso" value="Processado" detail={order?.refundAmount ? `${formatCurrency(order.refundAmount)} devolvido` : 'Valor total devolvido'} accent="success" />
                      )}
                      {isCancelled && order?.refundStatus === 'PARTIALLY_REFUNDED' && (
                        <TrackingMetaCard label="Reembolso" value="Parcial" detail={order?.refundAmount ? `${formatCurrency(order.refundAmount)} devolvido` : 'Valor parcial devolvido'} accent="warning" />
                      )}
                      {isCancelled && order?.refundStatus === 'DENIED' && (
                        <TrackingMetaCard label="Reembolso" value="Não aprovado" detail={order?.refundReason || 'Entre em contato com o estabelecimento'} accent="warning" />
                      )}
                      <TrackingMetaCard
                        label="Total"
                        value={formatCurrency(order.total || 0)}
                        detail={deliveryFeeValue !== null ? `Frete ${formatCurrency(deliveryFeeValue)}` : isDelivery ? 'Entrega' : 'Retirada'}
                        accent="primary"
                      />
                    </div>

                    <div className="space-y-3">
                      {isAdminForStore && (
                        <TrackingInfoRow
                          icon={<User size={16} weight="duotone" />}
                          label="Cliente"
                          value={order.customerName || "Cliente"}
                        />
                      )}
                      {isAdminForStore && order.phone ? (
                        <TrackingInfoRow
                          icon={<Phone size={16} weight="duotone" />}
                          label="Telefone"
                          value={order.phone}
                        />
                      ) : null}

                      {order.type === 'table' ? (
                        <TrackingInfoRow
                          icon={<Package size={16} weight="duotone" />}
                          label="Mesa"
                          value={order.table || '-'}
                        />
                      ) : null}

                      {isDelivery && formatAddress(order.address || order.deliveryAddress) ? (
                        <TrackingInfoRow
                          icon={<MapPin size={16} weight="duotone" />}
                          label="Endereco de entrega"
                          value={formatAddress(order.address || order.deliveryAddress)}
                        />
                      ) : null}
                    </div>

                    {showMercadoPagoApproved && (
                      <div className="overflow-hidden rounded-[1.35rem] border border-[#009ee3]/20 bg-[linear-gradient(135deg,#f8fdff_0%,#ffffff_52%,#eefaff_100%)] p-[1px] shadow-[0_18px_34px_-30px_rgba(0,158,227,0.68)]">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] bg-white/94 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                              <SealCheck size={21} weight="fill" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-black leading-tight text-slate-950">
                                Pagamento aprovado
                              </span>
                              <span className="mt-0.5 block text-[11px] font-semibold leading-tight text-slate-500">
                                {mercadoPagoApprovalDetail}
                              </span>
                            </span>
                          </div>
                          <span className="ml-auto flex h-11 w-[142px] shrink-0 items-center justify-center rounded-[16px] border border-slate-200/85 bg-white px-2.5 shadow-[0_10px_24px_-20px_rgba(10,0,128,0.42)]">
                            <img src={mercadoPagoHorizontal} alt="Mercado Pago" className="h-8 w-[118px] object-contain" />
                          </span>
                        </div>
                      </div>
                    )}

                    {cashTenderedValue !== null ? (
                      <div className="rounded-[1.35rem] border border-amber-100/80 bg-[linear-gradient(135deg,#fffdf7,#faf6ee)] p-4 shadow-[0_18px_36px_-30px_rgba(120,53,15,0.16)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Pagamento em dinheiro</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <TrackingMetaCard
                            label="Cliente paga com"
                            value={formatCurrency(cashTenderedValue)}
                            detail="Valor informado para o troco"
                          />
                          <TrackingMetaCard
                            label="Troco"
                            value={cashChangeValue && cashChangeValue > 0 ? formatCurrency(cashChangeValue) : 'Sem troco'}
                            detail={cashChangeValue && cashChangeValue > 0 ? 'Troco previsto para o atendimento' : 'Nao ha troco para este pedido'}
                          />
                        </div>
                      </div>
                    ) : null}

                    {isCondominiumOrder && (
                      <div className="rounded-[1.35rem] border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900 shadow-[0_18px_36px_-30px_rgba(16,185,129,0.22)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">Feira no condominio</p>
                        <p className="mt-1 font-black">{condominiumOrder?.condominiumName || (order as any)?.condominiumName}</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">{condominiumFulfillmentLabel}</p>
                        {(condominiumUnit?.block || condominiumUnit?.tower || condominiumUnit?.apartment || condominiumUnit?.reference) && (
                          <p className="mt-1 text-xs leading-5 text-emerald-800">
                            {[condominiumUnit?.block && `Bloco/Torre ${condominiumUnit.block}`, condominiumUnit?.apartment && `Apto ${condominiumUnit.apartment}`, condominiumUnit?.reference].filter(Boolean).join(' | ')}
                          </p>
                        )}
                      </div>
                    )}

                    {isPostalDelivery && (
                      <div className="rounded-[1.35rem] border border-amber-100/80 bg-[linear-gradient(135deg,#fffdf7,#faf6ee)] p-4 shadow-[0_18px_36px_-30px_rgba(120,53,15,0.16)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Envio postal</p>
                        <div className="mt-3 space-y-2 text-sm text-stone-700">
                          <p><span className="font-semibold">Status:</span> {postalStatusLabel}</p>
                          <p className="text-stone-500">{postalStatusDetail}</p>
                          <p><span className="font-semibold">Servico:</span> {shipmentServiceName || shipmentServiceCode || 'A confirmar'}</p>
                          {!isCancelled && postalEstimatedDays ? <p><span className="font-semibold">Prazo estimado:</span> {postalEstimatedDays} dia(s) uteis</p> : null}
                          {!isCancelled && postalExpectedDeliveryDate ? <p><span className="font-semibold">Previsao de entrega:</span> {postalExpectedDeliveryDate.toLocaleDateString('pt-BR')}</p> : null}
                          {shipmentTrackingCode ? (
                            <p className="break-all"><span className="font-semibold">Codigo:</span> {shipmentTrackingCode}</p>
                          ) : !isCancelled ? (
                            <p className="text-stone-500">Codigo de rastreio ainda nao informado.</p>
                          ) : null}
                        </div>
                        {shipmentTrackingUrl && !isCancelled ? (
                          <a
                            href={shipmentTrackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-amber-50"
                          >
                            Acompanhar entrega
                          </a>
                        ) : null}
                      </div>
                    )}

                    {isPixPayment ? (
                      shouldHidePixPaymentBlockBase ? (
                        <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4">
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                            {isCancelled ? 'Pagamento confirmado antes do cancelamento' : 'Pagamento confirmado'}
                          </span>
                        </div>
                      ) : isCancelled ? (
                        <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50 p-4">
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700">
                            Pagamento nao concluido
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-[1.35rem] border border-amber-100/80 bg-[linear-gradient(135deg,#fffdf7,#faf6ee)] p-4 shadow-[0_18px_36px_-30px_rgba(120,53,15,0.16)]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-stone-900">Pagamento via Pix</span>
                            <span className="text-xs font-semibold text-stone-500">Use o QR Code ou chave</span>
                          </div>
                          {pixKey ? (
                            <>
                              <div className="mt-4 flex items-center justify-center">
                                <img
                                  src={pixQrUrl}
                                  alt="QR Code Pix"
                                  className="h-40 w-40 rounded-2xl border border-amber-200/80 bg-white object-contain"
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
                                className="mt-4 w-full rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-all duration-200 hover:bg-amber-50 active:scale-[0.97] active:opacity-80"
                              >
                                {pixCopied ? 'Copiado!' : 'Copiar codigo Pix'}
                              </button>
                            </>
                          ) : (
                            <div className="mt-3 text-xs text-stone-500">
                              A chave Pix da loja ainda nao foi cadastrada.
                            </div>
                          )}
                        </div>
                      )
                    ) : null}

                    {isDelivery && !isPostalDelivery && storeCoords?.lat && deliveryCoords?.lat && (
                      <div className="rounded-[1.35rem] border border-amber-100/80 bg-white/92 p-4 shadow-[0_18px_36px_-30px_rgba(120,53,15,0.16)]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-stone-900">Rota da entrega</span>
                          {deliveryRoute?.distanceKm ? (
                            <span className="text-xs font-semibold text-emerald-600">
                              {deliveryRoute.distanceKm.toFixed(1)} km
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <RouteMapView
                            origin={{ lat: Number(storeCoords.lat), lng: Number(storeCoords.lng) }}
                            destination={{ lat: Number(deliveryCoords.lat), lng: Number(deliveryCoords.lng) }}
                            compact
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
                          <span>Tempo de trajeto</span>
                          <span className="font-semibold text-stone-900">
                            {routeDurationMinutes !== null ? `${routeDurationMinutes} min` : routeLoading ? 'Calculando...' : '-'}
                          </span>
                        </div>
                        {deliveryEta ? (
                          <div className="mt-2 text-xs font-semibold text-emerald-700">
                            {etaForecastLabel}: {formatEtaMoment(deliveryEta)}
                          </div>
                        ) : null}
                        {etaDetails ? (
                          <div className="mt-3 space-y-2 rounded-xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf7,#faf6ee)] p-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                              <span>{isInTransitPhase ? 'Tempo de trajeto estimado' : 'Tempo de preparo estimado'}</span>
                              <span className="text-stone-950">
                                {etaTotalMinutes ? `~${etaTotalMinutes} min` : '-'}
                              </span>
                            </div>
                            {(etaDetails.prepMinutes !== undefined || etaDetails.queueMinutes !== undefined) && (
                              <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-stone-600">
                                {etaDetails.prepMinutes !== undefined && (
                                  <span className="rounded-full border border-amber-100 bg-white px-2 py-1">
                                    Tempo de preparo: {etaDetails.prepMinutes} min
                                  </span>
                                )}
                                {etaDetails.queueMinutes !== undefined && (
                                  <span className="rounded-full border border-amber-100 bg-white px-2 py-1">
                                    Fila: {etaDetails.queueMinutes} min
                                  </span>
                                )}
                                {etaDetails.travelMinutes !== undefined && etaDetails.travelMinutes !== null && (
                                  <span className="rounded-full border border-amber-100 bg-white px-2 py-1">
                                    Tempo de trajeto: {etaDetails.travelMinutes} min
                                  </span>
                                )}
                                {etaDetails.bufferMinutes !== undefined && (
                                  <span className="rounded-full border border-amber-100 bg-white px-2 py-1">
                                    Buffer: {etaDetails.bufferMinutes} min
                                  </span>
                                )}
                              </div>
                            )}
                            {etaWindowMin && etaWindowMax ? (
                              <div className="text-[11px] text-stone-500">
                                Janela prevista: {etaWindowMin}–{etaWindowMax} min
                              </div>
                            ) : null}
                            {trackingLoading ? (
                              <div className="text-[11px] text-stone-400">Atualizando acompanhamento...</div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {(isReady && elapsedMs > 0) || (remainingEstimateMinutes !== null && !isReady) || (isPostalDelivery && !isReady && postalRemainingDays !== null) || isEstimateDelayed || (!isPostalDelivery && etaWindowMin && etaWindowMax && !isReady) || (isPostalDelivery && postalExpectedDeliveryDate && !isReady) ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {isReady && elapsedMs > 0 ? (
                          <TrackingMetaCard
                            label="Tempo total"
                            value={formatDuration(elapsedMs)}
                            detail="Tempo total ate a conclusao do pedido"
                          />
                        ) : null}
                        {remainingEstimateMinutes !== null && !isReady ? (
                          <TrackingMetaCard
                            label={`${etaPhaseLabel} restante`}
                            value={`~${remainingEstimateMinutes} min`}
                            detail={etaForecastLabel}
                            accent={isEstimateDelayed ? 'warning' : 'primary'}
                          />
                        ) : null}
                        {isPostalDelivery && !isReady && postalRemainingDays !== null ? (
                          <TrackingMetaCard
                            label="Prazo restante"
                            value={`~${postalRemainingDays} dia(s)`}
                            detail="Estimativa atual para o envio postal"
                          />
                        ) : null}
                        {isEstimateDelayed ? (
                          <TrackingMetaCard
                            label="Previsao"
                            value="Em atraso"
                            detail="O pedido passou da estimativa inicial."
                            accent="warning"
                          />
                        ) : null}
                        {!isPostalDelivery && etaWindowMin && etaWindowMax && !isReady ? (
                          <TrackingMetaCard
                            label="Janela prevista"
                            value={`${etaWindowMin}–${etaWindowMax} min`}
                            detail="Faixa atual informada para este pedido"
                          />
                        ) : null}
                        {isPostalDelivery && postalExpectedDeliveryDate && !isReady ? (
                          <TrackingMetaCard
                            label="Previsao de entrega"
                            value={postalExpectedDeliveryDate.toLocaleDateString('pt-BR')}
                            detail="Estimativa atual dos Correios"
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {(order?.items?.length || storeWhatsappLink) ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {order?.items?.length ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCtaPulse(true);
                              window.setTimeout(() => setCtaPulse(false), 220);
                              handleRepeatOrder();
                            }}
                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3 text-[13px] font-bold text-white shadow-[0_18px_34px_-20px_rgba(51,104,134,0.46)] transition-transform active:scale-[0.98]"
                            style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
                          >
                            <ArrowClockwise size={15} weight="bold" />
                            Pedir de novo
                          </button>
                        ) : null}
                      </div>
                    ) : null}
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
                                  <div className={`rounded-lg border px-3 py-2 text-[11px] ${
                                    tipDirectToMotoboy
                                      ? 'border-sky-200 bg-sky-50 text-sky-800'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}>
                                    {tipDirectToMotoboy
                                      ? 'Esse Pix cai direto no Mercado Pago do entregador conectado.'
                                      : 'Depois do pagamento, a loja confirma o repasse manual para o entregador.'}
                                  </div>
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
                                      <p className="font-semibold">
                                        {tipDirectToMotoboy
                                          ? 'Pagamento confirmado. A gorjeta foi enviada direto ao entregador.'
                                          : 'Pagamento confirmado. Obrigado!'}
                                      </p>
                                      {tipDirectToMotoboy ? (
                                        <p className="mt-1 text-[11px] text-emerald-800/80">
                                          O valor foi liquidado na conta Mercado Pago conectada do entregador.
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : showTipPendingUi ? (
                                    <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white px-3 py-2 space-y-2 shadow-[0_10px_24px_-22px_rgba(234,88,12,0.85)]">
                                      <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/80 px-2.5 py-2">
                                        <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-[0.2em]">Tempo restante</span>
                                        <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-black text-white animate-pulse">
                                          {tipCountdownLabel}
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
                                            ? tipDirectToMotoboy
                                              ? 'Aguardando confirmação do Pix. Quando aprovar, a gorjeta cai direto no entregador.'
                                              : 'Aguardando confirmação do pagamento via Pix. Isso pode levar alguns segundos.'
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

    </div>
  );
}
