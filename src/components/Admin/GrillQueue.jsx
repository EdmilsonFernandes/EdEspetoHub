import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Clock, ChefHat, RefreshCcw, Plus, Minus } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { formatCurrency, formatDateTime, formatDuration } from '../../utils/format';

export const GrillQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadQueue = async () => {
    setLoading(true);
    const data = await orderService.fetchQueue();
    setQueue(data);
    setLoading(false);
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
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvance = async (orderId, status) => {
    await orderService.updateStatus(orderId, status);
  };

  const applyItemsChange = async (orderId, updater) => {
    const targetOrder = queue.find((entry) => entry.id === orderId);
    const updatedItems = updater(targetOrder?.items || []);
    const sanitizedItems = updatedItems.filter((item) => item?.qty > 0);
    const nextTotal = sanitizedItems.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);

    setQueue((previous) =>
      previous.map((order) =>
        order.id === orderId ? { ...order, items: sanitizedItems, total: nextTotal } : order
      )
    );

    await orderService.updateItems(orderId, sanitizedItems, nextTotal);
  };

  const handleQuantityChange = (orderId, itemId, delta) => {
    applyItemsChange(orderId, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
    );
  };

  const handleAddItem = (orderId) => {
    const productId = selectedProducts[orderId];
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;

    applyItemsChange(orderId, (items) => {
      const existingItem = items.find((item) => item.id === product.id);
      if (existingItem) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1, price: product.price } : item
        );
      }
      return [...items, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const elapsedTime = useMemo(
    () =>
      queue.reduce((acc, order) => ({
        ...acc,
        [order.id]: formatDuration(order.createdAt ? currentTime - order.createdAt : 0),
      }), {}),
    [currentTime, queue]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <ChefHat className="text-red-500" />
          Fila do Churrasqueiro
        </div>
        <button
          onClick={loadQueue}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <RefreshCcw size={16} /> Atualizar
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {queue.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
                <h3 className="text-lg font-bold text-gray-800">{order.name || 'Cliente'}</h3>
                <p className="text-xs text-gray-500 uppercase">{order.type}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-bold rounded ${
                  order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {order.status}
              </span>
            </div>

            <div className="mt-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={14} className="text-red-500" />
              <span>{elapsedTime[order.id] || '0s'}</span>
            </div>

            <div className="mt-4 space-y-2">
              {(order.items || []).map((item) => (
                <div key={item.name} className="flex justify-between text-sm text-gray-700 items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(order.id, item.id, -1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-gray-800 w-8 text-center">{item.qty}</span>
                    <button
                      onClick={() => handleQuantityChange(order.id, item.id, 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2 items-center">
              <select
                value={selectedProducts[order.id] || ''}
                onChange={(event) =>
                  setSelectedProducts((prev) => ({ ...prev, [order.id]: event.target.value }))
                }
                className="flex-1 border border-gray-200 rounded-lg p-2 text-sm"
              >
                <option value="">Adicionar item...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleAddItem(order.id)}
                className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Incluir
              </button>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-gray-800 font-black">{formatCurrency(order.total || 0)}</div>
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleAdvance(order.id, 'preparing')}
                    className="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center gap-1"
                  >
                    <Clock size={16} /> Preparar
                  </button>
                )}
                <button
                  onClick={() => handleAdvance(order.id, 'done')}
                  className="px-3 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1"
                >
                  <CheckSquare size={16} /> Finalizar
                </button>
              </div>
            </div>
          </div>
        ))}
        {queue.length === 0 && !loading && (
          <div className="col-span-2 text-center text-gray-500 py-12 bg-white rounded-xl border border-dashed">
            Nenhum pedido aguardando.
          </div>
        )}
      </div>
    </div>
  );
};
