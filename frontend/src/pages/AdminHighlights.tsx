// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowClockwise,
  BellRinging,
  BookOpen,
  ChartBar,
  CheckCircle,
  CheckSquare,
  ClipboardText,
  CreditCard,
  Gear,
  MagnifyingGlass,
  Package,
  PaperPlaneTilt,
  PlugsConnected,
  Plus,
  Scooter,
  Star,
  UsersThree,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { productService } from '../services/productService';
import { featuredService } from '../services/featuredService';
import { formatCurrency, formatDateTime } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { PaymentAuditPanel } from '../components/Admin/PaymentAuditPanel';
import { PaymentQRCard } from '../components/common/PaymentQRCard';
import { PaymentTechnicalModal } from '../components/Admin/PaymentTechnicalModal';
import { promoPushService } from '../services/promoPushService';
import {
  getFeaturedPaymentRemainingMs,
  getFeaturedPaymentStatusLabel,
  isFeaturedPaymentFailed,
  isFeaturedPaymentPaid,
  shouldPollFeaturedPayment,
} from '../utils/featuredPaymentStatus';

type DurationUnit = 'DAY' | 'WEEK' | 'MONTH';

const DURATION_META: Record<DurationUnit, { label: string; days: number }> = {
  DAY: { label: '1 dia (24h)', days: 1 },
  WEEK: { label: '1 semana (7 dias)', days: 7 },
  MONTH: { label: '1 mês (30 dias)', days: 30 },
};

const statusTone = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value === 'PAID_WAITING_SLOT') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (value === 'PENDING_PAYMENT') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (value === 'PAYMENT_FAILED') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (value === 'REJECTED') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (value === 'CANCELLED' || value === 'EXPIRED') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const statusBorderAccent = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'border-l-emerald-400';
  if (value === 'PAID_WAITING_SLOT') return 'border-l-indigo-400';
  if (value === 'PENDING_PAYMENT') return 'border-l-amber-400';
  if (value === 'PAYMENT_FAILED' || value === 'REJECTED') return 'border-l-rose-400';
  return 'border-l-slate-300';
};

const statusLabel = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'Ativo';
  if (value === 'PAID_WAITING_SLOT') return 'Pago aguardando vaga';
  if (value === 'PENDING_PAYMENT') return 'Aguardando pagamento';
  if (value === 'PAYMENT_FAILED') return 'Pagamento falhou';
  if (value === 'REJECTED') return 'Recusado';
  if (value === 'CANCELLED') return 'Cancelado';
  if (value === 'EXPIRED') return 'Encerrado';
  return value || 'Pendente';
};

const paymentMethodLabel = (value: string) => {
  const method = String(value || '').toUpperCase();
  if (method === 'CREDIT_CARD') return 'Cartão';
  return 'PIX';
};

const PAGE_SIZE = 10;

const normalizeDateTime = (value: any) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const pageItems = (items: any[], page: number, pageSize = PAGE_SIZE) => {
  const start = Math.max(0, (page - 1) * pageSize);
  return items.slice(start, start + pageSize);
};

