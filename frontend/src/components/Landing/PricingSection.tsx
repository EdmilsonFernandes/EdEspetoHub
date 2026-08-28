import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import {
  PLAN_TIERS,
  BILLING_OPTIONS,
  resolveAnnualPromoTotal,
  getPlanFeatureLabel,
} from '../../constants/planCatalog';

const formatBRL = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const TIER_BADGE: Record<string, string> = {
  basic: 'Plano Basic',
  pro: 'Plano Pro',
};

export function PricingSection() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const billing = BILLING_OPTIONS[cycle];

  return (
    <section id="planos" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">Planos</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Preço fixo. Zero comissão por pedido.
        </h2>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Você recebe 100% de cada pedido no seu Mercado Pago. Pague só a mensalidade abaixo.
        </p>

        <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-colors ${
                cycle === c ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {BILLING_OPTIONS[c].label}
              {c === 'yearly' ? (
                <span className="ml-1.5 text-emerald-400">{BILLING_OPTIONS[c].savings}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {PLAN_TIERS.map((tier) => {
          const full = billing.priceByTier[tier.key];
          const price = cycle === 'yearly' ? resolveAnnualPromoTotal(full) : full;
          const monthlyEq = cycle === 'yearly' ? price / 12 : price;
          const popular = Boolean(tier.popular);
          return (
            <div
              key={tier.key}
              className={`relative flex flex-col rounded-3xl border p-6 sm:p-8 ${
                popular
                  ? 'border-emerald-400/40 bg-emerald-500/[0.04] shadow-[0_24px_54px_-40px_rgba(16,185,129,0.5)]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              {popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
                  Mais popular
                </span>
              ) : null}
              <p className="text-sm font-black text-white">{TIER_BADGE[tier.key]}</p>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-4xl font-black text-white">{formatBRL(price)}</span>
                <span className="pb-1 text-xs font-bold text-slate-400">{billing.period}</span>
              </div>
              {cycle === 'yearly' ? (
                <p className="mt-1 text-[11px] font-semibold text-emerald-400">
                  ≈ {formatBRL(monthlyEq)}/mês · cobrado anual
                </p>
              ) : null}

              <ul className="mt-6 space-y-2.5">
                {tier.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-300">
                    <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-emerald-400" />
                    <span>{getPlanFeatureLabel(f)}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  popular ? 'bg-emerald-400 text-slate-950' : 'bg-white text-slate-950'
                }`}
              >
                Começar agora
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-[11px] font-semibold text-slate-500">
        Sem cartão no cadastro · 3 meses VIP grátis + preço de lançamento vitalício para os 50 primeiros fundadores · Cancele quando quiser
      </p>
    </section>
  );
}
