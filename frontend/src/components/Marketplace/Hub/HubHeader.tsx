import { memo, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { BellRinging, CaretDown, MagnifyingGlass, X, House, Receipt, Buildings, Mountains } from '@phosphor-icons/react';
import { HeaderAvatarTrigger } from '../HeaderAvatarTrigger';
import { inputAssistProps } from '../../../utils/inputAssist';
import { HubFilterBar, type HubQuickFilterKey } from './HubFilters';

type HubHeaderProps = {
  isNativePlatform: boolean;
  isHeaderElevated: boolean;
  customerDisplayName: string;
  customerProfileImage?: string | null;
  isCustomerLogged: boolean;
  hubHeaderEyebrow: string;
  displayLocationLabel: string;
  hubNotificationCount: number;
  searchInputRef: RefObject<HTMLInputElement | null>;
  query: string;
  isSearchEditing: boolean;
  searchPlaceholder: string;
  searchPlaceholderVisible: boolean;
  quickFilter: HubQuickFilterKey;
  segmentFilter: string;
  onOpenProfileDrawer: () => void;
  onToggleNearbyFilter: () => void;
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
  hubHeaderEyebrow,
  displayLocationLabel,
  hubNotificationCount,
  searchInputRef,
  query,
  isSearchEditing,
  searchPlaceholder,
  searchPlaceholderVisible,
  quickFilter,
  segmentFilter,
  onOpenProfileDrawer,
  onToggleNearbyFilter,
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

  const assignVisibleSearchRef = (el: HTMLInputElement | null) => {
    if (el && el.offsetParent !== null) {
      if (searchInputRef) {
        (searchInputRef as any).current = el;
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-[60] border-b border-white/65 transition-all duration-300 jnc-marketplace-header-glass ${
        isNativePlatform
          ? 'jnc-marketplace-header-glass--native'
          : isHeaderElevated
            ? ''
            : 'jnc-marketplace-header-glass--floating'
      }`}
    >
      <div
        className={`mx-auto max-w-[1200px] px-4 ${
          isNativePlatform
            ? 'pb-2 pt-[max(0.55rem,calc(env(safe-area-inset-top)+0.1rem))]'
            : 'pb-3 pt-[max(0.85rem,calc(env(safe-area-inset-top)+0.2rem))]'
        }`}
      >
        <div
          className={`${
            isNativePlatform ? 'space-y-2.5 rounded-[1.65rem] px-2.5 py-2.5' : 'space-y-3 rounded-[1.9rem] px-3 py-3'
          } jnc-hub-surface relative overflow-hidden`}
        >
          <div className="pointer-events-none absolute -left-12 -top-16 h-36 w-36 rounded-full bg-[#153A4C]/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-6 h-28 w-28 rounded-full bg-slate-200/40 blur-3xl" />

          {/* MOBILE LAYOUT (hidden on desktop) */}
          <div className="lg:hidden space-y-2.5 md:space-y-3">
            <div className="relative flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <HeaderAvatarTrigger
                  displayName={customerDisplayName}
                  profileImageUrl={customerProfileImage}
                  hasNotification={!isCustomerLogged}
                  onClick={onOpenProfileDrawer}
                />
                <div className="jnc-hub-surface-soft min-w-0 flex-1 rounded-[1.35rem] px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <img
                      src="/janocaminho.jpg"
                      alt="Já no Caminho"
                      className="h-4 w-4 shrink-0 rounded-[0.4rem] object-cover shadow-[0_2px_6px_-2px_rgba(21,58,76,0.3)]"
                    />
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {hubHeaderEyebrow}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="jnc-hub-touch inline-flex w-full min-w-0 items-center justify-between gap-2 text-left text-[14px] font-black text-slate-950 hover:text-[#336886]"
                    onClick={onToggleNearbyFilter}
                  >
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      {quickFilter === 'nearby' && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                        </span>
                      )}
                      <span className="truncate">{displayLocationLabel}</span>
                    </span>
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#336886]">
                      <CaretDown size={13} weight="bold" />
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onHubNotificationClick}
                className="jnc-hub-touch jnc-hub-pill relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] text-[#153A4C] hover:bg-white"
                aria-label={hubNotificationCount > 0 ? `${hubNotificationCount} notificação de pedido` : 'Abrir notificações'}
                title={hubNotificationCount > 0 ? 'Pedidos em andamento' : 'Notificações'}
              >
                <BellRinging size={18} weight={hubNotificationCount > 0 ? 'fill' : 'duotone'} />
                {hubNotificationCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white shadow-[0_8px_18px_-10px_rgba(225,29,72,0.9)]">
                    {hubNotificationCount > 9 ? '9+' : hubNotificationCount}
                  </span>
                ) : null}
                {hubNotificationCount > 0 ? (
                  <span className="absolute inset-0 rounded-[1.15rem] border border-rose-600/35 animate-ping" />
                ) : null}
              </button>
            </div>

            <div className="relative z-20">
              <div
                className={`jnc-hub-card group relative isolate flex items-center gap-3 overflow-hidden px-3.5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-[#336886]/15 focus-within:border-[#336886]/25 focus-within:shadow-[0_18px_40px_-28px_rgba(51,104,134,0.34)] focus-within:ring-2 focus-within:ring-[#336886]/10 ${
                  isNativePlatform
                    ? 'min-h-[50px] rounded-[1.35rem]'
                    : 'min-h-[54px] rounded-[1.55rem]'
                }`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button')) return;
                  searchInputRef.current?.focus();
                }}
              >
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border border-[#336886]/10 bg-[#336886]/8 text-[#336886] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <MagnifyingGlass size={18} weight="bold" />
                </div>
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
                    onBlur={() => onSearchEditingChange(false)}
                    placeholder={isSearchEditing ? 'Buscar loja, categoria ou produto' : ''}
                    enterKeyHint="search"
                    className={`block w-full min-w-0 appearance-none bg-transparent pr-1 font-semibold text-slate-950 outline-none transition-opacity duration-300 ${
                      isNativePlatform ? 'min-h-[48px] text-[15px]' : 'min-h-[52px] text-[14px]'
                    }`}
                    style={{
                      WebkitAppearance: 'none',
                      caretColor: '#336886',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      WebkitTextFillColor: 'inherit',
                      color: '#0f172a',
                      transform: 'translateZ(0)',
                    }}
                  />
                  {!isSearchEditing && !query && (
                    <div
                      className={`pointer-events-none absolute left-0 flex items-center transition-all duration-300 ${
                        searchPlaceholderVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      } ${
                        isNativePlatform ? 'text-[15px]' : 'text-[14px]'
                      }`}
                    >
                      <span className="font-semibold text-slate-400 truncate">
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
                    className="jnc-hub-touch inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Limpar busca"
                    title="Limpar"
                  >
                    <X size={14} weight="bold" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* DESKTOP LAYOUT (hidden on mobile) */}
          <div className="hidden lg:flex items-center justify-between gap-6 relative py-1.5">
            {/* Left side: Logo + Location Picker */}
            <div className="flex items-center gap-4">
              <Link to="/hub" onClick={onHomeClick} className="flex items-center gap-2.5 shrink-0 select-none group">
                <img
                  src="/janocaminho.jpg"
                  alt="Já no Caminho"
                  className="h-9 w-9 rounded-xl object-cover shadow-[0_4px_12px_rgba(15,23,42,0.15)] ring-1 ring-slate-100 group-hover:scale-105 transition-transform duration-300"
                />
                <span className="text-[15px] font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent">
                  Já no Caminho
                </span>
              </Link>
              
              <div className="h-5 w-px bg-slate-200" />
              
              {/* Location Badge */}
              <button
                type="button"
                onClick={onToggleNearbyFilter}
                className="jnc-hub-touch jnc-hub-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300"
              >
                {quickFilter === 'nearby' ? (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  </span>
                ) : (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-300" />
                  </span>
                )}
                <span className="truncate max-w-[160px]" title={displayLocationLabel}>
                  {displayLocationLabel}
                </span>
                <CaretDown size={11} weight="bold" className="text-[#336886]" />
              </button>
            </div>

            {/* Middle: Navigation Links */}
            <nav className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em]">
              <button
                type="button"
                onClick={onHomeClick}
                className={`jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-100/70 ${
                  !isCondominiumScope
                    ? 'text-[#336886] bg-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <House size={14} weight={!isCondominiumScope ? 'fill' : 'bold'} />
                Início
              </button>
              <button
                type="button"
                onClick={onAgendaClick}
                className={`jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-100/70 ${
                  isCondominiumScope
                    ? 'text-[#336886] bg-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Buildings size={14} weight={isCondominiumScope ? 'fill' : 'bold'} />
                Agenda
              </button>
              <button
                type="button"
                onClick={onPedidosClick}
                className="jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-500 hover:text-[#336886] hover:bg-slate-100/70"
              >
                <Receipt size={14} weight="bold" />
                Pedidos
              </button>
              <button
                type="button"
                onClick={onDestinosClick}
                className="jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-500 hover:text-[#336886] hover:bg-slate-100/70"
              >
                <Mountains size={14} weight="bold" />
                Destinos
              </button>
            </nav>

            {/* Right side: Search Bar + Notifications + Profile */}
            <div className="flex items-center gap-3.5 flex-1 max-w-[440px] justify-end">
              {/* Desktop Search Bar */}
              <div
                className="jnc-hub-card relative flex items-center gap-2.5 hover:bg-white focus-within:bg-white px-3 py-1.5 rounded-[1.25rem] focus-within:ring-2 focus-within:ring-[#336886]/10 focus-within:border-[#336886]/25 transition-all duration-200 flex-1 max-w-[280px]"
                onClick={() => desktopSearchInputRef.current?.focus()}
              >
                <MagnifyingGlass size={15} weight="bold" className="text-[#336886] shrink-0" />
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
                    onBlur={() => onSearchEditingChange(false)}
                    placeholder={isSearchEditing ? 'Buscar no app' : ''}
                    enterKeyHint="search"
                    className="block w-full min-w-0 appearance-none bg-transparent font-bold text-slate-900 outline-none text-xs placeholder:text-slate-400 placeholder:font-semibold"
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
                    className="jnc-hub-touch inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X size={10} weight="bold" />
                  </button>
                ) : null}
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onHubNotificationClick}
                className="jnc-hub-touch jnc-hub-pill relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[0.85rem] text-[#153A4C] hover:bg-slate-50 p-1.5"
                title={hubNotificationCount > 0 ? 'Pedidos em andamento' : 'Notificações'}
              >
                <BellRinging size={15} weight={hubNotificationCount > 0 ? 'fill' : 'bold'} />
                {hubNotificationCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white ring-1.5 ring-white">
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

          <HubFilterBar
            isNativePlatform={isNativePlatform}
            quickFilter={quickFilter}
            segmentFilter={segmentFilter}
            onQuickFilterChange={onQuickFilterChange}
            onOpenFilters={onOpenFilters}
            onScrollStoresIntoView={onScrollStoresIntoView}
          />
        </div>
      </div>
    </header>
  );
});
