// @ts-nocheck
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChartBar, ChefHat, Package, Users } from '@phosphor-icons/react';

export function AdminMobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || '';
  const dashboardTab = (location.state as any)?.activeTab || '';

  const items = [
    {
      id: 'monitor',
      label: 'Monitor',
      icon: ChefHat,
      active: path === '/admin/queue',
      onClick: () => navigate('/admin/queue'),
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: Package,
      active: path === '/admin/dashboard' && dashboardTab === 'produtos',
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'produtos' } }),
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      active: path === '/admin/dashboard' && dashboardTab === 'pedidos',
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'pedidos' } }),
    },
    {
      id: 'resumo',
      label: 'Resumo',
      icon: ChartBar,
      active: path === '/admin/dashboard' && (!dashboardTab || dashboardTab === 'resumo'),
      onClick: () => navigate('/admin/dashboard', { state: { activeTab: 'resumo' } }),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[260] border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[max(env(safe-area-inset-bottom),8px)] pt-2 px-2">
      <ul className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className={`w-full rounded-xl py-2 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition ${
                  item.active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} weight="duotone" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

