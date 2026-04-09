import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft } from '@phosphor-icons/react';

const STACK_KEY = 'jnk_native_route_stack_v1';
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
  const currentPath = getCurrentPath(location);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const stack = readStack();
    if (stack[stack.length - 1] === currentPath) return;
    writeStack([ ...stack, currentPath ]);
  }, [currentPath]);

  const previousPath = useMemo(() => {
    const stack = readStack();
    for (let i = stack.length - 2; i >= 0; i -= 1) {
      if (stack[i] && stack[i] !== currentPath) return stack[i];
    }
    return '';
  }, [currentPath]);

  if (!Capacitor.isNativePlatform() || !isEligiblePath(location.pathname)) {
    return null;
  }

  const handleBack = () => {
    const stack = readStack();
    const trimmed = stack.filter((_, index) => index < stack.length - 1);
    writeStack(trimmed);
    if (previousPath) {
      navigate(previousPath);
      return;
    }
    navigate('/hub');
  };

  const handleHome = () => {
    const stack = readStack();
    const nextStack = stack.filter((entry) => entry && entry !== '/hub');
    writeStack([ ...nextStack, '/hub' ]);
    navigate('/hub');
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[130] transition-transform duration-300 ease-in-out lg:hidden">
      <div className="pointer-events-auto mx-auto grid max-w-none grid-cols-2 gap-1 border-t border-slate-200/40 bg-white/72 p-1.5 pb-[max(env(safe-area-inset-bottom),4px)] shadow-[0_-12px_24px_-20px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={handleBack}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-600 transition active:scale-95"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <ArrowLeft size={17} weight="bold" />
          </span>
          Voltar
        </button>
        <button
          type="button"
          onClick={handleHome}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] transition active:scale-95"
          style={{ backgroundColor: '#0f172a' }}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/14 p-0.5">
            <img src="/jnc.png" alt="JNC" className="h-full w-full rounded-full object-contain" />
          </span>
          JNC
        </button>
      </div>
    </nav>
  );
}
