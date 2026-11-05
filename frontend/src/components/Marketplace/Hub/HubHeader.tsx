import { memo, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRinging,
  CaretDown,
  MagnifyingGlass,
  MapPinLine,
  Mountains,
  Buildings,
  House,
  X,
  Receipt,
  MapTrifold,
  Tent,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { HeaderAvatarTrigger } from '../HeaderAvatarTrigger';
import { inputAssistProps } from '../../../utils/inputAssist';
import { HubFilterBar, type HubQuickFilterKey } from './HubFilters';
import { useRecentSearches } from '../../../hooks/hub/useRecentSearches';
import type { DeliveryContext } from './HubContextSheet';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

type HubHeaderProps = {
  isNativePlatform: boolean;
  isHeaderElevated: boolean;
  customerDisplayName: string;
  customerProfileImage?: string | null;
  isCustomerLogged: boolean;
  hubHeaderEyebrow: string;
  displayLocationLabel: string;
  hubNotificationCount: number;
  timeOfDay?: TimeOfDay;
  searchInputRef: RefObject<HTMLInputElement | null>;
  query: string;
  isSearchEditing: boolean;
  searchPlaceholder: string;
  searchPlaceholderVisible: boolean;
  quickFilter: HubQuickFilterKey;
  segmentFilter: string;
  activeDeliveryContext?: DeliveryContext;
  onOpenProfileDrawer: () => void;
  onToggleNearbyFilter: () => void;
  onOpenContextSheet?: () => void;
  onHubNotificationClick: () => void;
  onQueryChange: (value: string) => void;
  onDebouncedQueryChange: (value: string) => void;
  onSearchEditingChange: (editing: boolean) => void;
  onQuickFilterChange: (filter: HubQuickFilterKey) => void;
  onOpenFilters: () => void;
  onScrollStoresIntoView: () => void;
  onHomeClick: () => void;
  onAgendaClick: () => void;
  onPedidosClick: () => void;
  onDestinosClick: () => void;
  isCondominiumScope: boolean;
};

export const HubHeader = memo(function HubHeader({
  isNativePlatform,
  isHeaderElevated,
  customerDisplayName,
  customerProfileImage,
  isCustomerLogged,
  hubHeaderEyebrow: _hubHeaderEyebrow,
  displayLocationLabel,
  hubNotificationCount,
  searchInputRef,
  query,
  isSearchEditing,
  searchPlaceholder,
  searchPlaceholderVisible,
  quickFilter,
  segmentFilter,
  activeDeliveryContext,
  onOpenProfileDrawer,
  onToggleNearbyFilter,
  onOpenContextSheet,
  onHubNotificationClick,
  onQueryChange,
  onDebouncedQueryChange,
  onSearchEditingChange,
  onQuickFilterChange,
  onOpenFilters,
  onScrollStoresIntoView,
  onHomeClick,
  onAgendaClick,
  onPedidosClick,
  onDestinosClick,
  isCondominiumScope,
}: HubHeaderProps) {
  const desktopSearchInputRef = useRef<HTMLInputElement | null>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  const handleSearchBlur = () => {
    if (query.trim().length >= 3) addRecentSearch(query);
    onSearchEditingChange(false);
  };

  const applyRecentSearch = (term: string) => {
    onQueryChange(term);
    onDebouncedQueryChange(term);
    searchInputRef?.current?.focus?.();
  };

  const assignVisibleSearchRef = (el: HTMLInputElement | null) => {
    if (el && el.offsetParent !== null) {
      if (searchInputRef) {
        (searchInputRef as any).current = el;
      }
    }
  };

  const contextType = activeDeliveryContext?.type || 'home';
  const contextTitle = activeDeliveryContext?.title || displayLocationLabel;
  const isChale = contextType === 'chale';
  const isCondo = contextType === 'condo';

  return (
    <header
      className={`sticky top-0 z-[60] border-b border-slate-100 bg-white/96 backdrop-blur-xl transition-all duration-300 ${
        isHeaderElevated ? 'shadow-[0_10px_30px_-15px_rgba(15,23,42,0.08)]' : ''
      }`}
    >
      <div
        className={`mx-auto max-w-[1200px] px-4 ${
          isNativePlatform
            ? 'pb-2.5 pt-[max(0.4rem,calc(env(safe-area-inset-top)+0.05rem))]'
            : 'pb-3 pt-[max(0.55rem,calc(env(safe-area-inset-top)+0.1rem))]'
        }`}
      >
        <div className="relative space-y-2.5">
          {/* MOBILE LAYOUT (hidden on desktop) */}
          <div className="lg:hidden space-y-2.5">
            {/* Top row: Context Chip + (Bell & Avatar) */}
            <div className="relative flex items-center justify-between gap-2.5">
              {/* Context Chip ReUI: abre a Sheet de Entrega ao tocar */}
              <button
                type="button"
                onClick={onOpenContextSheet || onToggleNearbyFilter}
                className={`jnc-hub-touch flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-1.5 shadow-2xs transition-all active:scale-[0.98] ${
                  isChale
                    ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70'
                    : isCondo
                      ? 'border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70'
                      : 'border-slate-200/80 bg-slate-50/90 hover:bg-slate-100/80'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isChale
                    ? 'bg-emerald-600 text-white'
                    : isCondo
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#5FD35A] text-[#153A4C]'
                }`}>
                  {isChale ? (
                    <Mountains size={13} weight="fill" />
                  ) : isCondo ? (
                    <Buildings size={13} weight="fill" />
                  ) : (
                    <MapPinLine size={13} weight="fill" />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className={`block text-[9.5px] font-black uppercase tracking-[0.14em] ${
                    isChale ? 'text-emerald-700' : isCondo ? 'text-indigo-700' : 'text-slate-400'
                  }`}>
                    {isChale ? 'Chalé / Serra' : isCondo ? 'Condomínio' : 'Entregar em'}
                  </span>
                  <span className="block truncate text-xs font-black text-slate-900">
                    {contextTitle}
                  </span>
                </span>
                <CaretDown size={12} weight="bold" className="shrink-0 text-slate-400" />
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onHubNotificationClick}
                  className="jnc-hub-touch relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-slate-50 text-slate-700 shadow-2xs transition hover:bg-slate-100 active:scale-95"
                  aria-label={hubNotificationCount > 0 ? `${hubNotificationCount} notificação de pedido` : 'Notificações'}
                  title={hubNotificationCount > 0 ? 'Pedidos em andamento' : 'Notificações'}
                >
                  <BellRinging size={17} weight={hubNotificationCount > 0 ? 'fill' : 'bold'} />
                  {hubNotificationCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#5FD35A] text-[10px] font-black text-[#153A4C] ring-2 ring-white">
                      {hubNotificationCount > 9 ? '9+' : hubNotificationCount}
                    </span>
                  ) : null}
                </button>

                <HeaderAvatarTrigger
                  displayName={customerDisplayName}
                  profileImageUrl={customerProfileImage}
                  hasNotification={!isCustomerLogged}
                  onClick={onOpenProfileDrawer}
                />
              </div>
            </div>

            {/* Greeting */}
            <div className="pt-0.5">
              <p className="text-[17px] font-black tracking-tight text-slate-950">
                {isChale ? (
                  'Jantar no chalé? Peça agora'
                ) : isCondo ? (
                  'Feiras e lojas no seu condomínio'
                ) : isCustomerLogged && customerDisplayName ? (
                  `Com fome, ${customerDisplayName.split(' ')[0]}?`
                ) : (
                  'Com fome? Peça agora'
                )}
              </p>
              {isChale && (
                <p className="text-2xs font-bold text-emerald-700">
                  São Francisco Xavier · Lojas que entregam na sua hospedagem
                </p>
              )}
            </div>

            {/* Search Input ReUI: Clean, Soft Gray Surface */}
            <div className="relative z-20">
              <div
                className="group relative flex min-h-[44px] items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-100/70 px-3.5 shadow-2xs transition-all focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/15"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button')) return;
                  searchInputRef.current?.focus();
                }}
              >
                <MagnifyingGlass size={17} weight="bold" className="shrink-0 text-[#2563EB]" />
                <div className="relative min-w-0 flex-1 flex items-center">
                  <input
                    {...inputAssistProps.search}
                    ref={(el) => {
                      if (searchInputRef) {
                        (searchInputRef as any).current = el;
                      }
                      assignVisibleSearchRef(el);
                    }}
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onFocus={() => onSearchEditingChange(true)}
                    onBlur={handleSearchBlur}
                    placeholder={isSearchEditing ? (isChale ? 'Buscar loja ou prato na serra' : 'Buscar loja, categoria ou produto') : ''}
                    enterKeyHint="search"
                    className="block min-h-[42px] w-full min-w-0 appearance-none bg-transparent font-semibold text-slate-900 outline-none text-[13.5px] placeholder:text-slate-400"
                    style={{
                      WebkitAppearance: 'none',
                      caretColor: '#2563EB',
                      backgroundColor: 'transparent',
                      color: '#0F172A',
                    }}
                  />
                  {!isSearchEditing && !query && (
                    <div
                      className={`pointer-events-none absolute left-0 flex items-center transition-all duration-300 ${
                        searchPlaceholderVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      } text-[13.5px]`}
                    >
                      <span className="font-semibold text-slate-400 truncate">
                        {isChale ? 'Buscar loja ou prato na serra...' : (searchPlaceholder || 'Buscar loja, prato ou produto')}
                      </span>
                    </div>
                  )}
                </div>
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      onQueryChange('');
                      onDebouncedQueryChange('');
                      onSearchEditingChange(false);
                    }}
                    className="jnc-hub-touch inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
                    aria-label="Limpar busca"
                  >
                    <X size={13} weight="bold" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* DESKTOP LAYOUT (hidden on mobile) */}
          <div className="hidden lg:flex items-center justify-between gap-6 relative py-1">
            {/* Left side: Logo + Location Picker */}
            <div className="flex items-center gap-4">
              <Link to="/hub" onClick={onHomeClick} className="jnc-hub-touch flex min-h-10 shrink-0 select-none items-center gap-2.5 rounded-xl group">
                <img
                  src="/janocaminho.jpg"
                  alt="Já no Caminho"
                  className="h-9 w-9 rounded-xl object-cover shadow-xs ring-1 ring-slate-200 group-hover:scale-105 transition-transform duration-300"
                />
                <span className="text-[15px] font-black tracking-tight text-slate-950">
                  Já no Caminho
                </span>
              </Link>
              
              <div className="h-5 w-px bg-slate-200" />
              
              {/* Location Badge */}
              <button
                type="button"
                onClick={onOpenContextSheet || onToggleNearbyFilter}
                className="jnc-hub-touch inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
              >
                <MapPinLine size={13} weight="fill" className="text-[#5FD35A]" />
                <span className="truncate max-w-[160px]" title={contextTitle}>
                  {contextTitle}
                </span>
                <CaretDown size={11} weight="bold" className="text-slate-400" />
              </button>
            </div>

            {/* Middle: Navigation Links */}
            <nav className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em]">
              <button
                type="button"
                onClick={onHomeClick}
                className={`jnc-hub-touch flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 ${
                  !isCondominiumScope
                    ? 'bg-slate-100 text-slate-950 font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <House size={14} weight={!isCondominiumScope ? 'fill' : 'bold'} />
                Início
              </button>
              <button
                type="button"
                onClick={onAgendaClick}
                className={`jnc-hub-touch flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 ${
                  isCondominiumScope
                    ? 'bg-slate-100 text-slate-950 font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <Tent size={14} weight={isCondominiumScope ? 'fill' : 'bold'} />
                Feiras
              </button>
              <button
                type="button"
                onClick={onPedidosClick}
                className="jnc-hub-touch flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              >
                <Receipt size={14} weight="bold" />
                Pedidos
              </button>
              <button
                type="button"
                onClick={onDestinosClick}
                className="jnc-hub-touch flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              >
                <MapTrifold size={14} weight="bold" />
                Visite
              </button>
            </nav>

            {/* Right side: Search Bar + Notifications + Profile */}
            <div className="flex items-center gap-3 flex-1 max-w-[420px] justify-end">
              {/* Desktop Search Bar */}
              <div
                className="relative flex min-h-10 max-w-[260px] flex-1 items-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-2xs transition-all duration-300 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/15"
                onClick={() => desktopSearchInputRef.current?.focus()}
              >
                <MagnifyingGlass size={15} weight="bold" className="text-slate-400 shrink-0" />
                <div className="relative min-w-0 flex-1 flex items-center h-full">
                  <input
                    {...inputAssistProps.search}
                    ref={(el) => {
                      desktopSearchInputRef.current = el;
                      assignVisibleSearchRef(el);
                    }}
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onFocus={() => onSearchEditingChange(true)}
                    onBlur={handleSearchBlur}
                    placeholder={isSearchEditing ? 'Buscar no app' : ''}
                    enterKeyHint="search"
                    className="block min-h-10 w-full min-w-0 appearance-none bg-transparent font-bold text-slate-900 outline-none text-xs placeholder:text-slate-400"
                  />
                  {!isSearchEditing && !query && (
                    <div
                      className={`pointer-events-none absolute left-0 flex items-center transition-all duration-300 ${
                        searchPlaceholderVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      }`}
                    >
                      <span className="font-bold text-slate-400 text-xs truncate">
                        {searchPlaceholder}
                      </span>
                    </div>
                  )}
                </div>
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      onQueryChange('');
                      onDebouncedQueryChange('');
                      onSearchEditingChange(false);
                    }}
                    className="jnc-hub-touch inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
                    aria-label="Limpar busca"
                  >
                    <X size={10} weight="bold" />
                  </button>
                ) : null}
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onHubNotificationClick}
                className="jnc-hub-touch relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                aria-label={hubNotificationCount > 0 ? `${hubNotificationCount} notificação de pedido` : 'Notificações'}
                title={hubNotificationCount > 0 ? 'Pedidos em andamento' : 'Notificações'}
              >
                <BellRinging size={16} weight={hubNotificationCount > 0 ? 'fill' : 'bold'} />
                {hubNotificationCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5FD35A] text-[10px] font-black text-[#153A4C] ring-1.5 ring-white">
                    {hubNotificationCount > 9 ? '9+' : hubNotificationCount}
                  </span>
                ) : null}
              </button>

              {/* Profile Avatar */}
              <HeaderAvatarTrigger
                displayName={customerDisplayName}
                profileImageUrl={customerProfileImage}
                hasNotification={!isCustomerLogged}
                onClick={onOpenProfileDrawer}
              />
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="pt-0.5">
            <HubFilterBar
              isNativePlatform={isNativePlatform}
              quickFilter={quickFilter}
              segmentFilter={segmentFilter}
              variant="default"
              onQuickFilterChange={onQuickFilterChange}
              onOpenFilters={onOpenFilters}
              onScrollStoresIntoView={onScrollStoresIntoView}
            />
          </div>
        </div>
      </div>

      {/* Buscas recentes */}
      {isSearchEditing && !query && recentSearches.length > 0 && (
        <div className="absolute inset-x-0 top-full z-[61] px-4 pt-2">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="inline-flex items-center gap-1.5 text-2xs font-black uppercase tracking-[0.16em] text-slate-400">
              <ClockCounterClockwise size={13} weight="duotone" />
              Recentes
            </span>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyRecentSearch(term)}
                className="jnc-hub-touch max-w-[46vw] truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-[#2563EB]/30 hover:bg-white hover:text-slate-900 active:scale-95"
              >
                {term}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearRecentSearches}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-2xs font-bold uppercase tracking-[0.1em] text-slate-400 transition hover:text-rose-500"
              aria-label="Limpar buscas recentes"
            >
              <X size={12} weight="bold" />
              Limpar
            </button>
          </div>
        </div>
      )}
    </header>
  );
});
