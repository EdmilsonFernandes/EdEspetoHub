// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { planService } from '../services/planService';
import { subscriptionService } from '../services/subscriptionService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';
import { getPaymentMethodMeta } from '../utils/paymentAssets';

export function AdminRenewal() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [isAnnual, setIsAnnual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const openedPaymentLinkRef = useRef('');

  const storeId = auth?.store?.id;
  const currentStatus = auth?.subscription?.status;
  const currentEndDate = auth?.subscription?.endDate;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await planService.list();
        setPlans(response || []);
        const defaultPlan = response?.find((plan) => plan.name === getPlanName('basic', 'monthly'));
        if (defaultPlan) {
          setSelectedPlanId(defaultPlan.id);
        } else if (response?.[0]) {
          setSelectedPlanId(response[0].id);
        }
      } catch (error) {
        console.error('Não foi possível carregar os planos', error);
      }
    };

    fetchPlans();
  }, []);

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = plans.reduce((acc, plan) => {
    acc[plan.name] = plan;
    return acc;
  }, {});

  useEffect(() => {
    if (!plans.length) return;
    const currentPlan = plans.find((plan) => plan.id === selectedPlanId);
    const isCurrentCycle = currentPlan?.name?.endsWith(`_${billingKey}`);
    if (isCurrentCycle) return;
    const fallback = PLAN_TIERS
      .map((tier) => plansByName[getPlanName(tier.key, billingKey)]?.id)
      .find(Boolean);
    if (fallback) setSelectedPlanId(fallback);
  }, [billingKey, plans, plansByName, selectedPlanId]);

  const handleRenew = async () => {
    if (!storeId) return;
    if (!selectedPlanId) {
      setError('Selecione um plano para continuar.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const payment = await subscriptionService.createRenewal(storeId, {
        planId: selectedPlanId,
        paymentMethod,
      });

      if (payment?.paymentLink && (payment.method === 'CREDIT_CARD' || payment.method === 'BOLETO')) {
        if (openedPaymentLinkRef.current !== payment.paymentLink) {
          openedPaymentLinkRef.current = payment.paymentLink;
          window.open(payment.paymentLink, '_blank', 'noopener,noreferrer');
        }
      }

      if (payment?.id) {
        navigate(`/payment/${payment.id}`);
      }
    } catch (err) {
      setError(err.message || 'Não foi possível gerar a renovação agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const expiresLabel = currentEndDate ? new Date(currentEndDate).toLocaleDateString('pt-BR') : '—';
  const platformLogo = '/chama-no-espeto.jpeg';
  const handleGoToLogin = () => {
    logout();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-white bg-white">
                <img src={platformLogo} alt="Chama no Espeto" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-lg font-bold text-gray-900">Chama no Espeto</p>
                <p className="text-sm text-gray-500">Renovação</p>
              </div>
            </button>
            <button
              onClick={handleGoToLogin}
              className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ir para login
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Renovar assinatura</h1>
              <p className="text-gray-500 mt-1">
                Sua assinatura esta {currentStatus === 'EXPIRED' ? 'expirada' : 'quase expirando'}.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-500">Expiração</p>
              <p className="text-sm font-semibold text-slate-800">{expiresLabel}</p>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</div>}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Escolha um plano</h3>
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-semibold ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Mensal</span>
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${isAnnual ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-9' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-semibold ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Anual</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLAN_TIERS.map((tier) => {
                const planKey = getPlanName(tier.key, billingKey);
                const plan = plansByName[planKey];
                const price = plan ? Number(plan.price) : billing.priceByTier[tier.key];
                const durationLabel = plan
                  ? `${plan.durationDays} dias de acesso`
                  : billingKey === 'yearly'
                  ? '365 dias de acesso'
                  : '30 dias de acesso';
                const isSelected = plan?.id && selectedPlanId === plan.id;
                const isDisabled = !plan?.id;
                return (
                  <button
                    type="button"
                    key={planKey}
                    onClick={() => plan?.id && setSelectedPlanId(plan.id)}
                    disabled={isDisabled}
                    className={`border rounded-2xl p-4 text-left transition-all relative ${
                      !selectedPlanId && !isSelected ? 'border-red-200 bg-red-50/40' : ''
                    } ${isSelected
                      ? 'border-red-500 shadow-lg bg-red-50'
                      : 'border-gray-200 hover:border-red-200'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        MAIS POPULAR
                      </span>
                    )}
                    {billing.savings && (
                      <span className="absolute -top-3 left-4 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                        {billing.savings}
                      </span>
                    )}
                    <p className="text-sm uppercase font-semibold text-gray-500">{tier.label}</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {Number(price).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{billing.period}</p>
                    <p className="text-xs text-gray-500 mt-1">{durationLabel}</p>
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

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Forma de pagamento</h4>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('PIX')}
                className={`rounded-2xl px-4 py-3 text-left transition-all border active:scale-[0.98] ${
                  paymentMethod === 'PIX'
                    ? 'border-brand-primary bg-gradient-to-br from-brand-primary/15 via-white to-white text-brand-primary shadow-lg ring-2 ring-brand-primary/30'
                    : 'border-gray-200 text-gray-600 bg-white/80 hover:border-brand-primary/40 hover:shadow-sm'
                }`}
              >
                <span className="flex items-center gap-3">
                  <img src={getPaymentMethodMeta('PIX').icon} alt="Pix" className="h-6 w-6 object-contain" />
                  <span className="text-sm font-semibold tracking-tight">Pix</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`rounded-2xl px-4 py-3 text-left transition-all border active:scale-[0.98] ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-brand-primary bg-gradient-to-br from-brand-primary/15 via-white to-white text-brand-primary shadow-lg ring-2 ring-brand-primary/30'
                    : 'border-gray-200 text-gray-600 bg-white/80 hover:border-brand-primary/40 hover:shadow-sm'
                }`}
              >
                <span className="flex items-center gap-3">
                  <img
                    src={getPaymentMethodMeta('CREDIT_CARD').icon}
                    alt="Cartão"
                    className="h-6 w-6 object-contain"
                  />
                  <span className="text-sm font-semibold tracking-tight">Cartão de crédito</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BOLETO')}
                className={`rounded-2xl px-4 py-3 text-left transition-all border active:scale-[0.98] ${
                  paymentMethod === 'BOLETO'
                    ? 'border-brand-primary bg-gradient-to-br from-brand-primary/15 via-white to-white text-brand-primary shadow-lg ring-2 ring-brand-primary/30'
                    : 'border-gray-200 text-gray-600 bg-white/80 hover:border-brand-primary/40 hover:shadow-sm'
                }`}
              >
                <span className="text-sm font-semibold tracking-tight">Boleto</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleRenew}
              disabled={!selectedPlanId || isSubmitting}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Gerando pagamento...' : 'Gerar renovação'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
