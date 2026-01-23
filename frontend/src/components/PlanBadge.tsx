// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { BILLING_OPTIONS, PLAN_TIERS } from '../constants/planCatalog';
import { formatCurrency, formatDate } from '../utils/format';

const PLAN_STYLES = {
  basic: {
    label: 'Basic',
    badge:
      'from-emerald-400/90 to-teal-500/90 text-emerald-50 ring-emerald-200/40 shadow-emerald-500/30',
  },
  pro: {
    label: 'Pro',
    badge: 'from-amber-400/95 to-orange-500/95 text-amber-50 ring-amber-200/50 shadow-orange-500/30',
  },
  premium: {
    label: 'Premium',
    badge:
      'from-violet-500/95 to-fuchsia-500/95 text-fuchsia-50 ring-fuchsia-200/50 shadow-fuchsia-500/30',
  },
};

const resolvePlanDetails = (planName = '') => {
  const normalized = String(planName || '').toLowerCase();
  if (normalized === 'monthly') {
    return { tierKey: 'basic', tier: PLAN_TIERS[0], billingKey: 'monthly' };
  }
  if (normalized === 'yearly') {
    return { tierKey: 'basic', tier: PLAN_TIERS[0], billingKey: 'yearly' };
  }
  const tierKey = PLAN_TIERS.find((tier) => normalized.includes(tier.key))?.key;
  if (!tierKey) return null;
  const billingKey = normalized.includes('yearly')
    ? 'yearly'
    : normalized.includes('monthly')
      ? 'monthly'
      : null;
  const tier = PLAN_TIERS.find((entry) => entry.key === tierKey);
  return {
    tierKey,
    tier,
    billingKey,
  };
};

export const PlanBadge = ({ planName, displayName, variant = 'light', details }) => {
  const [isOpen, setIsOpen] = useState(false);
  const detailsRef = useRef(null);

  const planDetails = resolvePlanDetails(planName);
  const styleKey = planDetails?.tierKey || 'basic';
  const style = PLAN_STYLES[styleKey];
  const billing = planDetails?.billingKey ? BILLING_OPTIONS[planDetails.billingKey] : null;
  const badgeTone =
    variant === 'dark'
      ? 'bg-white/15 text-white ring-white/25 shadow-black/20'
      : `bg-gradient-to-r ${style.badge}`;
  const titleLabel = displayName || planDetails?.tier?.label || 'Plano não definido';

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={detailsRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`list-none cursor-pointer select-none rounded-full px-3 py-1.5 text-xs font-semibold ring-1 shadow-md flex items-center gap-2 ${badgeTone} transition-all`}
      >
        <span className="uppercase tracking-wide">{titleLabel}</span>
        {billing && <span className="text-[10px] font-bold opacity-80">{billing.label}</span>}
        <CaretDown size={14} weight="duotone" className={`opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-3 w-64 rounded-2xl border border-white/20 bg-white p-4 text-gray-700 shadow-xl backdrop-blur-lg z-50 ${
            variant === 'dark' ? 'bg-white/95' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Plano</span>
            {billing?.savings && (
              <span className="text-[10px] font-semibold text-amber-600">{billing.savings}</span>
            )}
          </div>
          <h4 className="mt-1 text-base font-bold text-gray-900">
            {titleLabel} {billing ? `(${billing.label})` : ''}
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-gray-600">
            {(planDetails?.tier?.features || ['Plano indefinido.']).map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          {details?.startDate || details?.endDate || details?.latestPaymentAt ? (
            <div className="mt-3 border-t border-gray-100 pt-3 text-[11px] text-gray-500 space-y-1">
              {details?.startDate && (
                <div className="flex items-center justify-between">
                  <span>Iniciado</span>
                  <span className="font-semibold text-gray-700">{formatDate(details.startDate)}</span>
                </div>
              )}
              {details?.latestPaymentAt && (
                <div className="flex items-center justify-between">
                  <span>Ultimo pagamento</span>
                  <span className="font-semibold text-gray-700">
                    {formatDate(details.latestPaymentAt)}
                  </span>
                </div>
              )}
              {details?.latestPaymentAmount && (
                <div className="flex items-center justify-between">
                  <span>Valor pago</span>
                  <span className="font-semibold text-gray-700">
                    {formatCurrency(details.latestPaymentAmount)}
                  </span>
                </div>
              )}
              {details?.endDate && (
                <div className="flex items-center justify-between">
                  <span>Expira em</span>
                  <span className="font-semibold text-gray-700">{formatDate(details.endDate)}</span>
                </div>
              )}
            </div>
          ) : null}
          <p className="mt-3 text-[10px] text-gray-400">Clique fora para fechar.</p>
        </div>
      )}
    </div>
  );
};
