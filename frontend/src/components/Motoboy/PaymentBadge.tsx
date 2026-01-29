const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
        {methodLabel}
      </span>
      <span
        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
          STATUS_STYLES[normalizedStatus] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {statusLabel}
      </span>
    </div>
  );
}
