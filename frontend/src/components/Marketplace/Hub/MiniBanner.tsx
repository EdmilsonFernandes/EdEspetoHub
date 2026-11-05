import React from 'react';
import { Compass, Check, MapPin } from '@phosphor-icons/react';

interface MiniBannerProps {
  title: string;
  state?: string;
  count?: number;
  selected?: boolean;
  bannerUrl?: string;
  onClick: () => void;
}

export const MiniBanner: React.FC<MiniBannerProps> = ({
  title,
  state,
  count,
  selected = false,
  bannerUrl,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200 active:scale-97 ${
        selected
          ? 'border-emerald-600 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white shadow-sm ring-2 ring-emerald-500/30'
          : 'border-slate-200/90 bg-white hover:border-emerald-300 hover:bg-slate-50/80 shadow-2xs'
      }`}
      style={{ minWidth: '175px', maxWidth: '220px' }}
    >
      {/* Visual Badge / Icon / Mini Image */}
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-transform duration-200 group-hover:scale-105 ${
          selected
            ? 'bg-emerald-600 text-white shadow-inner shadow-emerald-700/20'
            : 'bg-emerald-100/70 text-emerald-800'
        }`}
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Compass
            size={20}
            weight={selected ? 'fill' : 'duotone'}
            className={selected ? 'text-white' : 'text-emerald-700'}
          />
        )}
        {selected && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs">
            <Check size={10} weight="bold" />
          </span>
        )}
      </div>

      {/* Info column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate text-xs font-bold leading-tight ${
            selected ? 'text-emerald-950 font-black' : 'text-slate-800'
          }`}
        >
          {title}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
          {state && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">
              <MapPin size={10} weight="bold" />
              {state}
            </span>
          )}
          {typeof count === 'number' && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                selected
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {count} {count === 1 ? 'local' : 'locais'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
