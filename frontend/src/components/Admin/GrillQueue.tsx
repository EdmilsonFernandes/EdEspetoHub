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
  SpeakerHigh,
  SpeakerX,
  DotsThreeVertical,
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
}: any) => (
  (() => {
    const isDelivery = String(order?.type || '').toLowerCase() === 'delivery';
    const leftAccent = isDelivery ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-orange-500';
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
    className={`w-full rounded-xl border ${isLate ? 'border-red-400 animate-pulse' : 'border-slate-200'} ${leftAccent} bg-white p-4 text-left flex flex-col gap-3 transition-all duration-300 transition-transform hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] cursor-pointer`}
  >
    <div className="flex justify-between items-start gap-2 mb-3">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded-md shadow-sm">
          #{String(queueRank).padStart(2, '0')}
        </span>
        <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md whitespace-nowrap border ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>
      <span className={`px-2 py-1 text-xs font-bold font-mono rounded-md shrink-0 whitespace-nowrap border ${isLate ? 'bg-red-500 text-white border-red-500' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
        {elapsedLabel}
      </span>
    </div>

    <div>
      <h3 className="text-lg font-black text-slate-800 line-clamp-1">{order.customerName || order.name || 'Cliente'}</h3>
      <p className="mt-1 text-[11px] font-semibold text-slate-500">Pedido #{orderDisplayId}</p>
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
        <span className="inline-flex items-center gap-1">
          {typeMeta.icon}
          <span>{typeMeta.label}</span>
        </span>
        <span className="text-slate-300">•</span>
        <span>{paymentLabel}</span>
      </div>
    </div>

    <div className="border-t border-slate-100 pt-3 mt-1 flex justify-between items-center">
      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-indigo-100">
        {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-slate-900">{totalLabel}</span>
        {canPrint && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrint();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-900 transition-all no-print"
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

export const GrillQueue = () => {
  // Tap feedback animation
  const pulseCta = (key: string) => {
    setCtaPulseId(key);
    window.setTimeout(() => setCtaPulseId(null), 220);
  };
  const { auth } = useAuth();
  const hasAdminPrintAccess = String(auth?.user?.role || '').toLowerCase() === 'admin';
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
  const [activeTab, setActiveTab] = useState<'queue' | 'inroute' | 'completed'>('queue');
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeMotoboysCount, setActiveMotoboysCount] = useState(0);
  const [tvMode, setTvMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("queueTvMode") === "true";
  });
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'late'>('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [printPayload, setPrintPayload] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const previousIdsRef = useRef<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isDrawerOpen = selectedOrder !== null;
  const isPaymentModalOpen = confirmModal !== null;

  const closeOrderOverlays = () => {
    setConfirmModal(null);
    setSelectedOrder(null);
  };

  const handlePrintOrder = (order: any, queueRank = 1) => {
    if (!hasAdminPrintAccess || !order?.id) return;
    setPrintPayload({
      order,
      queueRank,
      orderDisplayId: formatOrderDisplayId(order.id, storeSlug),
      createdAt: order?.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
    });
    setIsPrinting(true);
  };

  useEffect(() => {
    const clearPrint = () => {
      setIsPrinting(false);
      setPrintPayload(null);
    };
    window.addEventListener('afterprint', clearPrint);
    return () => window.removeEventListener('afterprint', clearPrint);
  }, []);

  useEffect(() => {
    if (!isPrinting || !printPayload) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [isPrinting, printPayload]);

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
    return { fee: safeFee, total, itemsTotal };
  };

  const renderMoneyBreakdown = (order: any, alignRight = false) => {
    const { fee, total, itemsTotal } = calcMoney(order);
    return (
      <div
        className={[
          'grid w-full min-w-0 grid-cols-1 gap-2 text-[10px] sm:grid-cols-3 sm:text-[11px] font-semibold',
          alignRight ? 'sm:ml-auto' : '',
        ].join(' ')}
      >
        <span className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5">
          <span className="text-slate-500 font-semibold text-[10px]">Itens</span>
          <span className="truncate">{formatCurrency(itemsTotal)}</span>
        </span>
        <span className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5">
          <span className="text-slate-500 font-semibold text-[10px]">Frete</span>
          <span className="truncate">{fee > 0 ? formatCurrency(fee) : '—'}</span>
        </span>
        <span className="flex min-w-0 flex-col rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
          <span className="text-emerald-600 font-semibold text-[10px]">Total</span>
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

  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-queue-actions]")) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleAdvance = async (orderId, status) => {
    const previousQueue = queue;
    try {
      setUpdating(orderId);
      // Mantém a operação previsível: sempre volta para "Todos" após qualquer ação.
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
      await orderService.updateStatus(orderId, status);
      await loadQueue();
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
    } else {
      setQueue((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, items: sanitizedItems, total: nextTotal } : order
        )
      );
    }

    try {
      await orderService.updateItems(orderId, sanitizedItems, nextTotal);
      if (sanitizedItems.length === 0) {
        await orderService.updateStatus(orderId, 'cancelled');
      }
    } catch (err) {
      console.error('Erro ao atualizar itens', err);
      setError('Não foi possível atualizar os itens agora. Atualize a fila.');
    }
  };

  const handleQuantityChange = (orderId, itemId, delta) => {
    applyItemsChange(orderId, (items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      )
    );
  };

  const handleAddItem = (orderId) => {
    const productId = selectedProducts[orderId];
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return;

    applyItemsChange(orderId, (items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      return [
        ...items,
        { id: product.id, productId: product.id, name: product.name, price: product.price, unitPrice: product.price, qty: 1 },
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

  const completedToday = useMemo(() => {
    const today = new Date();
    const isSameDay = (value) => {
      if (!value) return false;
      const date = new Date(value);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    };
    const completedStatuses = new Set([ 'done', 'delivered', 'finished' ]);
    return [...queue]
      .filter((order) => completedStatuses.has(order.status) && isSameDay(order.createdAt))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [queue]);
  const completedSummary = useMemo(() => {
    const totals = completedToday.reduce(
      (acc, order) => {
        const { total, fee } = calcMoney(order);
        acc.sales += Number.isFinite(total) ? total : 0;
        acc.deliveryFees += Number.isFinite(fee) ? fee : 0;
        acc.items += (order?.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);
        return acc;
      },
      { sales: 0, deliveryFees: 0, items: 0 }
    );
    const ordersCount = completedToday.length;
    const averageTicket = ordersCount > 0 ? totals.sales / ordersCount : 0;
    return {
      ordersCount,
      sales: totals.sales,
      deliveryFees: totals.deliveryFees,
      averageTicket,
      itemsCount: totals.items,
    };
  }, [completedToday]);
  const completedTotalPages = Math.max(1, Math.ceil(completedToday.length / completedPageSize));
  const pagedCompleted = useMemo(() => {
    const start = (completedPage - 1) * completedPageSize;
    return completedToday.slice(start, start + completedPageSize);
  }, [completedToday, completedPage]);

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

  const filteredProductionQueue = useMemo(() => {
    if (queueFilter === 'all') return productionQueue;
    if (queueFilter === 'pending') return productionQueue.filter((order) => order.status === 'pending');
    if (queueFilter === 'preparing') return productionQueue.filter((order) => order.status === 'preparing');
    if (queueFilter === 'ready') {
      return productionQueue.filter((order) => order.status === 'ready');
    }
    if (queueFilter === 'late') {
      const now = Date.now();
      return productionQueue.filter((order) => {
        const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : now;
        const ageMs = Math.max(0, now - createdAt);
        return ageMs > PREP_SLA_MS;
      });
    }
    return productionQueue;
  }, [productionQueue, queueFilter, currentTime, PREP_SLA_MS]);
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
    if (activeTab !== 'queue') {
      closeOrderOverlays();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedOrder) return;
    const latest = filteredProductionQueue.find((order) => order.id === selectedOrder.id);
    if (!latest) {
      closeOrderOverlays();
      return;
    }
    if (latest !== selectedOrder) {
      setSelectedOrder(latest);
    }
  }, [filteredProductionQueue, selectedOrder]);
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
              const success = await handleAdvance(order.id, "ready");
              if (success) setSelectedOrder(null);
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
    <div className={`no-print ${tvMode ? "space-y-6 rounded-3xl bg-slate-900/95 p-4 sm:p-6 text-white" : "space-y-2"}`}>
      <style>{`
        @keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}
        @keyframes drawerIn{0%{transform:translateX(100%)}100%{transform:translateX(0)}}
        @media print{
          @page{size:58mm auto;margin:0}
          *{box-sizing:border-box!important}
          html,body{
            margin:0!important;
            padding:0!important;
            height:auto!important;
            overflow:visible!important;
            background:#fff!important;
          }
          body > *:not(#print-area){
            display:none!important;
            height:0!important;
            overflow:hidden!important;
          }
          .print-container{
            display:block!important;
            float:none!important;
            position:absolute!important;
            top:0!important;
            left:0!important;
            width:58mm!important;
            background:#fff!important;
            color:#000!important;
            box-shadow:none!important;
            border:0!important;
            page-break-inside:avoid!important;
            break-inside:avoid-page!important;
            page-break-after:avoid!important;
            zoom:1!important;
            transform:none!important;
            border-radius:0!important;
          }
          .print-container *{
            background:#fff!important;
            color:#000!important;
            box-shadow:none!important;
            border-radius:0!important;
          }
          .no-print{display:none!important}
          .print-only{display:block!important}
        }
      `}</style>
      <div className={`${tvMode ? "" : "rounded-2xl border border-slate-200 bg-white px-3 py-3"}`}>
        <div className="flex flex-col gap-2 mb-2 border-b border-slate-100 pb-2">
          {!tvMode ? (
            <>
              <div className="flex justify-between items-center w-full gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {[
                    { id: 'queue', label: 'Operação', count: productionQueue.length },
                    { id: 'inroute', label: 'Em rota', count: inRouteQueue.length },
                    { id: 'completed', label: 'Finalizados hoje', count: completedToday.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as 'queue' | 'inroute' | 'completed')}
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
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

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-xs font-medium text-slate-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-md">
                    {productionQueue.length} em produção
                  </span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                    SLA alvo {prepSlaMinutes}min
                  </span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                    Mais antigo {formatDuration(queueMetrics.oldest)}
                  </span>
                  <div className="relative" data-queue-actions>
                    <button
                      type="button"
                      onClick={() => setActionsOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <DotsThreeVertical size={14} weight="duotone" />
                      Opções
                    </button>
                    {actionsOpen && (
                      <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                        <button
                          onClick={() => {
                            toggleTvMode();
                            setActionsOpen(false);
                          }}
                          className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Monitor size={16} weight="duotone" />
                          Ativar modo TV
                        </button>
                        <button
                          onClick={() => {
                            handleToggleSound();
                            setActionsOpen(false);
                          }}
                          className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          {soundEnabled ? <SpeakerHigh size={16} weight="duotone" /> : <SpeakerX size={16} weight="duotone" />}
                          {soundEnabled ? "Som ligado" : "Som desligado"}
                        </button>
                        <button
                          onClick={() => {
                            if (!soundEnabled) {
                              setSoundEnabled(true);
                            }
                            ensureAudioContext().then(() => playNewOrderSound()).catch(() => {});
                            setActionsOpen(false);
                          }}
                          className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <SpeakerHigh size={16} weight="duotone" />
                          Testar som
                        </button>
                        <button
                          onClick={() => {
                            loadQueue();
                            setActionsOpen(false);
                          }}
                          className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <ArrowsClockwise size={16} weight="duotone" />
                          Atualizar fila
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {activeTab === 'queue' && (
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: 'Todos', value: productionQueue.length },
                    { id: 'pending', label: 'Pendentes', value: queueMetrics.pending },
                    { id: 'preparing', label: 'Em atendimento', value: queueMetrics.preparing },
                    { id: 'ready', label: 'Prontos', value: queueMetrics.ready },
                    { id: 'late', label: 'Atrasados', value: queueMetrics.late },
                  ].map((kpi) => (
                    <button
                      key={kpi.id}
                      type="button"
                      onClick={() => setQueueFilter(kpi.id as any)}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                        queueFilter === kpi.id
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{kpi.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        queueFilter === kpi.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
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
                {new Date(currentTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
        <div className="space-y-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-1 sm:px-0">
            {filteredProductionQueue.map((order, index) => {
              const orderAgeMs = order?.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
              const isLate = orderAgeMs > PREP_SLA_MS;
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
                  canPrint={hasAdminPrintAccess}
                  onPrint={() => handlePrintOrder(order, index + 1)}
                  onClick={() => {
                    setActionsOpen(false);
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
                    {selectedOrder && hasAdminPrintAccess && (
                      <button
                        type="button"
                        onClick={() => handlePrintOrder(selectedOrder, selectedOrderRank)}
                        className="inline-flex h-9 px-3 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-900 transition-all no-print"
                        aria-label="Imprimir pedido"
                        title="Imprimir pedido"
                      >
                        <Printer size={16} weight="duotone" />
                        <span className="text-xs font-semibold">Imprimir</span>
                      </button>
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
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-rose-100 text-rose-700 border-rose-200">
                      Prazo estourado
                    </span>
                  )}
                </div>
              </div>

              {/* LISTA DE ITENS */}
              <div className="mt-3 space-y-2">
                {getOrderedItems(order.id, order.items || []).map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-700 items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-1.5">
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
                          {item.imageUrl || productsById.get(item.productId || item.id)?.imageUrl ? (
                            <img
                              src={resolveAssetUrl(item.imageUrl || productsById.get(item.productId || item.id)?.imageUrl)}
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
	                <span>Itens</span>
	                <span className="px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold">
	                  {formatCurrency(itemsSubtotal)}
	                </span>
	              </div>
	              {confirmModal.type === 'delivery' && deliveryFeeValue > 0 && (
	                <div className="flex items-center justify-between">
	                  <span>Frete</span>
	                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-sm font-bold">
	                    {formatCurrency(deliveryFeeValue)}
	                  </span>
	                </div>
	              )}
	              <div className="flex items-center justify-between">
	                <span>Total</span>
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 shadow-[0_16px_32px_-26px_rgba(16,185,129,0.4)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-emerald-700">Finalizados hoje</p>
                <p className="text-sm text-slate-600 mt-0.5">Resumo de vendas dos pedidos concluídos no dia.</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                {completedSummary.ordersCount} pedido(s)
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Vendido no dia</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(completedSummary.sales)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Ticket médio</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(completedSummary.averageTicket)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Frete no dia</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(completedSummary.deliveryFees)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Itens vendidos</p>
                <p className="text-lg font-black text-slate-900">{completedSummary.itemsCount}</p>
              </div>
            </div>
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

            {completedToday.length === 0 && (
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
          {completedToday.length > completedPageSize && (
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
    </div>
    {printPayload && createPortal(
      <div id="print-area" className="print-container print-only">
        <div style={{ width: '58mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.35, padding: '2mm' }}>
          <div style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>
            {String(printPayload.order?.storeName || 'Sertanejo no Espeto')}
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px' }}>Pedido via Ja no Caminho</div>
          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
          <div style={{ fontWeight: 700 }}>
            [[ FILA: #{String(printPayload.queueRank || 1).padStart(2, '0')} ]]
          </div>
          <div>Pedido: #{printPayload.orderDisplayId}</div>
          <div>Cliente: {printPayload.order?.customerName || printPayload.order?.name || 'Cliente'}</div>
          <div>Data: {printPayload.createdAt}</div>
          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
          {(Array.isArray(printPayload.order?.items) ? printPayload.order.items : []).map((item: any, idx: number) => {
            const qty = Number(item?.qty ?? item?.quantity ?? 0);
            const unit = Number(item?.unitPrice ?? item?.price ?? 0);
            const lineTotal = qty * unit;
            return (
              <div key={`${item?.id || idx}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{qty}x {String(item?.name || 'Item')}</span>
                  <span>{formatCurrency(lineTotal)}</span>
                </div>
                {(item?.cookingPoint || item?.options) ? (
                  <div style={{ fontSize: '10px' }}>{`  ${String(item?.cookingPoint || item?.options || '')}`}</div>
                ) : null}
              </div>
            );
          })}
          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span>{formatCurrency(Number(printPayload.order?.total || 0))}</span>
          </div>
          <div style={{ whiteSpace: 'pre-line' }}>{'\n\n'}</div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};



