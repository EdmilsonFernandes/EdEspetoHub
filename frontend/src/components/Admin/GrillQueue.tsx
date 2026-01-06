// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Clock, ChefHat, RefreshCcw, Plus, Minus, Hash, Volume2, VolumeX } from "lucide-react";
import { orderService } from "../../services/orderService";
import { productService } from "../../services/productService";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatOrderStatus,
  formatOrderType,
  formatPaymentMethod,
} from "../../utils/format";

export const GrillQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("queueSoundEnabled");
    return saved ? saved === "true" : true;
  });
  const previousIdsRef = useRef<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

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
      console.error("Nao foi possivel tocar o som", err);
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
    const interval = setInterval(loadQueue, 5000);

    const unsubProducts = productService.subscribe(setProducts);

    return () => {
      clearInterval(interval);
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
      setError('Nao foi possivel atualizar o status. Tente novamente.');
    } finally {
      setUpdating(null);
    }
  };

  const applyItemsChange = async (orderId, updater) => {
    const targetOrder = queue.find((entry) => entry.id === orderId);
    const updatedItems = updater(targetOrder?.items || []);

    const sanitizedItems = updatedItems.filter((item) => item.qty > 0);

    const nextTotal = sanitizedItems.reduce(
      (sum, item) => sum + (item.unitPrice ?? item.price ?? 0) * item.qty,
      0
    );

    setQueue((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, items: sanitizedItems, total: nextTotal } : order
      )
    );

    try {
      await orderService.updateItems(orderId, sanitizedItems, nextTotal);
    } catch (err) {
      console.error('Erro ao atualizar itens', err);
      setError('Nao foi possivel atualizar os itens. Atualize a fila.');
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
        { id: product.id, name: product.name, price: product.price, unitPrice: product.price, qty: 1 },
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <ChefHat className="text-brand-primary" />
          Fila do Churrasqueiro
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-primary text-white">
            {sortedQueue.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
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
            }}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            Testar som
          </button>
          <button
            onClick={loadQueue}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <RefreshCcw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedQueue.map((order, index) => (
          <div
            key={order.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            {/* HEADER DO CARD */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 uppercase font-bold">
                  <Hash size={12} className="text-brand-primary" /> Fila{" "}
                  {String(index + 1).padStart(2, "0")}
                </div>

                <p className="text-sm text-gray-500">
                  {formatDateTime(order.createdAt)}
                </p>

                <h3 className="text-lg font-bold text-gray-800">
                  Cliente: {order.customerName || order.name || "Cliente"}
                </h3>

                <p className="text-xs text-gray-500 uppercase">
                  {formatOrderType(order.type)}
                  {order.table ? ` · Mesa ${order.table}` : ''}
                </p>
                {order.phone && (
                  <p className="text-xs text-gray-500">{order.phone}</p>
                )}

                <p className="text-xs text-gray-500 uppercase mt-1">
                  Pagamento: {formatPaymentMethod(order.payment)}
                </p>
              </div>

              <span
                className={`px-2 py-1 text-xs font-bold rounded ${getStatusStyles(order.status).className}`}
              >
                {getStatusStyles(order.status).label}
              </span>
            </div>

            {/* TEMPO */}
            <div className="mt-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-brand-primary text-white font-black flex items-center gap-2 shadow-sm">
                <Clock size={14} className="text-white" />
                <span className="tabular-nums text-base">
                  {elapsedTime[order.id] || "0s"}
                </span>
              </div>
            </div>

            {/* LISTA DE ITENS */}
            <div className="mt-4 space-y-2">
              {(order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm text-gray-700 items-center gap-3"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(order.id, item.id, -1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="font-bold text-gray-800 w-8 text-center">
                      {item.qty}
                    </span>

                    <button
                      onClick={() => handleQuantityChange(order.id, item.id, 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      <Plus size={14} />
                    </button>

                    <span>{item.name}</span>
                  </div>

                  <span className="font-semibold">
                    {formatCurrency((item.unitPrice ?? (item.price && item.qty ? item.price / item.qty : item.price) ?? 0) * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* ADICIONAR ITEM */}
            <div className="mt-3 flex gap-2 items-center">
              <select
                value={selectedProducts[order.id] || ""}
                onChange={(e) =>
                  setSelectedProducts((prev) => ({
                    ...prev,
                    [order.id]: e.target.value,
                  }))
                }
                className="flex-1 border border-gray-200 rounded-lg p-2 text-sm"
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
                className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold flex items-center gap-1 hover:opacity-90"
              >
                <Plus size={14} /> Incluir
              </button>
            </div>

            {renderTimeline(order.status)}

            {/* TOTAL + BOTÕES */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-gray-800 font-black">
                {formatCurrency(order.total || 0)}
              </div>

              <div className="flex gap-2">
                {order.status === "pending" && (
                  <button
                    onClick={() => handleAdvance(order.id, "preparing")}
                    disabled={updating === order.id}
                    className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                  >
                    <Clock size={16} /> Iniciar preparo
                  </button>
                )}

                <button
                  onClick={() => handleAdvance(order.id, "done")}
                  disabled={updating === order.id}
                  className="px-3 py-2 rounded-lg bg-green-100 text-green-800 text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                >
                  <CheckSquare size={16} /> Marcar pronto
                </button>
              </div>
            </div>
          </div>
        ))}

            {sortedQueue.length === 0 && !loading && (
              <div className="col-span-3 text-center text-gray-500 py-12 bg-white rounded-xl border border-dashed">
                Nenhum pedido aguardando.
              </div>
            )}
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}
    </div>
  );
};
