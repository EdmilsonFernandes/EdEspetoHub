import React from 'react';
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Outlet />

      <nav
        className="fixed bottom-0 left-0 right-0 z-[70] border-t border-slate-200 bg-white/85 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegação do entregador"
      >
        <div className="max-w-xl mx-auto px-4 py-2 grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={[
                  'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                  active
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span className={active ? 'text-brand-primary' : 'text-slate-600'}>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

