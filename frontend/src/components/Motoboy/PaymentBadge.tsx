const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  paid: { pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { pill: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500' },
};

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  pix_loja: 'Pix da loja',
  pix_presencial: 'Pix na entrega',
  cash: 'Dinheiro',
  dinheiro: 'Dinheiro',
  card: 'Cartão',
  credit: 'Crédito',
  debit: 'Débito',
};

export function PaymentBadge({ method, status }: { method?: string; status?: string }) {
  const normalizedStatus = (status || 'pending').toLowerCase();
  const normalizedMethod = (method || '').toLowerCase();
  const statusLabel =
    normalizedStatus === 'paid'
      ? 'Pago'
      : normalizedMethod === 'cash' || normalizedMethod === 'dinheiro'
        ? 'Receber'
        : normalizedMethod === 'pix' || normalizedMethod === 'pix_loja' || normalizedMethod === 'pix_presencial'
          ? 'Aguardando'
          : 'Pendente';
  const methodLabel = METHOD_LABELS[normalizedMethod] || method || 'Pagamento';
  const tone = STATUS_STYLES[normalizedStatus] || { pill: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
      <span className="min-w-0 max-w-full px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-600">
        <span className="truncate">{methodLabel}</span>
      </span>
      <span
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tone.pill} min-w-0 max-w-full`}
      >
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        <span className="truncate">{statusLabel}</span>
      </span>
    </div>
  );
}
