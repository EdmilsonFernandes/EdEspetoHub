import { Drawer } from 'vaul';
import {
  Bicycle,
  CheckCircle,
  Clock,
  Heart,
  MapPinLine,
  SlidersHorizontal,
  Storefront,
  X,
} from '@phosphor-icons/react';

export type HubQuickFilterKey = 'all' | 'free_shipping' | 'nearby' | 'open_now' | 'favorites';
type HubActiveQuickFilterKey = Exclude<HubQuickFilterKey, 'all'>;

export type HubCategoryTile = {
  icon: typeof Storefront;
  label: string;
};

const HUB_PRIMARY_QUICK_FILTERS: HubActiveQuickFilterKey[] = ['open_now', 'free_shipping', 'nearby'];

const HUB_QUICK_FILTER_OPTIONS: Array<{
  key: HubActiveQuickFilterKey;
  label: string;
  compactLabel: string;
  description: string;
  icon: typeof Storefront;
}> = [
  {
    key: 'open_now',
    label: 'Aberto agora',
    compactLabel: 'Aberto',
    description: 'Mostra lojas atendendo neste momento.',
    icon: Clock,
  },
  {
    key: 'free_shipping',
    label: 'Entrega grátis',
    compactLabel: 'Grátis',
    description: 'Prioriza lojas sem taxa de entrega.',
    icon: Bicycle,
  },
  {
    key: 'nearby',
    label: 'Perto de mim',
    compactLabel: 'Perto',
    description: 'Lojas mais próximas do endereço atual.',
    icon: MapPinLine,
  },
  {
    key: 'favorites',
    label: 'Favoritos',
    compactLabel: 'Favoritos',
    description: 'Apenas lojas salvas por você.',
    icon: Heart,
  },
];

type HubFilterBarProps = {
  isNativePlatform: boolean;
  quickFilter: HubQuickFilterKey;
  segmentFilter: string;
  onQuickFilterChange: (filter: HubQuickFilterKey) => void;
  onOpenFilters: () => void;
  onScrollStoresIntoView: () => void;
};

