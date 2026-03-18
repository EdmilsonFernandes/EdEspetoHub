const STATUS_STYLES: Record<string, { pill: string; dot: string; pulse?: boolean }> = {
  pending: { pill: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500', pulse: true },
  preparing: { pill: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500', pulse: true },
  ready_for_delivery: { pill: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500', pulse: true },
  waiting_for_motoboy: { pill: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500', pulse: true },
  in_delivery: { pill: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500', pulse: true },
  delivered: { pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  finished: { pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pedido Recebido',
  preparing: 'Em Preparação',
  ready_for_delivery: 'Pronto para entrega',
  waiting_for_motoboy: 'Aguardando',
  in_delivery: 'Em rota',
  delivered: 'Entregue',
  finished: 'Finalizado',
};

export function StatusBadge({ status }: { status?: string }) {
  const label = STATUS_LABELS[status || ''] || status || 'Atualizando';
  const tone =
    STATUS_STYLES[status || ''] || { pill: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

  return (
    <span
      className={[
        'status-chip inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        'min-w-0 max-w-full overflow-hidden',
        tone.pill,
      ].join(' ')}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot} ${tone.pulse ? 'status-blink' : ''}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}

