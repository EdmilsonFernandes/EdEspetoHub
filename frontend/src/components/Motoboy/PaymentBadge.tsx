const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  paid: { pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { pill: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
};

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  dinheiro: 'Dinheiro',
  card: 'Cartão',
  credit: 'Crédito',
  debit: 'Débito',
};

export function PaymentBadge({ method, status }: { method?: string; status?: string }) {
  const normalizedStatus = (status || 'pending').toLowerCase();
  const normalizedMethod = (method || '').toLowerCase();
  const statusLabel = normalizedStatus === 'paid' ? 'Pago' : 'Pendente';
  const methodLabel = METHOD_LABELS[normalizedMethod] || method || 'Pagamento';
  const tone = STATUS_STYLES[normalizedStatus] || { pill: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/70 border border-slate-200 text-slate-700">
        {methodLabel}
      </span>
      <span
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tone.pill}`}
      >
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {statusLabel}
      </span>
    </div>
  );
}
