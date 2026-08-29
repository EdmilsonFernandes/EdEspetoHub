// Hook consumidor da fonte única de navegação admin. Centraliza o executor de
// ações (tab/config/rota/fila/vitrinha/evento/logout), o gate de motoboys e o
// estado ativo — antes cada página tinha seu handleNavSelect com regras próprias.
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import {
  getAdminItemById,
  getAdminNavItems,
  getAdminActiveItemId,
  groupAdminNavItems,
  resolveCanUseMotoboys,
  type AdminNavItem,
  type AdminNavSection,
} from './adminNavigation';

export type UseAdminNavOptions = {
  /** Fixa o item ativo (páginas fora do dashboard: orders/queue/highlights). */
  activeIdOverride?: string;
  /** Contadores dos badges (fila aberta, solicitações de motoboy pendentes). */
  badges?: { queueCount?: number; motoboysPending?: number };
  /** Envolve a execução num guard (AdminDashboard: runOrConfirmDiscard). */
  wrapRun?: (run: () => void) => void;
  /** Dashboard: troca de aba sem re-navegação (setActiveTab local). */
  onLocalTab?: (tab: string) => void;
  /** Dashboard: abre seção de config localmente (openConfigSection). */
  onOpenConfig?: (section: string) => void;
  /** Notificação do gate (Dashboard: showToast "plano Pro"). */
  notify?: (message: string, kind?: string) => void;
};

export type AdminNavApi = {
  /** Itens canônicos do papel (todas as superfícies) com badges resolvidos. */
  items: AdminNavItem[];
  /** Itens de sidebar/drawer (o que o menu renderiza). */
  sidebarItems: AdminNavItem[];
  /** Seções agrupadas na ordem canônica (Resumo solo → grupos → Sair). */
  sections: AdminNavSection[];
  activeItemId: string;
  isOperator: boolean;
  canUseMotoboys: boolean;
  storeSlug: string;
  selectItem: (id: string) => void;
  logout: () => void;
};

const resolveBadge = (
  item: AdminNavItem,
  badges: { queueCount?: number; motoboysPending?: number }
): AdminNavItem => {
  if (item.badgeKey === 'queueCount' && badges.queueCount != null && badges.queueCount > 0) {
    return { ...item, badge: badges.queueCount };
  }
  if (item.badgeKey === 'motoboysPending' && badges.motoboysPending != null && badges.motoboysPending > 0) {
    return { ...item, badge: badges.motoboysPending, tone: 'amber' };
  }
  return item;
};

export function useAdminNav(options: UseAdminNavOptions = {}): AdminNavApi {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const badges = options.badges || {};

  const role = String(auth?.user?.role || '');
  const isOperator = role.toUpperCase() === 'OPERATOR';
  const canUseMotoboys = resolveCanUseMotoboys(auth);
  const storeSlug = String(auth?.store?.slug || '').trim();

  const items = useMemo(
    () =>
      getAdminNavItems({ role, canUseMotoboys }).map((item) => {
        if (item.id === 'motoboys' && item.disabled) {
          // Plano sem entregadores: badge "Pro" violeta (comportamento do dashboard).
          return { ...item, badge: 'Pro', tone: 'violet' as const };
        }
        return resolveBadge(item, badges);
      }),
    // badges: objeto novo por render do caller — estabilizamos pelos valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, canUseMotoboys, badges.queueCount, badges.motoboysPending]
  );

  const sidebarItems = useMemo(
    () => items.filter((item) => (item.surfaces || []).some((s) => s === 'sidebar' || s === 'drawer') || !item.surfaces),
    [items]
  );

  const sections = useMemo(() => groupAdminNavItems(sidebarItems), [sidebarItems]);

  const activeItemId = useMemo(() => {
    if (options.activeIdOverride !== undefined) return options.activeIdOverride;
    const persistedTab =
      typeof window !== 'undefined' ? String(sessionStorage.getItem('admin:activeTab') || '') : '';
    return getAdminActiveItemId({
      pathname: location.pathname,
      search: location.search,
      state: location.state as { activeTab?: string | null } | null,
      persistedTab,
    });
    // activeIdOverride é estável por página; location muda a navegação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.activeIdOverride, location.pathname, location.search, location.state]);

  const executeItem = useCallback(
    (item: AdminNavItem) => {
      if (item.gate === 'motoboys' && !canUseMotoboys) {
        options.notify?.('Disponível no plano Pro. Faça o upgrade para liberar entregadores.', 'info');
        navigate('/admin/renewal?focus=pro');
        return;
      }
      const action = item.action;
      const onDashboard = location.pathname.startsWith('/admin/dashboard');
      switch (action.type) {
        case 'tab': {
          if (options.onLocalTab && onDashboard) {
            options.onLocalTab(action.tab);
            return;
          }
          navigate('/admin/dashboard', { state: { activeTab: action.tab } });
          return;
        }
        case 'config': {
          if (options.onOpenConfig && onDashboard) {
            options.onOpenConfig(action.section);
            return;
          }
          // `cfg` é o nome que o gravador/consumidor do dashboard troca (fix do
          // loop de 17/08); o consumidor também aceita `section` (drawer antigo).
          navigate(`/admin/dashboard?cfg=${encodeURIComponent(action.section)}`, {
            state: { activeTab: 'config' },
          });
          return;
        }
        case 'route': {
          navigate(action.to, action.state ? { state: action.state } : undefined);
          return;
        }
        case 'storefront': {
          if (storeSlug) navigate(`/${storeSlug}`);
          return;
        }
        case 'queue': {
          navigate('/admin/queue', action.forcedTab ? { state: { activeTab: action.forcedTab } } : undefined);
          return;
        }
        case 'event': {
          window.dispatchEvent(new CustomEvent(action.name));
          return;
        }
        case 'logout': {
          markManualLogoutRedirect('admin', '/hub');
          logout();
          navigate('/hub', { replace: true });
          return;
        }
      }
    },
    // opções chegam inline do caller; estabilizar por referência quebraria o guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUseMotoboys, storeSlug, location.pathname, navigate, logout, options.wrapRun, options.onLocalTab, options.onOpenConfig, options.notify]
  );

  const selectItem = useCallback(
    (id: string) => {
      const item = getAdminItemById(id);
      if (!item) return;
      if (options.wrapRun) {
        options.wrapRun(() => executeItem(item));
        return;
      }
      executeItem(item);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executeItem, options.wrapRun]
  );

  const handleLogout = useCallback(() => {
    const item = getAdminItemById('logout');
    if (item) executeItem(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeItem]);

  return {
    items,
    sidebarItems,
    sections,
    activeItemId,
    isOperator,
    canUseMotoboys,
    storeSlug,
    selectItem,
    logout: handleLogout,
  };
}
