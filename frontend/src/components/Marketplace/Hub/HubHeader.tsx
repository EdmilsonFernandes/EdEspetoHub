import { memo, type RefObject } from 'react';
import { BellRinging, CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
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
}: HubHeaderProps) {
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
          } relative overflow-hidden border border-white/88 bg-[linear-gradient(145deg,rgba(255,255,255,0.90)_0%,rgba(248,250,252,0.76)_56%,rgba(255,255,255,0.82)_100%)] shadow-[0_22px_54px_-38px_rgba(21,58,76,0.26)] ring-1 ring-slate-200/50 backdrop-blur-2xl`}
        >
          <div className="pointer-events-none absolute -left-12 -top-16 h-36 w-36 rounded-full bg-[#153A4C]/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-6 h-28 w-28 rounded-full bg-slate-200/40 blur-3xl" />

          <div className="relative flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <HeaderAvatarTrigger
                displayName={customerDisplayName}
                profileImageUrl={customerProfileImage}
                hasNotification={!isCustomerLogged}
                onClick={onOpenProfileDrawer}
              />
              <div className="min-w-0 flex-1 rounded-[1.35rem] border border-white/75 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_30px_-26px_rgba(15,23,42,0.34)] ring-1 ring-slate-950/5 backdrop-blur-sm">
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
                  className="inline-flex w-full min-w-0 items-center justify-between gap-2 text-left text-[14px] font-black text-slate-950 transition-colors duration-150 ease-out hover:text-[#336886] active:scale-[0.99]"
                  onClick={onToggleNearbyFilter}
                >
                  <span className="truncate">{displayLocationLabel}</span>
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#336886]">
                    <CaretDown size={13} weight="bold" />
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onHubNotificationClick}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/80 bg-white/76 text-[#153A4C] shadow-[0_14px_26px_-20px_rgba(21,58,76,0.38)] ring-1 ring-[#d7e7ef]/75 backdrop-blur-xl transition-all duration-150 ease-out hover:bg-white active:scale-95"
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
              className={`group relative isolate flex items-center gap-3 overflow-hidden border border-slate-200/80 bg-white px-3.5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-slate-300 focus-within:border-[#336886]/25 focus-within:shadow-[0_18px_40px_-24px_rgba(51,104,134,0.28)] focus-within:ring-2 focus-within:ring-[#336886]/10 ${
                isNativePlatform
                  ? 'min-h-[50px] rounded-[1.35rem] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.25)]'
                  : 'min-h-[54px] rounded-[1.55rem] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.28)]'
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
              <div className="relative min-w-0 flex-1">
                <input
                  {...inputAssistProps.search}
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onFocus={() => onSearchEditingChange(true)}
                  onBlur={() => onSearchEditingChange(false)}
                  placeholder={isSearchEditing ? 'Buscar loja, categoria ou produto' : searchPlaceholder}
                  enterKeyHint="search"
                  className={`block w-full min-w-0 appearance-none bg-transparent pr-1 font-semibold text-slate-950 outline-none transition-opacity duration-300 ${
                    searchPlaceholderVisible || isSearchEditing ? 'placeholder:opacity-100' : 'placeholder:opacity-0'
                  } placeholder:text-slate-400 placeholder:transition-opacity placeholder:duration-300 ${
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
              </div>
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange('');
                    onDebouncedQueryChange('');
                    onSearchEditingChange(false);
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 active:scale-95"
                  aria-label="Limpar busca"
                  title="Limpar"
                >
                  <X size={14} weight="bold" />
                </button>
              ) : null}
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
