import { useState, useEffect } from 'react';
import { ArrowClockwise, MapPin, Storefront, Truck, WifiHigh, WifiSlash } from '@phosphor-icons/react';

export function OfflineAlert() {
  const [isOffline, setIsOffline] = useState(() => (typeof navigator === 'undefined' ? false : !navigator.onLine));
  const [showReconnected, setShowReconnected] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setChecking(false);
      setTimeout(() => setShowReconnected(false), 3000);
      window.dispatchEvent(new CustomEvent('jnc:app-foreground'));
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
      setChecking(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setChecking(true);
    window.dispatchEvent(new CustomEvent('jnc:app-foreground'));
    window.setTimeout(() => {
      setChecking(false);
      if (navigator.onLine) {
        setIsOffline(false);
        setShowReconnected(true);
        window.setTimeout(() => setShowReconnected(false), 3000);
      }
    }, 700);
  };

  if (showReconnected) {
    return (
      <div className="fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[10000] mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-[0_18px_42px_-28px_rgba(5,150,105,0.9)] animate-slide-down">
        <WifiHigh size={16} weight="bold" />
        Conexão restabelecida
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.85rem,env(safe-area-inset-bottom))] z-[10000] flex justify-center px-3 sm:bottom-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[1.65rem] border border-white/85 bg-white/94 text-slate-900 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.46)] ring-1 ring-[#336886]/10 backdrop-blur-xl">
        <div className="relative p-4">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#336886]/16 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-[#5FD35A]/16 blur-2xl" />

          <div className="relative flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.05rem] bg-[linear-gradient(145deg,#153A4C,#336886)] shadow-[0_18px_38px_-26px_rgba(21,58,76,0.85)]">
              <span className="absolute -top-2 left-1/2 h-4 w-[2px] -translate-x-1/2 rounded-full bg-[#5FD35A]/85" />
              <span className="absolute left-[15px] top-[15px] h-1.5 w-1.5 animate-pulse rounded-full bg-[#5FD35A] shadow-[0_0_10px_rgba(95,211,90,0.9)]" />
              <span className="absolute right-[15px] top-[15px] h-1.5 w-1.5 animate-pulse rounded-full bg-[#5FD35A] shadow-[0_0_10px_rgba(95,211,90,0.9)]" />
              <img src="/janocaminho.jpg" alt="" className="mt-3 h-7 w-7 rounded-lg object-contain" />
              <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-white">
                <WifiSlash size={11} weight="bold" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Conexão pausada</p>
              <h2 className="mt-1 text-base font-black leading-tight text-slate-950">Sem internet agora</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                O app fica preparado e atualiza lojas, destinos e pedidos assim que a conexão voltar.
              </p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Lojas', icon: Storefront },
              { label: 'Destinos', icon: MapPin },
              { label: 'Entregas', icon: Truck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-[#336886]/10 bg-[#F4F8FB] px-2 py-2 text-center">
                  <Icon size={16} weight="duotone" className="mx-auto text-[#336886]" />
                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleRetry}
            disabled={checking}
            className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_42px_-28px_rgba(51,104,134,0.9)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
          >
            <ArrowClockwise size={15} weight="bold" className={checking ? 'animate-spin' : ''} />
            {checking ? 'Verificando...' : 'Tentar reconectar'}
          </button>
        </div>
      </div>
    </div>
  );
}
