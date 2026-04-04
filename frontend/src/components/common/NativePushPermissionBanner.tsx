import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { BellSimple } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';

const isEligiblePath = (pathname: string) => {
  if (!pathname) return false;
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/motoboy') ||
    pathname.startsWith('/cliente')
  ) {
    return false;
  }
  return true;
};

export function NativePushPermissionBanner() {
  const location = useLocation();
  const [isGranted, setIsGranted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const canRender = useMemo(
    () => Capacitor.isNativePlatform() && isEligiblePath(location.pathname),
    [location.pathname]
  );

  const refreshPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsGranted(true);
      return;
    }
    if (!Capacitor.isPluginAvailable('PushNotifications')) {
      setIsGranted(true);
      setSupported(false);
      return;
    }
    setSupported(true);
    try {
      const status = await PushNotifications.checkPermissions();
      setIsGranted(status.receive === 'granted');
    } catch {
      setIsGranted(true);
    }
  }, []);

  const handleEnable = useCallback(async () => {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const before = await PushNotifications.checkPermissions();
      if (before.receive !== 'granted') {
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive !== 'granted') {
          const openSettings = (CapacitorApp as any)?.openSettings;
          if (typeof openSettings === 'function') {
            await openSettings();
          }
          setLoading(false);
          return;
        }
      }
      await PushNotifications.register();
      setIsGranted(true);
    } catch {
      try {
        const openSettings = (CapacitorApp as any)?.openSettings;
        if (typeof openSettings === 'function') {
          await openSettings();
        }
      } catch {
        // no-op
      }
    } finally {
      setLoading(false);
      void refreshPermission();
    }
  }, [loading, refreshPermission, supported]);

  useEffect(() => {
    if (!canRender) return;
    void refreshPermission();
    const onFocus = () => {
      void refreshPermission();
    };
    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(onFocus, 20000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [canRender, refreshPermission]);

  if (!canRender || !supported || isGranted) return null;

  return (
    <div className="fixed bottom-[88px] left-1/2 z-[290] w-[calc(100%-1rem)] max-w-md -translate-x-1/2 rounded-2xl border border-sky-200/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <img
          src="/janocaminho-logo.png"
          alt="Já no Caminho"
          className="h-8 w-8 rounded-lg border border-slate-200 object-cover"
          loading="eager"
        />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <BellSimple size={16} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">Ative notificações de pedido</p>
          <p className="truncate text-[11px] text-slate-500">Receba atualização de status em tempo real.</p>
        </div>
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Abrindo...' : 'Ativar'}
        </button>
      </div>
    </div>
  );
}
