// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';

export function PaymentPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsHasMore, setEventsHasMore] = useState(true);
  const [pixCopied, setPixCopied] = useState(false);
  const [renewMethod, setRenewMethod] = useState('PIX');
  const [renewing, setRenewing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isAnnual, setIsAnnual] = useState(false);
  const EVENTS_PAGE_SIZE = 25;
  const platformLogo = '/chama-no-espeto.jpeg';
  const redirectRef = useRef(false);

  const handleCopyPix = async (value: string) => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2000);
    } catch (error) {
      console.error('Falha ao copiar PIX', error);
    }
  };

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
        setError(err.message || 'Não foi possível carregar o pagamento no momento.');
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

  useEffect(() => {
    if (!paymentId) return;
    const loadPlans = async () => {
      try {
        const data = await planService.list();
        const planList = Array.isArray(data) ? data : [];
        setPlans(planList);
        if (!planList.length) return;
        const currentPlanId = payment?.subscription?.plan?.id;
        if (currentPlanId) {
          setSelectedPlanId(currentPlanId);
          const currentPlan = planList.find((plan) => plan.id === currentPlanId);
          if (currentPlan?.name?.includes('_yearly')) {
            setIsAnnual(true);
          }
          return;
        }
        const defaultPlan = planList.find((plan) => plan.name === getPlanName('basic', 'monthly'));
        setSelectedPlanId(defaultPlan?.id || planList[0].id);
      } catch (err) {
        console.error('Falha ao carregar planos', err);
      }
    };
    loadPlans();
  }, [paymentId, payment?.subscription?.plan?.id]);

  const isPaid = payment?.status === 'PAID';
  const isFailed = payment?.status === 'FAILED';
  const isExpired = payment?.expiresAt ? new Date(payment.expiresAt) <= new Date() : false;
  const createdAt = payment?.createdAt ? new Date(payment.createdAt) : null;
  const isRecentPayment =
    createdAt && Number.isFinite(createdAt.getTime())
      ? Date.now() - createdAt.getTime() <= 24 * 60 * 60 * 1000
      : false;
  const needsRenew = isFailed || isExpired;
  const isVerified = payment?.emailVerified;
  const statusLabel = isPaid
    ? 'Pagamento aprovado'
    : isFailed
    ? 'Pagamento falhou'
    : isExpired
    ? 'Pagamento expirou'
    : 'Aguardando pagamento';
  const statusTone = isPaid ? 'text-emerald-600' : needsRenew ? 'text-red-600' : 'text-yellow-600';
  const statusBg = isPaid ? 'bg-emerald-50 text-emerald-600' : needsRenew ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600';
  const isMock = payment?.provider === 'MOCK';
  const storeSlug = payment?.storeSlug;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const storeUrl = storeSlug ? `${baseUrl}/chamanoespeto/${storeSlug}` : '';
  const adminUrl = storeSlug ? `${baseUrl}/admin?slug=${encodeURIComponent(storeSlug)}` : `${baseUrl}/admin`;
  const methodMeta = getPaymentMethodMeta(payment?.method);
  const providerMeta = getPaymentProviderMeta(payment?.provider);
  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = plans.reduce((acc, plan) => {
    acc[plan.name] = plan;
    return acc;
  }, {});

  useEffect(() => {
    if (!plans.length || !needsRenew) return;
    const currentPlan = plans.find((plan) => plan.id === selectedPlanId);
    const isCurrentCycle = currentPlan?.name?.endsWith(`_${billingKey}`);
    if (isCurrentCycle) return;
    const fallback = PLAN_TIERS
      .map((tier) => plansByName[getPlanName(tier.key, billingKey)]?.id)
      .find(Boolean);
    if (fallback) setSelectedPlanId(fallback);
  }, [billingKey, plans, plansByName, selectedPlanId, needsRenew]);

  useEffect(() => {
    if (!isPaid || !isVerified || redirectRef.current) return;
    redirectRef.current = true;
    const timeout = window.setTimeout(() => {
      navigate(storeSlug ? `/admin?slug=${encodeURIComponent(storeSlug)}` : '/admin');
    }, 7000);
    return () => window.clearTimeout(timeout);
  }, [isPaid, isVerified, navigate, storeSlug]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
        <div className="h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-[0_14px_26px_-18px_rgba(239,68,68,0.7)] border border-white bg-white">
                <img src={platformLogo} alt="Chama no Espeto" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-lg font-black text-gray-900">Chama no Espeto</p>
                <p className="text-xs text-gray-500 uppercase tracking-[0.25em]">Pagamento</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/create')}
              className="px-3 py-2 sm:px-4 text-sm rounded-full border border-slate-200 text-gray-700 hover:bg-gray-50 transition-colors"
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
                  <div className={`w-12 h-12 rounded-2xl ${statusBg} flex items-center justify-center text-2xl`}>
                    💳
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pagamento #{payment.id}</p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{statusLabel}</h1>
                    {isPaid ? (
                    <p className="text-gray-600 mt-2">
                      {isVerified
                        ? 'Sua loja foi liberada. Use o e-mail e senha cadastrados para acessar o painel.'
                        : 'Pagamento aprovado. Confirme seu e-mail para liberar a loja.'}
                    </p>
                    ) : needsRenew ? (
                      <p className="text-gray-600 mt-2">
                        O pagamento expirou ou falhou. Gere um novo pagamento para continuar.
                      </p>
                    ) : (
                      <p className="text-gray-600 mt-2">
                        {payment.method === 'BOLETO'
                          ? 'Boleto pode levar até 3 dias úteis para compensar. Sua loja será liberada automaticamente.'
                          : 'Use o QR Code abaixo para completar o pagamento.'}
                    </p>
                  )}
                </div>
              </div>

              {isPaid && isVerified && (
                <div className="p-5 border border-emerald-100 rounded-2xl bg-emerald-50 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-emerald-800">Loja ativa</p>
                  {payment.storeName && (
                    <p className="text-sm text-emerald-800">
                      <span className="font-semibold">Loja:</span> {payment.storeName}
                    </p>
                  )}
                  {storeSlug && (
                    <p className="text-sm text-emerald-800">
                      <span className="font-semibold">Slug da loja:</span> {storeSlug}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={adminUrl}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90"
                    >
                      Acessar painel
                    </a>
                    {storeUrl && (
                      <a
                        href={storeUrl}
                        className="px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100"
                      >
                        Ver vitrine
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800">
                    Use o login e senha cadastrados para entrar no painel. Seu slug ja vai preenchido no login.
                  </p>
                  <p className="text-xs text-emerald-700">Redirecionando em alguns segundos...</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
                  <p className={`text-lg font-bold ${statusTone}`}>
                    {payment.status}
                    {polling && <span className="ml-2 text-xs text-gray-500">(atualizando)</span>}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">Forma de pagamento:</span>
                      {methodMeta.icon && (
                        <img src={methodMeta.icon} alt={methodMeta.label} className="h-5 w-5 object-contain" />
                      )}
                      <span>{methodMeta.label}</span>
                    </p>
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
                  {isPaid ? (
                    <p className="text-sm text-emerald-700 font-semibold text-center">
                      Pagamento confirmado. Sua loja já está liberada.
                    </p>
                  ) : needsRenew ? (
                    <>
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-between w-full gap-2">
                          <p className="text-sm font-semibold text-gray-700">Escolha um plano</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Mensal</span>
                            <button
                              type="button"
                              onClick={() => setIsAnnual(!isAnnual)}
                              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isAnnual ? 'bg-red-500' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs font-semibold ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Anual</span>
                          </div>
                        </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {PLAN_TIERS.map((tier) => {
                            const planKey = getPlanName(tier.key, billingKey);
                            const plan = plansByName[planKey];
                            const price = plan ? Number(plan.price) : billing.priceByTier[tier.key];
                            const isSelected = plan?.id && selectedPlanId === plan.id;
                            const isDisabled = !plan?.id;
                            return (
                              <button
                                type="button"
                                key={planKey}
                                onClick={() => plan?.id && setSelectedPlanId(plan.id)}
                                disabled={isDisabled}
                                className={`border rounded-2xl px-3 py-3 text-left transition-all ${
                                  !selectedPlanId && !isSelected ? 'border-red-200 bg-red-50/40' : ''
                                } ${isSelected
                                  ? 'border-red-500 shadow-lg bg-red-50'
                                  : 'border-gray-200 hover:border-red-200'
                                  } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <p className="text-[11px] uppercase font-semibold text-gray-500">{tier.label}</p>
                                <p className="text-lg font-bold text-gray-900">R$ {Number(price).toFixed(2)}</p>
                                <p className="text-[11px] text-gray-500">{billing.period}</p>
                              </button>
                            );
                          })}
                      </div>
                      {!selectedPlanId && (
                        <p className="text-xs text-red-500 font-semibold">
                          Selecione um plano para continuar.
                        </p>
                      )}
                    </div>
                      <p className="text-sm font-semibold text-gray-700 text-center">
                        Escolha uma forma para gerar um novo pagamento
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setRenewMethod('PIX')}
                          className={`rounded-2xl px-4 py-3 text-left transition-all border text-sm font-semibold active:scale-[0.98] ${
                            renewMethod === 'PIX'
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-100 via-white to-white text-emerald-700 shadow-lg ring-2 ring-emerald-200'
                              : 'border-gray-200 text-gray-600 bg-white/80 hover:border-emerald-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <img
                              src={getPaymentMethodMeta('PIX').icon}
                              alt="Pix"
                              className="h-6 w-6 object-contain"
                            />
                            <span className="text-sm font-semibold tracking-tight">Pix</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenewMethod('CREDIT_CARD')}
                          className={`rounded-2xl px-4 py-3 text-left transition-all border text-sm font-semibold active:scale-[0.98] ${
                            renewMethod === 'CREDIT_CARD'
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-100 via-white to-white text-emerald-700 shadow-lg ring-2 ring-emerald-200'
                              : 'border-gray-200 text-gray-600 bg-white/80 hover:border-emerald-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <img
                              src={getPaymentMethodMeta('CREDIT_CARD').icon}
                              alt="Cartão"
                              className="h-6 w-6 object-contain"
                            />
                            <span className="text-sm font-semibold tracking-tight">Cartão</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenewMethod('BOLETO')}
                          className={`rounded-2xl px-4 py-3 text-left transition-all border text-sm font-semibold active:scale-[0.98] ${
                            renewMethod === 'BOLETO'
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-100 via-white to-white text-emerald-700 shadow-lg ring-2 ring-emerald-200'
                              : 'border-gray-200 text-gray-600 bg-white/80 hover:border-emerald-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="text-sm font-semibold tracking-tight">Boleto</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!paymentId) return;
                          if (!selectedPlanId) {
                            setError('Selecione um plano para continuar.');
                            return;
                          }
                          setRenewing(true);
                          setError('');
                          try {
                            const nextPayment = await paymentService.renew(paymentId, {
                              paymentMethod: renewMethod,
                              planId: selectedPlanId,
                            });
                            if (nextPayment?.id) {
                              navigate(`/payment/${nextPayment.id}`);
                            }
                          } catch (err: any) {
                          setError(err.message || 'Não foi possível gerar um novo pagamento agora.');
                          } finally {
                            setRenewing(false);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={renewing || !selectedPlanId}
                      >
                        {renewing ? 'Gerando...' : 'Gerar novo pagamento'}
                      </button>
                    </>
                  ) : payment.method === 'PIX' && payment.qrCodeBase64 ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {providerMeta.icon && (
                          <img src={providerMeta.icon} alt={providerMeta.label} className="h-5" />
                        )}
                        <span>Escaneie o QR Code PIX</span>
                      </div>
                      <img src={payment.qrCodeBase64} alt="QR Code PIX" className="w-64 h-64 object-contain" />
                      {payment.qrCodeText && (
                        <div className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left space-y-2">
                          <p className="text-xs text-gray-500">Código copia e cola</p>
                          <p className="text-xs text-gray-700 break-all">{payment.qrCodeText}</p>
                          <button
                            onClick={() => handleCopyPix(payment.qrCodeText)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90"
                          >
                            {pixCopied ? 'Copiado!' : 'Copiar codigo'}
                          </button>
                        </div>
                      )}
                      {isMock && (
                        <p className="text-xs text-gray-500 text-center">Pagamento mock para testes - nenhum valor será cobrado.</p>
                      )}
                    </>
                  ) : payment.paymentLink && isRecentPayment ? (
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
                    <p className="text-gray-600 text-center">
                      Este link expirou. Gere um novo pagamento para continuar.
                    </p>
                  )}
                </div>
              </div>
              {payment.provider && (
                <div className="border border-gray-100 rounded-2xl p-5 bg-white">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Linha do tempo</p>
                  <p className="text-sm text-gray-600">
                    Provedor:{' '}
                    <span className="font-semibold inline-flex items-center gap-2">
                      {providerMeta.icon && (
                        <img src={providerMeta.icon} alt={providerMeta.label} className="h-4 w-4 object-contain" />
                      )}
                      {providerMeta.label}
                    </span>
                  </p>
                  {payment.providerId && (
                    <p className="text-sm text-gray-600">
                      ID do provedor: <span className="font-semibold">{payment.providerId}</span>
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    {(events || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                        <div className="text-3xl">🛰️</div>
                        <p className="mt-2 text-sm font-semibold text-slate-700">Nenhum evento recebido ainda.</p>
                        <p className="text-xs text-slate-500">
                          Assim que o provedor atualizar o pagamento, ele aparece aqui.
                        </p>
                      </div>
                    ) : (
                      events.map((event) => (
                        <div key={event.id} className="text-sm text-gray-600 border border-gray-100 rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{event.status}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(event.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))
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
