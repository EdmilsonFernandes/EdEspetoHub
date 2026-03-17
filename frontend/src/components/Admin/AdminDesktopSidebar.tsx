// @ts-nocheck
import React from 'react';
import { CaretLeft, CaretRight, SignOut } from '@phosphor-icons/react';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  disabled?: boolean;
  badge?: string | number;
  tone?: 'violet' | 'amber' | 'default';
}

interface AdminDesktopSidebarProps {
  items: SidebarItem[];
  activeId: string;
  compact: boolean;
  onToggleCompact: () => void;
  onSelect: (id: string) => void;
  onLogout: () => void;
}

export function AdminDesktopSidebar({
  items,
  activeId,
  compact,
  onToggleCompact,
  onSelect,
  onLogout,
}: AdminDesktopSidebarProps) {
  return (
    <aside
      className={`hidden lg:block sticky top-0 self-start h-[100dvh] z-[50] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        compact ? 'w-[80px]' : 'w-[260px]'
      }`}
    >
      <div className="h-full border-r border-slate-800 bg-slate-950 overflow-hidden flex flex-col rounded-none shadow-none">
        <div className={`px-3 pt-3 pb-2 flex items-center shrink-0 ${compact ? 'justify-center' : 'justify-between'}`}>
          {!compact && <p className="px-2 ds-admin-sidebar-title">Navegação</p>}
          <button
            type="button"
            onClick={onToggleCompact}
            className="ds-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20 transition"
            aria-label={compact ? 'Expandir menu' : 'Minimizar menu'}
            title={compact ? 'Expandir menu' : 'Minimizar menu'}
          >
            {compact ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
          </button>
        </div>

        <div className="space-y-1.5 min-h-0 flex-1 overflow-y-auto overflow-x-visible px-2 pb-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            const isDisabled = Boolean(item.disabled);
            const compactBadgeTone =
              item.tone === 'violet'
                ? 'bg-violet-600'
                : item.tone === 'amber'
                ? 'bg-amber-500'
                : 'bg-slate-500';
            const defaultBadgeTone =
              item.tone === 'violet'
                ? 'bg-violet-100 text-violet-700'
                : item.tone === 'amber'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-label={item.label}
                title={isDisabled ? 'Disponível no plano Pro · clique para upgrade' : undefined}
                className={`group relative ds-admin-sidebar-item ds-focus-ring flex items-center ${
                  compact ? 'justify-center px-0' : 'justify-between gap-2'
                } ${isActive ? 'ds-admin-sidebar-item-active' : ''} ${
                  isDisabled ? 'opacity-80 cursor-pointer border border-violet-300/50 bg-violet-500/10 hover:bg-violet-500/20' : ''
                }`}
              >
                <span className={`inline-flex items-center ${compact ? '' : 'gap-2'}`}>
                  <Icon size={16} weight={isActive ? 'fill' : 'duotone'} />
                  {!compact && item.label}
                </span>

                {!compact && item.badge !== undefined && item.badge !== null && String(item.badge) !== '' && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : defaultBadgeTone}`}>
                    {item.badge}
                  </span>
                )}

                {compact && item.badge !== undefined && item.badge !== null && String(item.badge) !== '' && (
                  <span className={`absolute -top-1 -right-1 rounded-full ${compactBadgeTone} text-white text-[9px] font-semibold px-1.5 py-0.5`}>
                    {item.badge}
                  </span>
                )}

                {compact && (
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2 pt-2 px-2 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className={`group relative ds-admin-sidebar-item ds-focus-ring flex items-center ${
              compact ? 'justify-center px-0' : 'justify-between gap-2'
            } text-rose-700 hover:bg-rose-50`}
            aria-label="Sair da conta"
            title="Sair"
          >
            <span className={`inline-flex items-center ${compact ? '' : 'gap-2'}`}>
              <SignOut size={16} weight="bold" />
              {!compact && 'Sair'}
            </span>
            {compact && (
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                Sair
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
