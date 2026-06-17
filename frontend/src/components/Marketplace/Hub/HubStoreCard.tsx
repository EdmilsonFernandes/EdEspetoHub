import { Link } from 'react-router-dom';
import type { ComponentType, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Heart, Star, Storefront } from '@phosphor-icons/react';
import { getStoreAvatarUrl } from '../../../utils/storeAvatar';
import { prefetchRouteByPath } from '../../../utils/clientRoutePrefetch';
import { prefetchStorefrontData } from '../../../utils/storefrontPrefetch';

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: Math.min(i * 0.06, 0.48),
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const tapSpring = { whileTap: { scale: 0.97 }, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } };

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
  if (badgeKey === 'pickup') return 'bg-[#edf5fa] text-[#336886] ring-[#d7e7ef]';
  if (badgeKey === 'free_shipping' || badgeKey === 'delivery') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (badgeKey === 'outside') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (badgeKey === 'postal') return 'bg-violet-50 text-violet-700 ring-violet-100';
  if (badgeKey === 'highlight') return 'bg-rose-50 text-rose-600 ring-rose-100';
  return 'bg-slate-50 text-slate-500 ring-slate-100';
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
  const storeAvailable = store.isOpen && !isUnavailableForRegion;
  const deliveryIsFree = deliveryFeeLabel.toLowerCase() === 'grátis';
  const warmupStoreRoute = () => {
    prefetchRouteByPath(to);
    prefetchStorefrontData(store.slug);
  };

  if (selectedCondominium) {
    return (
      <motion.div
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        {...tapSpring}
        className="contents"
      >
      <Link
        to={to}
        state={state}
        onPointerEnter={warmupStoreRoute}
        onFocus={warmupStoreRoute}
        onTouchStart={warmupStoreRoute}
        className={`jnc-hub-touch jnc-hub-lift group overflow-hidden rounded-[1.45rem] ${
          store.isOpen
            ? 'jnc-hub-card md:hover:border-[#336886]/20'
            : 'border-slate-200/70 bg-slate-50/86 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.14)] grayscale-[25%] opacity-85 filter blur-[0.4px] hover:grayscale-0 hover:opacity-100 hover:blur-none transition-all duration-300'
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
            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
      </motion.div>
    );
  }

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      {...tapSpring}
      className="contents"
    >
    <Link
      to={to}
      state={state}
      onPointerEnter={warmupStoreRoute}
      onFocus={warmupStoreRoute}
      onTouchStart={warmupStoreRoute}
      className={`jnc-hub-touch group grid grid-cols-[4.85rem_minmax(0,1fr)_2rem] items-center gap-3.5 rounded-[1.35rem] border px-2.5 py-2.5 transition-all ${
        storeAvailable
          ? 'border-white/80 bg-white/95 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.34)] ring-1 ring-slate-100/70 md:hover:-translate-y-0.5 md:hover:border-[#336886]/14 md:hover:bg-white md:hover:shadow-[0_24px_52px_-38px_rgba(15,23,42,0.42)]'
          : 'border-slate-100/80 bg-white/72 shadow-[0_14px_32px_-30px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/45 grayscale-[14%] opacity-85 filter blur-[0.15px] hover:grayscale-0 hover:opacity-100 hover:blur-none'
      }`}
    >
      <div className="relative h-[4.55rem] w-[4.55rem] shrink-0 overflow-hidden rounded-[1.08rem] bg-white shadow-[0_16px_32px_-28px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/70">
        <img
          src={store.logo}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${storeAvailable ? '' : 'grayscale opacity-55'}`}
          onError={(event) => {
            (event.target as HTMLImageElement).src = getStoreAvatarUrl(store.slug, store.name);
          }}
        />
        {!store.isOpen || isUnavailableForRegion ? <div className="absolute inset-0 bg-white/35" /> : null}
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className={`min-w-0 truncate text-[14.8px] font-black leading-5 tracking-[-0.035em] ${storeAvailable ? 'text-slate-950' : 'text-slate-500'}`}>
            {store.name}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold leading-4 text-slate-500 tabular-nums">
          {store.rating > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Star size={11} weight="fill" className="text-amber-400" />
              <span className="font-black text-slate-700">{ratingLabel}</span>
            </span>
          ) : null}
          {store.rating > 0 ? <span className="text-slate-200">·</span> : null}
          <span className={`inline-flex items-center gap-1 ${storeAvailable ? 'text-emerald-700' : isUnavailableForRegion ? 'text-slate-500' : 'text-rose-600'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${storeAvailable ? 'bg-emerald-500 animate-pulse' : isUnavailableForRegion ? 'bg-slate-400' : 'bg-rose-500'}`} />
            {isUnavailableForRegion ? 'Fora da entrega' : store.isOpen ? 'Aberto' : 'Fechado'}
          </span>
          <span className="text-slate-200">·</span>
          <span>{store.etaMin}–{store.etaMax} min</span>
          <span className="text-slate-200">·</span>
          <span>{resolvedDistanceLabel}</span>
          <span className="text-slate-200">·</span>
          <span className={deliveryIsFree ? 'font-black text-emerald-700' : ''}>{deliveryFeeLabel}</span>
        </div>
        {store.isOpen && serviceBadges.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {serviceBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <span
                  key={`${store.id}-${badge.key}`}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-black leading-none ring-1 ${getCompactBadgeClass(badge.key)} ${badge.key === 'open_now' ? 'animate-pulse' : ''}`}
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
    </motion.div>
  );
}
