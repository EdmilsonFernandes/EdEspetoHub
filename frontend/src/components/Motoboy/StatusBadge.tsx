const STATUS_STYLES: Record<string, { pill: string; dot: string; pulse?: boolean }> = {
  pending: { pill: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500', pulse: true },
  preparing: { pill: 'bg-sky-50 text-sky-900 border-sky-200', dot: 'bg-sky-500', pulse: true },
  ready_for_delivery: { pill: 'bg-violet-50 text-violet-900 border-violet-200', dot: 'bg-violet-500' },
  waiting_for_motoboy: { pill: 'bg-indigo-50 text-indigo-900 border-indigo-200', dot: 'bg-indigo-500', pulse: true },
  in_delivery: { pill: 'bg-blue-50 text-blue-900 border-blue-200', dot: 'bg-blue-500', pulse: true },
  delivered: { pill: 'bg-emerald-50 text-emerald-900 border-emerald-200', dot: 'bg-emerald-500' },
  finished: { pill: 'bg-emerald-100 text-emerald-900 border-emerald-200', dot: 'bg-emerald-600' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Recebido',
  preparing: 'Em preparo',
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
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        'min-w-0 max-w-full overflow-hidden',
        tone.pill,
      ].join(' ')}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot} ${tone.pulse ? 'status-blink' : ''}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