export function HubFilterBar({
  isNativePlatform,
  quickFilter,
  segmentFilter,
  onQuickFilterChange,
  onOpenFilters,
  onScrollStoresIntoView,
}: HubFilterBarProps) {
  const hiddenFilterCount = (quickFilter === 'favorites' ? 1 : 0) + (segmentFilter !== 'all' ? 1 : 0);
  const primaryOptions = HUB_QUICK_FILTER_OPTIONS.filter((item) => HUB_PRIMARY_QUICK_FILTERS.includes(item.key));

  return (
    <div className={`${isNativePlatform ? 'pt-0.5' : 'pt-1'}`}>
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-1.5 min-[390px]:gap-2">
        {primaryOptions.map((filter) => {
          const Icon = filter.icon;
          const active = quickFilter === filter.key;
          const nextFilter: HubQuickFilterKey = active ? 'all' : filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                onQuickFilterChange(nextFilter);
                if (nextFilter !== 'all') onScrollStoresIntoView();
              }}
              className={`jnc-hub-touch inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-[11px] font-black leading-none min-[390px]:min-h-11 min-[390px]:px-3 ${
                active
                  ? 'jnc-hub-pill-active'
                  : 'jnc-hub-pill text-slate-600 hover:text-[#153A4C]'
              }`}
              aria-pressed={active}
              aria-label={filter.label}
              title={filter.label}
            >
              <Icon size={13} weight={active ? 'fill' : 'duotone'} className="shrink-0" />
              <span className="truncate">{filter.compactLabel}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenFilters}
          className={`jnc-hub-touch relative inline-flex h-full min-h-10 min-w-[3.35rem] items-center justify-center gap-1 rounded-full px-2.5 py-2 text-[11px] font-black leading-none min-[390px]:min-h-11 min-[390px]:px-3 ${
            hiddenFilterCount > 0
              ? 'border border-[#336886]/22 bg-[#edf5fa]/86 text-[#153A4C] shadow-[0_16px_32px_-26px_rgba(51,104,134,0.34)]'
              : 'jnc-hub-pill text-slate-600 hover:text-[#153A4C]'
          }`}
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal size={14} weight="bold" />
          <span className="hidden min-[390px]:inline">Filtros</span>
          <span className="min-[390px]:hidden">Mais</span>
          {hiddenFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#153A4C] px-1 text-[9px] font-black text-white ring-2 ring-white">
              {hiddenFilterCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

type HubFilterSheetProps = {
  open: boolean;
  quickFilter: HubQuickFilterKey;
  segmentFilter: string;
  debouncedQuery: string;
  filteredStoresCount: number;
  categoryTiles: HubCategoryTile[];
  onOpenChange: (open: boolean) => void;
  onQuickFilterChange: (filter: HubQuickFilterKey) => void;
  onSegmentFilterChange: (filter: string) => void;
  onResetFilters: () => void;
  onScrollStoresIntoView: () => void;
};

export function HubFilterSheet({
  open,
  quickFilter,
  segmentFilter,
  debouncedQuery,
  filteredStoresCount,
  categoryTiles,
  onOpenChange,
  onQuickFilterChange,
  onSegmentFilterChange,
  onResetFilters,
  onScrollStoresIntoView,
}: HubFilterSheetProps) {
  const selectedQuickFilterOption = HUB_QUICK_FILTER_OPTIONS.find((item) => item.key === quickFilter) || null;
  const activeFilterCount =
    (quickFilter !== 'all' ? 1 : 0) + (segmentFilter !== 'all' ? 1 : 0) + (debouncedQuery ? 1 : 0);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-[3px]" />
        <Drawer.Content className="jnc-hub-surface fixed inset-x-0 bottom-0 z-[130] mx-auto h-fit max-h-[88vh] max-w-2xl overflow-hidden rounded-t-[2rem] text-slate-950 shadow-[0_-28px_76px_-42px_rgba(15,23,42,0.68)] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300/80" />
          <div className="max-h-[calc(88vh-0.75rem)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Drawer.Title className="text-[19px] font-black tracking-[-0.03em] text-slate-950">
                  Encontre mais rápido
                </Drawer.Title>
                <Drawer.Description className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-500">
                  Use atalhos para chegar nas lojas certas sem mexer na ordem do app.
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.3)] transition active:scale-95"
                aria-label="Fechar filtros"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-[#336886]/10 bg-[#edf5fa]/68 px-3.5 py-3 text-[#153A4C] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]/75">Agora na lista</p>
                  <p className="mt-0.5 truncate text-sm font-black text-[#153A4C]">
                    {filteredStoresCount} loja{filteredStoresCount === 1 ? '' : 's'} encontrada{filteredStoresCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-[#336886] ring-1 ring-white/80">
                  <CheckCircle size={12} weight="fill" />
                  {activeFilterCount > 0 ? `${activeFilterCount} ativo${activeFilterCount === 1 ? '' : 's'}` : 'Sem filtro'}
                </span>
              </div>
              {selectedQuickFilterOption || segmentFilter !== 'all' || debouncedQuery ? (
                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#336886]/80">
                  {[
                    selectedQuickFilterOption?.label,
                    segmentFilter !== 'all' ? `Categoria: ${segmentFilter}` : '',
                    debouncedQuery ? `Busca: ${debouncedQuery}` : '',
                  ].filter(Boolean).join(' • ')}
                </p>
              ) : null}
            </div>

            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Atalhos</p>
                {quickFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => onQuickFilterChange('all')}
                    className="jnc-hub-touch inline-flex min-h-10 items-center rounded-full px-3 text-[11px] font-black text-[#336886] active:scale-95"
                  >
                    Limpar atalho
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {HUB_QUICK_FILTER_OPTIONS.map((filter) => {
                  const Icon = filter.icon;
                  const active = quickFilter === filter.key;
                  return (
                    <button
                      key={`sheet-${filter.key}`}
                      type="button"
                      onClick={() => {
                        onQuickFilterChange(active ? 'all' : filter.key);
                        onOpenChange(false);
                        if (!active) onScrollStoresIntoView();
                      }}
                      className={`jnc-hub-touch min-h-[4.75rem] rounded-[1.25rem] p-3 text-left ${
                        active
                          ? 'jnc-hub-pill-active'
                          : 'jnc-hub-card text-slate-700'
                      }`}
                      aria-pressed={active}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${active ? 'bg-white/16 text-white' : 'bg-[#edf5fa] text-[#336886]'}`}>
                          <Icon size={16} weight={active ? 'fill' : 'duotone'} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-black">{filter.label}</span>
                      </div>
                      <p className={`mt-2 line-clamp-2 text-[11px] font-semibold leading-snug ${active ? 'text-white/76' : 'text-slate-500'}`}>
                        {filter.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Categorias</p>
                {segmentFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => onSegmentFilterChange('all')}
                    className="text-[11px] font-black text-[#336886] active:scale-95"
                  >
                    Ver todas
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    onSegmentFilterChange('all');
                    onOpenChange(false);
                    onScrollStoresIntoView();
                  }}
                  className={`jnc-hub-touch min-h-10 min-w-0 rounded-[1.05rem] px-2 py-2.5 text-center text-[11px] font-black ${
                    segmentFilter === 'all'
                      ? 'jnc-hub-pill-active'
                      : 'jnc-hub-pill text-slate-600'
                  }`}
                >
                  Todos
                </button>
                {categoryTiles.map((item, index) => {
                  const active = segmentFilter === item.label;
                  const CategoryIcon = item.icon;
                  return (
                    <button
                      key={`sheet-category-${item.label}-${index}`}
                      type="button"
                      onClick={() => {
                        onSegmentFilterChange(active ? 'all' : item.label);
                        onOpenChange(false);
                        onScrollStoresIntoView();
                      }}
                      className={`jnc-hub-touch min-h-10 min-w-0 rounded-[1.05rem] px-2 py-2.5 text-center ${
                        active
                          ? 'jnc-hub-pill-active'
                          : 'jnc-hub-pill text-slate-600'
                      }`}
                    >
                      <CategoryIcon size={15} weight={active ? 'fill' : 'duotone'} className="mx-auto mb-1" />
                      <span className="block truncate text-[10.5px] font-black">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetFilters();
                  onOpenChange(false);
                }}
                disabled={activeFilterCount === 0}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white text-sm font-black text-slate-600 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.26)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onScrollStoresIntoView();
                }}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-[1.2rem] bg-[#153A4C] text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.65)] transition active:scale-[0.98]"
              >
                Ver lojas
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
