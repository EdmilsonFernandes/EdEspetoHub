// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChefHat, CircleCheck, Clock, Loader2, MapPin } from 'lucide-react';
import { orderService } from '../services/orderService';
import { formatCurrency, formatDateTime } from '../utils/format';

const statusLabels: Record<string, string> = {
  pending: 'Recebido',
  preparing: 'Em preparo',
  done: 'Pronto',
  delivered: 'Entregue',
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

export function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

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
            queuePosition: parsed.queuePosition ?? 1,
            queueSize: parsed.queueSize ?? 4,
          };
          setOrder(next);
        } else {
          setError('Pedido demo nao encontrado.');
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
        setError(err.message || 'Nao foi possivel carregar o pedido.');
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

  const status = order?.status || 'pending';
  const statusLabel = statusLabels[status] || status;
  const typeLabel = typeLabels[order?.type] || 'Pedido';
  const isReady = status === 'done' || status === 'delivered';
  const queuePosition = order?.queuePosition;
  const queueSize = order?.queueSize;
  const storePhone = order?.store?.phone;
  const estimateMinutes =
    typeof queuePosition === 'number' && queuePosition > 0 ? Math.max(5, queuePosition * 6) : null;

  const steps = useMemo(
    () => [
      { id: 'pending', label: 'Recebido' },
      { id: 'preparing', label: 'Em preparo' },
      { id: 'done', label: 'Pronto' },
    ],
    []
  );
  const currentStep = status === 'delivered' ? 'done' : status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-white bg-white">
                <img src="/chama-no-espeto.jpeg" alt="Chama no Espeto" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-lg font-bold text-gray-900">Acompanhar pedido</p>
                <p className="text-sm text-gray-500">Status em tempo real</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
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
              <Loader2 className="animate-spin" />
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
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{statusLabel}</h1>
                  <p className="text-sm text-gray-500 mt-2">
                    {order.store?.name || 'Chama no Espeto'} • {typeLabel}
                  </p>
                  {estimateMinutes && !isReady && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                      Estimativa: ~{estimateMinutes} min
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={16} />
                  {order.createdAt ? formatDateTime(order.createdAt) : 'Agora'}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-4">
                  <ChefHat className="text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Andamento do preparo</p>
                    <p className="text-xs text-gray-500">
                      {polling ? 'Atualizando automaticamente' : 'Status finalizado'}
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {steps.map((step) => {
                    const isDone =
                      steps.findIndex((item) => item.id === step.id) <=
                      steps.findIndex((item) => item.id === currentStep);
                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-4 py-3 flex items-center gap-2 ${
                          isDone ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {isDone ? <CircleCheck size={18} /> : <Clock size={18} />}
                        <span className="text-sm font-semibold">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-3">Resumo do pedido</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    {(order.items || []).map((item) => (
                      <div key={item.id || item.productId} className="flex items-center justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>R$ {Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm font-semibold text-gray-800">
                    <span>Total</span>
                    <span>{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Informacoes</p>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      <span className="font-semibold">Cliente:</span> {order.customerName || 'Cliente'}
                    </p>
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
                    {order.type === 'delivery' && order.address && (
                      <p className="flex items-start gap-2">
                        <MapPin size={16} className="text-gray-400 mt-0.5" />
                        <span>{order.address}</span>
                      </p>
                    )}
                  {storePhone && (
                      <div className="flex flex-col gap-2">
                        <p>
                          <span className="font-semibold">Contato da loja:</span> {storePhone}
                        </p>
                        <a
                          href={`https://wa.me/${storePhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:opacity-90"
                        >
                          Falar no WhatsApp
                        </a>
                      </div>
                    )}
                    <p>
                      <span className="font-semibold">Status:</span> {statusLabel}
                    </p>
                    {typeof queuePosition === 'number' && typeof queueSize === 'number' && (
                      <p>
                        <span className="font-semibold">Posicao na fila:</span> {queuePosition} de {queueSize}
                      </p>
                    )}
                    {estimateMinutes && !isReady && (
                      <p>
                        <span className="font-semibold">Estimativa:</span> ~{estimateMinutes} min
                      </p>
                    )}
                  </div>
                  {isReady && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                      Seu pedido esta pronto! Pode ir retirar ou aguarde o atendimento.
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
