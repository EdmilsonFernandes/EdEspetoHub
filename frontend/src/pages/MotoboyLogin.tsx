import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowSquareOut, Check, Eye, EyeSlash, SignOut, Scooter, UserCircle, WarningCircle } from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { runClientFreshStart } from '../utils/clientFreshStart';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { AuthLayout } from '../layouts/AuthLayout';

export function MotoboyLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyPrompt, setVerifyPrompt] = useState<{ email?: string; emailMasked?: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('auth:remember-motoboy') !== 'false';
  });
  const logoTapCountRef = useRef(0);
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('auth:superadmin-unlocked') === 'true';
  });
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [persistedSession, setPersistedSession] = useState(() => {
    try {
      const raw = localStorage.getItem('motoboySession');
      const parsed = raw ? JSON.parse(raw) : null;
      const role = String(parsed?.user?.role || '').toUpperCase();
      if (!parsed?.token || role !== 'MOTOBOY') return null;
      return parsed;
    } catch {
      return null;
    }
  });
  const sessionName = String(persistedSession?.user?.fullName || persistedSession?.user?.name || '').trim();
  const sessionEmail = String(persistedSession?.user?.email || '').trim();
  const alreadyLoggedIn = Boolean(persistedSession?.token && sessionEmail);

  useEffect(() => {
    const raw = localStorage.getItem('motoboy:last_email');
    if (raw && !form.email) setForm((prev) => ({ ...prev, email: raw }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (form.email) localStorage.setItem('motoboy:last_email', form.email);
  }, [form.email]);

  const formValid = useMemo(() => {
    return Boolean(String(form.email || '').trim()) && Boolean(String(form.password || '').trim());
  }, [form.email, form.password]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formValid || loading) return;
    setError('');
    setVerifyPrompt(null);
    setLoading(true);
    try {
      const session = await authService.login(form.email, form.password);
      const role = String(session?.user?.role || '').toUpperCase();
      if (role !== 'MOTOBOY') {
        setError('Esta conta não é de entregador.');
        return;
      }
      try {
        await runClientFreshStart({
          maxAgeMs: 8 * 60 * 60 * 1000,
          currentBuildId: APP_BUILD_INFO.buildId,
        });
      } catch {
        // no-op: login must continue even if client cleanup fails
      }
      const sessionData = { token: session.token, user: session.user, store: session.store };
      localStorage.setItem('motoboySession', JSON.stringify(sessionData));
      setAuth(sessionData);
      navigate('/motoboy/home');
    } catch (err: any) {
      if (err?.code === 'AUTH-005') {
        const targetEmail = err?.details?.email || form.email;
        if (targetEmail) {
          localStorage.setItem('signupEmail', String(targetEmail).trim().toLowerCase());
        }
        setVerifyPrompt({
          email: targetEmail,
          emailMasked: err?.details?.emailMasked,
        });
      }
      setError(err?.message || 'Não foi possível entrar agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    const email = String(verifyPrompt?.email || '').trim().toLowerCase();
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setError('');
    try {
      const result = await authService.resendVerification(email);
      setResendCooldown(Number(result?.cooldownSec || 60));
      setError(result?.message || 'Se o e-mail existir, enviaremos instruções.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível reenviar agora.');
    } finally {
      setResendLoading(false);
    }
  };

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
    setPersistedSession(null);
  };

  const handleLogoTap = () => {
    if (superAdminUnlocked) return;
    logoTapCountRef.current += 1;
    if (logoTapCountRef.current >= 10) {
      setSuperAdminUnlocked(true);
      logoTapCountRef.current = 0;
      try {
        localStorage.setItem('auth:superadmin-unlocked', 'true');
      } catch {
        // no-op
      }
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-4 login-page-enter">
        <div className="text-center space-y-2">
          <button type="button" onClick={handleLogoTap} className="mx-auto block">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="mx-auto h-12 w-auto rounded-lg" />
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Acesso da plataforma</p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
            {alreadyLoggedIn ? 'Sessão ativa do entregador' : 'Login Entregador'}
          </h2>
          {superAdminUnlocked ? (
            <p className="text-[11px] font-semibold text-emerald-700">Modo Super Admin liberado neste dispositivo</p>
          ) : null}
        </div>

        <div className="auth-segment">
          <button type="button" onClick={() => navigate('/admin')} className="auth-segment-btn">Loja</button>
          <button type="button" className="auth-segment-btn active">Entregador</button>
          {superAdminUnlocked ? (
            <button type="button" onClick={() => navigate('/superadmin')} className="auth-segment-btn">Super Admin</button>
          ) : null}
        </div>

        <div className="login-card-premium p-5 sm:p-6 space-y-4">
          {alreadyLoggedIn ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600">
                  <UserCircle size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 break-words">{sessionName || 'Entregador'}</div>
                  <div className="text-xs text-slate-600 break-all">{sessionEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/motoboy/home')}
                className="w-full h-12 rounded-xl border-0 bg-[var(--color-primary)] text-white font-black hover:brightness-105"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowSquareOut size={18} weight="duotone" />
                  Ir para painel
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-11 rounded-[10px] border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <SignOut size={17} weight="duotone" />
                  Trocar conta
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {verifyPrompt && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900 text-xs space-y-2">
                  <p className="font-semibold">
                    {verifyPrompt.emailMasked
                      ? `Ative o e-mail ${verifyPrompt.emailMasked} para entrar.`
                      : 'Ative seu e-mail para entrar.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading || resendCooldown > 0 || !verifyPrompt.email}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-white font-bold disabled:opacity-60"
                    >
                      {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-amber-700 font-bold"
                    >
                      Já tenho o código
                    </button>
                  </div>
                </div>
              )}

              <div className="floating-field">
                <input
                  id="motoboy-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="floating-input"
                  placeholder=" "
                />
                <label htmlFor="motoboy-email" className="floating-label">E-mail</label>
              </div>

              {error ? (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 -mt-2">
                  <WarningCircle size={14} weight="fill" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="floating-field">
                <input
                  id="motoboy-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="floating-input"
                  placeholder=" "
                />
                <label htmlFor="motoboy-password" className="floating-label">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
                </button>
              </div>

              <label className="premium-check-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setRememberDevice((prev) => {
                      const next = !prev;
                      try {
                        localStorage.setItem('auth:remember-motoboy', String(next));
                      } catch {
                        // no-op
                      }
                      return next;
                    });
                  }}
                  className={`premium-check-btn ${rememberDevice ? 'checked' : ''}`}
                  aria-label={rememberDevice ? 'Desativar lembrar acesso' : 'Ativar lembrar acesso'}
                >
                  <Check size={14} weight="bold" />
                </button>
                <span className="text-xs font-semibold text-slate-600">Lembrar acesso neste dispositivo</span>
              </label>

              <button
                type="submit"
                disabled={!formValid || loading}
                className="w-full h-12 rounded-xl border-0 bg-[var(--color-primary)] text-white font-black shadow-[0_16px_28px_-18px_rgba(47,157,247,0.85)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <Scooter size={18} weight="duotone" />
                  {loading ? 'Entrando...' : 'Entrar'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/motoboy/register')}
                className="w-full h-11 rounded-[10px] border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
              >
                Criar conta de entregador
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Voltar para o site
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
