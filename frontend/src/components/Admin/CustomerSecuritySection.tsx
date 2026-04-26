import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowClockwise,
  MagnifyingGlass,
  ShieldCheck,
  ShieldSlash,
  WarningCircle,
} from '@phosphor-icons/react';
import { FormSection } from '../common/FormSection';
import { superAdminService } from '../../services/superAdminService';

const DEFAULT_FILTERS = {
  search: '',
  blockStatus: 'active',
  severity: 'all',
  blockType: 'all',
  eventType: 'all',
  limitBlocks: 15,
  limitEvents: 25,
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

const formatBlockType = (value?: string) => {
  const code = String(value || '').trim().toLowerCase();
  if (code === 'far_pickup_abuse') return 'Retirada distante suspeita';
  if (code === 'payment_abuse') return 'Abuso de pagamento';
  if (code === 'identity_risk') return 'Risco de identidade';
  if (code === 'manual_review') return 'Revisão manual';
  if (code === 'chargeback_risk') return 'Risco de chargeback';
  return code || '-';
};

const formatEventType = (value?: string) => {
  const code = String(value || '').trim().toLowerCase();
  if (code === 'rapid_far_pickup_multi_store') return 'Retirada distante em lojas diferentes';
  return code || '-';
};

const blockStatusTone = (value?: string) => {
  const code = String(value || '').trim().toLowerCase();
  if (code === 'active') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (code === 'revoked') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (code === 'expired') return 'border-slate-200 bg-slate-100 text-slate-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
};

const severityTone = (value?: string) => {
  const code = String(value || '').trim().toLowerCase();
  if (code === 'hard') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (code === 'soft') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
};

const renderMetadataSummary = (metadata?: any) => {
  if (!metadata || typeof metadata !== 'object') return '-';
  const distance = Number(metadata.pickupDistanceKm);
  const totalRecentEvents = Number(metadata.totalRecentEvents);
  const recentStores = Array.isArray(metadata.recentOtherStoreIds) ? metadata.recentOtherStoreIds.length : 0;

  const parts = [];
  if (Number.isFinite(distance) && distance > 0) parts.push(`${distance.toFixed(1)} km`);
  if (Number.isFinite(totalRecentEvents) && totalRecentEvents > 0) parts.push(`${totalRecentEvents} sinais`);
  if (recentStores > 0) parts.push(`${recentStores} outras lojas`);
  return parts.length ? parts.join(' • ') : '-';
};

export function CustomerSecuritySection({
  token,
  isActive,
  showToast,
}: {
  token: string;
  isActive: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftSearch, setDraftSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState('');
  const [payload, setPayload] = useState<any>({
    summary: null,
    blocks: [],
    events: [],
  });

  const loadData = useCallback(
    async (nextFilters: typeof DEFAULT_FILTERS) => {
      if (!token || !isActive) return;
      setLoading(true);
      try {
        const data = await superAdminService.fetchCustomerSecurityOverview(token, nextFilters);
        setPayload({
          summary: data?.summary || null,
          blocks: Array.isArray(data?.blocks) ? data.blocks : [],
          events: Array.isArray(data?.events) ? data.events : [],
        });
      } catch (err: any) {
        showToast(err?.message || 'Não foi possível carregar a segurança dos clientes.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [isActive, showToast, token]
  );

  useEffect(() => {
    if (!isActive || !token) return;
    void loadData(filters);
  }, [filters.blockStatus, filters.blockType, filters.eventType, filters.limitBlocks, filters.limitEvents, filters.severity, isActive, loadData, token]);

  useEffect(() => {
    if (!isActive) return;
    setDraftSearch(filters.search || '');
  }, [filters.search, isActive]);

  const summary = payload?.summary || {};
  const blocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
  const events = Array.isArray(payload?.events) ? payload.events : [];

  const blockTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set<string>(blocks.map((item: any) => String(item?.blockType || '').trim()).filter(Boolean))
    );
    if (filters.blockType !== 'all' && !values.some((value) => value.toLowerCase() === filters.blockType)) {
      values.push(filters.blockType);
    }
    return values.sort((a, b) => a.localeCompare(b));
  }, [blocks, filters.blockType]);

  const eventTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set<string>(events.map((item: any) => String(item?.eventType || '').trim()).filter(Boolean))
    );
    if (filters.eventType !== 'all' && !values.some((value) => value.toLowerCase() === filters.eventType)) {
      values.push(filters.eventType);
    }
    return values.sort((a, b) => a.localeCompare(b));
  }, [events, filters.eventType]);

  const applySearch = () => {
    const nextFilters = { ...filters, search: String(draftSearch || '').trim() };
    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  const revokeBlock = async (block: any) => {
    if (!block?.id || revokingId) return;
    const note = window.prompt('Motivo da revogação (opcional):', '');
    setRevokingId(String(block.id));
    try {
      await superAdminService.revokeCustomerSecurityBlock(token, String(block.id), String(note || '').trim() || undefined);
      showToast('Bloqueio revogado.', 'success');
      await loadData(filters);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível revogar o bloqueio.', 'error');
    } finally {
      setRevokingId('');
    }
  };

  return (
    <FormSection
      title="Segurança de clientes"
      subtitle="Bloqueios temporários, sinais de abuso e revisão operacional das contas."
      className={`${isActive ? '' : 'hidden'}`}
    >
      <div className="space-y-4">
        <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#172554_55%,#0f172a_100%)] p-5 text-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.72)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Conta, risco e integridade</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">Camada operacional de segurança do cliente</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use esta área para auditar abuso de retirada distante, revisar eventos suspeitos e revogar bloqueios quando a análise humana confirmar legitimidade.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadData(filters)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowClockwise size={16} className={loading ? 'animate-spin' : ''} />
              Atualizar segurança
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-600">Bloqueios ativos</p>
            <p className="mt-2 text-3xl font-black text-rose-700">{Number(summary?.activeBlocks || 0)}</p>
            <p className="mt-1 text-xs text-rose-700/70">Contas com restrição vigente agora.</p>
          </div>
          <div className="rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-600">Bloqueios hard</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{Number(summary?.hardActiveBlocks || 0)}</p>
            <p className="mt-1 text-xs text-amber-700/70">Casos mais sensíveis para revisão humana.</p>
          </div>
          <div className="rounded-[1.5rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-600">Eventos em 24h</p>
            <p className="mt-2 text-3xl font-black text-sky-700">{Number(summary?.eventsLast24h || 0)}</p>
            <p className="mt-1 text-xs text-sky-700/70">Todos os sinais operacionais capturados na janela curta.</p>
          </div>
          <div className="rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-600">Retirada distante</p>
            <p className="mt-2 text-3xl font-black text-violet-700">{Number(summary?.rapidFarPickupEventsLast24h || 0)}</p>
            <p className="mt-1 text-xs text-violet-700/70">Sinais de abuso multi-loja nas últimas 24 horas.</p>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_24px_56px_-40px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Buscar cliente</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={draftSearch}
                    onChange={(event) => setDraftSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applySearch();
                      }
                    }}
                    placeholder="Nome, e-mail, telefone ou ID"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={applySearch}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Aplicar
                </button>
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Status do bloqueio</span>
              <select
                value={filters.blockStatus}
                onChange={(event) => setFilters((prev) => ({ ...prev, blockStatus: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900"
              >
                <option value="active">Ativos</option>
                <option value="revoked">Revogados</option>
                <option value="expired">Expirados</option>
                <option value="all">Todos</option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Severidade</span>
              <select
                value={filters.severity}
                onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todas</option>
                <option value="soft">Soft</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tipo de bloqueio</span>
              <select
                value={filters.blockType}
                onChange={(event) => setFilters((prev) => ({ ...prev, blockType: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todos</option>
                {blockTypeOptions.map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {formatBlockType(value)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tipo de evento</span>
              <select
                value={filters.eventType}
                onChange={(event) => setFilters((prev) => ({ ...prev, eventType: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-900"
              >
                <option value="all">Todos</option>
                {eventTypeOptions.map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {formatEventType(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? <div className="text-sm text-slate-500">Carregando segurança dos clientes...</div> : null}

        <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_24px_56px_-40px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff5f5_0%,#ffffff_56%,#fff7ed_100%)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Bloqueios de segurança</p>
                  <h4 className="mt-1 text-lg font-black text-slate-900">Visão operacional por conta</h4>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-rose-700">
                  <ShieldCheck size={12} weight="duotone" />
                  {blocks.length} registro{blocks.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <div className="max-h-[620px] overflow-auto">
              {blocks.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Nenhum bloqueio encontrado para os filtros aplicados.</div>
              ) : (
                <table className="ds-table min-w-[780px]">
                  <thead>
                    <tr>
                      <th className="text-left">Cliente</th>
                      <th className="text-left">Tipo</th>
                      <th className="text-left">Status</th>
                      <th className="text-left">Motivo</th>
                      <th className="text-left">Janela</th>
                      <th className="text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((block: any) => (
                      <tr key={block.id}>
                        <td className="align-top">
                          <div className="text-sm font-black text-slate-900">{block.userName || 'Cliente sem nome'}</div>
                          <div className="mt-1 text-xs text-slate-500">{block.email || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500">{block.phone || '-'}</div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-400 break-all">{block.userId}</div>
                        </td>
                        <td className="align-top">
                          <div className="text-sm font-semibold text-slate-800">{formatBlockType(block.blockType)}</div>
                          <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${severityTone(block.severity)}`}>
                            {String(block.severity || '-')}
                          </span>
                        </td>
                        <td className="align-top">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${blockStatusTone(block.status)}`}>
                            {String(block.status || '-')}
                          </span>
                          <div className="mt-2 text-xs text-slate-500">Criado por: {block.createdBy || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500">Revisado por: {block.reviewedBy || '-'}</div>
                        </td>
                        <td className="align-top">
                          <div className="text-sm text-slate-700">{block.reason || '-'}</div>
                          <div className="mt-2 text-xs text-slate-500">{renderMetadataSummary(block.metadata)}</div>
                        </td>
                        <td className="align-top text-xs text-slate-600">
                          <div>Bloqueado: {formatDateTime(block.blockedAt)}</div>
                          <div className="mt-1">Até: {formatDateTime(block.blockedUntil)}</div>
                          <div className="mt-1">Atualizado: {formatDateTime(block.updatedAt)}</div>
                        </td>
                        <td className="align-top">
                          {String(block.status || '').toLowerCase() === 'active' ? (
                            <button
                              type="button"
                              onClick={() => revokeBlock(block)}
                              disabled={revokingId === block.id}
                              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ShieldSlash size={14} weight="duotone" />
                              {revokingId === block.id ? 'Revogando...' : 'Revogar'}
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">Sem ação</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_24px_56px_-40px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Eventos recentes</p>
                  <h4 className="mt-1 text-lg font-black text-slate-900">Sinais capturados antes do bloqueio</h4>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-sky-700">
                  <WarningCircle size={12} weight="duotone" />
                  {events.length} evento{events.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <div className="max-h-[620px] overflow-auto divide-y divide-slate-100">
              {events.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Nenhum evento encontrado para os filtros aplicados.</div>
              ) : (
                events.map((event: any) => (
                  <div key={event.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900">{event.userName || 'Cliente sem nome'}</div>
                        <div className="mt-1 text-xs text-slate-500">{event.email || '-'}</div>
                        <div className="mt-1 text-xs text-slate-500">{event.phone || '-'}</div>
                      </div>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">
                        score {Number(event.score || 0)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-800">{formatEventType(event.eventType)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Loja: {event.storeName ? `${event.storeName} (${event.storeSlug || '-'})` : 'Não vinculada'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Detectado em: {formatDateTime(event.createdAt)}</div>
                    <div className="mt-1 text-xs text-slate-500">IP: {event.ipAddress || '-'}</div>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {renderMetadataSummary(event.metadata)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
