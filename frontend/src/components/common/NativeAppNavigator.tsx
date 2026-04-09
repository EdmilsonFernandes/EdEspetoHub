import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, House } from '@phosphor-icons/react';

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
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] z-[80] flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/92 p-1.5 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors active:scale-95"
        >
          <ArrowLeft size={16} weight="bold" />
          Voltar
        </button>
        <div className="h-6 w-px bg-slate-200" />
        <button
          type="button"
          onClick={handleHome}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors active:scale-95"
        >
          <House size={16} weight="fill" />
          Hub
        </button>
      </div>
    </div>
  );
}
