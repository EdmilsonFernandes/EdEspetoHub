import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowSquareOut, Check, Eye, EyeSlash, LockKey, Scooter, ShieldCheck, SignOut, UserCircle, WarningCircle, WhatsappLogo } from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { motoboyService } from '../services/motoboyService';
import { useAuth } from '../contexts/AuthContext';
import { runClientFreshStart } from '../utils/clientFreshStart';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { AuthLayout } from '../layouts/AuthLayout';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';

export function MotoboyLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyPrompt, setVerifyPrompt] = useState<{ email?: string; emailMasked?: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [autoBiometricTried, setAutoBiometricTried] = useState(false);
  const [enrollmentPromptOpen, setEnrollmentPromptOpen] = useState(false);
  const [pendingBiometricSession, setPendingBiometricSession] = useState<any | null>(null);
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
  const [searchParams] = useSearchParams();
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
  const forceBiometric = String(searchParams.get('bio') || '') === '1';
  const hubMode = String(searchParams.get('hub') || '') === '1';
  const nextPath = String(searchParams.get('next') || '').trim();
  const hubSuffix = (() => {
    const params = new URLSearchParams();
    if (hubMode) params.set('hub', '1');
    if (nextPath) params.set('next', nextPath);
    return params.toString() ? `?${params.toString()}` : '';
  })();
  const accessPortalPath = `/entrar${hubSuffix}`;

  useEffect(() => {
    const refreshBiometricAvailability = () => {
      setBiometricAvailable(nativeBiometricService.isSupported() && nativeBiometricService.hasValidStoredMotoboyEnrollment());
    };

    refreshBiometricAvailability();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      refreshBiometricAvailability();
      if (attempts >= 12) {
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener('focus', refreshBiometricAvailability);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshBiometricAvailability);
    };
  }, []);

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

  const finishMotoboyLogin = (sessionData: any) => {
    nativeBiometricService.syncMotoboySession(sessionData);
    localStorage.setItem('motoboySession', JSON.stringify(sessionData));
    setAuth(sessionData);
    setPersistedSession(sessionData);
    navigate('/motoboy/home');
  };

  const handleEnableMotoboyBiometric = () => {
    if (pendingBiometricSession?.token) {
      const enabled = nativeBiometricService.enableMotoboy(pendingBiometricSession);
      setBiometricAvailable(enabled);
      if (!enabled) {
        setError('Não foi possível ativar a biometria neste aparelho.');
      }
    }
    const session = pendingBiometricSession;
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (session?.token) {
      finishMotoboyLogin(session);
    }
  };

  const handleSkipMotoboyBiometric = () => {
    const session = pendingBiometricSession;
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (session?.token) {
      finishMotoboyLogin(session);
    }
  };

  const handleBiometricLogin = async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    setError('');
    setVerifyPrompt(null);
    try {
      const session = await nativeBiometricService.loginMotoboyWithBiometrics('Confirme sua identidade para acessar suas entregas');
      finishMotoboyLogin(session);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar com biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    if (!biometricAvailable || biometricLoading || autoBiometricTried || alreadyLoggedIn) return;
    const hasTypedCredentials = !forceBiometric && (Boolean(String(form.email || '').trim()) || Boolean(String(form.password || '').trim()));
    if (hasTypedCredentials) return;

    setAutoBiometricTried(true);
    const timer = window.setTimeout(() => {
      void handleBiometricLogin();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [alreadyLoggedIn, autoBiometricTried, biometricAvailable, biometricLoading, forceBiometric, form.email, form.password]);

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
      nativeBiometricService.syncMotoboySession(sessionData);
      if (nativeBiometricService.shouldOfferMotoboyEnrollment(sessionData)) {
        setPendingBiometricSession(sessionData);
        setEnrollmentPromptOpen(true);
        return;
      }
      if (nativeBiometricService.hasStoredMotoboyProfile()) {
        nativeBiometricService.enableMotoboy(sessionData);
      }
      finishMotoboyLogin(sessionData);
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
    markManualLogoutRedirect('motoboy', '/hub');
    const token = String(persistedSession?.token || '').trim();
    if (token) {
      void motoboyService.unregisterPushToken({ token }).catch(() => undefined);
    }
    try {
      nativeBiometricService.syncMotoboySession(null);
    } catch {
      // ignore
    }
    try {
      setAuth(null);
    } catch {
      // ignore
    }
    nativeBiometricService.disableMotoboy();
    setPersistedSession(null);
    navigate('/hub', { replace: true });
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
          <button type="button" onClick={handleLogoTap} className="mx-auto flex flex-col items-center gap-3 hover:scale-[1.03] transition-transform active:scale-95">
            <div className="h-[4.75rem] w-[4.75rem] overflow-hidden rounded-full border-[4px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)] ring-1 ring-[#336886]/12">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
            </div>
            <div className="text-center leading-tight">
              <p className="text-base font-black tracking-tight text-slate-900">Já no Caminho</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#336886]/80">Portal do entregador</p>
            </div>
          </button>
          <div className="flex items-center justify-center gap-3">
            <Scooter size={34} weight="duotone" className="text-[#0d4f66]" />
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

        {!hubMode ? (
          <button
            type="button"
            onClick={() => navigate(accessPortalPath)}
            className="mx-auto inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:text-slate-700"
          >
            Escolher outro tipo de acesso
          </button>
        ) : null}

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
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-5">
              <div className="flex items-center gap-3 rounded-2xl border border-[#336886]/10 bg-[#336886]/6 px-3.5 py-3 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#0d4f66] shadow-sm ring-1 ring-[#336886]/10">
                  <Scooter size={22} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Login entregador</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">Entre para ver rotas, coletas e entregas.</p>
                </div>
              </div>

              {biometricAvailable ? (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/12 bg-[#336886]/8 px-4 py-3 text-sm font-black text-[#336886] shadow-[0_18px_34px_-28px_rgba(51,104,134,0.35)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LockKey size={18} weight="duotone" />
                  {biometricLoading ? 'Lendo biometria...' : 'Entrar com biometria'}
                </button>
              ) : null}

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

                {!hubMode ? (
                  <button
                    type="button"
                    onClick={() => navigate('/motoboy/register')}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Criar conta de entregador
                  </button>
                ) : null}
              </div>
            </form>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => navigate(hubMode ? '/hub' : '/')}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              {hubMode ? 'Voltar para o hub' : 'Voltar para o site'}
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
      <ConfirmationModal
        isOpen={enrollmentPromptOpen}
        onClose={handleSkipMotoboyBiometric}
        onConfirm={handleEnableMotoboyBiometric}
        title="Acessar mais rápido?"
        description="Ative a biometria neste aparelho para entrar nas suas entregas com digital, rosto ou bloqueio do celular nas próximas vezes."
        confirmLabel="Ativar biometria"
        cancelLabel="Agora não"
        variant="info"
        icon={<LockKey size={32} weight="duotone" />}
      />
    </AuthLayout>
  );

}
