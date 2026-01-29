const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  preparing: 'bg-sky-100 text-sky-700',
  ready_for_delivery: 'bg-violet-100 text-violet-700',
  waiting_for_motoboy: 'bg-indigo-100 text-indigo-700',
  in_delivery: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  finished: 'bg-emerald-200 text-emerald-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Recebido',
  preparing: 'Em preparo',
  ready_for_delivery: 'Pronto para entrega',
  waiting_for_motoboy: 'Aguardando entregador',
  in_delivery: 'Em rota',
  delivered: 'Entregue',
  finished: 'Finalizado',
};

export function StatusBadge({ status }: { status?: string }) {
  const label = STATUS_LABELS[status || ''] || status || 'Atualizando';
  const classes = STATUS_STYLES[status || ''] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${classes}`}>
      {label}
    </span>
  );
}
