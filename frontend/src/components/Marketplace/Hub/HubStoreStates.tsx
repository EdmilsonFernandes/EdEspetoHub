import { memo } from 'react';
import {
  Buildings,
  ForkKnife,
  MapPinLine,
  PaperPlaneTilt,
  Sparkle,
  Storefront,
} from '@phosphor-icons/react';

type HubGeoDiscovery = {
  mode?: string | null;
  summary?: {
    deliverableCount?: number | null;
  } | null;
} | null;

type HubStoreDiscoveryNoticeProps = {
  isShowingAllStores: boolean;
  geoDiscovery: HubGeoDiscovery;
  displayLocationLabel?: string | null;
  onRestoreRegionalView: () => void;
};

export const HubStoreDiscoveryNotice = memo(function HubStoreDiscoveryNotice({
  isShowingAllStores,
  geoDiscovery,
  displayLocationLabel,
  onRestoreRegionalView,
}: HubStoreDiscoveryNoticeProps) {
  if (isShowingAllStores) {
    return (
      <div className="rounded-[1.55rem] border border-[#336886]/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(239,247,255,0.96)_100%)] px-4 py-3 shadow-[0_16px_34px_-24px_rgba(51,104,134,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#336886]/10 text-[#336886]">
              <Sparkle size={18} weight="duotone" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]">Exploração ampliada</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Você está vendo uma vitrine ampliada do app.</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Isso ajuda a explorar mais lojas sem depender do contexto local da home.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRestoreRegionalView}
            className="shrink-0 rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (geoDiscovery?.mode === 'deliverable') {
    const deliverableCount = geoDiscovery?.summary?.deliverableCount || 0;
    return (
      <div className="rounded-[1.55rem] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.98)_0%,rgba(240,253,250,0.94)_100%)] px-4 py-3 shadow-[0_14px_34px_-26px_rgba(16,185,129,0.38)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <MapPinLine size={18} weight="duotone" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Sua região</p>
            <p className="mt-1 text-sm font-bold text-slate-900">Mostrando lojas que entregam perto de você.</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {deliverableCount} loja{deliverableCount === 1 ? '' : 's'} com cobertura ativa{displayLocationLabel ? ` em ${displayLocationLabel}` : ''}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (geoDiscovery?.mode === 'nearby_fallback') {
    return (
      <div className="rounded-[1.55rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.98)_0%,rgba(248,250,252,0.94)_100%)] px-4 py-3 shadow-[0_14px_34px_-26px_rgba(2,132,199,0.24)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <MapPinLine size={18} weight="duotone" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Mais próximas</p>
            <p className="mt-1 text-sm font-bold text-slate-900">Não encontramos cobertura direta agora.</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Estas são as lojas mais próximas da sua localização.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
});

export const HubStoreLoadingSkeleton = memo(function HubStoreLoadingSkeleton({
  selectedCondominium,
}: {
  selectedCondominium?: boolean;
}) {
  if (selectedCondominium) {
    return (
      <div className="grid grid-cols-2 gap-2.5 min-[390px]:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white/78 p-0 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/38"
          >
            <div className="h-[56px] w-full ds-skeleton rounded-t-[1.45rem]" />
            <div className="p-3 space-y-3">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 shrink-0 rounded-[0.65rem] ds-skeleton" />
                <div className="h-4 flex-1 rounded-full ds-skeleton mt-1" />
              </div>
              <div className="h-3 w-8/12 rounded-full ds-skeleton" />
              <div className="h-4 w-16 rounded-full ds-skeleton mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[4.8rem_minmax(0,1fr)_2.05rem] items-center gap-3 rounded-[1.45rem] border border-white/80 bg-white/78 px-2.5 py-2.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/38"
        >
          <div className="h-[4.45rem] w-[4.45rem] shrink-0 rounded-[1.28rem] ds-skeleton" />
          <div className="min-w-0 space-y-2.5">
            <div className="h-4 w-7/12 rounded-full ds-skeleton" />
            <div className="h-3 w-5/12 rounded-full ds-skeleton" />
            <div className="h-3 w-9/12 rounded-full ds-skeleton" />
          </div>
          <div className="h-9 w-9 rounded-full ds-skeleton" />
        </div>
      ))}
    </div>
  );
});

type HubStoreEmptyStateProps = {
  productSearchLoading: boolean;
  debouncedQuery: string;
  geoDiscovery: HubGeoDiscovery;
  displayLocationLabel?: string | null;
  onCreateStore: () => void;
  onEnableAllStoresView: () => void;
  onClearFilters: () => void;
};

export const HubStoreEmptyState = memo(function HubStoreEmptyState({
  productSearchLoading,
  debouncedQuery,
  geoDiscovery,
  displayLocationLabel,
  onCreateStore,
  onEnableAllStoresView,
  onClearFilters,
}: HubStoreEmptyStateProps) {
  if (productSearchLoading && debouncedQuery) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-semibold text-slate-700">Buscando lojas com esse item no cardápio...</p>
        <p className="mt-1 text-xs font-bold text-slate-400">A busca agora considera produtos, descrições e categorias.</p>
      </div>
    );
  }

  if (geoDiscovery?.mode === 'no_coverage') {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-[#336886]/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(239,247,255,0.96)_52%,rgba(248,250,252,0.98)_100%)] p-5 shadow-[0_24px_54px_-34px_rgba(51,104,134,0.28)]">
        <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-[#336886]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-300/12 blur-3xl" />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/70 bg-white/88 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.24)]">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-9 w-9 rounded-full object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Expansão da região</p>
              <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">
                Ainda não atendemos {displayLocationLabel || 'essa região'} com entrega.
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                Indique um lojista, restaurante ou operação perto de você para acelerar a chegada do Já no Caminho.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
              <Storefront size={16} weight="duotone" className="text-[#336886]" />
              <p className="mt-2 text-[11px] font-black text-slate-900">Lojista local</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Mercado, adega, conveniência.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
              <ForkKnife size={16} weight="duotone" className="text-emerald-600" />
              <p className="mt-2 text-[11px] font-black text-slate-900">Restaurante</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Delivery, retirada ou balcão.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
              <Buildings size={16} weight="duotone" className="text-violet-600" />
              <p className="mt-2 text-[11px] font-black text-slate-900">Condomínio</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Feira, evento ou operação local.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/80 bg-white/76 px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
              <PaperPlaneTilt size={16} weight="duotone" className="text-sky-600" />
              <p className="mt-2 text-[11px] font-black text-slate-900">Seja o primeiro</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Ajude a puxar a cobertura local.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCreateStore}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1.15rem] bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.58)]"
            >
              <Storefront size={14} weight="fill" />
              Indicar um lojista da região
            </button>
            <button
              type="button"
              onClick={onEnableAllStoresView}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1.15rem] border border-[#336886]/14 bg-white/88 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_14px_28px_-24px_rgba(51,104,134,0.35)]"
            >
              <Sparkle size={14} weight="fill" />
              Explorar outras lojas
            </button>
          </div>

          <p className="text-[11px] font-medium text-slate-500">
            Quando a cobertura local abrir, sua região entra na frente da operação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="font-semibold text-slate-700">Nenhuma loja encontrada com esses filtros.</p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
      >
        Limpar filtros
      </button>
    </div>
  );
});
