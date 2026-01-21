// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Clock, ChefHat, RefreshCcw, Plus, Minus, Hash, Volume2, VolumeX, MoreVertical, X } from "lucide-react";
import { orderService } from "../../services/orderService";
import { productService } from "../../services/productService";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatOrderDisplayId,
  formatOrderStatus,
  formatOrderType,
} from "../../utils/format";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";

export const GrillQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
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
  const [activeTab, setActiveTab] = useState<'queue' | 'completed'>('queue');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [confirmModal, setConfirmModal] = useState(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("queueSoundEnabled");
    return saved ? saved === "true" : true;
  });
  const [actionsOpen, setActionsOpen] = useState(false);
  const previousIdsRef = useRef<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const itemOrderRef = useRef<Map<string, Map<string, number>>>(new Map());
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar varinha');
    return labels.length ? labels.join(' • ') : '';
  };
  const getPriorityTone = (position) => {
    if (position === 1) return "bg-red-600 text-white";
    if (position === 2) return "bg-amber-500 text-white";
    if (position === 3) return "bg-yellow-400 text-slate-900";
    return "bg-slate-100 text-slate-700";
  };
  const getItemBaseKey = (item) =>
    `${item?.productId || item?.name || ''}-${item?.cookingPoint || ''}-${item?.passSkewer ? '1' : '0'}`;
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
      const hasNew = nextIds.some((id) => !previousIds.includes(id));
      if (hasNew) {
        playNewOrderSound();
      }
      previousIdsRef.current = nextIds;
      setQueue(data);
    } catch (err) {
      console.error('Erro ao buscar fila', err);
      setError('Não foi possível carregar os pedidos. Faça login novamente.');
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
    try {
      setUpdating(orderId);
      await orderService.updateStatus(orderId, status);
      setQueue((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar status', err);
      setError('Não foi possível atualizar o status. Tente novamente.');
    } finally {
      setUpdating(null);
    }
  };

  const openPaymentConfirm = (order) => {
    setConfirmModal({
      id: order.id,
      customerName: order.customerName || order.name || 'Cliente',
      total: order.total || 0,
      table: order.table || null,
      payment: order.payment,
      phone: order.phone || '',
    });
  };

  const handleConfirmPaid = async () => {
    if (!confirmModal?.id) return;
    await handleAdvance(confirmModal.id, 'done');
    setConfirmModal(null);
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
      setError('Não foi possível atualizar os itens. Atualize a fila.');
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

  const sortedQueue = useMemo(
    () =>
      [...queue]
        .filter((order) => ['pending', 'preparing'].includes(order.status))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [queue]
  );

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
    return [...queue]
      .filter((order) => order.status === 'done' && isSameDay(order.createdAt))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [queue]);

  const getStatusStyles = (status) => {
    if (status === "preparing") {
      return { label: "Em preparo", className: "bg-amber-100 text-amber-700" };
    }
    return { label: "Aguardando", className: "bg-red-100 text-red-700" };
  };

  const renderTimeline = (status) => {
    const steps = [
      { key: "pending", label: "Recebido" },
      { key: "preparing", label: "Em preparo" },
      { key: "done", label: "Pronto" },
    ];

    const isActive = (key) => {
      if (status === "pending") return key === "pending";
      if (status === "preparing") return key !== "done";
      return true;
    };

    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isActive(step.key) ? "bg-brand-primary" : "bg-gray-300"
              }`}
            />
            <span className={isActive(step.key) ? "text-gray-700 font-semibold" : ""}>
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="text-gray-300">•</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-gray-700 font-semibold">
          <ChefHat className="text-brand-primary" />
          Fila do Churrasqueiro
          <span className="px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold">
            {activeTab === 'queue' ? sortedQueue.length : completedToday.length} pedidos
          </span>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <div className="flex flex-wrap gap-2 order-2 sm:order-none">
            {[
              { id: 'queue', label: 'Fila', count: sortedQueue.length },
              { id: 'completed', label: 'Finalizados hoje', count: completedToday.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'queue' | 'completed')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto" data-queue-actions>
            <button
              type="button"
              onClick={() => setActionsOpen((prev) => !prev)}
              className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 w-full sm:w-auto transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <span className="flex items-center gap-2">
                <MoreVertical size={16} />
                Acoes rapidas
              </span>
              <span className="text-xs text-gray-400">{soundEnabled ? "Som on" : "Som off"}</span>
            </button>
            {actionsOpen && (
              <div className="absolute right-0 mt-2 w-full sm:w-52 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                <button
                  onClick={() => {
                    handleToggleSound();
                    setActionsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
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
                  <Volume2 size={16} />
                  Testar som
                </button>
                <button
                  onClick={() => {
                    loadQueue();
                    setActionsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCcw size={16} />
                  Atualizar fila
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 xl:gap-4">
          {sortedQueue.map((order, index) => (
            <div
              key={order.id}
              className="relative w-full max-w-full p-2.5 sm:p-3 rounded-3xl border border-slate-200 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-30px_rgba(15,23,42,0.55)] overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 60%, rgba(226,232,240,0.6) 100%)',
              }}
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-brand-primary/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-brand-secondary/10 blur-2xl" />
              {/* HEADER DO CARD */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 text-[10px] text-gray-600 uppercase font-bold">
                    <Hash size={14} className="text-brand-primary" /> Fila
                    <span className={`ml-1 px-2.5 py-1 rounded-full text-xs font-black shadow-sm ${getPriorityTone(index + 1)}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                <p className="text-[11px] text-gray-500">
                  {formatDateTime(order.createdAt)}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                </p>

                  <h3 className="text-base font-bold text-gray-800 truncate">
                    Cliente: {order.customerName || order.name || "Cliente"}
                  </h3>

                  {!(order.type === "table" && order.table) && (
                    <p className="text-[11px] text-gray-500 uppercase break-words">
                      {formatOrderType(order.type)}
                      {order.table && (
                        <span className="font-semibold text-gray-800"> · Mesa {order.table}</span>
                      )}
                    </p>
                  )}
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
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                  {order.type === "table" && order.table && (
                    <div className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide shadow-sm">
                      Mesa {order.table}
                    </div>
                  )}
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${getStatusStyles(order.status).className}`}
                  >
                    {getStatusStyles(order.status).label}
                  </span>
                  <div className="px-2.5 py-0.5 rounded-full bg-brand-primary text-white font-black flex items-center gap-1.5 shadow-sm text-[11px] ring-2 ring-white/40">
                    <Clock size={11} className="text-white" />
                    <span className="tabular-nums text-[11px]">
                      {elapsedTime[order.id] || "0s"}
                    </span>
                  </div>
                </div>
              </div>

              {/* LISTA DE ITENS */}
              <div className="mt-3 space-y-2">
                {getOrderedItems(order.id, order.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-xs text-gray-700 items-center gap-3 bg-white/70 border border-slate-200/60 rounded-2xl px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleQuantityChange(order.id, item.id, -1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <Minus size={14} />
                        </button>

                        <span className="font-bold text-gray-800 w-7 text-center text-[11px]">
                          {item.qty}
                        </span>

                        <button
                          onClick={() => handleQuantityChange(order.id, item.id, 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <Plus size={14} />
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
                                passar varinha
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className="font-semibold flex-shrink-0 text-[11px]">
                      {formatCurrency((item.unitPrice ?? (item.price && item.qty ? item.price / item.qty : item.price) ?? 0) * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              {/* ADICIONAR ITEM */}
              <div className="mt-3 flex flex-row gap-2 items-center bg-white/70 border border-slate-200/70 rounded-2xl p-1.5">
                <select
                  value={selectedProducts[order.id] || ""}
                  onChange={(e) =>
                    setSelectedProducts((prev) => ({
                      ...prev,
                      [order.id]: e.target.value,
                    }))
                  }
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
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
                  className="w-10 h-10 sm:w-auto sm:px-3 sm:py-2 rounded-lg bg-brand-primary text-white text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Incluir</span>
                </button>
              </div>

              {renderTimeline(order.status)}

              {/* TOTAL + BOTÕES */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                Total
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  {formatCurrency(order.total || 0)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {order.status === "pending" && (
                  <div className="w-full sm:w-auto">
                    <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                      Clique em iniciar preparo para começar.
                    </div>
                    <button
                      onClick={() => handleAdvance(order.id, "preparing")}
                      disabled={updating === order.id}
                      className="w-full sm:w-auto px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      <Clock size={16} /> Iniciar preparo
                    </button>
                  </div>
                )}

                {order.status === "preparing" && (
                  <div className="w-full sm:w-auto">
                    <div className="mb-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1">
                      Pedido pronto? Clique para finalizar.
                    </div>
                    <button
                      onClick={() => openPaymentConfirm(order)}
                      disabled={updating === order.id}
                      className="w-full sm:w-auto px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      <CheckSquare size={16} /> Marcar pronto
                    </button>
                  </div>
                )}
              </div>
            </div>
            </div>
          ))}

          {sortedQueue.length === 0 && !loading && (
            <div className="col-span-full text-center text-gray-500 py-12 bg-white rounded-xl border border-dashed">
              Nenhum pedido aguardando.
            </div>
          )}
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Confirmar pagamento</p>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Pedido pronto para cobrar</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <X size={18} />
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
                <span>Total</span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold">
                  {formatCurrency(confirmModal.total || 0)}
                </span>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Pagamento recebido
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedToday.map((order) => (
              <div
                key={order.id}
                className="relative w-full max-w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-4 shadow-sm overflow-hidden"
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
                  <p className="uppercase">
                    {order.type === "table" && order.table ? (
                      <span className="font-semibold text-slate-800">Mesa {order.table}</span>
                    ) : (
                      <>
                        {formatOrderType(order.type)}
                        {order.table && <span className="font-semibold text-slate-800"> · Mesa {order.table}</span>}
                      </>
                    )}
                  </p>
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
                      <span className="truncate">{item.qty}x {item.name}</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency((item.unitPrice ?? (item.price && item.qty ? item.price / item.qty : item.price) ?? 0) * item.qty)}
                      </span>
                    </div>
                  ))}
                  {(order.items || []).length > 3 && (
                    <p className="text-[11px] text-slate-400">
                      + {(order.items || []).length - 3} itens
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-700">
                    {formatCurrency(order.total || 0)}
                  </span>
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
                Nenhum pedido finalizado hoje.
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}
    </div>
  );
};
