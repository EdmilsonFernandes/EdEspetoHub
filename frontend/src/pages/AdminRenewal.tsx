<<<<<<< HEAD
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { planService } from '../services/planService';
import { subscriptionService } from '../services/subscriptionService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';
=======
﻿// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AdminLayout } from '../layouts/AdminLayout';
import { planService } from '../services/planService';
import { subscriptionService } from '../services/subscriptionService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName, resolveAnnualPromoTotal, resolveMonthlyEquivalent } from '../constants/planCatalog';
>>>>>>> main
import { getPaymentMethodMeta } from '../utils/paymentAssets';

export function AdminRenewal() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { auth, logout } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
=======
  const location = useLocation();
  const { auth } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedTierKey, setSelectedTierKey] = useState<'basic' | 'pro'>('basic');
>>>>>>> main
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [isAnnual, setIsAnnual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
<<<<<<< HEAD
  const openedPaymentLinkRef = useRef('');

  const storeId = auth?.store?.id;
  const currentStatus = auth?.subscription?.status;
  const currentEndDate = auth?.subscription?.endDate;
=======
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const openedPaymentLinkRef = useRef('');

  const storeId = auth?.store?.id;
  const currentStatus = currentSubscription?.status ?? auth?.subscription?.status;
  const currentEndDate = currentSubscription?.endDate ?? auth?.subscription?.endDate;
  const latestPaymentStatus = String(currentSubscription?.latestPaymentStatus || '').toUpperCase();
  const showTrialBadge = String(currentStatus || '').toUpperCase() === 'TRIAL' && latestPaymentStatus !== 'PAID';
  const currentPlanName = String(currentSubscription?.plan?.name || auth?.subscription?.plan?.name || '').toLowerCase();
  const currentTier: 'basic' | 'pro' = currentPlanName.includes('pro') ? 'pro' : 'basic';
  const preferredTier: 'basic' | 'pro' | null = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const focus = String(params.get('focus') || '').toLowerCase();
    if (focus === 'pro') return 'pro';
    if (focus === 'basic') return 'basic';
    return null;
  }, [location.search]);
  const allowedTierKeys = useMemo(() => PLAN_TIERS.map((tier) => tier.key), []);
  const showOnlyProUpgrade = preferredTier === 'pro' && currentTier === 'basic';

  useEffect(() => {
    let active = true;
    const loadCurrentSubscription = async () => {
      if (!storeId) return;
      try {
        const data = await subscriptionService.getByStore(storeId, { force: true });
        if (active) {
          setCurrentSubscription(data || null);
        }
      } catch (loadError) {
        if (active) {
          setCurrentSubscription(null);
        }
      }
    };
    loadCurrentSubscription();
    return () => {
      active = false;
    };
  }, [storeId]);
>>>>>>> main

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await planService.list();
        setPlans(response || []);
<<<<<<< HEAD
        const defaultPlan = response?.find((plan) => plan.name === getPlanName('basic', 'monthly'));
        if (defaultPlan) {
          setSelectedPlanId(defaultPlan.id);
        } else if (response?.[0]) {
          setSelectedPlanId(response[0].id);
        }
=======
        const defaultTier =
          preferredTier && allowedTierKeys.includes(preferredTier)
            ? preferredTier
            : (allowedTierKeys.includes(currentTier) ? currentTier : 'basic');
        setSelectedTierKey(defaultTier as 'basic' | 'pro');
>>>>>>> main
      } catch (error) {
        console.error('Não foi possível carregar os planos', error);
      }
    };

    fetchPlans();
<<<<<<< HEAD
  }, []);
=======
  }, [allowedTierKeys, currentTier, preferredTier]);
>>>>>>> main

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = plans.reduce((acc, plan) => {
    acc[plan.name] = plan;
    return acc;
  }, {});
