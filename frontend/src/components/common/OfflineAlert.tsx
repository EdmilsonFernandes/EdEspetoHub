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
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.85rem,env(safe-area-inset-bottom))] z-[10000] flex justify-center px-3 sm:bottom-auto sm:top-[max(0.9rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[1.6rem] border border-white/12 bg-[#0B0F1A]/94 text-white shadow-[0_24px_80px_-36px_rgba(8,17,31,0.9)] ring-1 ring-[#336886]/20 backdrop-blur-xl">
        <div className="relative p-4">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#336886]/24 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-[#5FD35A]/10 blur-2xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200 shadow-[0_0_28px_rgba(251,191,36,0.14)]">
              <WifiSlash size={21} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8EC5DD]">Conexão pausada</p>
              <h2 className="mt-1 text-base font-black leading-tight text-white">Sem internet agora</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300">
                Mantemos sua rota preparada. Assim que a conexão voltar, lojas, destinos e pedidos atualizam automaticamente.
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
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-center">
                  <Icon size={16} weight="duotone" className="mx-auto text-[#8EC5DD]" />
                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">{item.label}</p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleRetry}
            disabled={checking}
            className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#336886] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_42px_-28px_rgba(51,104,134,0.9)] transition-all hover:bg-[#2b5b75] active:scale-[0.99] disabled:opacity-70"
          >
            <ArrowClockwise size={15} weight="bold" className={checking ? 'animate-spin' : ''} />
            {checking ? 'Verificando...' : 'Tentar reconectar'}
          </button>
        </div>
      </div>
    </div>
  );
}
