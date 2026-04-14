import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowSquareOut, Check, Eye, EyeSlash, LockKey, Scooter, ShieldCheck, SignOut, UserCircle, WarningCircle, WhatsappLogo } from '@phosphor-icons/react';
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
      <div className="space-y-4 ds-login-card-enter w-full">
        <div className="text-center space-y-2.5">
          <button type="button" onClick={handleLogoTap} className="mx-auto block hover:scale-105 transition-transform active:scale-95">
            <img src="/janocaminho-logo.png" alt="Já no Caminho" className="mx-auto h-16 w-auto drop-shadow-md" />
          </button>
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-slate-400">Acesso da plataforma</p>
          <div className="flex items-center justify-center gap-3">
            <LockKey size={32} weight="duotone" className="text-[#0d4f66]" />
            <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.03em]">
              {alreadyLoggedIn ? 'Sessão Ativa' : 'Login Entregador'}
            </h2>
          </div>
          {superAdminUnlocked ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Modo Super Admin</p>
            </div>
          ) : null}
        </div>

        <div className="auth-segment">
          <button type="button" onClick={() => navigate('/admin')} className="auth-segment-btn">Lojista</button>
          <button type="button" onClick={() => navigate('/cliente?mode=login')} className="auth-segment-btn">Cliente</button>
          <button type="button" className="auth-segment-btn active">Entregador</button>
          {superAdminUnlocked ? (
            <button type="button" onClick={() => navigate('/superadmin')} className="auth-segment-btn">Master</button>
          ) : null}
        </div>

        <div className="ds-card-elevated p-6 sm:p-8 space-y-5 bg-white/80 backdrop-blur-xl border-white/40">
          {alreadyLoggedIn ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex items-center gap-4 backdrop-blur-sm">
                <div className="h-12 w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#0d4f66] shadow-sm">
                  <UserCircle size={24} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black text-slate-900 truncate">{sessionName || 'Entregador'}</div>
                  <div className="text-xs font-semibold text-slate-500 truncate">{sessionEmail}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/motoboy/home')}
                  className="ds-btn-shine w-full h-14 rounded-2xl bg-[#0d4f66] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <ArrowSquareOut size={20} weight="bold" />
                  Ir para o Painel
                </button>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <SignOut size={18} weight="duotone" />
                  Trocar de Conta
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {verifyPrompt && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-amber-900 text-xs space-y-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <WarningCircle size={18} weight="fill" className="text-amber-500" />
                    <p className="font-bold text-[13px]">Ativação Pendente</p>
                  </div>
                  <p className="font-medium text-amber-800/80 leading-relaxed">
                    {verifyPrompt.emailMasked
                      ? `Enviamos um código para ${verifyPrompt.emailMasked}. Verifique sua caixa de entrada.`
                      : 'Sua conta ainda não foi ativada. Verifique seu e-mail.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading || resendCooldown > 0 || !verifyPrompt.email}
                      className="flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-white font-bold disabled:opacity-50 transition-all hover:bg-amber-600 shadow-sm active:scale-95"
                    >
                      {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                      className="flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-amber-700 font-bold hover:bg-amber-50 transition-colors active:scale-95"
                    >
                      Digitar código
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="floating-field">
                  <input
                    id="email"
                    name="email"
                    autoComplete="username"
                    type="text"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="floating-input"
                    placeholder=" "
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                  />
                  <label htmlFor="email" className="floating-label">Seu e-mail ou usuário</label>
                </div>

                <div className="floating-field">
                  <input
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="floating-input"
                    placeholder=" "
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="done"
                  />
                  <label htmlFor="password" className="floating-label">Sua senha secreta</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100 animate-shake">
                  <WarningCircle size={16} weight="fill" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-2 py-1 px-3 rounded-xl bg-slate-50 border border-slate-100/50">
                <ShieldCheck size={16} weight="fill" className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ambiente Seguro & Criptografado</span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={() => {
                        setRememberDevice((prev) => {
                          const next = !prev;
                          try {
                            localStorage.setItem('auth:remember-motoboy', String(next));
                          } catch { /* no-op */ }
                          return next;
                        });
                      }}
                      className="sr-only"
                    />
                    <div className={`h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberDevice ? 'bg-[#0d4f66] border-[#0d4f66]' : 'border-slate-300 group-hover:border-slate-400 bg-white'}`}>
                      {rememberDevice && <Check size={12} weight="bold" className="text-white" />}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors uppercase tracking-wider">Lembrar acesso</span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs font-bold text-[#0d4f66] hover:text-[#0b3f52] hover:underline uppercase tracking-wider"
                >
                  Recuperar senha
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={!formValid || loading}
                  className="ds-btn-shine w-full h-14 rounded-2xl bg-[#0d4f66] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
                >
                  <Scooter size={22} weight="duotone" className="group-hover:translate-x-1 transition-transform" />
                  {loading ? 'Entrando...' : 'Acessar Painel'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/motoboy/register')}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Criar conta de entregador
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              Voltar para o site
            </button>

            <button
              type="button"
              onClick={() => window.open('https://wa.me/5512991234567', '_blank')}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-[#0d4f66] transition-colors py-2 group"
            >
              <WhatsappLogo size={18} weight="duotone" className="group-hover:animate-bounce" />
              Precisa de ajuda? Fale conosco
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );

}