<<<<<<< HEAD

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
=======
  const selectedPlan = plansByName[getPlanName(selectedTierKey, billingKey)];
  const selectedPlanId = selectedPlan?.id || '';
  const selectedPlanDisplayValue = useMemo(() => {
    if (!selectedPlan) return null;
    const full = Number(selectedPlan.price || 0);
    const promoFromApi = selectedPlan?.promoPrice != null ? Number(selectedPlan.promoPrice) : null;
    if (billingKey === 'yearly') {
      if (promoFromApi != null && promoFromApi > 0 && promoFromApi < full) return promoFromApi;
      return resolveAnnualPromoTotal(full);
    }
    return full;
  }, [selectedPlan, billingKey]);

  useEffect(() => {
    if (!plans.length) return;
    if (!plansByName[getPlanName(selectedTierKey, billingKey)]?.id) {
      const fallbackTier = (PLAN_TIERS.find((tier) => plansByName[getPlanName(tier.key, billingKey)]?.id)?.key || 'basic') as 'basic' | 'pro';
      setSelectedTierKey(fallbackTier);
    }
  }, [billingKey, plans, plansByName, selectedTierKey]);

  const handleRenew = async () => {
    if (!storeId) return;
    if (!selectedPlanId) {
      setError('Selecione um plano para continuar.');
      return;
    }
>>>>>>> main
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
<<<<<<< HEAD
      setError(err.message || 'Não foi possível gerar a renovação agora.');
=======
      const waitMinutes = Number(err?.details?.retryAfterMinutes || 0);
      const pendingUrl = err?.details?.paymentUrl;
      if (err?.code === 'SUB-007') {
        setError(
          waitMinutes > 0
            ? `Já existe um pagamento pendente. Aguarde cerca de ${waitMinutes} minuto(s) para tentar novamente.`
            : 'Já existe um pagamento pendente para esta loja. Aguarde expirar para tentar novamente.'
        );
        if (pendingUrl) {
          openedPaymentLinkRef.current = pendingUrl;
        }
      } else {
        setError(err.message || 'Não foi possível gerar a renovação agora.');
      }
>>>>>>> main
    } finally {
      setIsSubmitting(false);
    }
  };

  const expiresLabel = currentEndDate ? new Date(currentEndDate).toLocaleDateString('pt-BR') : '—';
<<<<<<< HEAD
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
=======

  return (
    <AdminLayout contextLabel="Renovar assinatura">
      <main className="w-full max-w-5xl mx-auto py-2 sm:py-4">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/65 p-5 sm:p-8 shadow-[0_26px_58px_-40px_rgba(15,23,42,0.6)] space-y-6">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              ← Voltar
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Renovar assinatura</h1>
              <p className="text-slate-500 mt-1">
                Sua assinatura está {currentStatus === 'EXPIRED' ? 'expirada' : 'quase expirando'}.
              </p>
              {showTrialBadge ? (
                <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 inline-flex">
                  Trial ativo com recursos Pro liberados.
                </p>
              ) : null}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.45)]">
              <p className="text-xs text-slate-500">Expiração</p>
              <p className="text-sm font-bold text-slate-800">{expiresLabel}</p>
>>>>>>> main
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</div>}

