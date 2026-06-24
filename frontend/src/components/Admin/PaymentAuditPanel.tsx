import { ClockCounterClockwise, CreditCard, ShieldCheck, WarningCircle, Code } from '@phosphor-icons/react';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../../utils/paymentAssets';



const statusTone = (summary: any) => {
  const normalized = String(summary?.paymentStatus || summary?.providerStatus || '').trim().toUpperCase();
  if (normalized === 'PAID' || normalized === 'APPROVED') {
    return {
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      box: 'border-emerald-200 bg-emerald-50/60',
      icon: 'bg-emerald-100 text-emerald-700',
    };
  }
  if (normalized === 'FAILED' || normalized === 'REJECTED' || normalized === 'CANCELLED') {
    return {
      badge: 'border-rose-200 bg-rose-50 text-rose-700',
      box: 'border-rose-200 bg-rose-50/70',
      icon: 'bg-rose-100 text-rose-700',
    };
  }
  return {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    box: 'border-amber-200 bg-amber-50/70',
    icon: 'bg-amber-100 text-amber-700',
  };
};

export function PaymentAuditPanel({
  title = 'Informações de pagamento',
  summary,
  events = [],
  showEvents = true,
  showTechnicalButton = false,
  technicalLoading = false,
  onTechnicalClick,
}: any) {
  if (!summary) return null;

  const paymentMethodMeta = getPaymentMethodMeta(summary?.paymentMethod || summary?.providerStatus || '');
  const providerMeta = getPaymentProviderMeta(summary?.provider || 'MERCADO_PAGO');
  const tone = statusTone(summary);
  const reason = summary?.providerStatusDetailLabel || null;

  return (
    <div className={`rounded-2xl border ${tone.box} px-4 py-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.45)]`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              {paymentMethodMeta?.icon ? (
                <img src={paymentMethodMeta.icon} alt={paymentMethodMeta.label} className="h-4 w-4 object-contain" />
              ) : (
                <CreditCard size={14} weight="duotone" />
              )}
              {paymentMethodMeta?.label || 'Pagamento online'}
            </span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${tone.badge}`}>
              {summary?.paymentStatusLabel || summary?.providerStatusLabel || summary?.paymentStatus || 'Pendente'}
            </span>
            {providerMeta?.label && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                {providerMeta?.icon ? (
                  <img src={providerMeta.icon} alt={providerMeta.label} className="h-4 w-4 object-contain" />
                ) : (
                  <ShieldCheck size={14} weight="duotone" />
                )}
                {providerMeta.label}
              </span>
            )}
          </div>
        </div>
        {showTechnicalButton && (
          <button
            type="button"
            onClick={onTechnicalClick}
            disabled={technicalLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Code size={14} weight="duotone" />
            Ver detalhes técnicos
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Valor</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {summary?.amount != null ? formatCurrency(Number(summary.amount || 0)) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Transação</p>
          <p className="mt-1 text-sm font-black text-slate-900 break-all">{summary?.providerPaymentId || '—'}</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Última atualização</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {summary?.lastEventAt ? formatDateTime(summary.lastEventAt) : summary?.updatedAt ? formatDateTime(summary.updatedAt) : '—'}
          </p>
        </div>
      </div>

      {reason && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5">
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
            <WarningCircle size={16} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Motivo informado pelo provedor</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{reason}</p>
          </div>
        </div>
      )}

      {showEvents && Array.isArray(events) && events.length > 0 && (
        <div className="mt-3 space-y-2">
          {events.slice(0, 3).map((event: any) => (
            <div
              key={event.id}
              className="flex items-start gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2"
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <ClockCounterClockwise size={14} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">
                  {event?.eventStageLabel}
                  {event?.providerStatusLabel ? ` • ${event.providerStatusLabel}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {event?.providerStatusDetailLabel || 'Atualização registrada'} • {formatDateTime(event?.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
