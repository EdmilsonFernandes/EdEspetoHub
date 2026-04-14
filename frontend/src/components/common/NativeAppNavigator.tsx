import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Buildings, Heart, House, Receipt } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';

const STACK_KEY = 'jnk_native_route_stack_v1';
const HIDDEN_KEY = 'jnk_native_nav_hidden_v1';
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

const isEligiblePath = (pathname: string) => {
  if (!pathname || pathname === '/hub') return false;
  if (pathname.startsWith('/cliente/pedidos')) return false;
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

  useEffect(() => {
    const handleCartVisibility = (e: any) => {
      setHiddenByCart(!!e.detail?.visible);
    };
    window.addEventListener('jnk:cart-visibility', handleCartVisibility);
    return () => window.removeEventListener('jnk:cart-visibility', handleCartVisibility);
  }, []);

  const isStoreAdmin = useMemo(() => {
    const role = String(auth?.user?.role || '').toUpperCase();
    return role === 'ADMIN' || role === 'OPERATOR' || role === 'CHURRASQUEIRO';
  }, [auth?.user?.role]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const stack = readStack();
    if (stack[stack.length - 1] === currentPath) return;
    writeStack([ ...stack, currentPath ]);
  }, [currentPath]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const syncHiddenState = () => {
      try {
        setIsHidden(sessionStorage.getItem(HIDDEN_KEY) === '1');
      } catch {
        setIsHidden(false);
      }
    };
    syncHiddenState();
    const handleVisibility = (event: Event) => {
      const hidden = Boolean((event as CustomEvent<{ hidden?: boolean }>).detail?.hidden);
      try {
        sessionStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
      } catch {
        // no-op
      }
      setIsHidden(hidden);
    };
    window.addEventListener('jnc:native-nav-visibility', handleVisibility as EventListener);
    window.addEventListener('storage', syncHiddenState);
    return () => {
      window.removeEventListener('jnc:native-nav-visibility', handleVisibility as EventListener);
      window.removeEventListener('storage', syncHiddenState);
    };
  }, []);

  if (!Capacitor.isNativePlatform() || !isEligiblePath(location.pathname) || isHidden || isStoreAdmin || hiddenByCart) {
    return null;
  }

  const handleHome = () => {
    const stack = readStack();
    const nextStack = stack.filter((entry) => entry && entry !== '/hub');
    writeStack([ ...nextStack, '/hub' ]);
    navigate('/hub');
  };

  const isOrders = location.pathname.startsWith('/cliente/pedidos');
  const isCondominium = location.pathname === '/hub' && location.search.includes('panel=condominios');
  const isFavorites = location.pathname === '/hub' && location.search.includes('favorites=1');

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[35] px-0 pb-0 transition-transform duration-300 ease-in-out lg:hidden">
      <div className="pointer-events-auto mx-auto grid max-w-none grid-cols-4 gap-1 rounded-t-[1.75rem] border border-b-0 border-[#2d5f7b]/16 bg-[linear-gradient(180deg,rgba(221,236,246,0.98)_0%,rgba(204,224,238,0.96)_100%)] px-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-12px_28px_-20px_rgba(45,95,123,0.28)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={handleHome}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#2d5f7b] transition active:scale-95"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#336886]/10 text-[#336886]">
            <House size={17} weight="fill" />
          </span>
          Início
        </button>
        <button
          type="button"
          onClick={() => navigate('/cliente/pedidos')}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] transition active:scale-95 ${
            isOrders ? 'bg-[#336886]/10 text-[#336886] shadow-[0_10px_20px_-18px_rgba(51,104,134,0.22)]' : 'text-slate-500'
          }`}
        >
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isOrders ? 'bg-[#336886]/12 text-[#336886]' : 'bg-slate-100 text-slate-600'}`}>
            <Receipt size={17} weight={isOrders ? 'fill' : 'duotone'} />
          </span>
          Pedidos
        </button>
        <button
          type="button"
          onClick={() => navigate('/hub?panel=condominios')}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] transition active:scale-95 ${
            isCondominium ? 'bg-[#336886]/10 text-[#336886] shadow-[0_10px_20px_-18px_rgba(51,104,134,0.22)]' : 'text-slate-500'
          }`}
        >
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isCondominium ? 'bg-[#336886]/12 text-[#336886]' : 'bg-slate-100 text-slate-600'}`}>
            <Buildings size={17} weight={isCondominium ? 'fill' : 'duotone'} />
          </span>
          Condo
        </button>
        <button
          type="button"
          onClick={() => navigate('/hub?favorites=1')}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] transition active:scale-95 ${
            isFavorites ? 'bg-[#336886]/10 text-[#336886] shadow-[0_10px_20px_-18px_rgba(51,104,134,0.22)]' : 'text-slate-500'
          }`}
        >
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isFavorites ? 'bg-[#336886]/12 text-[#336886]' : 'bg-slate-100 text-slate-600'}`}>
            <Heart size={17} weight={isFavorites ? 'fill' : 'regular'} />
          </span>
          Favoritos
        </button>
      </div>
    </nav>
  );
}
