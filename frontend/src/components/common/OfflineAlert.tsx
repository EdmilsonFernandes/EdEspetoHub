import { useState, useEffect } from 'react';
import { WifiSlash, WifiHigh } from '@phosphor-icons/react';

export function OfflineAlert() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
      // Disparar evento para que as telas recarreguem dados após reconexão
      window.dispatchEvent(new CustomEvent('jnc:app-foreground'));
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[10000] bg-emerald-600 text-white py-1.5 px-4 flex items-center justify-center gap-2 text-xs font-bold animate-slide-down shadow-md">
        <WifiHigh size={16} weight="bold" />
        Conexão restabelecida!
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-amber-500 text-white py-1.5 px-4 flex items-center justify-center gap-2 text-xs font-bold animate-slide-down shadow-md">
      <WifiSlash size={16} weight="bold" />
      Você está offline. Verifique sua conexão para continuar.
    </div>
  );
}
