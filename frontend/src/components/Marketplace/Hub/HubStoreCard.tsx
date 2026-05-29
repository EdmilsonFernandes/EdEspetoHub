import { Link } from 'react-router-dom';
import type { ComponentType, MouseEvent } from 'react';
import { Heart, Star, Storefront } from '@phosphor-icons/react';
import { getStoreAvatarUrl } from '../../../utils/storeAvatar';
import { prefetchRouteByPath } from '../../../utils/clientRoutePrefetch';

type BadgeIcon = ComponentType<{ size?: number; weight?: any; className?: string }>;

export type HubStoreServiceBadge = {
  key: string;
  label: string;
  icon?: BadgeIcon;
};

export type HubStoreCardStore = {
  id: string;
  slug: string;
  name: string;
  logo: string;
  banner: string;
  isOpen: boolean;
  rating: number;
  etaMin: number;
  etaMax: number;
  supportsDelivery: boolean;
  freeShipping: boolean;
  nextOpeningLabel?: string | null;
  isOutOfRegion?: boolean;
  deliveryStatusLabel?: string | null;
};

type HubStoreCardProps = {
  store: HubStoreCardStore;
  to: string;
  state?: unknown;
  index: number;
  selectedCondominium: boolean;
  isFavorite: boolean;
  isCondominiumEventLive: boolean;
  hasUpcomingCondominiumEvent: boolean;
  condominiumEventTimeLabel?: string;
  serviceBadges: HubStoreServiceBadge[];
  deliveryFeeLabel: string;
  resolvedDistanceLabel: string;
  ratingLabel: string;
  onToggleFavorite: (slug: string) => void;
};

const getCompactBadgeClass = (badgeKey: string) => {
  if (badgeKey === 'pickup') return 'border-[#d7e7ef] bg-[#edf5fa] text-[#336886]';
  if (badgeKey === 'free_shipping' || badgeKey === 'delivery') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (badgeKey === 'outside') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (badgeKey === 'postal') return 'border-violet-100 bg-violet-50 text-violet-700';
  if (badgeKey === 'highlight') return 'border-rose-100 bg-rose-50 text-rose-600';
  return 'border-slate-100 bg-slate-50 text-slate-500';
};

