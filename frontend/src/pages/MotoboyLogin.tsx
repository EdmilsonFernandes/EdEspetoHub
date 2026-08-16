import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowSquareOut, Check, Eye, EyeSlash, LockKey, Scooter, ShieldCheck, SignOut, UserCircle, WarningCircle, WhatsappLogo } from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { motoboyService } from '../services/motoboyService';
import { runClientFreshStart } from '../utils/clientFreshStart';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { AuthLayout } from '../layouts/AuthLayout';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { markManualLogoutRedirect } from '../utils/sessionRedirect';
import { MfaChallengeModal } from '../components/Auth/MfaChallengeModal';
import { AuthMascotPanel } from '../components/Auth/AuthMascotPanel';
import { persistTrustedMfaDevice } from '../utils/mfaDevice';
import { MFA_CHALLENGE_EXPIRED_MESSAGE, isMfaChallengeExpiredError } from '../utils/mfaErrors';

const hasInvalidEmailShape = (value: string) =>
  String(value || '').includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());

export function MotoboyLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
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
  const [mfaChallenge, setMfaChallenge] = useState<any | null>(null);
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('auth:remember-motoboy') !== 'false';
  });
  const logoTapCountRef = useRef(0);
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('auth:superadmin-unlocked') === 'true';
  });
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

  const finishMotoboyLogin = (sessionData: any) => {
    nativeBiometricService.syncMotoboySession(sessionData);
    localStorage.setItem('motoboySession', JSON.stringify(sessionData));
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

  const completeMotoboyLoginFlow = async (session: any) => {
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
    if (Boolean(session?.user?.mustChangePassword)) {
      finishMotoboyLogin(sessionData);
      return;
    }
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
  };

  const handleMfaVerify = async ({ code, trustDevice }: { code: string; trustDevice: boolean }) => {
    if (!mfaChallenge?.challengeToken || mfaLoading) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const session = await authService.verifyMfaChallenge({
        challengeToken: mfaChallenge.challengeToken,
        code,
        trustDevice,
      }, { authMode: 'motoboy' });
      persistTrustedMfaDevice(session?.trustedDevice);
      setMfaChallenge(null);
      await completeMotoboyLoginFlow(session);
    } catch (err: any) {
      if (isMfaChallengeExpiredError(err)) {
        setError('');
        setMfaError(MFA_CHALLENGE_EXPIRED_MESSAGE);
        setMfaChallenge((current: any) => (current ? { ...current, expired: true } : current));
        return;
      }
      setMfaError(err?.message || 'Código inválido. Tente novamente.');
    } finally {
      setMfaLoading(false);
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
    if (loading) return;
    const identifierValue = String(form.email || '').trim();
    const passwordValue = String(form.password || '');
    const nextFieldErrors: { email?: string; password?: string } = {};

    if (!identifierValue) {
      nextFieldErrors.email = 'Informe seu e-mail ou usuário.';
    } else if (hasInvalidEmailShape(identifierValue)) {
      nextFieldErrors.email = 'E-mail inválido.';
    }
    if (!passwordValue) {
      nextFieldErrors.password = 'Informe sua senha.';
    }
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError(nextFieldErrors.email || nextFieldErrors.password || 'Confira os campos obrigatórios.');
      return;
    }

    setFieldErrors({});
    setError('');
    setVerifyPrompt(null);
    setLoading(true);
    try {
      const session = await authService.login(form.email, form.password, { authMode: 'motoboy' });
      if (session?.mfaRequired) {
        setMfaError('');
        setMfaChallenge(session);
        return;
      }
      await completeMotoboyLoginFlow(session);
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
    <AuthLayout
      title={alreadyLoggedIn ? 'Sessão ativa' : 'Área do entregador'}
      eyebrow="Já no Caminho"
      subtitle="Entregas, rotas e ganhos"
      backTo={hubMode ? '/hub' : accessPortalPath}
      showHeader
    >
      <div className="space-y-1.5 ds-login-card-enter w-full sm:space-y-4">
        <div className="hidden text-center sm:block">
          <button
            type="button"
            onClick={handleLogoTap}
            className="mx-auto mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/82 text-[#1c4b62] shadow-[0_18px_38px_-26px_rgba(13,79,102,0.5)] transition active:scale-95 sm:hover:scale-[1.03]"
            aria-label="Acesso do entregador"
          >
            <Scooter size={24} weight="duotone" />
          </button>
          <h2 className="text-[2rem] font-black tracking-[-0.03em] text-slate-800">
            {alreadyLoggedIn ? 'Sessão ativa' : 'Entrar como entregador'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
            Veja entregas, rotas e ganhos com sua conta cadastrada.
          </p>
          {superAdminUnlocked ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Modo Super Admin</p>
            </div>
          ) : null}
        </div>

        {!hubMode ? (
          <button
            type="button"
            onClick={() => navigate(accessPortalPath)}
            className="mx-auto hidden items-center justify-center rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:text-slate-700 sm:inline-flex sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]"
          >
            Trocar tipo de acesso
          </button>
        ) : null}

        <div className="ds-card-elevated p-4 space-y-3 bg-white/80 backdrop-blur-xl border-white/40 sm:p-7 sm:space-y-5 lg:p-8">
          {alreadyLoggedIn ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex items-center gap-4 backdrop-blur-sm">
                <div className="h-12 w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#1c4b62] shadow-sm">
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
                  className="ds-btn-shine w-full h-12 rounded-2xl bg-[#1c4b62] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:h-14"
                >
                  <ArrowSquareOut size={20} weight="bold" />
                  Ir para o Painel
                </button>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:h-12 sm:text-base"
                >
                  <SignOut size={18} weight="duotone" />
                  Trocar de Conta
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-3 sm:space-y-5">
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
                      className="flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-slate-900 font-bold disabled:opacity-50 transition-all hover:bg-amber-600 shadow-sm active:scale-95"
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

              <div className="space-y-3 sm:space-y-4">
                <div className="floating-field">
                  <input
                    id="email"
                    name="email"
                    autoComplete="username"
                    type="text"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className={`floating-input ${fieldErrors.email ? 'border-rose-300 bg-rose-50/80 focus:border-rose-300 focus:ring-rose-200' : ''}`}
                    placeholder=" "
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'motoboy-identifier-error' : undefined}
                  />
                  <label htmlFor="email" className="floating-label">Seu e-mail ou usuário</label>
                  {fieldErrors.email ? <p id="motoboy-identifier-error" className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.email}</p> : null}
                </div>

                <div className="floating-field">
                  <input
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    className={`floating-input ${fieldErrors.password ? 'border-rose-300 bg-rose-50/80 focus:border-rose-300 focus:ring-rose-200' : ''}`}
                    placeholder=" "
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'motoboy-password-error' : undefined}
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
                  {fieldErrors.password ? <p id="motoboy-password-error" className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.password}</p> : null}
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100 animate-shake">
                  <WarningCircle size={16} weight="fill" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="hidden items-center justify-center gap-2 py-1 px-3 rounded-xl bg-slate-50 border border-slate-100/50 sm:flex">
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
                    <div className={`h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberDevice ? 'bg-[#1c4b62] border-[#1c4b62]' : 'border-slate-300 group-hover:border-slate-400 bg-white'}`}>
                      {rememberDevice && <Check size={12} weight="bold" className="text-white" />}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors uppercase tracking-wider">Lembrar acesso</span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate('/forgot-password?perfil=entregador')}
                  className="text-xs font-bold text-[#1c4b62] hover:text-[#153a4c] hover:underline uppercase tracking-wider"
                >
                  Recuperar senha
                </button>
              </div>

              <div className="space-y-3 pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-shine w-full h-12 rounded-2xl bg-[linear-gradient(135deg,#1c4b62,#336886)] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 sm:h-14"
                >
                  <Scooter size={22} weight="duotone" className="group-hover:translate-x-1 transition-transform" />
                  {loading ? 'Entrando...' : 'Acessar Painel'}
                </button>

                {biometricAvailable ? (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading || loading}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/15 bg-[#edf5fa] px-4 py-2.5 text-sm font-black text-[#153A4C] shadow-[0_14px_30px_-26px_rgba(51,104,134,0.45)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                  >
                    <LockKey size={18} weight="duotone" />
                    {biometricLoading ? 'Lendo biometria...' : 'Usar biometria neste aparelho'}
                  </button>
                ) : null}

                {!hubMode ? (
                  <button
                    type="button"
                    onClick={() => navigate('/motoboy/register')}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:h-12 sm:text-base"
                  >
                    Criar conta de entregador
                  </button>
                ) : null}
              </div>
              <AuthMascotPanel variant="motoboy" />
            </form>
          )}

          <div className="space-y-1 pt-1 sm:space-y-2 sm:pt-2">
            <button
              type="button"
              onClick={() => navigate(hubMode ? '/hub' : '/')}
              className="hidden w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest sm:block"
            >
              {hubMode ? 'Voltar para o hub' : 'Voltar para o site'}
            </button>

            <button
              type="button"
              onClick={() => window.open('https://wa.me/5512991234567', '_blank')}
              className="hidden w-full items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 transition-colors hover:text-[#1c4b62] sm:flex group"
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
      <MfaChallengeModal
        open={Boolean(mfaChallenge)}
        challenge={mfaChallenge}
        audience="motoboy"
        loading={mfaLoading}
        error={mfaError}
        expired={Boolean(mfaChallenge?.expired)}
        onCancel={() => setMfaChallenge(null)}
        onRestart={() => {
          setMfaChallenge(null);
          setMfaError('');
          setError('');
        }}
        onVerify={handleMfaVerify}
      />
    </AuthLayout>
  );

}
