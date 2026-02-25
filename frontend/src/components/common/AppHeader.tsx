// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { DotsThreeVertical, X } from '@phosphor-icons/react';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

type HeaderAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  tone?: 'primary' | 'ghost' | 'danger';
};

type AppHeaderProps = {
  variant?: 'admin' | 'store' | 'operations';
  storeName: string;
  storeLogo?: string;
  status?: string;
  city?: string;
  segment?: string;
  plan?: string;
  userName?: string;
  role?: string;
  subtitle?: string;
  bannerUrl?: string;
  actions?: HeaderAction[];
};

const getActionToneClass = (variant: 'admin' | 'store' | 'operations', tone: 'primary' | 'ghost' | 'danger') => {
  if (variant === 'operations') {
    if (tone === 'primary') return 'border-sky-400/50 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30';
    if (tone === 'danger') return 'border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25';
    return 'border-slate-600 bg-slate-800/90 text-slate-100 hover:bg-slate-700';
  }
  if (tone === 'primary') return 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800';
  if (tone === 'danger') return 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100';
  return 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
};

const variantShell = {
  admin: 'border-slate-200 bg-white shadow-[0_20px_48px_-34px_rgba(15,23,42,0.36)]',
  store: 'border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)]',
  operations: 'border-slate-700 bg-slate-900 text-white shadow-[0_20px_48px_-30px_rgba(2,6,23,0.66)]',
};

export function AppHeader({
  variant = 'admin',
  storeName,
  storeLogo,
  status,
  city,
  segment,
  plan,
  userName,
  role,
  subtitle,
  bannerUrl,
  actions = [],
}: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const resolvedLogo = resolveAssetUrl(storeLogo || '');
  const resolvedBanner = resolveAssetUrl(bannerUrl || '');
  const baseTextClass = variant === 'operations' ? 'text-white' : 'text-slate-900';
  const mutedTextClass = variant === 'operations' ? 'text-slate-200' : 'text-slate-500';
  const badges = useMemo(
    () =>
      [
        status ? { id: 'status', label: status } : null,
        segment ? { id: 'segment', label: segment } : null,
        city ? { id: 'city', label: city } : null,
      ].filter(Boolean),
    [status, segment, city]
  );
  const initials = String(storeName || 'JC')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <header className={`relative overflow-hidden rounded-2xl border ${variantShell[variant]}`}>
      {resolvedBanner ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${resolvedBanner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}
      <div className={`relative max-w-full px-3 sm:px-4 lg:px-5 ${variant === 'operations' ? 'py-3 sm:py-3.5' : 'py-3 sm:py-4'}`}>
        <div className="flex items-center gap-3 min-h-[44px]">
          <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-200/70 bg-white/90 overflow-hidden flex items-center justify-center">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={storeName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black text-slate-800">{initials || 'JC'}</span>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className={`text-base sm:text-lg font-black leading-tight truncate ${baseTextClass}`}>{storeName || 'Minha loja'}</h1>
            {subtitle ? <p className={`text-xs truncate mt-0.5 ${mutedTextClass}`}>{subtitle}</p> : null}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {plan ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                variant === 'operations'
                  ? 'border-slate-500 bg-slate-800 text-slate-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}>
                {plan}
              </span>
            ) : null}
            {actions.map((action) =>
              action.href ? (
                <a
                    key={action.id}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                    getActionToneClass(variant, action.tone || 'ghost')
                  }`}
                >
                  {action.icon}
                  {action.label}
                </a>
              ) : (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                    getActionToneClass(variant, action.tone || 'ghost')
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              )
            )}
            {userName ? (
              <span className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs ${
                variant === 'operations'
                  ? 'border-slate-600 bg-slate-800 text-slate-100'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <span className="h-7 w-7 rounded-lg bg-slate-900 text-white grid place-items-center text-[10px] font-bold">
                  {String(userName).slice(0, 2).toUpperCase()}
                </span>
                <span className="leading-tight">
                  <span className="block font-semibold">{userName}</span>
                  {role ? <span className="block text-[10px] opacity-75">{role}</span> : null}
                </span>
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border ${
              variant === 'operations'
                ? 'border-slate-600 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            aria-label="Abrir ações"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>
        </div>

        {badges.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {badges.map((badge: any) => (
              <span
                key={badge.id}
                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  variant === 'operations'
                    ? 'border-slate-600 bg-slate-800 text-slate-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[200]">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-slate-200 bg-white max-h-[76vh] overflow-y-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Ações</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
                aria-label="Fechar ações"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="p-4 space-y-2.5">
              {plan ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  Plano: {plan}
                </div>
              ) : null}
              {actions.map((action) =>
                action.href ? (
                  <a
                    key={`m-${action.id}`}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
                      getActionToneClass(variant, action.tone || 'ghost')
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </a>
                ) : (
                  <button
                    key={`m-${action.id}`}
                    type="button"
                    onClick={() => {
                      action.onClick?.();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
                      getActionToneClass(variant, action.tone || 'ghost')
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                )
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
