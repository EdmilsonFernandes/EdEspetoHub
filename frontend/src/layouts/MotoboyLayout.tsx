import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ClockCounterClockwise, ListChecks, UserCircle, NavigationArrow } from '@phosphor-icons/react';

type Tab = {
  to: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
};

export function MotoboyLayout() {
  const { pathname } = useLocation();
  const [installPrompt, setInstallPrompt] = useState<any | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  const tabs: Tab[] = [
    {
      to: '/motoboy/available',
      label: 'Fila',
      icon: <ListChecks size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/available'),
    },
    {
      to: '/motoboy/delivery',
      label: 'Entrega',
      icon: <NavigationArrow size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/delivery') || p.startsWith('/motoboy/current'),
    },
    {
      to: '/motoboy/history',
      label: 'Histórico',
      icon: <ClockCounterClockwise size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/history'),
    },
    {
      to: '/motoboy/profile',
      label: 'Perfil',
      icon: <UserCircle size={20} weight="duotone" />,
      match: (p) => p.startsWith('/motoboy/profile'),
    },
  ];

  useEffect(() => {
    const dismissed = localStorage.getItem('motoboy:pwa_dismissed') === '1';
    const handler = (e: any) => {
      try {
        e.preventDefault();
      } catch {}
      setInstallPrompt(e);
      if (!dismissed) setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return (
    <div className="min-h-screen motoboy-bg pb-28">
      <Outlet />

      {showInstall && installPrompt && (
        <div
          className="fixed left-0 right-0 z-[69] px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 98px)' }}
        >
          <div className="max-w-xl mx-auto premium-card-glass px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900">Instalar o app do Entregador</p>
              <p className="text-[11px] text-slate-600 truncate">Mais rápido, sem abas, igual aplicativo.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('motoboy:pwa_dismissed', '1');
                  setShowInstall(false);
                }}
                className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await installPrompt.prompt?.();
                    const choice = await installPrompt.userChoice;
                    if (choice?.outcome === 'accepted') {
                      localStorage.setItem('motoboy:pwa_dismissed', '1');
                    }
                  } catch {}
                  setShowInstall(false);
                }}
                className="btn-press rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-3 py-2 text-xs font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
              >
                Instalar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-[70] motoboy-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegação do entregador"
      >
        <div className="max-w-xl mx-auto px-4 py-2">
          <div className="motoboy-pill grid grid-cols-4 gap-1 p-1">
            {tabs.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={[
                    'motoboy-tab relative flex flex-col items-center justify-center gap-1 rounded-[999px] px-2 py-2 text-[11px] font-semibold',
                    active
                      ? 'bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_65%,#f59e0b))] text-white shadow-[0_18px_34px_-26px_rgba(239,68,68,0.8)]'
                      : 'text-slate-700 hover:bg-slate-100/80',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={active ? 'text-white' : 'text-slate-700'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
