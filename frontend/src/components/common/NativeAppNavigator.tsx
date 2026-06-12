import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { House, ListPlus, MapTrifold, Receipt, Tent } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { nativeBiometricService } from '../../services/nativeBiometricService';
import { prefetchRouteByPath } from '../../utils/clientRoutePrefetch';

const STACK_KEY = 'jnk_native_route_stack_v1';
const LEGACY_HIDDEN_KEY = 'jnk_native_nav_hidden_v1';
const MAX_STACK = 24;

const getCurrentPath = (location: ReturnType<typeof useLocation>) =>
  `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`;

const readStack = () => {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

const writeStack = (stack: string[]) => {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK)));
  } catch {
    // no-op
  }
};

const readCustomerSession = () => {
  try {
    const raw = localStorage.getItem('customerSession');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
};

const isEligiblePath = (pathname: string) => {
  if (!pathname || pathname === '/hub') return false;
  if (pathname === '/create' || pathname.startsWith('/create/')) return false;
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/motoboy')
  ) {
    return false;
  }
  return true;
};

export function NativeAppNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const currentPath = getCurrentPath(location);
  const [isHidden, setIsHidden] = useState(false);
  const [hiddenByCart, setHiddenByCart] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleCartVisibility = (e: any) => {
      setHiddenByCart(!!e.detail?.visible);
    };
    window.addEventListener('jnk:cart-visibility', handleCartVisibility);
    return () => window.removeEventListener('jnk:cart-visibility', handleCartVisibility);
  }, []);

  const isStoreAdmin = useMemo(() => {
    const role = String(auth?.user?.role || '').toUpperCase();
    return role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA';
  }, [auth?.user?.role]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const stack = readStack();
    if (stack[stack.length - 1] === currentPath) return;
    writeStack([ ...stack, currentPath ]);
  }, [currentPath]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      sessionStorage.removeItem(LEGACY_HIDDEN_KEY);
    } catch {
      // no-op
    }
    const handleVisibility = (event: Event) => {
      const hidden = Boolean((event as CustomEvent<{ hidden?: boolean }>).detail?.hidden);
      setIsHidden(hidden);
    };
    window.addEventListener('jnc:native-nav-visibility', handleVisibility as EventListener);
    return () => {
      window.removeEventListener('jnc:native-nav-visibility', handleVisibility as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (
      location.pathname.startsWith('/destinos') ||
      location.pathname.startsWith('/pedido/') ||
      location.pathname.startsWith('/cliente/pedidos')
    ) {
      setIsHidden(false);
      setHiddenByCart(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!isEligiblePath(location.pathname) || isStoreAdmin) return;
    // Visibility events are screen-local. When React keeps the navigator mounted,
    // stale hidden state from cart/checkout must not leak into the next route.
    setIsHidden(false);
    setHiddenByCart(false);
  }, [currentPath, isStoreAdmin, location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const root = document.documentElement;
    const isVisible =
      Capacitor.isNativePlatform() &&
      isEligiblePath(location.pathname) &&
      !isHidden &&
      !isStoreAdmin &&
      !hiddenByCart;

    const syncNativeNavHeight = () => {
      if (!isVisible || !navRef.current) {
        root.style.setProperty('--jnk-native-nav-height', '0px');
        return;
      }
      root.style.setProperty('--jnk-native-nav-height', `${navRef.current.offsetHeight}px`);
    };

    syncNativeNavHeight();
    window.addEventListener('resize', syncNativeNavHeight);
    window.visualViewport?.addEventListener('resize', syncNativeNavHeight);

    return () => {
      window.removeEventListener('resize', syncNativeNavHeight);
      window.visualViewport?.removeEventListener('resize', syncNativeNavHeight);
      root.style.setProperty('--jnk-native-nav-height', '0px');
    };
  }, [hiddenByCart, isHidden, isStoreAdmin, location.pathname]);

  if (!Capacitor.isNativePlatform() || !isEligiblePath(location.pathname) || isHidden || isStoreAdmin || hiddenByCart) {
    return null;
  }

  const handleHome = () => {
    const stack = readStack();
    const nextStack = stack.filter((entry) => entry && entry !== '/hub');
    writeStack([ ...nextStack, '/hub' ]);
    navigate('/hub');
  };
  const warmupRoute = (path: string) => () => prefetchRouteByPath(path);

  const handleOrders = async () => {
    const savedSession = readCustomerSession();
    if (savedSession?.token) {
      navigate('/cliente/pedidos');
      return;
    }

    if (nativeBiometricService.hasValidStoredCustomerEnrollment()) {
      try {
        await nativeBiometricService.loginCustomerWithBiometrics('Confirme sua identidade para ver seus pedidos');
        navigate('/cliente/pedidos');
        return;
      } catch {
        // If biometric fails/cancels, keep the manual login fallback.
      }
    }

    navigate('/cliente?mode=login&next=/cliente/pedidos&hub=1&bio=1');
  };

  const isOrders =
    location.pathname.startsWith('/cliente/pedidos') ||
    location.pathname.startsWith('/pedido/');
  const isCondominium = location.pathname === '/hub' && location.search.includes('panel=condominios');
  const isDestinations = location.pathname.startsWith('/destinos');
  const isMore = location.pathname === '/hub' && location.search.includes('profile=1');

  const isHome = !isOrders && !isCondominium && !isDestinations && !isMore;

  const itemBaseClass =
    'group flex min-h-[3.2rem] flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-[transform] duration-150 ease-out active:scale-[0.96]';
  const inactiveItemClass =
    'text-slate-500 hover:text-slate-700';

  const activeClass = 'text-[#2d5f7b]';
  const inactiveClass = 'text-slate-500 hover:text-slate-700';

  const iconClass = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
      active
        ? 'bg-[#336886] text-white shadow-[0_16px_32px_-24px_rgba(51,104,134,0.58)] scale-[1.08]'
        : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60 group-hover:bg-slate-100 group-hover:text-slate-700'
    }`;

  const dotClass = (active: boolean) =>
    active ? 'h-1 w-1 rounded-full bg-[#336886]' : 'h-1 w-1';

  return (
    <nav ref={navRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] px-0 pb-0 lg:hidden">
      <div className="pointer-events-auto mx-auto max-w-none rounded-none border-t border-slate-200/60 bg-white/[0.97] px-2 pt-2 shadow-[0_-18px_44px_-28px_rgba(15,23,42,0.32)] backdrop-blur-2xl">
        <div className="grid min-h-[4.2rem] grid-cols-5 items-center gap-1 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
        <button
          type="button"
          onPointerEnter={warmupRoute('/hub')}
          onFocus={warmupRoute('/hub')}
          onTouchStart={warmupRoute('/hub')}
          onClick={handleHome}
          className={`${itemBaseClass} ${isHome ? activeClass : inactiveClass}`}
        >
          <span className={iconClass(isHome)}>
            <House size={16} weight={isHome ? 'fill' : 'duotone'} />
          </span>
          <span className={dotClass(isHome)} />
          <span>Início</span>
        </button>
        <button
          type="button"
          onPointerEnter={warmupRoute('/cliente/pedidos')}
          onFocus={warmupRoute('/cliente/pedidos')}
          onTouchStart={warmupRoute('/cliente/pedidos')}
          onClick={handleOrders}
          className={`${itemBaseClass} ${isOrders ? activeClass : inactiveClass}`}
        >
          <span className={iconClass(isOrders)}>
            <Receipt size={16} weight={isOrders ? 'fill' : 'duotone'} />
          </span>
          <span className={dotClass(isOrders)} />
          <span>Pedidos</span>
        </button>
        <button
          type="button"
          onPointerEnter={warmupRoute('/hub')}
          onFocus={warmupRoute('/hub')}
          onTouchStart={warmupRoute('/hub')}
          onClick={() => navigate('/hub?panel=condominios')}
          className={`${itemBaseClass} ${isCondominium ? activeClass : inactiveClass}`}
        >
          <span className={iconClass(isCondominium)}>
            <Tent size={16} weight={isCondominium ? 'fill' : 'duotone'} />
          </span>
          <span className={dotClass(isCondominium)} />
          <span>Feiras</span>
        </button>
        <button
          type="button"
          onPointerEnter={warmupRoute('/destinos')}
          onFocus={warmupRoute('/destinos')}
          onTouchStart={warmupRoute('/destinos')}
          onClick={() => navigate('/destinos')}
          className={`${itemBaseClass} ${isDestinations ? activeClass : inactiveClass}`}
        >
          <span className={iconClass(isDestinations)}>
            <MapTrifold size={16} weight={isDestinations ? 'fill' : 'duotone'} />
          </span>
          <span className={dotClass(isDestinations)} />
          <span>Visite</span>
        </button>
        <button
          type="button"
          onPointerEnter={warmupRoute('/cliente/conta')}
          onFocus={warmupRoute('/cliente/conta')}
          onTouchStart={warmupRoute('/cliente/conta')}
          onClick={() => navigate('/hub?profile=1')}
          className={`${itemBaseClass} ${isMore ? activeClass : inactiveClass}`}
        >
          <span className={iconClass(isMore)}>
            <ListPlus size={17} weight={isMore ? 'bold' : 'duotone'} />
          </span>
          <span className={dotClass(isMore)} />
          <span>Mais</span>
        </button>
        </div>
      </div>
    </nav>
  );
}
