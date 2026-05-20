import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Buildings, House, Mountains, Receipt, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { nativeBiometricService } from '../../services/nativeBiometricService';

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
    }
  }, [location.pathname]);

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

  const isHome = !isOrders && !isCondominium && !isDestinations;

  const itemBaseClass =
    'group flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-[1.15rem] px-0.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03]';
  const activeItemClass =
    'bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12';
  const inactiveItemClass =
    'text-slate-500 hover:text-slate-700';

  return (
    <nav ref={navRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-[35] px-0 pb-0 transition-transform duration-300 ease-in-out lg:hidden">
      <div className="pointer-events-auto mx-auto max-w-none rounded-none border border-b-0 border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-2 pt-2 shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-0.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
        <button
          type="button"
          onClick={handleHome}
          className={`${itemBaseClass} ${isHome ? activeItemClass : inactiveItemClass}`}
        >
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            isHome
              ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}>
            <House size={16} weight={isHome ? 'fill' : 'duotone'} />
          </span>
          Início
        </button>
        <button
          type="button"
          onClick={handleOrders}
          className={`${itemBaseClass} ${isOrders ? activeItemClass : inactiveItemClass}`}
        >
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            isOrders
              ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}>
            <Receipt size={16} weight={isOrders ? 'fill' : 'duotone'} />
          </span>
          Pedidos
        </button>
        <button
          type="button"
          onClick={() => navigate('/hub?panel=condominios')}
          className={`${itemBaseClass} ${isCondominium ? activeItemClass : inactiveItemClass}`}
        >
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            isCondominium
              ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}>
            <Buildings size={16} weight={isCondominium ? 'fill' : 'duotone'} />
          </span>
          Agenda
        </button>
        <button
          type="button"
          onClick={() => navigate('/destinos')}
          className={`${itemBaseClass} ${isDestinations ? activeItemClass : inactiveItemClass}`}
        >
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            isDestinations
              ? 'bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}>
            <Mountains size={16} weight={isDestinations ? 'fill' : 'duotone'} />
          </span>
          Destinos
        </button>
        <button
          type="button"
          onClick={() => navigate('/hub?profile=1')}
          className={`${itemBaseClass} ${inactiveItemClass}`}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
            <UserCircle size={16} weight="duotone" />
          </span>
          Perfil
        </button>
        </div>
      </div>
    </nav>
  );
}
