import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';

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
  const showSession = Boolean(motoboySession?.token && userEmail);

  const handleLogout = () => {
    try {
      localStorage.removeItem('motoboySession');
    } catch {
      // ignore
    }
    // MotoboyLogin currently also writes to AuthContext (adminSession). Clear it to avoid leaking sessions.
    try {
      setAuth(null);
    } catch {
      // ignore
    }
    navigate('/motoboy/login', { replace: true });
  };

  return (
    <div className="premium-card-glass p-4 sm:p-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-2xl overflow-hidden shadow-[0_18px_34px_-26px_rgba(239,68,68,0.9)] shrink-0">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#ef4444,#f59e0b)] opacity-20" />
            <img src="/logo.svg" alt="Chama no Espeto" className="relative h-full w-full object-cover bg-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] sm:tracking-[0.3em] text-slate-500">Área do Entregador</p>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight break-words">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-words">{subtitle}</p>}
          </div>
        </div>
        <div className="shrink-0 w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">{rightAction}</div>
          {showSession ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-slate-800">
                <UserCircle size={18} weight="duotone" className="text-slate-600" />
                <div className="leading-tight text-left">
                  <div className="text-[11px] font-extrabold truncate max-w-[180px]">{userName || 'Entregador'}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{userEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 flex items-center gap-2"
                title="Sair"
              >
                <SignOut size={16} weight="bold" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
