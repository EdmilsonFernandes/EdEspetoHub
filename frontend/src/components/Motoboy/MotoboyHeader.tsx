import { useEffect, useMemo, useState } from 'react';
import { List, Motorcycle } from '@phosphor-icons/react';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { motoboyService } from '../../services/motoboyService';

type MotoboyHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function MotoboyHeader({ title, subtitle, rightAction }: MotoboyHeaderProps) {
  const motoboySession = useMemo(() => {
    try {
      const raw = localStorage.getItem('motoboySession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const user = motoboySession?.user || null;
  const userName = String(user?.fullName || user?.name || '').trim();
  const userEmail = String(user?.email || '').trim();
  const [resolvedUserImage, setResolvedUserImage] = useState<string>(
    resolveAssetUrl(String(user?.profileImageUrl || '')) || ''
  );
  const userImage = resolvedUserImage;
  const showSession = Boolean(motoboySession?.token && userEmail);

  useEffect(() => {
    let active = true;
    const fallbackImage = resolveAssetUrl(String(user?.profileImageUrl || '')) || '';
    if (fallbackImage) {
      setResolvedUserImage(fallbackImage);
      return () => {
        active = false;
      };
    }
    if (!showSession) return () => {
      active = false;
    };
    (async () => {
      try {
        const profile = await motoboyService.getProfile();
        const profileImageUrl = resolveAssetUrl(String(profile?.user?.profileImageUrl || '')) || '';
        if (!active) return;
        if (profileImageUrl) {
          setResolvedUserImage(profileImageUrl);
          try {
            const raw = localStorage.getItem('motoboySession');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.user && !parsed.user.profileImageUrl) {
              parsed.user.profileImageUrl = String(profile?.user?.profileImageUrl || '');
              localStorage.setItem('motoboySession', JSON.stringify(parsed));
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [showSession, user?.profileImageUrl]);

  return (
    <div className="premium-card-glass bg-white/85 backdrop-blur-md border border-slate-100 p-4 sm:p-5 overflow-hidden no-x-scroll">
      <div className="motoboy-header-grid">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-11 w-11 sm:h-12 sm:w-12 rounded-[1.2rem] overflow-hidden shadow-[0_16px_28px_-22px_rgba(15,23,42,0.45)] shrink-0 bg-white border border-slate-200/80">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="premium-title text-lg sm:text-xl leading-tight break-words">{title}</h1>
            {subtitle ? (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 break-words">{subtitle}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">Operação do entregador</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0 sm:mr-1">{rightAction}</div>
          {showSession ? (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('motoboy:open-menu-drawer'));
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white/80 text-slate-800 min-w-0 max-w-full sm:max-w-[320px] transition-all hover:bg-white active:scale-[0.98]"
                title="Abrir menu do entregador"
              >
                <div className="relative shrink-0">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName || 'Entregador'}
                      className="h-9 w-9 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-amber-600 shrink-0">
                      <Motorcycle size={18} weight="duotone" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-900 text-white shadow-sm">
                    <List size={11} weight="bold" />
                  </span>
                </div>
                <div className="leading-tight text-left min-w-0">
                  <div className="text-[11px] font-extrabold truncate">Menu</div>
                  <div className="text-[10px] text-slate-500 truncate">{userName || 'Atalhos e perfil'}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('motoboy:open-menu-drawer'));
                }}
                className="sm:hidden flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-200 bg-white/80 text-slate-800 min-w-0 transition-all hover:bg-white active:scale-[0.98]"
                title="Abrir menu do entregador"
              >
                <div className="relative shrink-0">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName || 'Entregador'}
                      className="h-8 w-8 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-amber-600 shrink-0">
                      <Motorcycle size={16} weight="duotone" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-slate-900 text-white shadow-sm">
                    <List size={10} weight="bold" />
                  </span>
                </div>
                <div className="leading-tight text-left min-w-0">
                  <div className="text-[11px] font-extrabold truncate">Menu</div>
                  <div className="text-[10px] text-slate-500 truncate">{userName || 'Perfil e atalhos'}</div>
                </div>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