const getPushStatusMeta = (statusRaw: string) => {
  const status = String(statusRaw || '').toUpperCase();
  if (status === 'SENT') return { label: 'Enviado', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'PENDING_APPROVAL') return { label: 'Aguardando aprovação', tone: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (status === 'PENDING_PAYMENT') return { label: 'Aguardando pagamento', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (status === 'REJECTED') return { label: 'Rejeitado', tone: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (status === 'CANCELLED') return { label: 'Cancelado', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
  return { label: status || 'Pendente', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
};

const filterFeaturedRequest = (request: any, filter: string) => {
  const status = String(request?.status || '').toUpperCase();
  const paymentStatus = String(request?.paymentStatus || '').toUpperCase();
  if (filter === 'active') return status === 'APPROVED' && paymentStatus === 'PAID';
  if (filter === 'payment') return status === 'PENDING_PAYMENT';
  if (filter === 'waiting_slot') return status === 'PAID_WAITING_SLOT';
  if (filter === 'problem') return ['PAYMENT_FAILED', 'REJECTED'].includes(status) || ['FAILED', 'PAYMENT_FAILED'].includes(paymentStatus);
  if (filter === 'closed') return ['CANCELLED', 'EXPIRED'].includes(status);
  return true;
};

const filterPush = (push: any, filter: string) => {
  const status = String(push?.status || '').toUpperCase();
  if (filter === 'sent') return status === 'SENT';
  if (filter === 'pending') return status === 'PENDING_APPROVAL';
  if (filter === 'payment') return status === 'PENDING_PAYMENT';
  if (filter === 'problem') return ['REJECTED', 'CANCELLED'].includes(status);
  return true;
};

function MetricCard({ label, value, description, tone = 'slate', icon: Icon }: any) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-100 bg-emerald-50/75 text-emerald-700'
      : tone === 'amber'
      ? 'border-amber-100 bg-amber-50/75 text-amber-700'
      : tone === 'blue'
      ? 'border-sky-100 bg-sky-50/75 text-sky-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';
  return (
    <div className={`rounded-3xl border px-4 py-3 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.5)] ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-current shadow-sm">
            <Icon size={19} weight="bold" />
          </span>
        ) : null}
      </div>
      {description ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p> : null}
    </div>
  );
}

function DataTablePagination({ page, totalItems, pageSize = PAGE_SIZE, onPageChange, label }: any) {
  const totalPages = Math.max(1, Math.ceil(Number(totalItems || 0) / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-1 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-semibold">
        {label}: {start}-{end} de {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>
        <span className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-700">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function FilterPill({ active, children, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition active:scale-[0.98] ${
        active
          ? 'border-[#153A4C] bg-[#153A4C] text-white shadow-[0_16px_28px_-20px_rgba(21,58,76,0.65)]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function SearchAndFilters({ query, onQueryChange, sortOrder, onSortOrderChange, children, placeholder }: any) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative min-w-0 flex-1">
          <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#336886]/40 focus:ring-4 focus:ring-[#336886]/10"
          />
        </label>
        <select
          value={sortOrder}
          onChange={(event) => onSortOrderChange(event.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
        >
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
        </select>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function LoadingRows({ rows = 4 }: any) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-3xl border border-slate-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-2/5 rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 rounded-full bg-slate-100" />
            </div>
            <div className="hidden h-8 w-24 rounded-full bg-slate-100 sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VisibilityShell({ activeTab, onTabChange, children, activeCount, pushCount }: any) {
  return (
    <div className="min-w-0 space-y-4 px-0 sm:px-1">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#336886]/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Já no Caminho</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Visibilidade da loja</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Controle vitrines pagas e notificações sem misturar contextos. Cada aba tem criação, busca, filtros e histórico próprio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-100 bg-slate-50/80 p-1.5">
            <button
              type="button"
              onClick={() => onTabChange('highlights')}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                activeTab === 'highlights' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
                <Star size={15} weight={activeTab === 'highlights' ? 'fill' : 'bold'} />
                Destaques
              </span>
              <span className="mt-1 block text-[11px] font-bold">{activeCount} ativo(s)</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('push')}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                activeTab === 'push' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
                <BellRinging size={15} weight={activeTab === 'push' ? 'fill' : 'bold'} />
                Push
              </span>
              <span className="mt-1 block text-[11px] font-bold">{pushCount} registro(s)</span>
            </button>
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}

function HighlightsTab({
  requests,
  pricing,
  productOptions,
  form,
  setForm,
  loading,
  submitting,
  selectedPrice,
  selectedDays,
  onCreate,
  onRefresh,
  onOpenPayment,
  onCancel,
}: any) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);

  const activeCount = (requests || []).filter((request: any) => String(request?.status || '').toUpperCase() === 'APPROVED' && String(request?.paymentStatus || '').toUpperCase() === 'PAID').length;
  const pendingPaymentCount = (requests || []).filter((request: any) => String(request?.status || '').toUpperCase() === 'PENDING_PAYMENT').length;
  const availableSlots = Number(pricing?.availableSlots ?? Math.max(0, Number(pricing?.maxActiveSlots || 0) - Number(pricing?.activeSlots || 0)));

  const filtered = useMemo(() => {
    const needle = String(query || '').trim().toLowerCase();
    return (requests || [])
      .filter((request: any) => filterFeaturedRequest(request, filter))
      .filter((request: any) => {
        if (!needle) return true;
        const text = [
          request?.product?.name,
          request?.publicNote,
          request?.status,
          request?.paymentStatus,
          request?.paymentMethod,
          request?.priceAmount,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(needle);
      })
      .sort((a: any, b: any) => {
        const diff = normalizeDateTime(b?.createdAt || b?.updatedAt) - normalizeDateTime(a?.createdAt || a?.updatedAt);
        return sortOrder === 'oldest' ? -diff : diff;
      });
  }, [requests, query, filter, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [query, filter, sortOrder, requests?.length]);

  const visibleRows = pageItems(filtered, page);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Destaques ativos" value={activeCount} description="Produtos aparecendo na vitrine pública." tone="green" icon={Star} />
        <MetricCard label="Espaços disponíveis" value={availableSlots} description={`${Number(pricing?.activeSlots || 0)} de ${Number(pricing?.maxActiveSlots || 50)} vagas ocupadas.`} tone="blue" icon={ChartBar} />
        <MetricCard label="Aguardando pagamento" value={pendingPaymentCount} description={`Diária a partir de ${formatCurrency(Number(pricing?.prices?.DAY || 0))}.`} tone="amber" icon={CreditCard} />
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="xl:w-[34%]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">Criar destaque</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Produto na vitrine</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
              Escolha o produto, a duração e gere a cobrança sem sair desta aba.
            </p>
          </div>
          <form onSubmit={onCreate} className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.9fr)_minmax(150px,0.55fr)_auto] lg:items-end">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Produto</span>
              <select
                value={form.productId}
                onChange={(event) => setForm((prev: any) => ({ ...prev, productId: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]/40 focus:ring-4 focus:ring-[#336886]/10"
              >
                <option value="">Selecione um produto</option>
                {productOptions.map((product: any) => (
                  <option key={product.id} value={product.id}>
                    {product.name} • {formatCurrency(Number(product?.promoActive ? product?.promoPrice : product?.price || 0))}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-600">Duração</span>
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {(['DAY', 'WEEK', 'MONTH'] as DurationUnit[]).map((unit) => {
                  const active = form.durationUnit === unit;
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setForm((prev: any) => ({ ...prev, durationUnit: unit }))}
                      className={`rounded-xl px-2 py-2 text-center text-[11px] font-black transition ${
                        active ? 'bg-[#153A4C] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {unit === 'DAY' ? '1 dia' : unit === 'WEEK' ? '7 dias' : '30 dias'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Total</p>
              <p className="text-lg font-black text-slate-950">{formatCurrency(selectedPrice)}</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !form.productId || productOptions.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 text-sm font-black text-white shadow-[0_18px_30px_-22px_rgba(21,58,76,0.75)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Plus size={15} weight="bold" />
              {submitting ? 'Gerando...' : 'Gerar cobrança'}
            </button>
          </form>
        </div>
        <p className="mt-3 text-xs font-medium text-slate-500">
          Pagamento via {paymentMethodLabel(form.paymentMethod)}. Após aprovação, o destaque dura {selectedDays} dia(s) e encerra automaticamente.
        </p>
        {productOptions.length === 0 && !loading ? (
          <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            Cadastre pelo menos um produto com preço para liberar a vitrine.
          </p>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tabela de controle</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Meus destaques</h2>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowClockwise size={14} weight="bold" />
            Atualizar
          </button>
        </div>

        <SearchAndFilters
          query={query}
          onQueryChange={setQuery}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          placeholder="Buscar produto, status, pagamento..."
        >
          {[
            ['all', 'Todos'],
            ['active', 'Ativos'],
            ['payment', 'Pagamento'],
            ['waiting_slot', 'Aguardando vaga'],
            ['problem', 'Falhas'],
            ['closed', 'Encerrados'],
          ].map(([value, label]) => (
            <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
              {label}
            </FilterPill>
          ))}
        </SearchAndFilters>

        <div className="mt-4">
          {loading ? (
            <LoadingRows />
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-black text-slate-800">Nenhum destaque encontrado</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Ajuste os filtros ou crie uma nova cobrança acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden overflow-x-auto rounded-3xl border border-slate-100 md:block">
                <div className="grid min-w-[835px] grid-cols-[minmax(240px,1.5fr)_150px_150px_145px_150px] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  <span>Produto</span>
                  <span>Status</span>
                  <span>Pagamento</span>
                  <span>Valor</span>
                  <span className="text-right">Ações</span>
                </div>
                {visibleRows.map((request: any) => {
                  const status = String(request?.status || '').toUpperCase();
                  const canCancel = status === 'PENDING_PAYMENT' || status === 'PAYMENT_FAILED' || status === 'REJECTED';
                  const canPay = status === 'PENDING_PAYMENT' && String(request?.paymentStatus || '').toUpperCase() !== 'PAID';
                  return (
                    <div key={request.id} className="grid min-w-[835px] grid-cols-[minmax(240px,1.5fr)_150px_150px_145px_150px] gap-3 border-t border-slate-100 px-4 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={resolveAssetUrl(request?.product?.imageUrl || undefined) || '/janocaminho.jpg'}
                          alt={request?.product?.name || 'Produto'}
                          className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{request?.product?.name || 'Produto'}</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {formatDateTime(request?.createdAt)} • {DURATION_META[String(request?.durationUnit || 'DAY').toUpperCase() as DurationUnit]?.label || `${Number(request?.durationDays || 1)} dia(s)`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone(status)}`}>{statusLabel(status)}</span>
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-600">{getFeaturedPaymentStatusLabel(request?.paymentStatus)}</div>
                      <div className="flex items-center font-black text-slate-900">{request?.priceAmount != null ? formatCurrency(Number(request.priceAmount || 0)) : '-'}</div>
                      <div className="flex items-center justify-end gap-2">
                        {(request?.paymentQrCodeBase64 || request?.paymentLink || request?.paymentQrCodeText || String(request?.paymentStatus || '').toUpperCase() === 'PAID') && (
                          <button type="button" onClick={() => onOpenPayment(request)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                            {canPay ? 'Pagar' : 'Pagamento'}
                          </button>
                        )}
                        {canCancel && (
                          <button type="button" onClick={() => onCancel(String(request.id))} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 md:hidden">
                {visibleRows.map((request: any) => {
                  const status = String(request?.status || '').toUpperCase();
                  const canCancel = status === 'PENDING_PAYMENT' || status === 'PAYMENT_FAILED' || status === 'REJECTED';
                  const canPay = status === 'PENDING_PAYMENT' && String(request?.paymentStatus || '').toUpperCase() !== 'PAID';
                  return (
                    <article key={request.id} className={`rounded-3xl border border-l-4 ${statusBorderAccent(status)} bg-white p-3 shadow-sm`}>
                      <div className="flex items-start gap-3">
                        <img
                          src={resolveAssetUrl(request?.product?.imageUrl || undefined) || '/janocaminho.jpg'}
                          alt={request?.product?.name || 'Produto'}
                          className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 text-sm font-black text-slate-950">{request?.product?.name || 'Produto'}</p>
                            <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${statusTone(status)}`}>{statusLabel(status)}</span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-500">{formatDateTime(request?.createdAt)}</p>
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {getFeaturedPaymentStatusLabel(request?.paymentStatus)} • {request?.priceAmount != null ? formatCurrency(Number(request.priceAmount || 0)) : '-'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(request?.paymentQrCodeBase64 || request?.paymentLink || request?.paymentQrCodeText || String(request?.paymentStatus || '').toUpperCase() === 'PAID') && (
                              <button type="button" onClick={() => onOpenPayment(request)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                                {canPay ? 'Pagar agora' : 'Ver pagamento'}
                              </button>
                            )}
                            {canCancel && (
                              <button type="button" onClick={() => onCancel(String(request.id))} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <DataTablePagination page={page} totalItems={filtered.length} onPageChange={setPage} label="Destaques" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PushTab({ auth, pushes, loading, pushForm, setPushForm, pushSubmitting, onCreatePush, onRefresh, onOpenPayment }: any) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const storeLogo = resolveAssetUrl(auth?.store?.settings?.logoUrl || '');
  const storeName = String(auth?.store?.name || 'Loja');

  const sentCount = (pushes || []).filter((push: any) => String(push?.status || '').toUpperCase() === 'SENT').length;
  const pendingApprovalCount = (pushes || []).filter((push: any) => String(push?.status || '').toUpperCase() === 'PENDING_APPROVAL').length;
  const pendingPaymentCount = (pushes || []).filter((push: any) => String(push?.status || '').toUpperCase() === 'PENDING_PAYMENT').length;

  const filtered = useMemo(() => {
    const needle = String(query || '').trim().toLowerCase();
    return (pushes || [])
      .filter((push: any) => filterPush(push, filter))
      .filter((push: any) => {
        if (!needle) return true;
        const text = [push?.title, push?.body, push?.message, push?.status, push?.rejectionReason].filter(Boolean).join(' ').toLowerCase();
        return text.includes(needle);
      })
      .sort((a: any, b: any) => {
        const diff = normalizeDateTime(b?.createdAt || b?.updatedAt || b?.sentAt) - normalizeDateTime(a?.createdAt || a?.updatedAt || a?.sentAt);
        return sortOrder === 'oldest' ? -diff : diff;
      });
  }, [pushes, query, filter, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [query, filter, sortOrder, pushes?.length]);

  const visibleRows = pageItems(filtered, page);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Pushes enviados" value={sentCount} description="Histórico aprovado e disparado." tone="green" icon={PaperPlaneTilt} />
        <MetricCard label="Em aprovação" value={pendingApprovalCount} description="Pagos e aguardando revisão." tone="blue" icon={CheckCircle} />
        <MetricCard label="Aguardando PIX" value={pendingPaymentCount} description="Cobranças ainda pendentes." tone="amber" icon={CreditCard} />
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="xl:w-[34%]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">Novo push</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Campanha rápida</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
              O push gera cobrança de R$ 4,90 e entra em revisão antes do envio para os usuários do app.
            </p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Agendamento</p>
              <p className="mt-1 text-sm font-black text-slate-800">Enviar após pagamento e aprovação</p>
            </div>
          </div>
          <form onSubmit={onCreatePush} className="grid min-w-0 flex-1 gap-3 lg:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Título ({pushForm.title.length}/80)</span>
              <input
                type="text"
                maxLength={80}
                value={pushForm.title}
                onChange={(event) => setPushForm((prev: any) => ({ ...prev, title: event.target.value }))}
                placeholder={`Ex: ${storeName} — promoção especial`}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]/40 focus:ring-4 focus:ring-[#336886]/10"
              />
            </label>
            <label className="block space-y-1 lg:row-span-2">
              <span className="text-xs font-bold text-slate-600">Mensagem ({pushForm.message.length}/160)</span>
              <textarea
                maxLength={160}
                rows={4}
                value={pushForm.message}
                onChange={(event) => setPushForm((prev: any) => ({ ...prev, message: event.target.value }))}
                placeholder="Ex: Estamos abertos hoje com promoção especial. Toque para conferir."
                className="min-h-[112px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]/40 focus:ring-4 focus:ring-[#336886]/10"
              />
            </label>
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/75 px-3 py-2">
              <p className="text-xs font-bold leading-5 text-amber-800">Conteúdo passa por revisão. Evite spam, caixa alta exagerada e promessa que não será cumprida.</p>
              <button
                type="submit"
                disabled={pushSubmitting || !pushForm.title.trim() || !pushForm.message.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 text-sm font-black text-white shadow-[0_18px_30px_-22px_rgba(21,58,76,0.75)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <BellRinging size={15} weight="bold" />
                {pushSubmitting ? 'Criando...' : 'Gerar cobrança - R$ 4,90'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Histórico paginado</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Notificações push</h2>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowClockwise size={14} weight="bold" />
            Atualizar
          </button>
        </div>

        <SearchAndFilters query={query} onQueryChange={setQuery} sortOrder={sortOrder} onSortOrderChange={setSortOrder} placeholder="Buscar título, mensagem, status...">
          {[
            ['all', 'Todos'],
            ['sent', 'Enviados'],
            ['pending', 'Em aprovação'],
            ['payment', 'Pagamento'],
            ['problem', 'Falhas/cancelados'],
          ].map(([value, label]) => (
            <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
              {label}
            </FilterPill>
          ))}
        </SearchAndFilters>

        <div className="mt-4">
          {loading ? (
            <LoadingRows />
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-black text-slate-800">Nenhum push encontrado</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Crie uma campanha ou ajuste a busca acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden overflow-x-auto rounded-3xl border border-slate-100 md:block">
                <div className="grid min-w-[900px] grid-cols-[minmax(260px,1.5fr)_165px_130px_130px_145px] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  <span>Campanha</span>
                  <span>Status</span>
                  <span>Alcance</span>
                  <span>Data</span>
                  <span className="text-right">Ações</span>
                </div>
                {visibleRows.map((push: any) => {
                  const status = String(push?.status || '').toUpperCase();
                  const isPendingPayment = status === 'PENDING_PAYMENT';
                  const meta = getPushStatusMeta(status);
                  return (
                    <div key={push.id} className="grid min-w-[900px] grid-cols-[minmax(260px,1.5fr)_165px_130px_130px_145px] gap-3 border-t border-slate-100 px-4 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-sm">
                          {storeLogo ? (
                            <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-xs font-black text-white">
                              {storeName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{push.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-500">{push.body}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${meta.tone}`}>{meta.label}</span>
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-600">{push.sentCount != null ? `${push.sentCount} usuários` : '-'}</div>
                      <div className="flex items-center text-xs font-bold text-slate-500">{formatDateTime(push.sentAt || push.createdAt)}</div>
                      <div className="flex items-center justify-end">
                        {isPendingPayment ? (
                          <button type="button" onClick={() => onOpenPayment(push)} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-900 shadow-[0_12px_20px_-16px_rgba(245,158,11,0.8)]">
                            Pagar
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Sem ação</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 md:hidden">
                {visibleRows.map((push: any) => {
                  const status = String(push?.status || '').toUpperCase();
                  const isPendingPayment = status === 'PENDING_PAYMENT';
                  const meta = getPushStatusMeta(status);
                  return (
                    <article key={push.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-sm">
                          {storeLogo ? (
                            <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-xs font-black text-white">
                              {storeName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 text-sm font-black text-slate-950">{push.title}</p>
                            <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${meta.tone}`}>{meta.label}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{push.body}</p>
                          <p className="mt-2 text-xs font-bold text-slate-400">{formatDateTime(push.sentAt || push.createdAt)}</p>
                          {push.rejectionReason ? (
                            <p className="mt-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Motivo: {push.rejectionReason}</p>
                          ) : null}
                          {isPendingPayment ? (
                            <button type="button" onClick={() => onOpenPayment(push)} className="mt-3 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-900 shadow-[0_12px_20px_-16px_rgba(245,158,11,0.8)]">
                              Pagar agora
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <DataTablePagination page={page} totalItems={filtered.length} onPageChange={setPage} label="Pushes" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function AdminHighlights() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '').trim();
  const storeSlug = String(auth?.store?.slug || '').trim();
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR';
  const canViewTechnical = userRole === 'ADMIN';
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pricing, setPricing] = useState<any>({
    prices: { DAY: 14.9, WEEK: 79.9, MONTH: 249.9 },
    maxActiveSlots: 50,
    activeSlots: 0,
    availableSlots: 50,
  });

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeVisibilityTab, setActiveVisibilityTab] = useState<'highlights' | 'push'>(() => {
    if (typeof window === 'undefined') return 'highlights';
    return sessionStorage.getItem('adminHighlights:tab') === 'push' ? 'push' : 'highlights';
  });

  // Push promocional
  const [pushes, setPushes] = useState<any[]>([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPaymentOpen, setPushPaymentOpen] = useState(false);
  const [activePush, setActivePush] = useState<any | null>(null);
  const [pushForm, setPushForm] = useState({ title: '', message: '' });
  const [pushSubmitting, setPushSubmitting] = useState(false);
  const [pushCountdownMs, setPushCountdownMs] = useState(0);

  useEffect(() => {
    if (!pushPaymentOpen || !activePush?.id || !storeId) return;
    if (activePush.paymentStatus === 'PAID' || activePush.paymentStatus === 'FAILED') return;
    const timer = window.setInterval(async () => {
      try {
        const updated = await promoPushService.refreshPayment(activePush.id, storeId);
        setActivePush(updated);
        setPushes((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        if (updated.paymentStatus === 'PAID') showToast('Pagamento confirmado! Aguardando aprovação.', 'success');
      } catch { /* silencioso */ }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pushPaymentOpen, activePush?.id, activePush?.paymentStatus, storeId]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedPaymentAudit, setSelectedPaymentAudit] = useState<any>(null);
  const [paymentAuditLoading, setPaymentAuditLoading] = useState(false);
  const [paymentTechnicalOpen, setPaymentTechnicalOpen] = useState(false);
  const [paymentCountdownMs, setPaymentCountdownMs] = useState(0);
  const paidToastShownRef = useRef<Set<string>>(new Set());
  const paymentExpiryNoticeShownRef = useRef<Set<string>>(new Set());
  const [form, setForm] = useState({
    productId: '',
    durationUnit: 'DAY' as DurationUnit,
    paymentMethod: 'PIX' as 'PIX' | 'CREDIT_CARD',
    publicNote: '',
  });
  const productOptions = useMemo(
    () =>
      (products || [])
        .filter((product: any) => Number(product?.price || product?.promoPrice || 0) > 0)
        .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR')),
    [products]
  );

  const loadPushes = async () => {
    if (!storeId) return;
    setPushLoading(true);
    try {
      const data = await promoPushService.listByStore(storeId);
      setPushes(Array.isArray(data) ? data : []);
    } catch {
      showToast('Não foi possível carregar o histórico de push agora.', 'warning');
    } finally {
      setPushLoading(false);
    }
  };

  const loadAll = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [storeProducts, featuredRequests, pricingSummary] = await Promise.all([
        productService.list(storeId),
        featuredService.listByStore(storeId),
        featuredService.getPricingByStore(storeId),
      ]);
      setProducts(Array.isArray(storeProducts) ? storeProducts : []);
      setRequests(Array.isArray(featuredRequests) ? featuredRequests : []);
      setPricing(pricingSummary || pricing);
      setForm((prev) => ({
        ...prev,
        productId: prev.productId || String(storeProducts?.[0]?.id || ''),
      }));
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar os destaques.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    void loadPushes();
  }, [storeId]);

  const formatCountdown = (ms: number) => {
    const safe = Math.max(0, Number(ms || 0));
    const totalSec = Math.floor(safe / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const openPayment = (request: any) => {
    setSelectedRequest(request);
    setSelectedPaymentAudit(null);
    setPaymentOpen(true);
    const remainingMs = getFeaturedPaymentRemainingMs(request?.paymentExpiresAt);
    const shouldStartCountdown = shouldPollFeaturedPayment(request) && remainingMs > 0;
    setPaymentCountdownMs(shouldStartCountdown ? remainingMs : 0);
    if (shouldStartCountdown && request?.id) {
      window.setTimeout(() => {
        void refreshPaymentStatusByRequest(String(request.id), true);
      }, 120);
    }
    if (request?.id) {
      window.setTimeout(() => {
        void loadPaymentAudit(String(request.id), true);
      }, 60);
    }
  };

  const closePayment = () => {
    setPaymentOpen(false);
    setSelectedRequest(null);
    setSelectedPaymentAudit(null);
    setPaymentTechnicalOpen(false);
    setPaymentCountdownMs(0);
  };

  const loadPaymentAudit = async (requestIdRaw: string, silent = false) => {
    const requestId = String(requestIdRaw || '').trim();
    if (!requestId || !storeId) return null;
    setPaymentAuditLoading(true);
    try {
      const payload = await featuredService.getPaymentAuditByStore(requestId, storeId);
      setSelectedPaymentAudit(payload || null);
      return payload;
    } catch (error: any) {
      if (!silent) {
        showToast(error?.message || 'Não foi possível carregar os detalhes do pagamento agora.', 'warning');
      }
      return null;
    } finally {
      setPaymentAuditLoading(false);
    }
  };

  const copyText = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      showToast(okMessage, 'success');
    } catch {
      showToast('Não foi possível copiar agora.', 'warning');
    }
  };

  const refreshPaymentStatusByRequest = async (requestIdRaw: string, silent = false) => {
    const requestId = String(requestIdRaw || '').trim();
    if (!requestId || !storeId) return;
    const previous = requests.find((entry) => String(entry?.id || '') === requestId) || selectedRequest;
    try {
      const updated = await featuredService.refreshPaymentByStore(requestId, storeId);
      const updatedId = String(updated?.id || '').trim();
      const suppressSilentFailure =
        silent &&
        isFeaturedPaymentFailed(updated?.paymentStatus) &&
        getFeaturedPaymentRemainingMs(updated?.paymentExpiresAt) > 0;
      if (suppressSilentFailure) {
        if (updatedId) await loadPaymentAudit(updatedId, true);
        return;
      }
      setRequests((prev) =>
        (Array.isArray(prev) ? prev : []).map((entry) =>
          String(entry?.id || '') === String(updated?.id || '') ? updated : entry
        )
      );
      setSelectedRequest((prev: any) =>
        String(prev?.id || '') === String(updated?.id || '') ? updated : prev
      );
      const becamePaid =
        String(previous?.paymentStatus || '').toUpperCase() !== 'PAID' &&
        String(updated?.paymentStatus || '').toUpperCase() === 'PAID';
      if (becamePaid) {
        if (!paidToastShownRef.current.has(requestId)) {
          paidToastShownRef.current.add(requestId);
          showToast('Pagamento confirmado. Seu destaque foi atualizado.', 'success');
        }
        await loadAll();
        closePayment();
      } else if (String(updated?.id || '').trim()) {
        await loadPaymentAudit(String(updated.id), true);
      }
    } catch (error: any) {
      if (!silent) showToast(error?.message || 'Não foi possível atualizar o pagamento agora.', 'warning');
    }
  };

  const refreshSelectedPaymentStatus = async (silent = false) => {
    const requestId = String(selectedRequest?.id || '').trim();
    if (!requestId) return;
    await refreshPaymentStatusByRequest(requestId, silent);
  };

  const currentPaymentAuditSummary = useMemo(() => {
    if (selectedPaymentAudit?.summary) return selectedPaymentAudit.summary;
    if (!selectedRequest) return null;
    return {
      provider: selectedRequest?.paymentProvider || 'MERCADO_PAGO',
      paymentMethod: selectedRequest?.paymentMethod || null,
      paymentStatus: selectedRequest?.paymentStatus || null,
      paymentStatusLabel: getFeaturedPaymentStatusLabel(selectedRequest?.paymentStatus),
      amount: selectedRequest?.priceAmount != null ? Number(selectedRequest.priceAmount) : null,
      providerPaymentId: selectedRequest?.paymentProviderId || null,
      expiresAt: selectedRequest?.paymentExpiresAt || null,
      paidAt: selectedRequest?.paymentPaidAt || null,
      updatedAt: selectedRequest?.updatedAt || selectedRequest?.createdAt || null,
      lastEventAt: selectedRequest?.updatedAt || selectedRequest?.createdAt || null,
    };
  }, [selectedPaymentAudit, selectedRequest]);

  useEffect(() => {
    if (!paymentOpen || !selectedRequest?.id) return;
    const shouldPoll = shouldPollFeaturedPayment(selectedRequest) && paymentCountdownMs > 0;
    if (!shouldPoll) return;
    const first = window.setTimeout(() => {
      void refreshSelectedPaymentStatus(true);
    }, 400);
    const timer = window.setInterval(() => {
      void refreshSelectedPaymentStatus(true);
    }, 3000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [paymentOpen, selectedRequest?.id, selectedRequest?.status, selectedRequest?.paymentStatus, storeId, paymentCountdownMs]);

  useEffect(() => {
    if (!paymentOpen || !selectedRequest?.id) return;
    if (isFeaturedPaymentPaid(selectedRequest?.paymentStatus)) return;
    if (paymentCountdownMs <= 0) return;
    const timer = window.setInterval(() => {
      setPaymentCountdownMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paymentOpen, selectedRequest?.id, selectedRequest?.paymentStatus, paymentCountdownMs]);

  useEffect(() => {
    if (!paymentOpen || !selectedRequest?.id) return;
    if (isFeaturedPaymentPaid(selectedRequest?.paymentStatus)) return;
    if (isFeaturedPaymentFailed(selectedRequest?.paymentStatus)) return;
    if (paymentCountdownMs > 0) return;
    const requestId = String(selectedRequest.id || '');
    if (paymentExpiryNoticeShownRef.current.has(requestId)) return;
    paymentExpiryNoticeShownRef.current.add(requestId);
    showToast('Atualização automática pausada. Se você já pagou, toque em Atualizar status.', 'warning');
  }, [paymentOpen, selectedRequest?.id, selectedRequest?.paymentStatus, paymentCountdownMs]);

  // Removido: useEffect que fechava modal automaticamente ao PAID causava piscar

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.productId) {
      showToast('Selecione um produto para destacar.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const created = await featuredService.createByStore(
        {
          productId: form.productId,
          durationUnit: form.durationUnit,
          paymentMethod: form.paymentMethod,
          publicNote: String(form.publicNote || '').trim(),
        },
        storeId
      );
      showToast('Solicitação criada. Faça o pagamento para ativar o destaque.', 'success');
      setForm((prev) => ({ ...prev, publicNote: '' }));
      await loadAll();
      openPayment(created);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível criar a solicitação.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await featuredService.cancelByStore(requestId, storeId);
      showToast('Solicitação cancelada.', 'success');
      await loadAll();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível cancelar a solicitação.', 'error');
    }
  };

  const handleVisibilityTabChange = (tab: 'highlights' | 'push') => {
    setActiveVisibilityTab(tab);
    if (typeof window !== 'undefined') sessionStorage.setItem('adminHighlights:tab', tab);
  };

  const openPushPayment = (push: any) => {
    setActivePush(push);
    setPushPaymentOpen(true);
    if (push?.paymentExpiresAt) {
      const remaining = Math.max(0, new Date(push.paymentExpiresAt).getTime() - Date.now());
      setPushCountdownMs(remaining);
    } else {
      setPushCountdownMs(0);
    }
  };

  const handleCreatePush = async (event?: React.FormEvent) => {
    event?.preventDefault?.();
    if (!storeId) return;
    if (!pushForm.title.trim() || !pushForm.message.trim()) {
      showToast('Informe título e mensagem do push.', 'warning');
      return;
    }
    setPushSubmitting(true);
    try {
      const created = await promoPushService.create(storeId, { title: pushForm.title.trim(), message: pushForm.message.trim() });
      showToast('Push criado. Faça o pagamento para enviar à aprovação.', 'success');
      setPushForm({ title: '', message: '' });
      setPushes((prev) => [created, ...prev]);
      openPushPayment(created);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao criar push.', 'error');
    } finally {
      setPushSubmitting(false);
    }
  };

  const selectedPrice = Number(pricing?.prices?.[form.durationUnit] || 0);
  const selectedDays = DURATION_META[form.durationUnit]?.days || 1;

  return (
    <AdminLayout contextLabel="Visibilidade" fluid withSidebar>
        <VisibilityShell
          activeTab={activeVisibilityTab}
          onTabChange={handleVisibilityTabChange}
          activeCount={(requests || []).filter((request: any) => String(request?.status || '').toUpperCase() === 'APPROVED' && String(request?.paymentStatus || '').toUpperCase() === 'PAID').length}
          pushCount={(pushes || []).length}
        >
          {activeVisibilityTab === 'highlights' ? (
            <HighlightsTab
              requests={requests}
              pricing={pricing}
              productOptions={productOptions}
              form={form}
              setForm={setForm}
              loading={loading}
              submitting={submitting}
              selectedPrice={selectedPrice}
              selectedDays={selectedDays}
              onCreate={handleCreate}
              onRefresh={loadAll}
              onOpenPayment={openPayment}
              onCancel={handleCancel}
            />
          ) : (
            <PushTab
              auth={auth}
              pushes={pushes}
              loading={pushLoading}
              pushForm={pushForm}
              setPushForm={setPushForm}
              pushSubmitting={pushSubmitting}
              onCreatePush={handleCreatePush}
              onRefresh={loadPushes}
              onOpenPayment={openPushPayment}
            />
          )}
        </VisibilityShell>

      {paymentOpen && selectedRequest && (
        <div className="fixed inset-0 z-[320] bg-slate-950/55 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
          <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Pagamento do destaque</p>
              <h3 className="text-lg font-black text-slate-900">{selectedRequest?.product?.name || 'Produto'}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Status: <strong>{getFeaturedPaymentStatusLabel(selectedRequest?.paymentStatus)}</strong>
                {selectedRequest?.paymentExpiresAt ? ` • expira em ${formatDateTime(selectedRequest.paymentExpiresAt)}` : ''}
              </p>
              {String(selectedRequest?.paymentStatus || '').toUpperCase() !== 'PAID' && paymentCountdownMs > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Tempo para atualização automática: <strong>{formatCountdown(paymentCountdownMs)}</strong>
                </p>
              )}
            </div>

            <PaymentQRCard
              qrCodeBase64={selectedRequest?.paymentQrCodeBase64 || null}
              qrCodeText={selectedRequest?.paymentQrCodeText || null}
              paymentLink={selectedRequest?.paymentLink || null}
              status={selectedRequest?.paymentStatus || 'PENDING'}
              expiresAt={selectedRequest?.paymentExpiresAt || null}
              amountLabel={formatCurrency(Number(selectedRequest?.priceAmount || 0))}
              title="Pagamento do destaque"
              subtitle={selectedRequest?.product?.name}
              variant="admin"
              onVerifyNow={() => refreshSelectedPaymentStatus(false)}
            />

            <div className="mt-3">
              <PaymentAuditPanel
                summary={currentPaymentAuditSummary}
                events={selectedPaymentAudit?.events || []}
                showEvents={false}
                showTechnicalButton={canViewTechnical}
                technicalLoading={paymentAuditLoading}
                onTechnicalClick={async () => {
                  const payload = selectedPaymentAudit || (await loadPaymentAudit(String(selectedRequest?.id || ''), false));
                  if (payload) setPaymentTechnicalOpen(true);
                }}
              />
            </div>

            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={async () => {
                  await refreshSelectedPaymentStatus(false);
                }}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 sm:w-auto"
              >
                Atualizar status
              </button>
              <button
                type="button"
                onClick={closePayment}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white sm:w-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentTechnicalModal
        open={paymentTechnicalOpen}
        title="Detalhes técnicos do pagamento do destaque"
        audit={selectedPaymentAudit}
        onClose={() => setPaymentTechnicalOpen(false)}
      />

      {/* Modal pagamento push */}
      {pushPaymentOpen && activePush && (
        <div className="fixed inset-0 z-[320] bg-slate-950/55 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
          <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Pagamento do Push</p>
              <h3 className="text-base font-black text-slate-900 truncate">{activePush.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Status: <strong>{activePush.paymentStatus === 'PAID' ? 'Pago ✅' : activePush.paymentStatus === 'FAILED' ? 'Falhou ❌' : 'Aguardando pagamento'}</strong></p>
              {activePush.paymentStatus !== 'PAID' && activePush.paymentStatus !== 'FAILED' && activePush.paymentExpiresAt && (
                <p className="text-xs text-amber-700 mt-1">Expira em: <strong>{new Date(activePush.paymentExpiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></p>
              )}
            </div>
            <PaymentQRCard
              qrCodeBase64={activePush.paymentQrCodeBase64 || null}
              qrCodeText={activePush.paymentQrCodeText || null}
              status={activePush.paymentStatus || 'PENDING'}
              expiresAt={activePush.paymentExpiresAt || null}
              title="Pagamento do Push"
              subtitle={activePush.title}
              variant="admin"
              onVerifyNow={async () => {
                if (!storeId) return;
                try {
                  const updated = await promoPushService.refreshPayment(activePush.id, storeId);
                  setActivePush(updated);
                  setPushes((prev) => prev.map((p) => p.id === updated.id ? updated : p));
                  if (updated.paymentStatus === 'PAID') showToast('Pagamento confirmado!', 'success');
                } catch { showToast('Não foi possível atualizar.', 'warning'); }
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              {activePush.paymentStatus !== 'PAID' && (
                <button type="button" onClick={async () => {
                  if (!storeId) return;
                  try {
                    const updated = await promoPushService.refreshPayment(activePush.id, storeId);
                    setActivePush(updated);
                    setPushes((prev) => prev.map((p) => p.id === updated.id ? updated : p));
                    if (updated.paymentStatus === 'PAID') showToast('Pagamento confirmado!', 'success');
                  } catch { showToast('Não foi possível atualizar.', 'warning'); }
                }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Atualizar status</button>
              )}
              <button type="button" onClick={() => setPushPaymentOpen(false)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
