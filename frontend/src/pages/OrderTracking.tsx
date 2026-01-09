// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChefHat, CircleCheck, Clock, Loader2, MapPin } from 'lucide-react';
import { orderService } from '../services/orderService';
import { formatCurrency, formatDateTime, formatDuration } from '../utils/format';

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
  const [elapsedMs, setElapsedMs] = useState(0);

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

  useEffect(() => {
    if (!order?.createdAt) return;
    const start = new Date(order.createdAt).getTime();
    if (!Number.isFinite(start)) return;
    const update = () => setElapsedMs(Date.now() - start);
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [order?.createdAt]);

  const status = order?.status || 'pending';
  const typeLabel = typeLabels[order?.type] || 'Pedido';
  const isDelivery = order?.type === 'delivery';
  const statusLabel = useMemo(() => {
    if (isDelivery && (status === 'done' || status === 'delivered')) return 'Saiu para entrega';
    if (order?.type === 'table' && status === 'done') return 'Pronto para servir';
    return statusLabels[status] || status;
  }, [isDelivery, order?.type, status]);
  const isReady = status === 'done' || status === 'delivered';
  const queuePosition = order?.queuePosition;
  const queueSize = order?.queueSize;
  const storePhone = order?.store?.phone;
  const estimateMinutes =
    typeof queuePosition === 'number' && queuePosition > 0 ? Math.max(5, queuePosition * 6) : null;

  const steps = useMemo(() => {
    if (isDelivery) {
      return [
        { id: 'pending', label: 'Recebido' },
        { id: 'preparing', label: 'Em preparo' },
        { id: 'done', label: 'Saiu para entrega' },
      ];
    }
    return [
      { id: 'pending', label: 'Recebido' },
      { id: 'preparing', label: 'Em preparo' },
      { id: 'done', label: order?.type === 'table' ? 'Pronto para servir' : 'Pronto' },
    ];
  }, [isDelivery, order?.type]);
  const currentStep = isDelivery && status === 'delivered' ? 'done' : status;
  const currentIndex = Math.max(0, steps.findIndex((item) => item.id === currentStep));
  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;

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
              <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-gray-50 to-white p-5 sm:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Pedido #{order.id}</p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{statusLabel}</h1>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isReady
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {isReady ? 'Finalizado' : 'Em andamento'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {order.store?.name || 'Chama no Espeto'} • {typeLabel}
                    </p>
                    {estimateMinutes && !isReady && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold animate-pulse">
                        Estimativa: ~{estimateMinutes} min
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} />
                    {order.createdAt ? formatDateTime(order.createdAt) : 'Agora'}
                    {elapsedMs > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">
                        • {formatDuration(elapsedMs)}
                      </span>
                    )}
                  </div>
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
                <div className="mb-4">
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{progress}% completo</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {steps.map((step) => {
                    const isDone =
                      steps.findIndex((item) => item.id === step.id) <=
                      steps.findIndex((item) => item.id === currentStep);
                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-4 py-3 flex items-center gap-2 ${
                          isDone
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-500'
                        } ${step.id === currentStep && !isReady ? 'ring-2 ring-amber-300 animate-pulse' : ''}`}
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
                      <div key={item.id || item.productId} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                              🍖
                            </div>
                          )}
                          <span>{item.quantity}x {item.name}</span>
                        </div>
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
                      {isDelivery
                        ? 'Seu pedido saiu para entrega. Logo chega ao seu destino. Bom apetite!'
                        : order?.type === 'table'
                        ? 'Seu pedido esta pronto. Aguarde o atendimento na sua mesa.'
                        : 'Seu pedido esta pronto! Pode ir retirar. Bom apetite!'}
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
