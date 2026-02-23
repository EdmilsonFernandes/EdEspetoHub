import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

type MotoboyHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function MotoboyHeader({ title, subtitle, rightAction }: MotoboyHeaderProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

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
  const userImage = resolveAssetUrl(String(user?.profileImageUrl || ''));
  const userInitial = String((userName || 'E').trim().charAt(0) || 'E').toUpperCase();
  const showSession = Boolean(motoboySession?.token && userEmail);

  const handleLogout = () => {
    try {
      localStorage.removeItem('motoboySession');
    } catch {
      // ignore
    }
    try {
      setAuth(null);
    } catch {
      // ignore
    }
    navigate('/motoboy/login', { replace: true });
  };

  return (
    <div className="premium-card-glass p-4 sm:p-5 overflow-hidden no-x-scroll">
      <div className="motoboy-header-grid">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-11 w-16 sm:h-12 sm:w-20 rounded-2xl overflow-hidden shadow-[0_18px_34px_-26px_rgba(239,68,68,0.9)] shrink-0 bg-slate-900 p-1">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#ef4444,#f59e0b)] opacity-20" />
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="relative h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] sm:tracking-[0.3em] text-slate-500">Área do Entregador</p>
            <h1 className="premium-title text-lg sm:text-xl leading-tight break-words">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-words">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0 sm:mr-1">{rightAction}</div>
          {showSession ? (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:ml-auto w-full sm:w-auto">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-slate-800 min-w-0 max-w-full sm:max-w-[320px]">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName || 'Entregador'}
                    className="h-9 w-9 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 grid place-items-center text-xs font-extrabold shrink-0">
                    {userInitial}
                  </div>
                )}
                <div className="leading-tight text-left min-w-0">
                  <div className="text-[11px] font-extrabold truncate">{userName || 'Entregador'}</div>
                  <div className="text-[10px] text-slate-500 truncate">{userEmail}</div>
                </div>
              </div>
              <div className="sm:hidden flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-200 bg-white/70 text-slate-800 min-w-0">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName || 'Entregador'}
                    className="h-8 w-8 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                  />
                ) : (
                  <UserCircle size={18} weight="duotone" className="text-slate-600 shrink-0" />
                )}
                <div className="leading-tight text-left min-w-0 max-w-[140px]">
                  <div className="text-[11px] font-extrabold truncate">{userName || 'Entregador'}</div>
                  <div className="text-[10px] text-slate-500 truncate">{userEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary btn-press ml-auto sm:ml-0 px-3 py-2 text-xs font-extrabold flex items-center gap-2"
                title="Sair"
              >
                <SignOut size={16} weight="bold" />
                <span>Sair</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