<<<<<<< HEAD
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
=======
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-black text-slate-800">Escolha um plano</h3>
            <p className="text-xs text-slate-500">
              {showOnlyProUpgrade
                ? 'Seu plano atual é Basic. Para liberar entregadores, faça upgrade para o plano Pro.'
                : currentTier === 'basic'
                ? 'Seu plano atual é Basic. Você pode manter o Basic (mensal/anual) ou fazer upgrade para Pro.'
                : 'Seu plano atual é Pro. Você pode alternar entre mensal e anual ou mudar de plano.'}
            </p>
            <div className="mx-auto w-full max-w-sm rounded-full border border-slate-200 bg-slate-100 p-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Anual {billing.savings ? `· ${billing.savings}` : ''}
              </button>
            </div>

            <div className={`grid grid-cols-1 ${showOnlyProUpgrade ? 'sm:grid-cols-1 max-w-md mx-auto' : 'sm:grid-cols-3'} gap-4`}>
              {PLAN_TIERS
                .filter((tier) => allowedTierKeys.includes(tier.key))
                .filter((tier) => (showOnlyProUpgrade ? tier.key === 'pro' : true))
                .map((tier) => {
                const planKey = getPlanName(tier.key, billingKey);
                const plan = plansByName[planKey];
                const full = plan ? Number(plan.price) : null;
                const promoFromApi = plan?.promoPrice != null ? Number(plan.promoPrice) : null;
                const promo = billingKey === 'yearly'
                  ? (promoFromApi != null && promoFromApi > 0 && full !== null && promoFromApi < full ? promoFromApi : (full !== null ? resolveAnnualPromoTotal(full) : null))
                  : promoFromApi;
                const showPromo = billingKey === 'yearly' && promo != null && promo > 0 && full !== null && promo < full;
                const displayPrice = full === null ? null : (billingKey === 'yearly' ? (showPromo ? promo : full) : full);
                const monthlyEq = billingKey === 'yearly' && displayPrice !== null ? resolveMonthlyEquivalent(displayPrice) : null;
>>>>>>> main
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
<<<<<<< HEAD
                    onClick={() => plan?.id && setSelectedPlanId(plan.id)}
                    disabled={isDisabled}
                    className={`border rounded-2xl p-4 text-left transition-all relative ${isSelected
                      ? 'border-red-500 shadow-lg bg-red-50'
                      : 'border-gray-200 hover:border-red-200'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
=======
                    onClick={() => plan?.id && setSelectedTierKey(tier.key as 'basic' | 'pro')}
                    disabled={isDisabled}
                  className={`border rounded-2xl p-4 text-left transition-all relative ${
                      !selectedPlanId && !isSelected ? 'border-red-200 bg-red-50/40' : ''
                    } ${isSelected
                      ? 'border-brand-primary shadow-[0_22px_36px_-28px_rgba(14,165,233,0.72)] bg-brand-primary-soft/45'
                      : 'border-gray-200 hover:border-brand-primary/35 hover:-translate-y-0.5'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 right-4 bg-brand-gradient text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
>>>>>>> main
                        MAIS POPULAR
                      </span>
                    )}
                    {billing.savings && (
                      <span className="absolute -top-3 left-4 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                        {billing.savings}
                      </span>
                    )}
<<<<<<< HEAD
                    <p className="text-sm uppercase font-semibold text-gray-500">{tier.label}</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {Number(price).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{billing.period}</p>
                    <p className="text-xs text-gray-500 mt-1">{durationLabel}</p>
=======
                    <p className="text-sm uppercase font-semibold text-slate-500">{tier.label}</p>
                    {displayPrice === null ? (
                      <div className="mt-1">
                        <p className="text-lg font-bold text-slate-500">Indisponível</p>
                      </div>
                    ) : showPromo ? (
                      <div className="mt-1">
                        <p className="text-xs text-slate-400 line-through">R$ {Number(full).toFixed(2)}</p>
                        <p className="text-2xl font-black text-slate-900">R$ {Number(displayPrice).toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-black text-slate-900">R$ {Number(displayPrice).toFixed(2)}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {displayPrice === null ? 'Entre em contato com o suporte.' : (billingKey === 'yearly' ? `${billing.period} (R$ ${Number(monthlyEq || 0).toFixed(2)}/mês)` : billing.period)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{durationLabel}</p>
                    <ul className="mt-3 text-xs text-slate-600 space-y-1">
                      {tier.features.map((feature) => (
                        <li key={feature}>✓ {feature}</li>
                      ))}
                    </ul>
>>>>>>> main
                  </button>
                );
              })}
            </div>
<<<<<<< HEAD
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Forma de pagamento</h4>
=======
            {!selectedPlanId && (
              <p className="text-xs text-red-500 font-semibold">
                Selecione um plano para continuar.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-bold">Resumo da cobrança</p>
              <div className="mt-1 grid gap-1.5 sm:grid-cols-3 text-sm">
                <p className="text-slate-700">
                  Plano: <span className="font-bold">{selectedPlan?.displayName || '—'}</span>
                </p>
                <p className="text-slate-700">
                  Ciclo: <span className="font-bold">{billing.period}</span>
                </p>
                <p className="text-slate-700">
                  Total: <span className="font-black text-slate-900">{selectedPlanDisplayValue != null ? `R$ ${Number(selectedPlanDisplayValue).toFixed(2)}` : '—'}</span>
                </p>
              </div>
            </div>
            <h4 className="text-sm font-semibold text-slate-700">Forma de pagamento</h4>
>>>>>>> main
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
<<<<<<< HEAD
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
=======
              className="w-full bg-brand-gradient text-white py-4 rounded-xl font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
>>>>>>> main
            >
              {isSubmitting ? 'Gerando pagamento...' : 'Gerar renovação'}
            </button>
          </div>
        </div>
      </main>
<<<<<<< HEAD
    </div>
  );
}
=======
    </AdminLayout>
  );
}

>>>>>>> main
