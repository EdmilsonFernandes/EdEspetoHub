import React, { useEffect, useState } from 'react';
import { CheckSquare, Clock, ChefHat, RefreshCcw } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { formatCurrency, formatDateTime } from '../../utils/format';

export const GrillQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    const data = await orderService.fetchQueue();
    setQueue(data);
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvance = async (orderId, status) => {
    await orderService.updateStatus(orderId, status);
  };

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

            <div className="mt-4 space-y-2">
              {(order.items || []).map((item) => (
                <div key={item.name} className="flex justify-between text-sm text-gray-700">
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span className="font-semibold">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
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
