// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { SignOut, Browsers, BookOpen, ChefHat } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscriptionService } from '../../services/subscriptionService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

type Props = {
  contextLabel?: string;
  onToggleHeader?: () => void;
};

const segmentLabelMap: Record<string, string> = {
  restaurante: 'Restaurante',
  hamburgueria: 'Hamburgueria',
  lanchonete: 'Lanchonete',
  pizzaria: 'Pizzaria',
  adega: 'Adega',
  mercado: 'Mercado',
  hortifruti: 'Hortifruti',
  farmacia: 'Farmácia',
  confeitaria: 'Confeitaria',
  outros: 'Comércio',
};

export function AdminHeader({ contextLabel = 'Painel da Loja', onToggleHeader }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [planLabel, setPlanLabel] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const storeSlug = auth?.store?.slug;
  const storeName = auth?.store?.name || 'Minha loja';
  const storeLogo = resolveAssetUrl(auth?.store?.settings?.logoUrl || auth?.store?.logoUrl || '');
  const storeBanner = resolveAssetUrl(auth?.store?.settings?.bannerUrl || '');
  const userName = auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Admin';
  const role = auth?.user?.role || 'ADMIN';
  const segment = segmentLabelMap[String(auth?.store?.settings?.segment || 'outros').toLowerCase()] || 'Comércio';
  const city = [auth?.store?.settings?.city, String(auth?.store?.settings?.state || '').toUpperCase()].filter(Boolean).join(' • ');

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    subscriptionService
      .getByStore(storeId)
      .then((subscription) => {
        if (subscription?.planExempt) {
          setPlanLabel('VIP');
          return;
        }
        const rawName = subscription?.plan?.displayName || subscription?.plan?.name || '';
        const cycle = subscription?.plan?.durationDays >= 360 ? 'Anual' : 'Mensal';
        setPlanLabel(rawName ? `${rawName} · ${cycle}` : '');
      })
      .catch(() => setPlanLabel(''));
  }, [auth?.store?.id]);

  const badges = useMemo(
    () =>
      [segment ? { id: 'segment', label: segment } : null, city ? { id: 'city', label: city } : null].filter(Boolean),
    [segment, city]
  );

  const actions = useMemo(
    () =>
      [
        {
          id: 'dashboard',
          label: 'Painel',
          icon: <Browsers size={14} weight="duotone" />,
          onClick: () => navigate('/admin/dashboard'),
        },
        storeSlug
          ? {
              id: 'store',
              label: 'Vitrine',
              icon: <BookOpen size={14} weight="duotone" />,
              onClick: () => navigate(`/${storeSlug}`),
            }
          : null,
        {
          id: 'queue',
          label: 'Operação',
          icon: <ChefHat size={14} weight="duotone" />,
          onClick: () => navigate('/admin/queue'),
        },
        onToggleHeader
          ? {
              id: 'focus',
              label: 'Modo foco',
              onClick: () => window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } })),
            }
          : null,
      ].filter(Boolean),
    [navigate, storeSlug, onToggleHeader]
  );

  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_-34px_rgba(15,23,42,0.36)]">
      {storeBanner ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: `url(${storeBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ) : null}
      <div className="relative px-3 sm:px-4 lg:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-3 min-h-[44px]">
          <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-200/70 bg-white/90 overflow-hidden flex items-center justify-center">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black text-slate-800">JC</span>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-base sm:text-lg font-black leading-tight truncate text-slate-900">{storeName}</h1>
            <p className="text-xs truncate mt-0.5 text-slate-500">{contextLabel}</p>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {planLabel ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border border-slate-200 bg-slate-50 text-slate-700">
                {planLabel}
              </span>
            ) : null}
            {actions.map((action: any) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/admin');
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <SignOut size={14} weight="duotone" />
              Sair
            </button>
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700">
              <span className="h-7 w-7 rounded-lg bg-slate-900 text-white grid place-items-center text-[10px] font-bold">
                {String(userName).slice(0, 2).toUpperCase()}
              </span>
              <span className="leading-tight">
                <span className="block font-semibold">{userName}</span>
                {role ? <span className="block text-[10px] opacity-75">{role}</span> : null}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden inline-flex h-11 px-3 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold"
            aria-label="Abrir ações"
          >
            Menu
          </button>
        </div>

        {badges.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {badges.map((badge: any) => (
              <span
                key={badge.id}
                className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
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
                className="inline-flex h-9 px-3 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
            <div className="p-4 space-y-2.5">
              {planLabel ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  Plano: {planLabel}
                </div>
              ) : null}
              {actions.map((action: any) => (
                <button
                  key={`m-${action.id}`}
                  type="button"
                  onClick={() => {
                    action.onClick?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700"
              >
                <SignOut size={16} weight="duotone" />
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
