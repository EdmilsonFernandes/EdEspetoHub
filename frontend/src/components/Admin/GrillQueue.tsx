// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  Clock,
  Monitor,
  ArrowsClockwise,
  Plus,
  Minus,
  Hash,
  Truck,
  Storefront,
  ForkKnife,
  Printer,
  X
} from "@phosphor-icons/react";
import { orderService } from "../../services/orderService";
import { storeService } from "../../services/storeService";
import { productService } from "../../services/productService";
import { motoboyAdminService } from "../../services/motoboyAdminService";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatOrderDisplayId,
  formatOrderStatus,
  formatOrderType,
} from "../../utils/format";
import { formatSelectedModifiers, getModifiersSignature } from "../../utils/productModifiers";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";
import { useAuth } from "../../contexts/AuthContext";
import { buildPixPayload } from "../../utils/pixPayload";
import { printReceiptAsImage } from "../../utils/printReceiptImage";

const OrderSummaryCard = ({
  order,
  queueRank,
  orderDisplayId,
  isLate,
  elapsedLabel,
  statusMeta,
  typeMeta,
  paymentLabel,
  totalLabel,
  itemsCount,
  onClick,
  onPrint,
  canPrint,
  printBusy,
  archived = false,
}: any) => (
  (() => {
    const isDelivery = String(order?.type || '').toLowerCase() === 'delivery';
    const leftAccent = isDelivery ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-orange-500';
    const compactMeta = `${formatOrderType(order?.type)} • ${paymentLabel} • ID ${orderDisplayId}`;
    const hasTable = String(order?.type || '').toLowerCase() === 'table' && order?.table;
    return (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    }}
    className={`w-full rounded-xl border ${isLate ? 'border-red-300' : 'border-slate-200'} ${leftAccent} ${archived ? 'bg-slate-50/90 opacity-90' : 'bg-white'} p-3 text-left flex flex-col gap-2 transition-all duration-300 transition-transform hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] cursor-pointer`}
  >
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-2">
      <div className="min-w-0">
        <span className="px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded-md shadow-sm">
          #{String(queueRank).padStart(2, '0')}
        </span>
      </div>
      <div className="flex justify-center min-w-0">
        <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md whitespace-nowrap border ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        {hasTable && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[13px] font-black tracking-wide text-white whitespace-nowrap shadow-sm">
            <Hash size={12} weight="bold" />
            MESA {String(order.table).padStart(2, "0")}
          </span>
        )}
        <span className={`px-2 py-1 text-xs font-bold font-mono rounded-md shrink-0 whitespace-nowrap border ${isLate ? 'bg-red-500 text-white border-red-500' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
          {elapsedLabel}
        </span>
      </div>
    </div>

    <div className="min-w-0">
      <h3 className="text-base font-black text-slate-800 line-clamp-1">{order.customerName || order.name || 'Cliente'}</h3>
      <p className="mt-1 text-xs text-slate-500 font-medium line-clamp-1">{compactMeta}</p>
    </div>

    <div className="border-t border-slate-100 pt-2 mt-1 flex justify-end items-center">
      <div className="text-right flex items-center gap-1.5">
        <span className="text-sm font-bold text-slate-900">{totalLabel}</span>
        <span className="text-[11px] text-slate-500">{itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
        {canPrint && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrint();
            }}
            disabled={printBusy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-900 transition-all no-print disabled:opacity-60"
            aria-label={`Imprimir pedido ${orderDisplayId}`}
            title="Imprimir pedido"
          >
            <Printer size={15} weight="duotone" />
          </button>
        )}
      </div>
    </div>
  </div>
    );
  })()
);

export const GrillQueue = ({ forcedTab = 'queue' }: { forcedTab?: 'queue' | 'inroute' | 'completed' }) => {
  const SAO_PAULO_TZ = 'America/Sao_Paulo';
  const getDayKeyInSaoPaulo = (value?: number | string | Date | null) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: SAO_PAULO_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return '';
    }
  };
  const getNowKeyInSaoPaulo = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SAO_PAULO_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const getMinutesInSaoPaulo = (value?: number | string | Date | null) => {
    if (!value) return 0;
    try {
      const date = new Date(value);
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: SAO_PAULO_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(date);
      const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
      const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
      return hour * 60 + minute;
    } catch {
      return 0;
    }
  };
  const resolvePaymentBucket = (payment: unknown): 'pix' | 'cash' | 'card' => {
    const normalized = String(payment || '').toLowerCase();
    if (normalized.includes('pix')) return 'pix';
    if (
      normalized.includes('dinheiro') ||
      normalized.includes('cash') ||
      normalized.includes('espécie') ||
      normalized.includes('especie')
    ) {
      return 'cash';
    }
    return 'card';
  };
  // Tap feedback animation
  const pulseCta = (key: string) => {
    setCtaPulseId(key);
    window.setTimeout(() => setCtaPulseId(null), 220);
  };
  const { auth } = useAuth();
  const userRole = String(auth?.user?.role || '').toLowerCase();
  const hasPrintAccess = userRole === 'admin' || userRole === 'operator';
  const isAdminUser = String(auth?.user?.role || '').toUpperCase() === 'ADMIN';
  const storeNameForPrint = String(auth?.store?.name || auth?.store?.settings?.name || 'Minha Loja').trim();
  const prepSlaMinutes = useMemo(() => {
    const raw = Number(auth?.store?.settings?.prepBaseMinutes ?? 20);
    if (!Number.isFinite(raw)) return 20;
    return Math.max(5, Math.round(raw));
  }, [auth?.store?.settings?.prepBaseMinutes]);
  const prepAttentionMinutes = useMemo(() => {
    const fallback = Math.max(1, prepSlaMinutes - 5);
    const raw = Number(auth?.store?.settings?.prepAttentionMinutes ?? fallback);
    if (!Number.isFinite(raw)) return fallback;
    return Math.min(prepSlaMinutes, Math.max(1, Math.round(raw)));
  }, [auth?.store?.settings?.prepAttentionMinutes, prepSlaMinutes]);
  const PREP_SLA_MS = prepSlaMinutes * 60 * 1000;
  const PREP_ATTENTION_MS = prepAttentionMinutes * 60 * 1000;
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [storePixKey, setStorePixKey] = useState('');
  const [cashConfirmValue, setCashConfirmValue] = useState('');
  const storeSlug = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('adminSession');
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return parsed?.store?.slug || '';
    } catch {
      return '';
    }
  }, []);
  const [activeTab, setActiveTab] = useState<'queue' | 'inroute' | 'completed'>(
    forcedTab === 'inroute' || forcedTab === 'completed' ? forcedTab : 'queue'
  );
  const [completedPage, setCompletedPage] = useState(1);
  const [completedPageSize, setCompletedPageSize] = useState(9);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [confirmModal, setConfirmModal] = useState(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [ctaPulseId, setCtaPulseId] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("queueSoundEnabled");
    return saved ? saved === "true" : true;
  });
  const [activeMotoboysCount, setActiveMotoboysCount] = useState(0);
  const [closeDayModalOpen, setCloseDayModalOpen] = useState(false);
  const [isPrintingDaySummary, setIsPrintingDaySummary] = useState(false);
  const [tvMode, setTvMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("queueTvMode") === "true";
  });
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'late' | 'finalized'>('all');
  const [reportRange, setReportRange] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today');
  const [reportFrom, setReportFrom] = useState(() => getNowKeyInSaoPaulo());
  const [reportTo, setReportTo] = useState(() => getNowKeyInSaoPaulo());
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [bulkFinishing, setBulkFinishing] = useState(false);
  const [printSelectionModal, setPrintSelectionModal] = useState<{
    open: boolean;
    order: any | null;
    queueRank: number;
    hasPrintedItems: boolean;
    hasNewItems: boolean;
  }>({
    open: false,
    order: null,
    queueRank: 1,
    hasPrintedItems: false,
    hasNewItems: false,
  });
  const previousIdsRef = useRef<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isDrawerOpen = selectedOrder !== null;
  const isPaymentModalOpen = confirmModal !== null;

  const closeOrderOverlays = () => {
    setConfirmModal(null);
    setSelectedOrder(null);
  };

  const executePrintOrder = async (order: any, queueRank = 1, mode: 'all' | 'new' = 'all') => {
    if (!hasPrintAccess || !order?.id) return;
    if (isGeneratingPrint) return;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    if (!orderItems.length) {
      setError('Pedido sem itens para impressão.');
      return;
    }
    const newItems = orderItems.filter((item: any) => !Boolean(item?.isPrinted));
    const itemsToPrint = mode === 'new' ? newItems : orderItems;
    if (!itemsToPrint.length) {
      setError('Nenhum item novo para imprimir.');
      return;
    }
    const printedIds = itemsToPrint
      .map((item: any) => String(item?.id || '').trim())
      .filter(Boolean);
    if (!printedIds.length) {
      setError('Itens sem ID para atualização de impressão.');
      return;
    }

    const payload = {
      order,
      queueRank,
      orderDisplayId: formatOrderDisplayId(order.id, storeSlug),
      createdAt: order?.createdAt
        ? new Date(order.createdAt).toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ })
        : new Date().toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ }),
      items: itemsToPrint,
      total:
        mode === 'new'
          ? itemsToPrint.reduce((acc: number, item: any) => {
              const qty = Number(item?.qty ?? item?.quantity ?? 0);
              const unit = Number(item?.unitPrice ?? item?.price ?? 0);
              return acc + qty * unit;
            }, 0)
          : Number(order?.total || 0),
      storeName: String(order?.storeName || auth?.store?.name || 'Sertanejo no Espeto'),
      table: order?.table || '',
    };
    setIsGeneratingPrint(true);
    setError('Gerando cupom...');
    try {
      await printReceiptAsImage({
        storeName: (payload.storeName || storeNameForPrint || 'Minha Loja').toUpperCase(),
        platformName: 'Já no Caminho',
        queueLabel: `#${String(payload.queueRank || 1).padStart(2, '0')}`,
        orderLabel: `#${payload.orderDisplayId}`,
        customerLabel: payload.order?.customerName || payload.order?.name || 'Cliente',
        tableLabel: payload.table ? String(payload.table) : '',
        dateLabel: payload.createdAt,
        items: payload.items.map((item: any) => {
          const qty = Number(item?.qty ?? item?.quantity ?? 0);
          const unit = Number(item?.unitPrice ?? item?.price ?? 0);
          return {
            quantity: qty,
            name: String(item?.name || 'Item'),
            lineTotal: formatCurrency(qty * unit),
            notes: item?.cookingPoint || item?.options ? String(item?.cookingPoint || item?.options || '') : '',
          };
        }),
        totalLabel: formatCurrency(payload.total),
      });
    } catch (printError) {
      console.error('[print] erro ao imprimir', printError);
      setError('Falha ao disparar impressão. Marcando itens como impressos no sistema.');
    } finally {
      try {
        await orderService.markItemsPrinted(order.id, printedIds);
      } catch (syncError) {
        console.error('[print] erro ao sincronizar isPrinted', syncError);
      }
      const printedSet = new Set(printedIds);
      const nextItems = orderItems.map((item: any) =>
        printedSet.has(String(item?.id || '').trim()) ? { ...item, isPrinted: true } : item
      );
      setQueue((prev) =>
        prev.map((entry) =>
          entry.id === order.id ? { ...entry, items: nextItems } : entry
        )
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev: any) => (prev ? { ...prev, items: nextItems } : prev));
      }
      setError('');
      setIsGeneratingPrint(false);
    }
  };

  const openPrintSelectionModal = (order: any, queueRank = 1) => {
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const hasPrintedItems = orderItems.some((item: any) => Boolean(item?.isPrinted));
    const hasNewItems = orderItems.some((item: any) => !Boolean(item?.isPrinted));
    setPrintSelectionModal({
      open: true,
      order,
      queueRank,
      hasPrintedItems,
      hasNewItems,
    });
  };

  const handlePrintOrder = async (order: any, queueRank = 1) => {
    if (!hasPrintAccess || !order?.id) return;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    if (!orderItems.length) {
      setError('Pedido sem itens para impressão.');
      return;
    }
    openPrintSelectionModal(order, queueRank);
  };

  const closePrintSelectionModal = () => {
    if (isGeneratingPrint) return;
    setPrintSelectionModal({
      open: false,
      order: null,
      queueRank: 1,
      hasPrintedItems: false,
      hasNewItems: false,
    });
  };

  const handleSelectPrintMode = async (mode: 'all' | 'new') => {
    const order = printSelectionModal.order;
    const queueRank = printSelectionModal.queueRank || 1;
    closePrintSelectionModal();
    await executePrintOrder(order, queueRank, mode);
  };

  const handleMarkAllPrinted = async (order: any) => {
    if (!order?.id) return;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const pendingIds = orderItems
      .filter((item: any) => !Boolean(item?.isPrinted))
      .map((item: any) => String(item?.id || '').trim())
      .filter(Boolean);
    if (!pendingIds.length) {
      setError('Todos os itens já estão marcados como impressos.');
      return;
    }
    try {
      setIsGeneratingPrint(true);
      await orderService.markItemsPrinted(order.id, pendingIds);
      const pendingSet = new Set(pendingIds);
      const nextItems = orderItems.map((item: any) =>
        pendingSet.has(String(item?.id || '').trim()) ? { ...item, isPrinted: true } : item
      );
      setQueue((prev) => prev.map((entry) => (entry.id === order.id ? { ...entry, items: nextItems } : entry)));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev: any) => (prev ? { ...prev, items: nextItems } : prev));
      }
      setError('');
    } catch (syncError) {
      console.error('[print] erro ao marcar todos como impressos', syncError);
      setError('Não foi possível marcar itens como impressos.');
    } finally {
      setIsGeneratingPrint(false);
    }
  };

  const orderTypeMeta = (order: any) => {
    const type = String(order?.type || '').toLowerCase();
    if (type === 'delivery') {
      return {
        label: 'Entrega',
        pill: 'bg-sky-100 text-sky-800 border-sky-200',
        icon: <Truck size={14} weight="duotone" />,
      };
    }
    if (type === 'pickup') {
      return {
        label: 'Retirada',
        pill: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Storefront size={14} weight="duotone" />,
      };
    }
    if (type === 'table') {
      const table = order?.table ? `Mesa ${order.table}` : 'Mesa';
      return {
        label: table,
        pill: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
        icon: <ForkKnife size={14} weight="duotone" />,
      };
    }
    return {
      label: formatOrderType(order?.type),
      pill: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <Hash size={14} weight="duotone" />,
    };
  };

  const calcMoney = (order: any) => {
    const fee =
      String(order?.type || '').toLowerCase() === 'delivery' && order?.deliveryFee !== null && order?.deliveryFee !== undefined
        ? Number(order.deliveryFee)
        : 0;
    const total = Number(order?.total || 0);
    const safeFee = Number.isFinite(fee) ? fee : 0;
    const itemsTotal = Math.max(0, total - safeFee);
    const itemsVolume = (order?.items || []).reduce((sum: number, item: any) => sum + Number(item?.qty || 0), 0);
    return { fee: safeFee, total, itemsTotal, itemsVolume };
  };

  const renderMoneyBreakdown = (order: any, alignRight = false) => {
    const { fee, total, itemsVolume } = calcMoney(order);
    if (fee <= 0) {
      return (
        <div
          className={[
            'grid w-full min-w-0 grid-cols-1 gap-2 text-[10px] sm:grid-cols-2 sm:text-[11px] font-semibold',
            alignRight ? 'sm:ml-auto' : '',
          ].join(' ')}
        >
          <span className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
            <span className="text-slate-500 font-semibold text-[10px]">Volume</span>
            <span className="truncate">{itemsVolume} {itemsVolume === 1 ? 'item' : 'itens'}</span>
          </span>
          <span className="flex min-w-0 flex-col rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
            <span className="text-emerald-600 font-semibold text-[10px]">Total a pagar</span>
            <span className="truncate">{formatCurrency(total)}</span>
          </span>
        </div>
      );
    }
    return (
      <div
        className={[
          'grid w-full min-w-0 grid-cols-1 gap-2 text-[10px] sm:grid-cols-3 sm:text-[11px] font-semibold',
          alignRight ? 'sm:ml-auto' : '',
        ].join(' ')}
      >
        <span className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5">
          <span className="text-slate-500 font-semibold text-[10px]">Volume</span>
          <span className="truncate">{itemsVolume} {itemsVolume === 1 ? 'item' : 'itens'}</span>
        </span>
        <span className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5">
          <span className="text-slate-500 font-semibold text-[10px]">Frete</span>
          <span className="truncate">{fee > 0 ? formatCurrency(fee) : '—'}</span>
        </span>
        <span className="flex min-w-0 flex-col rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
          <span className="text-emerald-600 font-semibold text-[10px]">Total a pagar</span>
          <span className="truncate">{formatCurrency(total)}</span>
        </span>
      </div>
    );
  };
  const itemOrderRef = useRef<Map<string, Map<string, number>>>(new Map());
  useEffect(() => {
    const sessionPixKey = auth?.store?.settings?.pixKey || '';
    if (sessionPixKey) {
      setStorePixKey(sessionPixKey);
      return;
    }
    if (!storeSlug) return;
    const loadPixKey = async () => {
      try {
        const store = await storeService.fetchBySlug(storeSlug);
        const fetchedKey = store?.settings?.pixKey || '';
        if (fetchedKey) {
          setStorePixKey(fetchedKey);
        }
      } catch (error) {
        console.error('Falha ao carregar chave Pix', error);
      }
    };
    loadPixKey();
  }, [auth?.store?.settings?.pixKey, storeSlug]);

  useEffect(() => {
    const loadMotoboys = async () => {
      const storeId = auth?.store?.id;
      if (!storeId) return;
      try {
        const data = await motoboyAdminService.list(storeId);
        const links = Array.isArray(data) ? data : [];
        setActiveMotoboysCount(links.filter((link) => link.active).length);
      } catch {
        setActiveMotoboysCount(0);
      }
    };
    loadMotoboys();
  }, [auth?.store?.id]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("queueTvMode", String(tvMode));
    if (tvMode) {
      setActiveTab("queue");
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [tvMode]);
  const toggleTvMode = () => {
    setTvMode((prev) => !prev);
  };
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar farinha');
    const selected = formatSelectedModifiers(item?.selectedModifiers || []);
    if (selected.length) labels.push(`+ ${selected.join(', ')}`);
    return labels.length ? labels.join(' • ') : '';
  };
  const getPriorityTone = (position) => {
    if (position === 1) return "bg-red-600 text-white";
    if (position === 2) return "bg-amber-500 text-white";
    if (position === 3) return "bg-yellow-400 text-slate-900";
    return "bg-slate-100 text-slate-700";
  };
  const getItemBaseKey = (item) =>
    `${item?.productId || item?.name || ''}-${item?.cookingPoint || ''}-${item?.passSkewer ? '1' : '0'}-${getModifiersSignature(item?.selectedModifiers || [])}`;

  const resolvePromoMeta = (item: any) => {
    const product = productsById.get(item.productId || item.id);
    const promoActive = Boolean(item.promoActive ?? product?.promoActive);
    const promoPrice =
      item.promoPrice != null
        ? Number(item.promoPrice)
        : product?.promoPrice != null
        ? Number(product.promoPrice)
        : null;
    const originalPrice =
      item.originalPrice != null
        ? Number(item.originalPrice)
        : product?.price != null
        ? Number(product.price)
        : null;
    const unitPrice = item.unitPrice ?? (item.price && item.qty ? item.price / item.qty : item.price);
    return {
      promoActive: promoActive && !!promoPrice,
      promoPrice,
      originalPrice,
      unitPrice: Number(unitPrice ?? 0),
    };
  };
  const assignItemKeys = (orderId, items = []) => {
    if (!orderId) return items.map((item) => ({ item, key: getItemBaseKey(item) }));
    const map = itemOrderRef.current.get(orderId) || new Map<string, number>();
    const existingByBase = new Map<string, string[]>();
    for (const key of map.keys()) {
      const base = key.split('::')[0];
      const list = existingByBase.get(base) || [];
      list.push(key);
      existingByBase.set(base, list);
    }
    const usedCount = new Map<string, number>();
    return items.map((item) => {
      const base = getItemBaseKey(item);
      const existingList = existingByBase.get(base) || [];
      const used = usedCount.get(base) || 0;
      let key = existingList[used];
      if (!key) {
        const occurrence = existingList.length + used + 1;
        key = `${base}::${occurrence}`;
      }
      usedCount.set(base, used + 1);
      return { item, key };
    });
  };
  const ensureOrderIndex = (orderId, items = []) => {
    if (!orderId) return;
    const map = itemOrderRef.current.get(orderId) || new Map<string, number>();
    let nextIndex = map.size;
    const assignedItems = assignItemKeys(orderId, items);
    assignedItems.forEach(({ key }) => {
      if (!map.has(key)) {
        map.set(key, nextIndex++);
      }
    });
    itemOrderRef.current.set(orderId, map);
  };
  const getOrderedItems = (orderId, items = []) => {
    const assignedItems = assignItemKeys(orderId, items);
    ensureOrderIndex(orderId, items);
    const map = itemOrderRef.current.get(orderId) || new Map<string, number>();
    return [...assignedItems].sort((a, b) => {
      const indexA = map.get(a.key) ?? 0;
      const indexB = map.get(b.key) ?? 0;
      return indexA - indexB;
    }).map(({ item }) => item);
  };

  const productsById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const ensureAudioContext = async () => {
    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") {
      await context.resume();
    }
    return context;
  };

  const playNewOrderSound = () => {
    if (!soundEnabled) return;
    try {
      const context = audioContextRef.current || new AudioContext();
      audioContextRef.current = context;
      if (context.state === "suspended") {
        return;
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.07;

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
    } catch (err) {
      console.error("Não foi possível tocar o som", err);
    }
  };

  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      await ensureAudioContext().catch(() => {});
    }
  };

  const loadQueue = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await orderService.fetchQueue();
      const nextIds = (data || []).map((order) => order.id);
      const previousIds = previousIdsRef.current;
      const incoming = nextIds.filter((id) => !previousIds.includes(id));
      const hasNew = incoming.length > 0;
      if (hasNew) {
        playNewOrderSound();
        setNewOrderIds(incoming);
        window.setTimeout(() => setNewOrderIds([]), 4000);
      }
      previousIdsRef.current = nextIds;
      setQueue(data);
    } catch (err) {
      console.error('Erro ao buscar fila', err);
      setError('Não foi possível carregar os pedidos agora. Faça login novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    let interval: number | undefined;
    const startPolling = () => {
      if (interval) return;
      interval = window.setInterval(loadQueue, 5000);
    };
    const stopPolling = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = undefined;
    };
    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };
    startPolling();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    const unsubProducts = productService.subscribe(setProducts);

    return () => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      unsubProducts();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("queueSoundEnabled", String(soundEnabled));
    if (!soundEnabled) return;

    const unlock = () => {
      ensureAudioContext().catch(() => {});
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [soundEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvance = async (orderId, status) => {
    const previousQueue = queue;
    try {
      setUpdating(orderId);
      // Mantém visão panorâmica após qualquer ação.
      setQueueFilter('all');
      // Atualização otimista para o pedido sumir/andar imediatamente na UI.
      setQueue((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order
        )
      );
      setSelectedOrder((prev: any) =>
        prev?.id === orderId
          ? {
              ...prev,
              status,
            }
          : prev
      );
      await orderService.updateStatus(orderId, status);
      setError('');
      // Não bloqueia a UI aguardando a recarga total da fila.
      void loadQueue();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar status', err);
      setQueue(previousQueue);
      setError('Não foi possível atualizar o status agora. Tente novamente.');
      return false;
    } finally {
      setUpdating(null);
    }
  };

  const openPaymentConfirm = (order) => {
    setCashConfirmValue('');
    setConfirmModal({
      id: order.id,
      customerName: order.customerName || order.name || 'Cliente',
      total: order.total || 0,
      table: order.table || null,
      payment: order.payment,
      phone: order.phone || '',
      pixKey: storePixKey,
    });
  };

  useEffect(() => {
    if (!confirmModal) return;
    setPixCopied(false);
  }, [confirmModal]);

  const handleConfirmPaid = async () => {
    if (!confirmModal?.id) return;
    const success = await handleAdvance(confirmModal.id, 'done');
    if (success) {
      setConfirmModal(null);
      setSelectedOrder(null);
    }
  };

  const handleFinalizeAllReady = async () => {
    if (bulkFinishing) return;
    const targetOrders = readyToFinalizeOrders;
    if (!targetOrders.length) return;

    const proceed = window.confirm(
      `Finalizar ${targetOrders.length} pedido(s) prontos agora?\n\nEsta ação confirma pagamento e conclui os pedidos.`
    );
    if (!proceed) return;

    setBulkFinishing(true);
    setError('');
    const targetIds = new Set(targetOrders.map((order) => String(order.id)));
    const previousQueue = queue;

    setQueue((prev) =>
      prev.map((order) =>
        targetIds.has(String(order.id))
          ? {
              ...order,
              status: 'done',
            }
          : order
      )
    );
    setConfirmModal((prev) => (prev && targetIds.has(String(prev.id)) ? null : prev));
    setSelectedOrder((prev: any) => (prev && targetIds.has(String(prev.id)) ? null : prev));

    try {
      const results = await Promise.allSettled(
        targetOrders.map((order) => orderService.updateStatus(order.id, 'done'))
      );
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        setQueue(previousQueue);
        setError(
          failedCount === targetOrders.length
            ? 'Não foi possível finalizar os pedidos agora. Tente novamente.'
            : `${failedCount} pedido(s) falharam ao finalizar. Atualize a fila.`
        );
      } else {
        setError('');
      }
    } catch (error) {
      setQueue(previousQueue);
      setError('Falha ao finalizar pedidos em lote. Tente novamente.');
    } finally {
      setBulkFinishing(false);
      void loadQueue();
    }
  };

  const applyItemsChange = async (orderId, updater) => {
    const targetOrder = queue.find((entry) => entry.id === orderId);
    const baseItems = getOrderedItems(orderId, targetOrder?.items || []);
    const updatedItems = updater(baseItems);

    const sanitizedItems = updatedItems.filter((item) => item.qty > 0);
    ensureOrderIndex(orderId, sanitizedItems);

    const nextTotal = sanitizedItems.reduce(
      (sum, item) => sum + (item.unitPrice ?? item.price ?? 0) * item.qty,
      0
    );

    if (sanitizedItems.length === 0) {
      setQueue((prev) => prev.filter((order) => order.id !== orderId));
      setSelectedOrder((prev: any) => (prev?.id === orderId ? null : prev));
    } else {
      setQueue((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, items: sanitizedItems, total: nextTotal } : order
        )
      );
      setSelectedOrder((prev: any) =>
        prev?.id === orderId
          ? {
              ...prev,
              items: sanitizedItems,
              total: nextTotal,
            }
          : prev
      );
    }

    try {
      await orderService.updateItems(orderId, sanitizedItems, nextTotal);
      if (sanitizedItems.length === 0) {
        await orderService.updateStatus(orderId, 'cancelled');
      }
      setError('');
      // Sincroniza em background sem atrasar feedback local.
      void loadQueue();
    } catch (err) {
      console.error('Erro ao atualizar itens', err);
      setError('Não foi possível atualizar os itens agora. Atualize a fila.');
    }
  };

  const handleQuantityChange = (orderId, itemId, delta) => {
    applyItemsChange(orderId, (items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              qty: Math.max(0, item.qty + delta),
              isPrinted: delta > 0 ? false : Boolean(item.isPrinted),
            }
          : item
      )
    );
  };

  const handleAddItem = (orderId) => {
    const productId = selectedProducts[orderId];
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return;

    applyItemsChange(orderId, (items) => {
      return [
        ...items,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          unitPrice: product.price,
          qty: 1,
          isPrinted: false,
        },
      ];
    });
  };

  const elapsedTime = useMemo(
    () =>
      queue.reduce(
        (acc, order) => ({
          ...acc,
          [order.id]: formatDuration(order.createdAt ? currentTime - order.createdAt : 0),
        }),
        {}
      ),
    [currentTime, queue]
  );

  const productionQueue = useMemo(() => {
    const statuses = new Set([ 'pending', 'preparing', 'ready' ]);
    return [...queue]
      .filter((order) => statuses.has(order.status))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queue]);

  const awaitingMotoboyQueue = useMemo(() => {
    return [...queue]
      .filter(
        (order) =>
          order.type === 'delivery' &&
          [ 'ready_for_delivery', 'waiting_for_motoboy' ].includes(order.status)
      )
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queue]);

  const inRouteQueue = useMemo(() => {
    return [...queue]
      .filter((order) => order.status === 'in_delivery')
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queue]);

  const completedOrders = useMemo(() => {
    const completedStatuses = new Set([ 'done', 'delivered', 'finished' ]);
    return [...queue]
      .filter((order) => completedStatuses.has(order.status))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [queue]);
  const completedToday = useMemo(() => {
    const todayKey = getNowKeyInSaoPaulo();
    return completedOrders.filter((order) => getDayKeyInSaoPaulo(order.createdAt) === todayKey);
  }, [completedOrders]);
  const completedRecent12h = useMemo(() => {
    const since = Date.now() - 12 * 60 * 60 * 1000;
    return completedOrders.filter((order) => Number(order?.createdAt || 0) >= since);
  }, [completedOrders]);
  const reportCompleted = useMemo(() => {
    const todayKey = getNowKeyInSaoPaulo();
    const yesterdayKey = getDayKeyInSaoPaulo(Date.now() - 24 * 60 * 60 * 1000);
    if (reportRange === 'today') {
      return completedOrders.filter((order) => getDayKeyInSaoPaulo(order.createdAt) === todayKey);
    }
    if (reportRange === 'yesterday') {
      return completedOrders.filter((order) => getDayKeyInSaoPaulo(order.createdAt) === yesterdayKey);
    }
    if (reportRange === 'last7') {
      const startMs = Date.now() - 6 * 24 * 60 * 60 * 1000;
      return completedOrders.filter((order) => Number(order.createdAt || 0) >= startMs);
    }
    const from = reportFrom || todayKey;
    const to = reportTo || from;
    return completedOrders.filter((order) => {
      const key = getDayKeyInSaoPaulo(order.createdAt);
      return key >= from && key <= to;
    });
  }, [completedOrders, reportRange, reportFrom, reportTo]);
  const reportSummary = useMemo(() => {
    const totals = reportCompleted.reduce(
      (acc, order) => {
        const { total, fee } = calcMoney(order);
        acc.sales += Number.isFinite(total) ? total : 0;
        acc.deliveryFees += Number.isFinite(fee) ? fee : 0;
        acc.items += (order?.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);
        const bucket = resolvePaymentBucket(order?.payment);
        acc[bucket] += Number.isFinite(total) ? total : 0;
        return acc;
      },
      { sales: 0, deliveryFees: 0, items: 0, pix: 0, cash: 0, card: 0 }
    );
    const ordersCount = reportCompleted.length;
    const averageTicket = ordersCount > 0 ? totals.sales / ordersCount : 0;
    return {
      ordersCount,
      sales: totals.sales,
      deliveryFees: totals.deliveryFees,
      averageTicket,
      itemsCount: totals.items,
      pix: totals.pix,
      cash: totals.cash,
      card: totals.card,
    };
  }, [reportCompleted]);
  const dailySalesSummary = useMemo(() => {
    const totals = completedToday.reduce(
      (acc, order) => {
        const { total } = calcMoney(order);
        const amount = Number.isFinite(total) ? total : 0;
        const bucket = resolvePaymentBucket(order?.payment);
        acc.total += amount;
        acc.orders += 1;
        acc[bucket] += amount;
        return acc;
      },
      { total: 0, orders: 0, pix: 0, cash: 0, card: 0 }
    );
    return totals;
  }, [completedToday]);
  const salesVsYesterday = useMemo(() => {
    const completedStatuses = new Set([ 'done', 'delivered', 'finished' ]);
    const now = Date.now();
    const yesterdayKey = getDayKeyInSaoPaulo(now - 24 * 60 * 60 * 1000);
    const currentMinutes = getMinutesInSaoPaulo(now);
    const yesterdayUntilNow = queue
      .filter((order) => {
        if (!completedStatuses.has(order.status)) return false;
        if (getDayKeyInSaoPaulo(order.createdAt) !== yesterdayKey) return false;
        return getMinutesInSaoPaulo(order.createdAt) <= currentMinutes;
      })
      .reduce((sum, order) => {
        const { total } = calcMoney(order);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0);
    const today = Number(dailySalesSummary.total || 0);
    const delta = today - yesterdayUntilNow;
    const deltaPct = yesterdayUntilNow > 0 ? (delta / yesterdayUntilNow) * 100 : 0;
    return {
      yesterdayUntilNow,
      delta,
      deltaPct,
      positive: delta >= 0,
      hasBase: yesterdayUntilNow > 0,
    };
  }, [queue, dailySalesSummary.total]);
  const reportComparison = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const toDateMs = (dateKey: string, endOfDay = false) => {
      const [year, month, day] = String(dateKey || '').split('-').map(Number);
      if (!year || !month || !day) return Date.now();
      const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
      return date.getTime();
    };
    let currentStart = 0;
    let currentEnd = Date.now();
    if (reportRange === 'today') {
      currentStart = toDateMs(getNowKeyInSaoPaulo());
    } else if (reportRange === 'yesterday') {
      const key = getDayKeyInSaoPaulo(Date.now() - oneDay);
      currentStart = toDateMs(key);
      currentEnd = toDateMs(key, true);
    } else if (reportRange === 'last7') {
      currentStart = Date.now() - 6 * oneDay;
    } else {
      currentStart = toDateMs(reportFrom || getNowKeyInSaoPaulo());
      currentEnd = toDateMs(reportTo || reportFrom || getNowKeyInSaoPaulo(), true);
    }
    const span = Math.max(oneDay, currentEnd - currentStart + 1);
    const prevEnd = currentStart - 1;
    const prevStart = prevEnd - span + 1;
    const previousSales = completedOrders
      .filter((order) => {
        const createdAt = Number(order?.createdAt || 0);
        return createdAt >= prevStart && createdAt <= prevEnd;
      })
      .reduce((sum, order) => {
        const { total } = calcMoney(order);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0);
    const currentSales = Number(reportSummary.sales || 0);
    const delta = currentSales - previousSales;
    const deltaPct = previousSales > 0 ? (delta / previousSales) * 100 : 0;
    return {
      previousSales,
      currentSales,
      delta,
      deltaPct,
      positive: delta >= 0,
      hasBase: previousSales > 0,
    };
  }, [reportRange, reportFrom, reportTo, completedOrders, reportSummary.sales]);
  const handlePrintDailySummary = async () => {
    if (isPrintingDaySummary) return;
    const nowLabel = new Date().toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ });
    const dayLabel = new Date().toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ });
    const totalOrders = Number(dailySalesSummary.orders || 0);
    setIsPrintingDaySummary(true);
    try {
      await printReceiptAsImage({
        storeName: (storeNameForPrint || 'Minha Loja').toUpperCase(),
        platformName: 'Já no Caminho',
        queueLabel: 'FECHAMENTO DO DIA',
        orderLabel: dayLabel,
        customerLabel: 'Resumo operacional',
        tableLabel: '',
        dateLabel: nowLabel,
        items: [
          { quantity: 1, name: `Total de pedidos: ${totalOrders}`, lineTotal: '' },
          { quantity: 1, name: 'Pix', lineTotal: formatCurrency(dailySalesSummary.pix) },
          { quantity: 1, name: 'Dinheiro', lineTotal: formatCurrency(dailySalesSummary.cash) },
          { quantity: 1, name: 'Cartão', lineTotal: formatCurrency(dailySalesSummary.card) },
        ],
        totalLabel: formatCurrency(dailySalesSummary.total),
      });
      setError('Fechamento enviado para impressão.');
    } catch (printError) {
      console.error('[print] erro ao imprimir fechamento', printError);
      setError('Falha ao imprimir fechamento do dia.');
    } finally {
      setIsPrintingDaySummary(false);
    }
  };
  const completedTotalPages = Math.max(1, Math.ceil(reportCompleted.length / completedPageSize));
  const pagedCompleted = useMemo(() => {
    const start = (completedPage - 1) * completedPageSize;
    return reportCompleted.slice(start, start + completedPageSize);
  }, [reportCompleted, completedPage]);

  const queueMetrics = useMemo(() => {
    const now = Date.now();
    const withAges = productionQueue.map((order) => {
      const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : now;
      const ageMs = Math.max(0, now - createdAt);
      return { ...order, ageMs };
    });
    const pending = withAges.filter((o) => o.status === 'pending').length;
    const preparing = withAges.filter((o) => o.status === 'preparing').length;
    const ready = withAges.filter((o) => o.status === 'ready').length;
    const late = withAges.filter((o) => o.ageMs > PREP_SLA_MS).length;
    const avgMs =
      withAges.length > 0
        ? withAges.reduce((acc, cur) => acc + cur.ageMs, 0) / withAges.length
        : 0;
    const oldest = withAges.reduce((acc, cur) => (cur.ageMs > acc ? cur.ageMs : acc), 0);
    return { pending, preparing, ready, late, avgMs, oldest };
  }, [productionQueue, currentTime, PREP_SLA_MS]);

  const allActiveQueue = useMemo(() => {
    const activeStatuses = new Set([ 'pending', 'preparing', 'ready', 'waiting_for_motoboy', 'ready_for_delivery', 'in_delivery' ]);
    return [...queue]
      .filter((order) => activeStatuses.has(String(order?.status || '').toLowerCase()))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queue]);
  const filteredProductionQueue = useMemo(() => {
    if (queueFilter === 'all') return allActiveQueue;
    if (queueFilter === 'finalized') return completedRecent12h;
    if (queueFilter === 'pending') return allActiveQueue.filter((order) => order.status === 'pending');
    if (queueFilter === 'preparing') return allActiveQueue.filter((order) => order.status === 'preparing');
    if (queueFilter === 'ready') {
      return allActiveQueue.filter((order) => order.status === 'ready');
    }
    if (queueFilter === 'late') {
      const now = Date.now();
      return allActiveQueue.filter((order) => {
        const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : now;
        const ageMs = Math.max(0, now - createdAt);
        return ageMs > PREP_SLA_MS;
      });
    }
    return allActiveQueue;
  }, [allActiveQueue, completedRecent12h, queueFilter, currentTime, PREP_SLA_MS]);

  const readyToFinalizeOrders = useMemo(
    () => allActiveQueue.filter((order) => String(order?.status || '').toLowerCase() === 'ready'),
    [allActiveQueue]
  );
  const selectedOrderRank = useMemo(() => {
    if (!selectedOrder?.id) return 1;
    const idx = filteredProductionQueue.findIndex((order) => order.id === selectedOrder.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [filteredProductionQueue, selectedOrder?.id]);

  useEffect(() => {
    if (activeTab === 'completed') {
      setCompletedPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (forcedTab === 'queue' || forcedTab === 'inroute' || forcedTab === 'completed') {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  useEffect(() => {
    if (activeTab !== 'queue') {
      closeOrderOverlays();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedOrder) return;
    const latest = queue.find((order) => order.id === selectedOrder.id);
    if (!latest) {
      closeOrderOverlays();
      return;
    }
    if (String(latest.status || '').toLowerCase() === 'done' || String(latest.status || '').toLowerCase() === 'cancelled') {
      closeOrderOverlays();
      return;
    }
    if (latest !== selectedOrder) {
      setSelectedOrder(latest);
    }
  }, [queue, selectedOrder]);
  useEffect(() => {
    setCompletedPage(1);
  }, [completedPageSize]);

  useEffect(() => {
    if (completedPage > completedTotalPages) {
      setCompletedPage(completedTotalPages);
    }
  }, [completedPage, completedTotalPages]);

  const getStatusStyles = (status, orderType) => {
    if (status === "preparing") {
      return { label: "Em atendimento", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (status === "ready" || status === "ready_for_delivery" || status === "waiting_for_motoboy") {
      const label =
        orderType === "delivery"
          ? "Pronto"
          : orderType === "pickup"
          ? "Pronto"
          : "Pronto";
      return { label, className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    return { label: "Aguardando", className: "bg-amber-50 text-amber-700 border-amber-100" };
  };
  const timelineStyles = {
    pending: { dot: "bg-amber-500", text: "text-amber-700" },
    preparing: { dot: "bg-sky-500", text: "text-sky-700" },
    ready: { dot: "bg-violet-500", text: "text-violet-700" },
    done: { dot: "bg-emerald-500", text: "text-emerald-700" },
  };

  const renderTimeline = (status, orderType) => {
    const normalizedStatus = (() => {
      if (orderType === 'delivery' && (status === 'ready_for_delivery' || status === 'waiting_for_motoboy')) return 'ready';
      if (orderType === 'delivery' && status === 'in_delivery') return 'done';
      if (status === 'delivered' || status === 'finished') return 'done';
      return status;
    })();
    const steps =
      orderType === "pickup"
        ? [
            { key: "pending", label: "Recebido" },
            { key: "preparing", label: "Em atendimento" },
            { key: "ready", label: "Pronto p/ retirada" },
            { key: "done", label: "Pago" },
          ]
        : orderType === "delivery"
        ? [
            { key: "pending", label: "Recebido" },
            { key: "preparing", label: "Em atendimento" },
            { key: "ready", label: "Aguardando entregador" },
            { key: "done", label: "Saiu para entrega" },
          ]
        : [
            { key: "pending", label: "Recebido" },
            { key: "preparing", label: "Em atendimento" },
            { key: "ready", label: "Pronto para servir" },
            { key: "done", label: "Finalizado" },
          ];

    const isActive = (key) => {
      if (normalizedStatus === "pending") return key === "pending";
      if (normalizedStatus === "preparing") return key !== "done" && key !== "ready";
      if (normalizedStatus === "ready") return key !== "done";
      return true;
    };

    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isActive(step.key)
                  ? timelineStyles[step.key]?.dot || "bg-brand-primary"
                  : "bg-gray-300"
              }`}
            />
            <span
              className={
                isActive(step.key)
                  ? `${timelineStyles[step.key]?.text || "text-gray-700"} font-semibold`
                  : ""
              }
            >
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="text-gray-300">•</span>}
          </div>
        ))}
      </div>
    );
  };

  const renderOrderFooterActions = (order: any) => (
    <div className="w-full flex flex-wrap gap-2 md:justify-end">
      {updating === order.id && (
        <div className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 inline-flex items-center gap-2">
          <ArrowsClockwise size={14} weight="duotone" className="animate-spin" />
          Atualizando pedido...
        </div>
      )}
      {order.status === "pending" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
            Clique em iniciar atendimento para começar.
          </div>
          <button
            onClick={() => { pulseCta(order.id + '-prep'); handleAdvance(order.id, "preparing"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-prep' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Clock size={16} weight="duotone" /> Iniciar atendimento
          </button>
        </div>
      )}

      {order.status === "preparing" && order.type === "delivery" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1">
            Pedido pronto? Marque como pronto para chamar o entregador.
          </div>
          {activeMotoboysCount === 0 && (
            <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
              Nenhum entregador ativo. Ative um vínculo em “Entregadores”.
            </div>
          )}
          <button
            onClick={() => { pulseCta(order.id + '-ready'); handleAdvance(order.id, "ready_for_delivery"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-sky-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Marcar pronto
          </button>
        </div>
      )}

      {order.status === "ready_for_delivery" && order.type === "delivery" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            Pedido pronto. Chame o entregador para retirada.
          </div>
          {activeMotoboysCount === 0 && (
            <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
              Nenhum entregador ativo. Ative um vínculo em “Entregadores”.
            </div>
          )}
          <button
            onClick={() => { pulseCta(order.id + '-wait'); handleAdvance(order.id, "waiting_for_motoboy"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-wait' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Aguardar entregador
          </button>
        </div>
      )}

      {order.status === "preparing" && order.type !== "pickup" && order.type !== "delivery" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1">
            Pedido pronto para servir.
          </div>
          <button
            onClick={() => { pulseCta(order.id + '-ready'); handleAdvance(order.id, "ready"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Marcar pronto
          </button>
        </div>
      )}

      {order.status === "preparing" && order.type === "pickup" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1">
            Pedido pronto para retirada.
          </div>
          <button
            onClick={async () => {
              pulseCta(order.id + '-ready');
              await handleAdvance(order.id, "ready");
            }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-sky-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Pronto p/ retirada
          </button>
        </div>
      )}

      {order.status === "ready" && (
        <div className="w-full">
          <div className={`mb-2 text-[11px] font-semibold border rounded-lg px-2.5 py-1 ${
            order.type === "delivery"
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-emerald-700 bg-emerald-50 border-emerald-100"
          }`}>
            {order.type === "delivery"
              ? "Motoboy saiu? Confirme o pagamento."
              : "Cliente chegou? Confirme o pagamento."}
          </div>
          <button
            onClick={() => { pulseCta(order.id + '-pay'); openPaymentConfirm(order); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-pay' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> {order.type === "delivery" ? "Saiu para entrega" : "Confirmar pagamento"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
    <div className={`no-print ${tvMode ? "space-y-6 rounded-3xl bg-slate-900/95 p-4 sm:p-6 text-white" : "space-y-1"}`}>
      <style>{`
        @keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}
        @keyframes drawerIn{0%{transform:translateX(100%)}100%{transform:translateX(0)}}
      `}</style>
      <div className={`${tvMode ? "" : "rounded-2xl border border-slate-200 bg-white px-2 sm:px-3 py-2"}`}>
        <div className="flex flex-col gap-2 mb-1 border-b border-slate-100 pb-2">
          {!tvMode ? (
            <>
              <div className="flex w-full items-center justify-between gap-2">
                <div className="inline-flex flex-1 sm:flex-none min-w-0 items-center gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                  {[
                    { id: 'queue', label: 'Pedidos', count: allActiveQueue.length },
                    { id: 'inroute', label: 'Em rota', count: inRouteQueue.length },
                    {
                      id: 'completed',
                      label: isAdminUser ? 'Faturamento & Relatórios' : 'Finalizados',
                      count: reportCompleted.length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as 'queue' | 'inroute' | 'completed')}
                      className={`inline-flex flex-shrink-0 items-center gap-1 text-xs sm:text-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-white shadow-sm font-semibold text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeTab === tab.id ? 'bg-slate-100 text-slate-700' : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                {activeTab === 'queue' && (
                  <button
                    type="button"
                    onClick={handleFinalizeAllReady}
                    disabled={bulkFinishing || readyToFinalizeOrders.length === 0}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-45 disabled:cursor-not-allowed"
                    title="Finalizar rapidamente todos os pedidos prontos"
                  >
                    <CheckSquare size={13} weight="duotone" />
                    {bulkFinishing ? 'Finalizando...' : `Finalizar prontos (${readyToFinalizeOrders.length})`}
                  </button>
                )}
              </div>

              {activeTab === 'queue' && (
                <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                  {[
                    { id: 'all', label: 'Todos', value: allActiveQueue.length },
                    { id: 'pending', label: 'Pendentes', value: queueMetrics.pending },
                    { id: 'preparing', label: 'Em atendimento', value: queueMetrics.preparing },
                    { id: 'ready', label: 'Prontos', value: queueMetrics.ready },
                    { id: 'late', label: 'Atrasados', value: queueMetrics.late },
                    { id: 'finalized', label: 'Finalizados', value: completedRecent12h.length },
                  ].map((kpi) => (
                    <button
                      key={kpi.id}
                      type="button"
                      onClick={() => setQueueFilter(kpi.id as any)}
                      className={`flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        queueFilter === kpi.id
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{kpi.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        queueFilter === kpi.id
                          ? 'bg-white/20 text-white'
                          : Number(kpi.value) === 0
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {kpi.value}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/15 text-white">
                {productionQueue.length} em produção
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
                <Clock size={14} weight="duotone" />
                {new Date(currentTime).toLocaleTimeString("pt-BR", { timeZone: SAO_PAULO_TZ, hour: "2-digit", minute: "2-digit" })}
              </span>
              <button
                type="button"
                onClick={toggleTvMode}
                className="inline-flex items-center gap-2 text-xs font-medium bg-white/15 text-white border border-white/20 px-2.5 py-1.5 rounded-md"
              >
                <Monitor size={14} weight="duotone" />
                Sair do modo TV
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-2 mt-2">
          {awaitingMotoboyQueue.length > 0 && (
            <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-indigo-900">
                  <Truck size={14} weight="duotone" />
                  Aguardando Coleta / Motoboy
                </p>
                <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                  {awaitingMotoboyQueue.length} pedido(s)
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {awaitingMotoboyQueue.map((order) => (
                  <div
                    key={`awaiting-${order.id}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-medium shadow-sm"
                  >
                    <span className="inline-flex items-center gap-1.5 font-extrabold text-indigo-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      #{formatOrderDisplayId(order.id, storeSlug)}
                    </span>
                    <span className="text-indigo-300">•</span>
                    <span className="text-indigo-900 truncate max-w-[240px]">
                      {order.customerName || 'Cliente'}
                    </span>
                    <span className="text-indigo-300">•</span>
                    <span className="text-indigo-700">
                      Pronto há {formatDuration(order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 px-0 sm:px-0">
            {filteredProductionQueue.map((order, index) => {
              const orderAgeMs = order?.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
              const isArchived = queueFilter === 'finalized';
              const isLate = !isArchived && orderAgeMs > PREP_SLA_MS;
              const statusMeta = getStatusStyles(order.status, order.type);
              const typeMeta = orderTypeMeta(order);
              const paymentLabel = getPaymentMethodMeta(order.payment).label;
              const totalLabel = formatCurrency(Number(order.total || 0));
              const itemsCount = (order.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);

              return (
                <OrderSummaryCard
                  key={`summary-${order.id}`}
                  order={order}
                  queueRank={index + 1}
                  orderDisplayId={formatOrderDisplayId(order.id, storeSlug)}
                  isLate={isLate}
                  elapsedLabel={elapsedTime[order.id] || "0s"}
                  statusMeta={statusMeta}
                  typeMeta={typeMeta}
                  paymentLabel={paymentLabel}
                  totalLabel={totalLabel}
                  itemsCount={itemsCount}
                  printBusy={isGeneratingPrint}
                  canPrint={hasPrintAccess}
                  onPrint={() => handlePrintOrder(order, index + 1)}
                  archived={isArchived}
                  onClick={() => {
                    setConfirmModal(null);
                    setSelectedOrder(order);
                  }}
                />
              );
            })}
          </div>
          {filteredProductionQueue.length === 0 && awaitingMotoboyQueue.length === 0 && !loading && (
            <div className="col-span-full text-center text-gray-500 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <div className="mx-auto max-w-sm space-y-2">
                <div className="text-4xl">🔥</div>
                <p className="text-sm font-semibold text-slate-700">Nenhum pedido aguardando.</p>
                <p className="text-xs text-slate-500">
                  Assim que chegar um pedido, ele aparece aqui com prioridade.
                </p>
              </div>
            </div>
          )}
          {isDrawerOpen && createPortal(
            <div className="fixed inset-0 z-[9999] overflow-hidden">
              <div
                className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={closeOrderOverlays}
              />
              <div className="fixed right-0 top-0 h-full w-full md:w-[450px] z-[10000] bg-white shadow-2xl flex flex-col animate-[drawerIn_220ms_ease-out]">
                <div className="shrink-0 flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-white">
                  <p className="text-sm font-bold text-slate-900">Detalhes do pedido</p>
                  <div className="flex items-center gap-2">
                    {selectedOrder && hasPrintAccess && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePrintOrder(selectedOrder, selectedOrderRank)}
                          disabled={isGeneratingPrint}
                          className="inline-flex h-9 px-3 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-900 transition-all no-print disabled:opacity-60"
                          aria-label="Imprimir pedido"
                          title="Imprimir pedido"
                        >
                          <Printer size={16} weight="duotone" />
                          <span className="text-xs font-semibold">{isGeneratingPrint ? 'Gerando cupom...' : 'Imprimir'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAllPrinted(selectedOrder)}
                          disabled={isGeneratingPrint}
                          className="inline-flex h-9 px-3 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-all no-print disabled:opacity-60"
                          aria-label="Marcar todos como impressos"
                          title="Marcar todos como impressos"
                        >
                          <span className="text-xs font-semibold">Marcar impressos</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={closeOrderOverlays}
                      className="flex items-center justify-center w-[40px] h-[40px] bg-red-50 text-red-600 rounded-full hover:bg-red-100 hover:scale-105 active:scale-95 transition-all shadow-sm focus:outline-none no-print"
                      aria-label="Fechar"
                    >
                      <X size={20} weight="bold" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  <div
                    className={`grid gap-3 xl:gap-4 ${
                      tvMode
                        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                        : "grid-cols-1"
                    }`}
                  >
                  {filteredProductionQueue
                    .filter((order) => order.id === selectedOrder?.id)
                    .map((order, index) => {
            const orderAgeMs = order?.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
            const isLate = orderAgeMs > PREP_SLA_MS;
            const isNew = newOrderIds.includes(order.id);
            const toneKey =
              order.status === "ready_for_delivery" || order.status === "waiting_for_motoboy"
                ? "ready"
                : order.status;
            const statusAccent =
              toneKey === "pending"
                ? "border-l-amber-400 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30"
                : toneKey === "preparing"
                ? "border-l-sky-400 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30"
                : toneKey === "ready"
                ? "border-l-violet-400 bg-gradient-to-br from-violet-50/70 via-white to-violet-50/30"
                : toneKey === "done"
                ? "border-l-emerald-400 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30"
                : "border-l-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-50";
            return (
            <div
              key={order.id}
              className={`relative w-full max-w-full p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md overflow-visible ${
                isNew ? 'ring-2 ring-emerald-300/80' : ''
              } ${isLate ? 'border-rose-200 bg-rose-50/60' : 'bg-white'}`}
            >
              {/* HEADER DO CARD */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-500 uppercase font-bold">
                    <Hash size={14} weight="duotone" className="text-slate-400" /> Prioridade
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${getPriorityTone(selectedOrderRank)}`}>
                      #{String(selectedOrderRank).padStart(2, "0")}
                    </span>
                  </div>

                <p className="text-[11px] text-gray-500">
                  {formatDateTime(order.createdAt)}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                </p>

                  <h3 className="text-base font-bold text-slate-800 truncate">
                    Cliente: {order.customerName || order.name || "Cliente"}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {(() => {
                      const meta = orderTypeMeta(order);
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${meta.pill}`}
                          title={formatOrderType(order.type)}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  {order.phone && (
                    <p className="text-[11px] text-gray-500 break-words">{order.phone}</p>
                  )}

                  <p className="text-[11px] text-gray-500 uppercase mt-1 inline-flex flex-wrap items-center gap-2">
                    Pagamento:
                    {(() => {
                      const paymentMeta = getPaymentMethodMeta(order.payment);
                      return (
                        <>
                          {paymentMeta.icon && (
                            <img
                              src={paymentMeta.icon}
                              alt={paymentMeta.label}
                              className="h-4 w-4 object-contain"
                            />
                          )}
                          <span>{paymentMeta.label}</span>
                        </>
                      );
                    })()}
                  </p>
                  {order.payment?.toString().toLowerCase() === 'dinheiro' && order.cashTendered ? (
                    <div className="text-[11px] space-y-0.5">
                      <p className="text-emerald-700 font-semibold">
                        Cliente paga com: {formatCurrency(Number(order.cashTendered))}
                      </p>
                      {Number(order.cashTendered) > Number(order.total || 0) ? (
                        <p className="text-amber-700 font-semibold">
                          Troco: {formatCurrency(Number(order.cashTendered) - Number(order.total || 0))}
                        </p>
                      ) : (
                        <p className="text-slate-500 font-semibold">Sem troco</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                  {order.type === "table" && order.table && (
                    <div className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide shadow-sm">
                      Mesa {order.table}
                    </div>
                  )}
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${getStatusStyles(order.status, order.type).className}`}
                  >
                    {getStatusStyles(order.status, order.type).label}
                  </span>
                  <div className="px-2.5 py-0.5 rounded-full bg-brand-primary text-white font-black flex items-center gap-1.5 shadow-sm text-[11px] ring-2 ring-white/40">
                    <Clock size={11} weight="duotone" className="text-white" />
                    <span className="tabular-nums text-[11px]">
                      {elapsedTime[order.id] || "0s"}
                    </span>
                  </div>
                  {isLate && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-rose-100 text-rose-700 border-rose-200 animate-pulse">
                      Prazo estourado
                    </span>
                  )}
                </div>
              </div>

              {/* LISTA DE ITENS */}
              <div className="mt-3 space-y-2">
                {getOrderedItems(order.id, order.items || []).map((item, itemIndex) => (
                  <div
                    key={`${item.id || item.productId || item.name}-${itemIndex}`}
                    className={`flex justify-between text-xs text-gray-700 items-center gap-3 rounded-2xl px-2.5 py-1.5 border ${
                      item?.isPrinted
                        ? "bg-slate-50 border-slate-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleQuantityChange(order.id, item.id, -1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <Minus size={14} weight="duotone" />
                        </button>

                        <span className="font-bold text-gray-800 w-7 text-center text-[11px]">
                          {item.qty}
                        </span>

                        <button
                          onClick={() => handleQuantityChange(order.id, item.id, 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <Plus size={14} weight="duotone" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                          {item.imageUrl || item.image_url || productsById.get(item.productId || item.id)?.imageUrl ? (
                            <img
                              src={resolveAssetUrl(item.imageUrl || item.image_url || productsById.get(item.productId || item.id)?.imageUrl)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                              🍖
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-[12px]" title={item.name}>
                            {item.name}
                          </span>
                          {!item?.isPrinted && (
                            <span className="mt-1 inline-flex w-fit items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                              Novo
                            </span>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item?.cookingPoint && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                {item.cookingPoint}
                              </span>
                            )}
                            {item?.passSkewer && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
                                passar farinha
                              </span>
                            )}
                            {formatSelectedModifiers(item?.selectedModifiers || []).map((modifierName) => (
                              <span
                                key={`${item.id || item.productId}-${modifierName}`}
                                className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                + {modifierName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const promoMeta = resolvePromoMeta(item);
                      const total = promoMeta.unitPrice * item.qty;
                      return (
                        <span className="flex flex-col items-end flex-shrink-0 text-[11px] font-semibold">
                          {promoMeta.promoActive && promoMeta.originalPrice ? (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatCurrency(promoMeta.originalPrice * item.qty)}
                            </span>
                          ) : null}
                          <span className={promoMeta.promoActive ? 'text-emerald-600' : 'text-slate-700'}>
                            {formatCurrency(total)}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* ADICIONAR ITEM */}
              <div className="mt-3 flex w-full min-w-0 flex-row gap-2 items-center bg-white/70 border border-slate-200/70 rounded-2xl p-1.5">
                <select
                  value={selectedProducts[order.id] || ""}
                  onChange={(e) =>
                    setSelectedProducts((prev) => ({
                      ...prev,
                      [order.id]: e.target.value,
                    }))
                  }
                  className="min-w-0 flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                >
                  <option value="">Adicionar item...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                        {product.name} – {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleAddItem(order.id)}
                  className="h-10 w-10 flex-shrink-0 sm:w-auto sm:px-3 sm:py-2 rounded-lg bg-brand-primary text-white text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <Plus size={14} weight="duotone" />
                  <span className="hidden sm:inline">Incluir</span>
                </button>
              </div>

              {tvMode ? renderTimeline(order.status, order.type) : null}

              <div className="mt-3">
                {renderMoneyBreakdown(order)}
              </div>
                    </div>
                  );
                  })}

                  </div>
                </div>
                <div className="shrink-0 p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  {selectedOrder ? renderOrderFooterActions(selectedOrder) : null}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {isPaymentModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            {(() => {
              const normalizedPayment = (confirmModal.payment || '').toString().trim().toLowerCase();
              const isPixPayment = normalizedPayment === 'pix';
              const isCashPayment = normalizedPayment === 'dinheiro';
              const pixKey = (confirmModal.pixKey || '').toString().trim();
              const pixPayload = pixKey
                ? buildPixPayload({
                    key: pixKey,
                    name: auth?.store?.name || 'Já no Caminho',
                    amount: Number(confirmModal.total || 0),
                    txid: confirmModal.id ? `PEDIDO${confirmModal.id.slice(0, 8)}` : 'PEDIDO',
                  })
                : '';
              const pixQrUrl = pixPayload
                ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixPayload)}`
                : '';
	              const totalValue = Number(confirmModal.total || 0);
	              const deliveryFeeValue =
	                confirmModal.type === 'delivery' && confirmModal.deliveryFee !== null && confirmModal.deliveryFee !== undefined
	                  ? Number(confirmModal.deliveryFee)
	                  : 0;
	              const itemsSubtotal = Math.max(0, totalValue - (Number.isFinite(deliveryFeeValue) ? deliveryFeeValue : 0));
                const itemsVolume = (confirmModal.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);
              const cashValue = Number((cashConfirmValue || '').toString().replace(',', '.'));
              const cashValid = !isCashPayment || (cashConfirmValue && !Number.isNaN(cashValue) && cashValue >= totalValue);
              const changeValue = isCashPayment && cashValid ? cashValue - totalValue : 0;
              const cashShortcuts = [20, 50, 100, 200];
              return (
                <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Confirmar pagamento</p>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Pedido pronto para cobrar</h3>
              </div>
              <button
                type="button"
                onClick={closeOrderOverlays}
                className="text-slate-400 hover:text-slate-600 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <X size={18} weight="duotone" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Cliente</span>
                <span className="font-semibold text-slate-800">{confirmModal.customerName}</span>
              </div>
              {confirmModal.table && (
                <div className="flex items-center justify-between">
                  <span>Mesa</span>
                  <span className="font-semibold text-slate-800">Mesa {confirmModal.table}</span>
                </div>
              )}
              {confirmModal.phone && (
                <div className="flex items-center justify-between">
                  <span>Telefone</span>
                  <span className="font-semibold text-slate-800">{confirmModal.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Pagamento</span>
                <span className="font-semibold text-slate-800">
                  {getPaymentMethodMeta(confirmModal.payment).label}
                </span>
              </div>
	              <div className="flex items-center justify-between">
	                <span>Volume</span>
	                <span className="px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold">
	                  {itemsVolume} {itemsVolume === 1 ? 'item' : 'itens'}
	                </span>
	              </div>
                {itemsSubtotal !== totalValue && (
	                <div className="flex items-center justify-between">
	                  <span>Subtotal</span>
	                  <span className="px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold">
	                    {formatCurrency(itemsSubtotal)}
	                  </span>
	                </div>
                )}
	              {confirmModal.type === 'delivery' && deliveryFeeValue > 0 && (
	                <div className="flex items-center justify-between">
	                  <span>Frete</span>
	                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-sm font-bold">
	                    {formatCurrency(deliveryFeeValue)}
	                  </span>
	                </div>
	              )}
	              <div className="flex items-center justify-between">
	                <span>Total a pagar</span>
	                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold">
	                  {formatCurrency(totalValue)}
	                </span>
	              </div>
              {Array.isArray(confirmModal.items) && confirmModal.items.some((item) => resolvePromoMeta(item).promoActive) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Promoção aplicada no pedido.
                </div>
              )}
            </div>
            {isPixPayment && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Pix do lojista</span>
                  <span className="text-xs text-slate-400">Confirmação rápida</span>
                </div>
                {pixKey ? (
                  <div className="mt-3 space-y-3">
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
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      {pixCopied ? 'Copiado!' : 'Copiar código Pix'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                    Cadastre a chave Pix em Configurações para gerar o QR Code.
                  </div>
                )}
              </div>
            )}
            {isCashPayment && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Pagamento em dinheiro</span>
                  <span className="text-xs text-amber-600">Informe para calcular o troco</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cashShortcuts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCashConfirmValue(String(value))}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      R$ {value}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="text-xs font-semibold text-amber-700">
                    Valor recebido
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashConfirmValue}
                      onChange={(event) => setCashConfirmValue(event.target.value)}
                      placeholder="0,00"
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>
                  <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700">
                    {cashValid
                      ? `Troco: ${formatCurrency(changeValue)}`
                      : 'Informe um valor válido'}
                  </div>
                </div>
                {!cashValid && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    O valor recebido precisa ser maior ou igual ao total.
                  </p>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={closeOrderOverlays}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={!cashValid || updating === confirmModal?.id}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updating === confirmModal?.id ? (
                  <span className="inline-flex items-center gap-2">
                    <ArrowsClockwise size={14} weight="duotone" className="animate-spin" />
                    Confirmando...
                  </span>
                ) : (
                  'Pagamento recebido'
                )}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {activeTab === 'inroute' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Pedidos em rota: o entregador já aceitou. Use “Acompanhar” para abrir a tela pública do cliente.
          </div>
          {inRouteQueue.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Nenhum pedido em rota agora.
            </div>
          ) : (
            <div
              className={`grid gap-3 xl:gap-4 ${
                tvMode
                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
              }`}
            >
              {inRouteQueue.map((order) => (
                <div
                  key={order.id}
                  className="relative w-full max-w-full p-3 rounded-2xl border border-l-4 border-l-blue-400 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {order.customerName || 'Cliente'}
                      </p>
                      {order.phone ? <p className="text-[11px] text-slate-500">{order.phone}</p> : null}
                      <p className="text-[11px] text-slate-400">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      Em rota
                    </span>
                  </div>

                  {formatAddress(order.address || order.deliveryAddress) ? (
                    <div className="mt-3 text-xs text-slate-600">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Entrega</p>
                      <p className="font-semibold text-slate-700">{formatAddress(order.address || order.deliveryAddress)}</p>
                    </div>
                  ) : null}

	                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
	                    <div className="flex-1 min-w-0">
	                      {renderMoneyBreakdown(order)}
	                    </div>
	                    <a
	                      href={`/pedido/${order.id}`}
	                      target="_blank"
	                      rel="noreferrer"
	                      className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                    >
                      Acompanhar
                    </a>
	                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-5">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: 'last7', label: 'Últimos 7 dias' },
                { id: 'custom', label: 'Calendário' },
              ].map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => setReportRange(period.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    reportRange === period.id
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            {reportRange === 'custom' && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(event) => setReportFrom(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                />
                <input
                  type="date"
                  value={reportTo}
                  onChange={(event) => setReportTo(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                />
              </div>
            )}
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-slate-500">
              {isAdminUser ? 'Faturamento' : 'Pedidos finalizados'}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {isAdminUser ? formatCurrency(reportSummary.sales) : `${reportSummary.ordersCount}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isAdminUser ? 'Total vendido no período' : 'Pedidos concluídos no período'}
            </p>
            {isAdminUser && (
              <span className={`absolute right-4 top-4 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                reportComparison.positive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {reportComparison.positive ? '▲' : '▼'} {reportComparison.hasBase ? `${Math.abs(reportComparison.deltaPct).toFixed(1)}%` : 'sem base'}
              </span>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2.5">
            {isAdminUser ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                    <Clock size={12} weight="duotone" /> Ticket médio
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatCurrency(reportSummary.averageTicket)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                    <Hash size={12} weight="duotone" /> Qtd pedidos
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">{reportSummary.ordersCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                    <CheckSquare size={12} weight="duotone" /> Itens vendidos
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">{reportSummary.itemsCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                    <Truck size={12} weight="duotone" /> Total frete
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatCurrency(reportSummary.deliveryFees)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                    <Hash size={12} weight="duotone" /> Qtd pedidos
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">{reportSummary.ordersCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                    <CheckSquare size={12} weight="duotone" /> Itens vendidos
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">{reportSummary.itemsCount}</p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pagedCompleted.map((order) => (
              <div
                key={order.id}
                className="relative w-full max-w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-4 shadow-sm overflow-visible"
              >
                <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-emerald-400/10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-20 h-20 rounded-full bg-brand-primary/10 blur-2xl" />
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                  </p>
                    <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Pronto
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    {order.customerName || order.name || 'Cliente'}
                  </p>
	                  {(() => {
	                    const meta = orderTypeMeta(order);
	                    return (
	                      <span
	                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${meta.pill}`}
	                      >
	                        {meta.icon}
	                        <span>{meta.label}</span>
	                      </span>
	                    );
	                  })()}
                  {order.phone && <p>{order.phone}</p>}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const paymentMeta = getPaymentMethodMeta(order.payment);
                      return (
                        <>
                          {paymentMeta.icon && (
                            <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                          )}
                          <span>{paymentMeta.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {(order.items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                      <span className="truncate">
                        {item.qty}x {item.name}
                        {formatItemOptions(item) ? ` (${formatItemOptions(item)})` : ''}
                      </span>
                      <span className="font-semibold text-slate-700">
                      {(() => {
                        const promoMeta = resolvePromoMeta(item);
                        const total = promoMeta.unitPrice * item.qty;
                        return (
                          <span className="flex flex-col items-end text-[11px] font-semibold">
                            {promoMeta.promoActive && promoMeta.originalPrice ? (
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatCurrency(promoMeta.originalPrice * item.qty)}
                              </span>
                            ) : null}
                            <span className={promoMeta.promoActive ? 'text-emerald-600' : 'text-slate-700'}>
                              {formatCurrency(total)}
                            </span>
                          </span>
                        );
                      })()}
                      </span>
                    </div>
                  ))}
                  {(order.items || []).length > 3 && (
                    <p className="text-[11px] text-slate-400">
                      + {(order.items || []).length - 3} itens
                    </p>
                  )}
                </div>

	                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
	                  <div className="w-full">
	                    {renderMoneyBreakdown(order)}
	                  </div>
	                  <a
	                    href={`/pedido/${order.id}`}
	                    className="text-xs font-semibold text-brand-primary hover:underline"
	                  >
	                    Ver pedido
	                  </a>
	                </div>
              </div>
            ))}

            {reportCompleted.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-8 border border-dashed rounded-xl bg-slate-50">
                <div className="mx-auto max-w-sm space-y-2">
                  <div className="text-4xl">✅</div>
                  <p className="text-sm font-semibold text-slate-700">Nenhum pedido finalizado hoje.</p>
                  <p className="text-xs text-slate-500">
                    Os pedidos prontos vão aparecer aqui quando forem concluídos.
                  </p>
                </div>
              </div>
            )}
          </div>
          {reportCompleted.length > completedPageSize && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Pagina {completedPage} de {completedTotalPages}</span>
                <label className="flex items-center gap-2">
                  <span>Por pagina</span>
                  <select
                    value={completedPageSize}
                    onChange={(event) => setCompletedPageSize(Number(event.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-brand-primary"
                  >
                    {[5, 9, 12, 15].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCompletedPage((prev) => Math.max(1, prev - 1))}
                  disabled={completedPage <= 1}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedPage((prev) => Math.min(completedTotalPages, prev + 1))}
                  disabled={completedPage >= completedTotalPages}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}
      {isAdminUser && closeDayModalOpen && createPortal(
        <div className="fixed inset-0 z-[10020]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => setCloseDayModalOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Fechamento do dia</p>
                  <p className="text-xs text-slate-500">
                    {new Date().toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCloseDayModalOpen(false)}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Fechar fechamento do dia"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Total de pedidos</span>
                  <span className="text-base font-black text-slate-900">{dailySalesSummary.orders}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Pix</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(dailySalesSummary.pix)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Dinheiro</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(dailySalesSummary.cash)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Cartão</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(dailySalesSummary.card)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-700">Faturamento total</span>
                  <span className="text-xl font-black text-emerald-800">{formatCurrency(dailySalesSummary.total)}</span>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCloseDayModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handlePrintDailySummary}
                  disabled={isPrintingDaySummary}
                  className="h-10 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isPrintingDaySummary ? 'Imprimindo...' : 'Imprimir Fechamento'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {printSelectionModal.open && createPortal(
        <div className="fixed inset-0 z-[10030]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={closePrintSelectionModal}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">O que deseja imprimir?</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escolha entre enviar apenas os novos itens para a cozinha ou imprimir o pedido completo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePrintSelectionModal}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Fechar seleção de impressão"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {printSelectionModal.hasPrintedItems && !printSelectionModal.hasNewItems && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                    Todos os itens ja foram impressos neste pedido.
                  </div>
                )}
                <button
                  type="button"
                  disabled={!printSelectionModal.hasNewItems || isGeneratingPrint}
                  onClick={() => handleSelectPrintMode('new')}
                  className="w-full h-11 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {printSelectionModal.hasNewItems ? 'Imprimir Apenas Novos' : 'Sem itens novos para imprimir'}
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPrint}
                  onClick={() => handleSelectPrintMode('all')}
                  className="w-full h-11 rounded-xl border border-amber-300 bg-white text-amber-700 text-sm font-semibold hover:bg-amber-50"
                >
                  Imprimir Tudo
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    </>
  );
};



