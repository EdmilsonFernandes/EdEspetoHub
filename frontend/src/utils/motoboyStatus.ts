export function formatMotoboyAccountStatus(status?: string | null) {
  const raw = String(status || '').trim().toUpperCase();
  const fallback = raw ? raw : 'PENDENTE';
  const map: Record<string, { label: string; tone: string }> = {
    ACTIVE: { label: 'ATIVO', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    PENDING: { label: 'PENDENTE', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
    PENDING_VERIFICATION: { label: 'EM ANALISE', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
    SUSPENDED: { label: 'SUSPENSO', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
    REJECTED: { label: 'RECUSADO', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
  };

  return map[raw] || { label: fallback, tone: 'bg-slate-100 text-slate-700 border-slate-200' };
}

