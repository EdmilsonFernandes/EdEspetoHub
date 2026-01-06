// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';

export function PaymentPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsHasMore, setEventsHasMore] = useState(true);
  const EVENTS_PAGE_SIZE = 25;

  useEffect(() => {
    let interval: number | undefined;

    const loadPayment = async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await paymentService.getById(paymentId);
        setPayment(data);
        const eventData = await paymentService.getEvents(paymentId, EVENTS_PAGE_SIZE, 0);
        setEvents(eventData || []);
        setEventsPage(0);
        setEventsHasMore((eventData || []).length === EVENTS_PAGE_SIZE);
        if (data?.status === 'PAID' || data?.status === 'FAILED') {
          setPolling(false);
        }
      } catch (err: any) {
        setError(err.message || 'Não foi possível carregar o pagamento');
      } finally {
        if (!silent) setIsLoading(false);
      }
    };

    if (paymentId) {
      loadPayment();
      setPolling(true);
      interval = window.setInterval(() => loadPayment(true), 8000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-black flex items-center justify-center shadow-lg">
                CS
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-lg font-bold text-gray-900">Chama no Espeto</p>
                <p className="text-sm text-gray-500">Pagamento</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/create')}
              className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Criar outra loja
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-10">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin" />
              <p className="text-gray-600">Carregando informações do pagamento...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {!isLoading && !error && payment && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl">
                  💳
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pagamento #{payment.id}</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Aguardando pagamento para liberar sua loja
                  </h1>
                  <p className="text-gray-600 mt-2">Use o QR Code abaixo para completar o pagamento.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {payment.status}
                    {polling && <span className="ml-2 text-xs text-gray-500">(atualizando)</span>}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Forma de pagamento:</span> {payment.method}</p>
                    <p><span className="font-semibold">Valor:</span> R$ {Number(payment.amount).toFixed(2)}</p>
                    {payment.expiresAt && (
                      <p>
                        <span className="font-semibold">Expira em:</span>{' '}
                        {new Date(payment.expiresAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50 flex flex-col items-center justify-center gap-3">
                  {payment.method === 'PIX' && payment.qrCodeBase64 ? (
                    <>
                      <p className="text-sm font-semibold text-gray-700">Escaneie o QR Code PIX</p>
                      <img src={payment.qrCodeBase64} alt="QR Code PIX" className="w-64 h-64 object-contain" />
                      <p className="text-xs text-gray-500 text-center">Pagamento mock para testes - nenhum valor será cobrado.</p>
                    </>
                  ) : payment.paymentLink ? (
                    <>
                      <p className="text-sm font-semibold text-gray-700">
                        {payment.method === 'BOLETO' ? 'Acesse o boleto' : 'Acesse o link de pagamento'}
                      </p>
                      <a
                        href={payment.paymentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90"
                      >
                        Abrir pagamento
                      </a>
                      <p className="text-xs text-gray-500 text-center">Você será direcionado para o provedor de pagamento.</p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-center">Forma de pagamento não disponível no momento.</p>
                  )}
                </div>
              </div>
              {payment.provider && (
                <div className="border border-gray-100 rounded-2xl p-5 bg-white">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Linha do tempo</p>
                  <p className="text-sm text-gray-600">
                    Provedor: <span className="font-semibold">{payment.provider}</span>
                  </p>
                  {payment.providerId && (
                    <p className="text-sm text-gray-600">
                      ID do provedor: <span className="font-semibold">{payment.providerId}</span>
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    {(events || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhum evento recebido ainda.</p>
                    ) : (
                      events.map((event) => {
                        const isExpanded = Boolean(expandedEvents[event.id]);
                        return (
                          <div key={event.id} className="text-sm text-gray-600 border border-gray-100 rounded-xl p-3 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{event.status}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                  {new Date(event.createdAt).toLocaleString('pt-BR')}
                                </span>
                                {event.payload && (
                                  <button
                                    onClick={() =>
                                      setExpandedEvents((prev) => ({
                                        ...prev,
                                        [event.id]: !prev[event.id],
                                      }))
                                    }
                                    className="text-xs font-semibold text-brand-primary hover:underline"
                                  >
                                    {isExpanded ? 'Ocultar' : 'Ver payload'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {isExpanded && event.payload && (
                              <pre className="mt-2 bg-slate-900 text-slate-100 text-xs p-3 rounded-lg overflow-auto max-h-48">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })
                    )}
                    {eventsHasMore && (
                      <button
                        onClick={async () => {
                          const nextPage = eventsPage + 1;
                          const next = await paymentService.getEvents(paymentId, EVENTS_PAGE_SIZE, nextPage * EVENTS_PAGE_SIZE);
                          const nextEvents = [ ...events, ...(next || []) ];
                          setEvents(nextEvents);
                          setEventsPage(nextPage);
                          setEventsHasMore((next || []).length === EVENTS_PAGE_SIZE);
                        }}
                        className="w-full mt-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Carregar mais eventos
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
