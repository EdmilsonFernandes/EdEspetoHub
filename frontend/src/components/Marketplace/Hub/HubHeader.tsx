import { memo, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BellRinging, CaretDown, MagnifyingGlass, X, House, Receipt, MapTrifold, Tent, Sun, Moon, SunHorizon } from '@phosphor-icons/react';
import { HeaderAvatarTrigger } from '../HeaderAvatarTrigger';
import { inputAssistProps } from '../../../utils/inputAssist';
import { HubFilterBar, type HubQuickFilterKey } from './HubFilters';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

const timeConfig: Record<TimeOfDay, { icon: typeof Sun; color: string; bg: string; glow: string }> = {
  morning: { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.3)]' },
  afternoon: { icon: SunHorizon, color: 'text-orange-500', bg: 'bg-orange-50', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]' },
  evening: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-50', glow: 'shadow-[0_0_12px_rgba(129,140,248,0.3)]' },
};

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
  timeOfDay,
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
          } relative overflow-hidden bg-white/[0.07] border border-white/[0.06]`}
        >
          <div className="pointer-events-none absolute -left-12 -top-16 h-36 w-36 rounded-full bg-[#5FD35A]/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-6 h-28 w-28 rounded-full bg-[#336886]/20 blur-3xl" />

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
                <div className="min-w-0 flex-1 rounded-[1.35rem] px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    {timeOfDay && (() => {
                      const cfg = timeConfig[timeOfDay];
                      const TimeIcon = cfg.icon;
                      return (
                        <motion.span
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
                          className={`inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${cfg.bg} ${cfg.glow}`}
                        >
                          <TimeIcon size={10} weight="fill" className={cfg.color} />
                        </motion.span>
                      );
                    })()}
                    <img
                      src="/janocaminho.jpg"
                      alt="Já no Caminho"
                      className="h-4 w-4 shrink-0 rounded-[0.4rem] object-cover shadow-[0_2px_6px_-2px_rgba(21,58,76,0.3)]"
                    />
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-white/55">
                      {hubHeaderEyebrow}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="jnc-hub-touch inline-flex w-full min-w-0 items-center justify-between gap-2 text-left text-[14px] font-black text-white hover:text-white/80"
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
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.10] text-white">
                      <CaretDown size={13} weight="bold" />
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onHubNotificationClick}
                className="jnc-hub-touch jnc-hub-pill relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] text-white hover:bg-white/[0.08]"
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
                className={`group relative isolate flex items-center gap-3 overflow-hidden px-3.5 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:border-white/20 focus-within:-translate-y-0.5 focus-within:border-[#5FD35A]/25 focus-within:shadow-[0_22px_54px_-34px_rgba(95,211,90,0.28)] focus-within:ring-2 focus-within:ring-[#5FD35A]/15 ${
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
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/10 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
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
                    className={`block w-full min-w-0 appearance-none bg-transparent pr-1 font-semibold text-white outline-none transition-opacity duration-300 ${
                      isNativePlatform ? 'min-h-[48px] text-[15px]' : 'min-h-[52px] text-[14px]'
                    }`}
                    style={{
                      WebkitAppearance: 'none',
                      caretColor: '#5FD35A',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      WebkitTextFillColor: 'inherit',
                      color: '#ffffff',
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
                      <span className="font-semibold text-white/50 truncate">
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
                    className="jnc-hub-touch inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
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
                  className="h-9 w-9 rounded-xl object-cover shadow-[0_4px_12px_rgba(15,23,42,0.15)] ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-300"
                />
                <span className="text-[15px] font-black tracking-tight text-white">
                  Já no Caminho
                </span>
              </Link>
              
              <div className="h-5 w-px bg-white/20" />
              
              {/* Location Badge */}
              <button
                type="button"
                onClick={onToggleNearbyFilter}
                className="jnc-hub-touch jnc-hub-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:border-white/20"
              >
                {quickFilter === 'nearby' ? (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  </span>
                ) : (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white/30" />
                  </span>
                )}
                <span className="truncate max-w-[160px]" title={displayLocationLabel}>
                  {displayLocationLabel}
                </span>
                <CaretDown size={11} weight="bold" className="text-white/60" />
              </button>
            </div>

            {/* Middle: Navigation Links */}
            <nav className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em]">
              <button
                type="button"
                onClick={onHomeClick}
                className={`jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white/10 ${
                  !isCondominiumScope
                    ? 'text-white bg-white/12 font-black'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <House size={14} weight={!isCondominiumScope ? 'fill' : 'bold'} />
                Início
              </button>
              <button
                type="button"
                onClick={onAgendaClick}
                className={`jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white/10 ${
                  isCondominiumScope
                    ? 'text-white bg-white/12 font-black'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Tent size={14} weight={isCondominiumScope ? 'fill' : 'bold'} />
                Feiras
              </button>
              <button
                type="button"
                onClick={onPedidosClick}
                className="jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white/50 hover:text-white hover:bg-white/10"
              >
                <Receipt size={14} weight="bold" />
                Pedidos
              </button>
              <button
                type="button"
                onClick={onDestinosClick}
                className="jnc-hub-touch px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white/50 hover:text-white hover:bg-white/10"
              >
                <MapTrifold size={14} weight="bold" />
                Visite
              </button>
            </nav>

            {/* Right side: Search Bar + Notifications + Profile */}
            <div className="flex items-center gap-3.5 flex-1 max-w-[440px] justify-end">
              {/* Desktop Search Bar */}
              <div
                className="jnc-hub-card relative flex max-w-[280px] flex-1 items-center gap-2.5 overflow-hidden rounded-[1.25rem] px-3 py-1.5 transition-all duration-300 hover:bg-white/12 focus-within:-translate-y-0.5 focus-within:border-[#5FD35A]/25 focus-within:bg-white/15 focus-within:shadow-[0_18px_42px_-30px_rgba(95,211,90,0.24)] focus-within:ring-2 focus-within:ring-[#5FD35A]/15"
                onClick={() => desktopSearchInputRef.current?.focus()}
              >
                <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <MagnifyingGlass size={15} weight="bold" className="text-white/60 shrink-0" />
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
                    className="block w-full min-w-0 appearance-none bg-transparent font-bold text-white outline-none text-xs placeholder:text-white/40 placeholder:font-semibold"
                  />
                  {!isSearchEditing && !query && (
                    <div
                      className={`pointer-events-none absolute left-0 flex items-center transition-all duration-300 ${
                        searchPlaceholderVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      }`}
                    >
                      <span className="font-bold text-white/40 text-xs truncate">
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
                    className="jnc-hub-touch inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
                  >
                    <X size={10} weight="bold" />
                  </button>
                ) : null}
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onHubNotificationClick}
                className="jnc-hub-touch jnc-hub-pill relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[0.85rem] text-white hover:bg-white/10 p-1.5"
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