export function HubStoreCard({
  store,
  to,
  state,
  index,
  selectedCondominium,
  isFavorite,
  isCondominiumEventLive,
  hasUpcomingCondominiumEvent,
  condominiumEventTimeLabel,
  serviceBadges,
  deliveryFeeLabel,
  resolvedDistanceLabel,
  ratingLabel,
  onToggleFavorite,
}: HubStoreCardProps) {
  const toggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(store.slug);
  };
  const isUnavailableForRegion = Boolean(store.isOutOfRegion);
  const warmupStoreRoute = () => prefetchRouteByPath(to);

  if (selectedCondominium) {
    return (
      <Link
        to={to}
        state={state}
        onPointerEnter={warmupStoreRoute}
        onFocus={warmupStoreRoute}
        onTouchStart={warmupStoreRoute}
        style={{ animationDelay: `${index * 50}ms` }}
        className={`jnc-hub-touch jnc-hub-lift group overflow-hidden rounded-[1.45rem] animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards ${
          store.isOpen
            ? 'jnc-hub-card md:hover:border-[#336886]/20'
            : 'border-slate-200/80 bg-slate-50/90 shadow-[0_8px_20px_rgba(15,23,42,0.04)] grayscale-[25%] opacity-85 filter blur-[0.4px] hover:grayscale-0 hover:opacity-100 hover:blur-none transition-all duration-300'
        }`}
      >
        <div className="relative">
          <div className="relative h-[56px] overflow-hidden rounded-t-[1.45rem] bg-slate-100">
            <img
              src={store.banner || store.logo}
              alt={store.name}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${store.isOpen ? '' : 'grayscale opacity-70'}`}
              onError={(event) => {
                (event.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name);
              }}
            />
            <div className={`absolute inset-0 ${store.isOpen ? 'bg-gradient-to-t from-black/38 via-black/5 to-transparent' : 'bg-gradient-to-t from-black/20 via-transparent to-transparent'}`} />
            <span
              className={`jnc-hub-glass-badge absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${
                isCondominiumEventLive ? 'bg-white/92 text-emerald-700' : 'bg-white/92 text-[#336886]'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isCondominiumEventLive ? 'animate-pulse bg-emerald-500' : 'bg-[#336886]'}`} />
              {isCondominiumEventLive ? 'Ao vivo' : hasUpcomingCondominiumEvent ? 'Agendado' : 'Prévia'}
            </span>
            <button
              type="button"
              onClick={toggleFavorite}
              className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.8] ${
                isFavorite
                  ? 'scale-[1.06] bg-rose-500 text-white shadow-[0_4px_18px_-4px_rgba(244,63,94,0.72)]'
                  : 'border border-white/20 bg-black/28 text-white backdrop-blur-md hover:scale-[1.1] hover:bg-black/42'
              }`}
              aria-label={`Favoritar ${store.name}`}
            >
              <Heart size={12} weight={isFavorite ? 'fill' : 'regular'} className={isFavorite ? 'animate-pop' : 'transition-transform duration-200 hover:scale-110'} />
            </button>
          </div>
        </div>
        <div className="px-3 pb-3 pt-3">
          <div className="flex min-w-0 items-start gap-2">
            <img
              src={store.logo}
              alt=""
              loading="lazy"
              decoding="async"
              className={`h-8 w-8 shrink-0 rounded-[0.65rem] bg-slate-50 object-cover ring-1 ring-slate-200/70 ${store.isOpen ? '' : 'grayscale opacity-60'}`}
              onError={(event) => {
                (event.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name);
              }}
            />
            <h3 className={`min-h-[2rem] min-w-0 flex-1 line-clamp-2 text-[13px] font-black leading-4 [overflow-wrap:anywhere] ${store.isOpen ? 'text-slate-950' : 'text-slate-500'}`}>
              {store.name}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-bold text-slate-500">
            {store.rating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star size={10} weight="fill" className="text-amber-400" />
                <span className="text-slate-700">{store.rating.toFixed(1)}</span>
              </span>
            ) : null}
            {store.rating > 0 ? <span className="text-slate-300">•</span> : null}
            <span>{store.etaMin}-{store.etaMax} min</span>
          </div>
          {!isCondominiumEventLive ? (
            <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#336886]">
              {hasUpcomingCondominiumEvent ? condominiumEventTimeLabel || 'Próxima feira' : 'Agenda em confirmação'}
            </p>
          ) : !store.isOpen ? (
            <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
              {store.nextOpeningLabel || 'Sem horário cadastrado'}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700">
                <Storefront size={10} weight="fill" />
                Retirada
              </span>
              {store.supportsDelivery && store.freeShipping ? (
                <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#336886]">
                  Grátis
                </span>
              ) : null}
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      state={state}
      onPointerEnter={warmupStoreRoute}
      onFocus={warmupStoreRoute}
      onTouchStart={warmupStoreRoute}
      style={{ animationDelay: `${index * 36}ms` }}
        className={`jnc-hub-touch jnc-hub-lift group grid grid-cols-[4.8rem_minmax(0,1fr)_2.05rem] items-center gap-3.5 rounded-[1.45rem] px-2.5 py-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards ${
        store.isOpen && !isUnavailableForRegion
          ? 'jnc-hub-surface-soft md:hover:bg-white md:hover:border-[#336886]/20'
          : 'border-slate-100/80 bg-slate-50/72 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/35 grayscale-[18%] opacity-85 filter blur-[0.25px] hover:grayscale-0 hover:opacity-100 hover:blur-none transition-all duration-300'
      }`}
    >
      <div className="relative h-[4.45rem] w-[4.45rem] shrink-0 overflow-hidden rounded-[1.28rem] bg-white shadow-[0_16px_28px_-24px_rgba(15,23,42,0.46)] ring-1 ring-slate-200/70">
        <img
          src={store.logo}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${store.isOpen && !isUnavailableForRegion ? '' : 'grayscale opacity-55'}`}
          onError={(event) => {
            (event.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name);
          }}
        />
        {!store.isOpen || isUnavailableForRegion ? <div className="absolute inset-0 bg-white/35" /> : null}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${store.isOpen && !isUnavailableForRegion ? 'bg-emerald-500' : isUnavailableForRegion ? 'bg-slate-400' : 'bg-rose-500'}`}
            style={{
              boxShadow: store.isOpen && !isUnavailableForRegion ? '0 0 8px rgba(16,185,129,0.42)' : '0 0 8px rgba(100,116,139,0.28)',
            }}
          />
          <h3 className={`min-w-0 truncate text-[14.5px] font-black leading-5 tracking-[-0.02em] ${store.isOpen && !isUnavailableForRegion ? 'text-slate-950' : 'text-slate-500'}`}>
            {store.name}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold text-slate-500">
          {store.rating > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Star size={11} weight="fill" className="text-amber-400" />
              <span className="font-black text-slate-700">{ratingLabel}</span>
            </span>
          ) : null}
          {store.rating > 0 ? <span className="text-slate-200">·</span> : null}
          <span className={store.isOpen && !isUnavailableForRegion ? 'text-emerald-700' : isUnavailableForRegion ? 'text-slate-500' : 'text-rose-600'}>
            {isUnavailableForRegion ? 'Fora da entrega' : store.isOpen ? 'Aberto' : 'Fechado'}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold text-slate-500">
          <span>{store.etaMin}–{store.etaMax} min</span>
          <span className="text-slate-200">·</span>
          <span>{resolvedDistanceLabel}</span>
          <span className="text-slate-200">·</span>
          <span>{deliveryFeeLabel}</span>
        </div>
        {store.isOpen && serviceBadges.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {serviceBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <span
                  key={`${store.id}-${badge.key}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8.5px] font-black uppercase tracking-[0.08em] ${getCompactBadgeClass(badge.key)} ${badge.key === 'open_now' ? 'animate-pulse' : ''}`}
                >
                  {Icon ? <Icon size={9} weight="duotone" /> : null}
                  {badge.label}
                </span>
              );
            })}
          </div>
        ) : null}
        {!store.isOpen || isUnavailableForRegion ? (
          <p className="mt-2 text-[10.5px] font-bold text-slate-400">
            {isUnavailableForRegion ? store.deliveryStatusLabel || 'Entrega fora da área' : store.nextOpeningLabel || 'Sem horário cadastrado'}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={toggleFavorite}
        className={`jnc-hub-touch inline-flex h-9 w-9 items-center justify-center rounded-full ${
          isFavorite
            ? 'bg-rose-50 text-rose-500 shadow-[0_10px_24px_-18px_rgba(244,63,94,0.58)] ring-1 ring-rose-100'
            : 'bg-transparent text-slate-400 hover:bg-white/80 hover:text-rose-400 hover:shadow-[0_10px_22px_-20px_rgba(15,23,42,0.28)]'
        }`}
        aria-label={`Favoritar ${store.name}`}
      >
        <Heart size={17} weight={isFavorite ? 'fill' : 'regular'} className={isFavorite ? 'animate-pop' : 'transition-transform duration-200 hover:scale-110'} />
      </button>
    </Link>
  );
}
