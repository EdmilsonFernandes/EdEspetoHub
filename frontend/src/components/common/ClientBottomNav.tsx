import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { House, ListPlus, MapTrifold, Receipt, Tent } from '@phosphor-icons/react';
import { prefetchRouteByPath } from '../../utils/clientRoutePrefetch';

type ClientBottomNavItem = 'home' | 'orders' | 'agenda' | 'destinations' | 'profile';

type ClientBottomNavProps = {
  active?: ClientBottomNavItem;
  hidden?: boolean;
  onOpenHome?: () => void | Promise<void>;
  onOpenOrders?: () => void | Promise<void>;
  onOpenAgenda?: () => void | Promise<void>;
  onOpenProfile?: () => void | Promise<void>;
  className?: string;
  zIndexClassName?: string;
  hideOnNative?: boolean;
};

const HEIGHT_VAR = '--jnk-client-bottom-nav-height';

export function ClientBottomNav({
  active = 'home',
  hidden = false,
  onOpenHome,
  onOpenOrders,
  onOpenAgenda,
  onOpenProfile,
  className = '',
  zIndexClassName = 'z-[100]',
  // Nav visível também no app nativo (APK): o hub (MarketplacePage) já exibe bottom nav
  // custom no nativo — esconder aqui criava navegação inconsistente no app (tab bar sumia
  // ao sair da home). Páginas posicionam conteúdo via --jnk-client-bottom-nav-height/padding fixo.
  hideOnNative = false,
}: ClientBottomNavProps) {
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement | null>(null);
  const isNative = hideOnNative && Capacitor.isNativePlatform();
  const shouldRender = !isNative;

  useEffect(() => {
    const root = document.documentElement;

    const syncHeight = () => {
      if (!shouldRender || hidden || !navRef.current) {
        root.style.setProperty(HEIGHT_VAR, '0px');
        return;
      }
      root.style.setProperty(HEIGHT_VAR, `${navRef.current.offsetHeight}px`);
    };

    syncHeight();
    window.addEventListener('resize', syncHeight);
    window.visualViewport?.addEventListener('resize', syncHeight);

    return () => {
      window.removeEventListener('resize', syncHeight);
      window.visualViewport?.removeEventListener('resize', syncHeight);
      root.style.setProperty(HEIGHT_VAR, '0px');
    };
  }, [hidden, shouldRender]);

  if (!shouldRender) return null;

  const itemBaseClass =
    // Auditoria 2 (18/08): title-case + 12px — labels uppercase 10px davam tom de
    // painel; alvo mínimo já coberto pelo min-h do item.
    'group flex min-h-[3.2rem] flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5 text-xs font-bold capitalize transition-[transform] duration-150 ease-out active:scale-[0.96]';
  const inactiveItemClass = 'text-slate-500 hover:text-slate-700';

  const iconClass = (selected: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
      selected
        ? 'bg-[#336886] text-white shadow-[0_16px_32px_-24px_rgba(51,104,134,0.58)] scale-[1.08]'
        : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60 group-hover:bg-slate-100 group-hover:text-slate-700'
    }`;

  const itemClass = (item: ClientBottomNavItem) =>
    `${itemBaseClass} ${active === item ? 'text-[#2d5f7b]' : inactiveItemClass}`;
  const warmupRoute = (path: string) => () => prefetchRouteByPath(path);

  const openHome = () => {
    if (onOpenHome) {
      void onOpenHome();
      return;
    }
    navigate('/hub');
  };

  const openOrders = () => {
    if (onOpenOrders) {
      void onOpenOrders();
      return;
    }
    navigate('/cliente/pedidos');
  };

  const openAgenda = () => {
    if (onOpenAgenda) {
      void onOpenAgenda();
      return;
    }
    navigate('/hub?panel=condominios');
  };

  const openProfile = () => {
    if (onOpenProfile) {
      void onOpenProfile();
      return;
    }
    navigate('/hub?profile=1');
  };

  const dotClass = (selected: boolean) =>
    selected ? 'h-1 w-1 rounded-full bg-[#336886]' : 'h-1 w-1';

  return (
    <nav
      ref={navRef}
      className={`fixed bottom-0 left-0 right-0 px-0 pb-0 transition-transform duration-300 lg:hidden ${zIndexClassName} ${hidden ? 'translate-y-[120%] pointer-events-none' : 'translate-y-0'} ${className}`}
      aria-label="Navegação principal do cliente"
    >
      <div className="mx-auto max-w-none rounded-none border-t border-slate-200/60 bg-white/[0.97] px-2 pt-2 shadow-[0_-18px_44px_-28px_rgba(15,23,42,0.32)] backdrop-blur-2xl">
        <div className="grid min-h-[4.2rem] grid-cols-5 items-center gap-1 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
          <button type="button" onPointerEnter={warmupRoute('/hub')} onFocus={warmupRoute('/hub')} onTouchStart={warmupRoute('/hub')} onClick={openHome} className={itemClass('home')} aria-current={active === 'home' ? 'page' : undefined}>
            <span className={iconClass(active === 'home')}>
              <House size={16} weight={active === 'home' ? 'fill' : 'duotone'} />
            </span>
            <span className={dotClass(active === 'home')} />
            <span>Início</span>
          </button>

          <button type="button" onPointerEnter={warmupRoute('/cliente/pedidos')} onFocus={warmupRoute('/cliente/pedidos')} onTouchStart={warmupRoute('/cliente/pedidos')} onClick={openOrders} className={itemClass('orders')} aria-current={active === 'orders' ? 'page' : undefined}>
            <span className={iconClass(active === 'orders')}>
              <Receipt size={16} weight={active === 'orders' ? 'fill' : 'duotone'} />
            </span>
            <span className={dotClass(active === 'orders')} />
            <span>Pedidos</span>
          </button>

          <button type="button" onPointerEnter={warmupRoute('/hub')} onFocus={warmupRoute('/hub')} onTouchStart={warmupRoute('/hub')} onClick={openAgenda} className={itemClass('agenda')} aria-current={active === 'agenda' ? 'page' : undefined}>
            <span className={iconClass(active === 'agenda')}>
              <Tent size={16} weight={active === 'agenda' ? 'fill' : 'duotone'} />
            </span>
            <span className={dotClass(active === 'agenda')} />
            <span>Feiras</span>
          </button>

          <button type="button" onPointerEnter={warmupRoute('/destinos')} onFocus={warmupRoute('/destinos')} onTouchStart={warmupRoute('/destinos')} onClick={() => navigate('/destinos')} className={itemClass('destinations')} aria-current={active === 'destinations' ? 'page' : undefined}>
            <span className={iconClass(active === 'destinations')}>
              <MapTrifold size={16} weight={active === 'destinations' ? 'fill' : 'duotone'} />
            </span>
            <span className={dotClass(active === 'destinations')} />
            <span>Destinos</span>
          </button>

          <button type="button" onPointerEnter={warmupRoute('/cliente/conta')} onFocus={warmupRoute('/cliente/conta')} onTouchStart={warmupRoute('/cliente/conta')} onClick={openProfile} className={itemClass('profile')} aria-current={active === 'profile' ? 'page' : undefined}>
            <span className={iconClass(active === 'profile')}>
              <ListPlus size={17} weight={active === 'profile' ? 'bold' : 'duotone'} />
            </span>
            <span className={dotClass(active === 'profile')} />
            <span>Conta</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
