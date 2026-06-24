import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { GooglePlayLogo, X } from '@phosphor-icons/react';
import { JNC_GOOGLE_PLAY_URL } from '../../utils/destinationQrPoster';

const DISMISS_KEY = 'qrAppBannerDismissed';

function shouldShowBanner() {
  // Only on Android, only on web (not inside the native app)
  if (Capacitor.isNativePlatform()) return false;
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function StoreAppPromoBanner({ withBottomNav = false }: { withBottomNav?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowBanner()) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // ignore sessionStorage errors
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  const bottomClass = withBottomNav
    ? 'bottom-[calc(5.1rem+env(safe-area-inset-bottom))]'
    : 'bottom-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]';

  return (
    <div className={`fixed inset-x-0 z-[120] px-3 ${bottomClass}`}>
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#153A4C] px-3 py-2.5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
          <GooglePlayLogo size={22} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold leading-tight text-white">Acompanhe seu pedido em tempo real</p>
          <p className="text-[10.5px] leading-tight text-white/70">Baixe o app e fique de olho na entrega.</p>
        </div>
        <a
          href={JNC_GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-[#153A4C] transition-transform active:scale-95"
        >
          Instalar
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="shrink-0 rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
