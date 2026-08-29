import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, SignOut } from '@phosphor-icons/react';
import { PlatformTrustFooter } from '../common/PlatformTrustFooter';
import {
  getAdminNavGroup,
  groupAdminNavItems,
  isAdminNavGroupSection,
  type AdminNavGroupSection,
} from '../../navigation/adminNavigation';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  disabled?: boolean;
  badge?: string | number;
  tone?: 'violet' | 'amber' | 'default' | 'danger';
}

interface AdminDesktopSidebarProps {
  items: SidebarItem[];
  activeId: string;
  compact: boolean;
  onToggleCompact?: () => void;
  onSelect: (id: string) => void;
  onLogout: () => void;
}

export function AdminDesktopSidebar({
  items,
  activeId,
  compact,
  onSelect,
  onLogout,
}: AdminDesktopSidebarProps) {
  const [optimisticActiveId, setOptimisticActiveId] = useState('');
  const optimisticTimerRef = useRef<number | null>(null);
  const allItemIds = useMemo(() => new Set((items || []).map((item) => item.id)), [items]);
  const isGroupedMode = useMemo(
    () =>
      Boolean(items && items.length) &&
      (items.some((item) => item.id.startsWith('cfg-')) ||
        ['resumo', 'pedidos', 'vendas', 'produtos', 'estoque', 'config', 'avaliacoes', 'fila'].some((id) => allItemIds.has(id))),
    [items, allItemIds]
  );

  // Agrupamento da fonte única — antes era hard-coded aqui (cópia nº 6) e não
  // conhecia 'cupons' no grupo Crescer, que renderizava DEPOIS do botão Sair.
  const groupedSections = useMemo(() => groupAdminNavItems(items || []), [items]);

  const activeGroupId = useMemo(() => {
    const hit = groupedSections.find(
      (section): section is AdminNavGroupSection<SidebarItem> =>
        isAdminNavGroupSection(section) && section.children.some((child) => child.id === activeId)
    );
    return hit?.id || '';
  }, [groupedSections, activeId]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('adminSidebar:openGroups');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('adminSidebar:openGroups', JSON.stringify(openGroups || {}));
  }, [openGroups]);

  useEffect(() => {
    if (!optimisticActiveId) return;
    if (activeId === optimisticActiveId) setOptimisticActiveId('');
  }, [activeId, optimisticActiveId]);

  useEffect(() => {
    return () => {
      if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
    };
  }, []);

  const setOptimisticNav = (id: string) => {
    setOptimisticActiveId(id);
    if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
    optimisticTimerRef.current = window.setTimeout(() => setOptimisticActiveId(''), 800);
  };

  const renderNavItem = (item: SidebarItem, nested = false) => {
    const Icon = item.icon;
    const isActive = (optimisticActiveId || activeId) === item.id;
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
        onPointerDown={() => setOptimisticNav(item.id)}
        onClick={() => {
          setOptimisticNav(item.id);
          onSelect(item.id);
        }}
        aria-label={item.label}
        title={isDisabled ? 'Disponível no plano Pro · clique para upgrade' : undefined}
        className={`group relative ds-admin-sidebar-item ds-focus-ring flex items-center transition-all duration-200 ${
          compact ? 'justify-center px-0' : 'justify-between gap-2'
        } ${nested && !compact ? 'pl-4 pr-2.5 py-2.5 rounded-[1rem] text-[13px] font-bold text-slate-500 hover:text-slate-950' : ''} ${
          !nested && !compact ? 'font-semibold' : ''
        } ${isActive ? 'ds-admin-sidebar-item-active text-white font-medium pl-5' : ''} ${
          isDisabled ? 'opacity-80 cursor-pointer border border-violet-300/50 bg-violet-500/10 hover:bg-violet-500/20' : ''
        }`}
      >
        {isActive && !compact && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-in fade-in zoom-in-75 duration-200" />
        )}
        <span className={`inline-flex items-center min-w-0 ${compact ? '' : 'gap-2.5'} transition-transform duration-200 group-hover:translate-x-0.5`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-200 ${
            isActive
              ? 'bg-white/12 text-white'
              : 'border border-white/80 bg-[linear-gradient(135deg,rgba(239,246,255,1),rgba(236,253,245,0.88))] text-[#1b77ba] shadow-[0_12px_22px_-20px_rgba(15,23,42,0.25)] group-hover:scale-105 group-hover:shadow-[0_14px_24px_-18px_rgba(15,23,42,0.35)]'
          }`}>
            <Icon size={17} weight={isActive ? 'fill' : 'duotone'} />
          </span>
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
  };

  const renderLogoutItem = () => (
    <button
      key="logout"
      type="button"
      onClick={onLogout}
      className="group relative ds-admin-sidebar-item ds-focus-ring flex items-center justify-between gap-2 border-rose-100/70 bg-rose-50/58 text-rose-700 hover:border-rose-100 hover:bg-rose-50/82"
      aria-label="Sair da conta"
      title="Sair"
    >
      <span className="inline-flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/80 bg-rose-100/78 text-rose-500 shadow-[0_12px_22px_-20px_rgba(225,29,72,0.3)]">
          <SignOut size={17} weight="duotone" />
        </span>
        <span>Sair</span>
      </span>
    </button>
  );

  return (
    <aside
      className={`hidden md:block sticky top-0 self-start h-[100dvh] z-[50] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        compact ? 'w-[80px]' : 'w-[260px]'
      }`}
    >
      <div className="ds-admin-sidebar h-full overflow-hidden flex flex-col rounded-none shadow-none">
        <div className={`pt-3 pb-1 shrink-0 ${compact ? 'justify-center' : 'justify-start'}`} />

        <div className="space-y-1.5 min-h-0 flex-1 overflow-y-auto overflow-x-visible px-2 pb-2">
          {(!isGroupedMode || compact) &&
            items.map((item) => renderNavItem(item))}

          {!isGroupedMode && !compact && renderLogoutItem()}

          {isGroupedMode && !compact && groupedSections.map((section: any) => {
            if (section.type === 'logout') {
              return renderLogoutItem();
            }
            if (section.type === 'item') return renderNavItem(section.item);
            const isSingleItem = section.children.length === 1;
            // Grupos ABERTOS por padrão (relato 29/08: fechados viravam "lista
            // de pontos de interrogação"); localStorage só fecha o que o
            // lojista fechou de propósito.
            const isOpen = isSingleItem || openGroups?.[section.id] !== false;
            const hasActiveChild = section.children.some((child: SidebarItem) => child.id === activeId);
            return (
              <div key={section.id} className="space-y-1">
                {isSingleItem ? (
                  <p className={`px-3 text-[11px] font-semibold ${hasActiveChild ? 'text-[#1b77ba]' : 'text-slate-400'}`}>
                    {section.label}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [section.id]: !isOpen }))}
                    className={`w-full min-h-11 rounded-[1rem] border px-3 text-left text-[12px] font-bold transition flex items-center justify-between gap-2 ${
                      hasActiveChild
                        ? 'border-[#2f9df7]/20 bg-white/86 text-slate-950 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)]'
                        : 'border-transparent bg-transparent text-slate-500 hover:border-white/80 hover:bg-white/80 hover:text-slate-950'
                    }`}
                    aria-expanded={isOpen}
                    aria-controls={`sidebar-group-${section.id}`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      {(() => {
                        const GroupIcon = getAdminNavGroup(section.id)?.icon;
                        return GroupIcon ? (
                          <GroupIcon size={14} weight="duotone" className="shrink-0 text-[#1b77ba]" />
                        ) : null;
                      })()}
                      {section.label}
                    </span>
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
                {isOpen && (
                  <div id={`sidebar-group-${section.id}`} className={`space-y-1 ${isSingleItem ? '' : 'ml-2 pl-2.5 border-l border-[#2f9df7]/20'}`}>
                    {section.children.map((child: SidebarItem) => renderNavItem(child, !isSingleItem))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 pt-2 px-2 border-t border-slate-200/70 shrink-0">
          {compact && (
            <button
              type="button"
              onClick={onLogout}
              className="group relative ds-admin-sidebar-item ds-focus-ring flex items-center justify-center px-0 text-rose-700 hover:bg-rose-50"
              aria-label="Sair da conta"
              title="Sair"
            >
              <span className="inline-flex items-center">
                <SignOut size={16} weight="bold" />
              </span>
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                Sair
              </span>
            </button>
          )}
          {!compact && (
            <PlatformTrustFooter className="mt-3 px-3 pb-1" tone="light" compact align="left" mode="minimal" />
          )}
        </div>
      </div>
    </aside>
  );
}
