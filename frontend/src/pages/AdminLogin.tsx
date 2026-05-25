// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { authService } from '../services/authService';
import { getPersistedBranding } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { runClientFreshStart } from '../utils/clientFreshStart';
import { APP_BUILD_INFO } from '../generated/buildInfo';
import { ArrowLeft, Check, Eye, EyeSlash, LockKey, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { MfaChallengeModal } from '../components/Auth/MfaChallengeModal';
import { persistTrustedMfaDevice } from '../utils/mfaDevice';
import { MFA_CHALLENGE_EXPIRED_MESSAGE, isMfaChallengeExpiredError } from '../utils/mfaErrors';
import { prefetchAdminLandingRoutes, scheduleAdminRoutePrefetch } from '../utils/adminRoutePrefetch';

const ADMIN_REMEMBER_IDENTIFIER_KEY = 'auth:last-admin-identifier';
const ADMIN_FRESH_START_BUDGET_MS = 350;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const hasInvalidEmailShape = (value: string) =>
  String(value || '').includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());

export function AdminLogin() {
  const isNativePlatform = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, auth, hydrated } = useAuth();
  const { setBranding } = useTheme();
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginFieldErrors, setLoginFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [pendingPayment, setPendingPayment] = useState(null);
  const [branding] = useState(getPersistedBranding());
  const [showPassword, setShowPassword] = useState(false);
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
    return localStorage.getItem('auth:remember-admin') !== 'false';
  });
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('auth:superadmin-unlocked') === 'true';
  });

  useEffect(() => scheduleAdminRoutePrefetch(), []);

  useEffect(() => {
    const refreshBiometricAvailability = () => {
      setBiometricAvailable(nativeBiometricService.isSupported() && nativeBiometricService.hasValidStoredAdminEnrollment());
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

  const finishAdminLogin = (sessionData: any) => {
    const redirectTab = sessionStorage.getItem('admin:redirectTab');
    const redirectSlug = sessionStorage.getItem('admin:redirectSlug');

    nativeBiometricService.syncAdminSession(sessionData);
    setAuth(sessionData);
    setBranding({
      primaryColor: sessionData.store?.settings?.primaryColor,
      secondaryColor: sessionData.store?.settings?.secondaryColor,
      logoUrl: sessionData.store?.settings?.logoUrl,
      brandName: sessionData.store?.name,
    });

    if (redirectTab && (!redirectSlug || redirectSlug === sessionData.store?.slug)) {
      sessionStorage.removeItem('admin:redirectTab');
      sessionStorage.removeItem('admin:redirectSlug');
      navigate('/admin/dashboard', { state: { activeTab: redirectTab } });
      return;
    }
    sessionStorage.removeItem('admin:redirectTab');
    sessionStorage.removeItem('admin:redirectSlug');
    const loginRole = String(sessionData?.user?.role || '').toUpperCase();
    if (loginRole === 'ADMIN' || loginRole === 'OPERATOR' || loginRole === 'LOJISTA') {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (isMobile && sessionData.store?.slug) {
        navigate(`/${sessionData.store.slug}`);
        return;
      }

      if (loginRole === 'ADMIN') {
        navigate('/admin/dashboard', { state: { activeTab: 'resumo' } });
        return;
      }
      navigate('/admin/queue');
      return;
    }
    navigate('/admin/queue');
  };

  const handleEnableAdminBiometric = () => {
    if (pendingBiometricSession?.token) {
      const enabled = nativeBiometricService.enableAdmin(pendingBiometricSession);
      setBiometricAvailable(enabled);
      if (!enabled) {
        setLoginError('Não foi possível ativar a biometria neste aparelho.');
      }
    }
    const session = pendingBiometricSession;
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (session?.token) {
      finishAdminLogin(session);
    }
  };

  const handleSkipAdminBiometric = () => {
    const session = pendingBiometricSession;
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (session?.token) {
      finishAdminLogin(session);
    }
  };

  const handleBiometricLogin = async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    setLoginError('');
    setPendingPayment(null);
    setVerifyPrompt(null);
    try {
      const session = await nativeBiometricService.loginAdminWithBiometrics('Confirme sua identidade para acessar sua operação');
      finishAdminLogin(session);
    } catch (error: any) {
      setLoginError(error?.message || 'Não foi possível entrar com biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const identifierFromUrl = String(searchParams.get('identifier') || searchParams.get('email') || '').trim().toLowerCase();
    if (identifierFromUrl) {
      setLoginForm((prev) => (prev.identifier ? prev : { ...prev, identifier: identifierFromUrl }));
      localStorage.setItem(ADMIN_REMEMBER_IDENTIFIER_KEY, identifierFromUrl);
      return;
    }
    if (!rememberDevice) return;
    const rememberedIdentifier = localStorage.getItem(ADMIN_REMEMBER_IDENTIFIER_KEY);
    if (rememberedIdentifier && !loginForm.identifier) {
      setLoginForm((prev) => ({ ...prev, identifier: rememberedIdentifier }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAutoBiometricTried(false);
  }, [searchParams]);

  useEffect(() => {
    if (!biometricAvailable || biometricLoading || autoBiometricTried) return;
    const hasTypedCredentials =
      !forceBiometric && (Boolean(String(loginForm.identifier || '').trim()) || Boolean(String(loginForm.password || '').trim()));
    if (hasTypedCredentials) return;

    setAutoBiometricTried(true);
    const timer = window.setTimeout(() => {
      void handleBiometricLogin();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    autoBiometricTried,
    biometricAvailable,
    biometricLoading,
    forceBiometric,
    loginForm.identifier,
    loginForm.password,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const normalizedIdentifier = String(loginForm.identifier || '').trim();
    if (rememberDevice && normalizedIdentifier) {
      localStorage.setItem(ADMIN_REMEMBER_IDENTIFIER_KEY, normalizedIdentifier);
      return;
    }
    localStorage.removeItem(ADMIN_REMEMBER_IDENTIFIER_KEY);
  }, [loginForm.identifier, rememberDevice]);

  const handleLogoTap = () => {
    if (superAdminUnlocked) return;
    setLogoTapCount((prev) => {
      const next = prev + 1;
      if (next >= 10) {
        setSuperAdminUnlocked(true);
        try {
          localStorage.setItem('auth:superadmin-unlocked', 'true');
        } catch {
          // no-op
        }
        return 0;
      }
      return next;
    });
  };

  const redirectToPendingPayment = (paymentUrl?: string | null, paymentLink?: string | null) => {
    const target = String(paymentUrl || '').trim();
    if (target) {
      try {
        const parsed = new URL(target, window.location.origin);
        if (parsed.origin === window.location.origin) {
          navigate(`${parsed.pathname}${parsed.search}${parsed.hash}`);
          return;
        }
      } catch {
        if (target.startsWith('/')) {
          navigate(target);
          return;
        }
      }
      window.location.href = target;
      return;
    }

    const external = String(paymentLink || '').trim();
    if (external) {
      window.location.href = external;
      return;
    }
  };

  const completeAdminLoginFlow = async (session: any) => {
    const redirectTab = sessionStorage.getItem('admin:redirectTab');
    const redirectSlug = sessionStorage.getItem('admin:redirectSlug');
    prefetchAdminLandingRoutes();
    try {
      const freshStartPromise = runClientFreshStart({
        maxAgeMs: 8 * 60 * 60 * 1000,
        currentBuildId: APP_BUILD_INFO.buildId,
        preserveLocalStorageKeys: [
          'adminSession',
          ADMIN_REMEMBER_IDENTIFIER_KEY,
          'auth:remember-admin',
          'auth:superadmin-unlocked',
        ],
        preserveSessionStorageKeys: [
          'admin:redirectTab',
          'admin:redirectSlug',
          'admin:activeTab',
        ],
      }).catch(() => null);
      await Promise.race([freshStartPromise, wait(ADMIN_FRESH_START_BUDGET_MS)]);
    } catch {
      // no-op: login must continue even if client cleanup fails
    }
    if (redirectTab) sessionStorage.setItem('admin:redirectTab', redirectTab);
    if (redirectSlug) sessionStorage.setItem('admin:redirectSlug', redirectSlug);
    const sessionData = { token: session.token, user: session.user, store: session.store };
    nativeBiometricService.syncAdminSession(sessionData);
    if (nativeBiometricService.shouldOfferAdminEnrollment(sessionData)) {
      setPendingBiometricSession(sessionData);
      setEnrollmentPromptOpen(true);
      return;
    }
    if (nativeBiometricService.hasStoredAdminProfile()) {
      nativeBiometricService.enableAdmin(sessionData);
    }
    finishAdminLogin(sessionData);
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
      }, { authMode: 'admin' });
      persistTrustedMfaDevice(session?.trustedDevice);
      setMfaChallenge(null);
      await completeAdminLoginFlow(session);
    } catch (error: any) {
      if (isMfaChallengeExpiredError(error)) {
        setLoginError('');
        setMfaError(MFA_CHALLENGE_EXPIRED_MESSAGE);
        setMfaChallenge((current: any) => (current ? { ...current, expired: true } : current));
        return;
      }
      setMfaError(error?.message || 'Código inválido. Tente novamente.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleLogin = async event => {
    event?.preventDefault();
    setLoginError('');
    setPendingPayment(null);
    setVerifyPrompt(null);
    const identifierValue = String(loginForm.identifier || '').trim();
    const passwordValue = String(loginForm.password || '');
    const nextFieldErrors: { identifier?: string; password?: string } = {};

    if (!identifierValue) {
      nextFieldErrors.identifier = 'Informe seu e-mail ou usuário.';
    } else if (hasInvalidEmailShape(identifierValue)) {
      nextFieldErrors.identifier = 'E-mail inválido.';
    }
    if (!passwordValue) {
      nextFieldErrors.password = 'Informe sua senha.';
    }
    if (Object.keys(nextFieldErrors).length) {
      setLoginFieldErrors(nextFieldErrors);
      setLoginError(nextFieldErrors.identifier || nextFieldErrors.password || 'Confira os campos obrigatórios.');
      return;
    }

    try {
      setLoginFieldErrors({});
      const session = await authService.adminLogin(loginForm.identifier, loginForm.password);
      if (session?.mfaRequired) {
        setMfaError('');
        setMfaChallenge(session);
        return;
      }
      await completeAdminLoginFlow(session);
    } catch (error: any) {
      const message = error.message || 'Não foi possível autenticar agora.';
      if (error?.code === 'PAY-010') {
        const paymentUrl = error?.details?.paymentUrl;
        const paymentLink = error?.details?.paymentLink;
        setPendingPayment({
          paymentUrl,
          paymentLink,
        });
        setLoginError('Pagamento pendente. Redirecionando para regularizar sua assinatura...');
        window.setTimeout(() => redirectToPendingPayment(paymentUrl, paymentLink), 350);
        return;
      }
      if (error?.code === 'AUTH-005') {
        const targetEmail = error?.details?.email;
        if (targetEmail) {
          localStorage.setItem('signupEmail', String(targetEmail).toLowerCase());
        }
        setVerifyPrompt({
          email: targetEmail,
          emailMasked: error?.details?.emailMasked,
        });
      }
      setLoginError(message);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    const email = verifyPrompt?.email;
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setLoginError('');
    try {
      const response = await authService.resendVerification(email);
      setResendCooldown(Number(response?.cooldownSec || 60));
      setLoginError(response?.message || 'Se o e-mail existir, enviaremos instruções.');
    } catch (error: any) {
      setLoginError(error?.message || 'Não foi possível reenviar agora.');
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    const role = String(auth?.user?.role || '').toUpperCase();
    if (auth?.token && (role === 'ADMIN' || role === 'OPERATOR' || role === 'LOJISTA')) {
      const redirectTab = sessionStorage.getItem('admin:redirectTab');
      const redirectSlug = sessionStorage.getItem('admin:redirectSlug');
      if (redirectTab && (!redirectSlug || redirectSlug === auth.store?.slug)) {
        sessionStorage.removeItem('admin:redirectTab');
        sessionStorage.removeItem('admin:redirectSlug');
        navigate('/admin/dashboard', { state: { activeTab: redirectTab } });
        return;
      }
      sessionStorage.removeItem('admin:redirectTab');
      sessionStorage.removeItem('admin:redirectSlug');
      if (role === 'ADMIN') {
        navigate('/admin/dashboard', { state: { activeTab: 'resumo' } });
        return;
      }
      navigate('/admin/queue');
    }
  }, [auth?.token, auth?.user?.role, hydrated, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      sessionStorage.setItem('admin:redirectTab', tab);
    }
  }, [searchParams]);

  return (
    <AuthLayout
      title={hubMode ? 'Lojista' : 'Login'}
      eyebrow="Área do lojista"
      subtitle="Painel, pedidos e operação"
      backTo={hubMode ? '/hub' : accessPortalPath}
      showHeader
    >
      <div className="space-y-2 ds-login-card-enter w-full sm:space-y-4">
        <div className="text-center space-y-1 sm:space-y-2.5">
          <button type="button" onClick={handleLogoTap} className="mx-auto hidden flex-col items-center gap-3 transition-transform active:scale-95 sm:flex sm:hover:scale-[1.03]">
            <div className="h-16 w-16 overflow-hidden rounded-full border-[3px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)] ring-1 ring-[#336886]/12 sm:h-[4.75rem] sm:w-[4.75rem] sm:border-[4px]">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
            </div>
            <div className="text-center leading-tight">
              <p className="text-sm font-black tracking-tight text-slate-900 sm:text-base">Já no Caminho</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#336886]/80 sm:text-[10px] sm:tracking-[0.22em]">Área do lojista</p>
            </div>
          </button>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <LockKey size={24} weight="duotone" className="text-[#0d4f66] sm:h-8 sm:w-8" />
            <h2 className="text-xl font-black text-slate-800 tracking-[-0.03em] sm:text-[2.2rem]">
              {hubMode ? 'Lojista' : 'Login'}
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
            className="mx-auto inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:text-slate-700 sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]"
          >
            Trocar tipo de acesso
          </button>
        ) : null}

        <form
          onSubmit={handleLogin}
          onFocusCapture={prefetchAdminLandingRoutes}
          autoComplete="on"
          className="ds-card-elevated p-4 space-y-3 bg-white/80 backdrop-blur-xl border-white/40 sm:p-8 sm:space-y-5"
        >
          {biometricAvailable ? (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/12 bg-[#336886]/8 px-4 py-2.5 text-sm font-black text-[#336886] shadow-[0_18px_34px_-28px_rgba(51,104,134,0.35)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
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

          <div className="space-y-3 sm:space-y-4">
            <div className="floating-field">
              <input
                id="email"
                name="email"
                autoComplete="username"
                type="text"
                value={loginForm.identifier}
                onChange={e => {
                  setLoginForm(prev => ({ ...prev, identifier: e.target.value }));
                  if (loginFieldErrors.identifier) setLoginFieldErrors(prev => ({ ...prev, identifier: '' }));
                }}
                className={`floating-input ${loginFieldErrors.identifier ? 'border-rose-300 bg-rose-50/80 focus:border-rose-300 focus:ring-rose-200' : ''}`}
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                aria-invalid={Boolean(loginFieldErrors.identifier)}
                aria-describedby={loginFieldErrors.identifier ? 'admin-identifier-error' : undefined}
              />
              <label htmlFor="email" className="floating-label">E-mail ou usuário</label>
              {loginFieldErrors.identifier ? <p id="admin-identifier-error" className="mt-1.5 text-xs font-bold text-rose-600">{loginFieldErrors.identifier}</p> : null}
            </div>

            <div className="floating-field">
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={e => {
                  setLoginForm(prev => ({ ...prev, password: e.target.value }));
                  if (loginFieldErrors.password) setLoginFieldErrors(prev => ({ ...prev, password: '' }));
                }}
                className={`floating-input ${loginFieldErrors.password ? 'border-rose-300 bg-rose-50/80 focus:border-rose-300 focus:ring-rose-200' : ''}`}
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-invalid={Boolean(loginFieldErrors.password)}
                aria-describedby={loginFieldErrors.password ? 'admin-password-error' : undefined}
              />
              <label htmlFor="password" className="floating-label">Sua senha secreta</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
              </button>
              {loginFieldErrors.password ? <p id="admin-password-error" className="mt-1.5 text-xs font-bold text-rose-600">{loginFieldErrors.password}</p> : null}
            </div>
          </div>

          {loginError ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100 animate-shake">
              <WarningCircle size={16} weight="fill" />
              <span>{loginError}</span>
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
                        localStorage.setItem('auth:remember-admin', String(next));
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

          <div className="space-y-3 pt-1 sm:pt-2">
            <button
              type="submit"
              className="ds-btn-shine w-full h-12 rounded-2xl bg-[#0d4f66] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group sm:h-14"
            >
              Acessar Painel
              <ArrowLeft size={20} weight="bold" className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => navigate(hubMode ? '/hub' : '/')}
              className="hidden w-full h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all items-center justify-center gap-2 sm:flex sm:h-12 sm:text-base"
            >
              <ArrowLeft size={18} weight="duotone" />
              {hubMode ? 'Voltar para o app' : 'Voltar ao início'}
            </button>
          </div>
        </form>

        <a
          href="mailto:contato@janocaminho.com.br"
          className="hidden w-full items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 transition-colors hover:text-[#0d4f66] sm:flex"
        >
          Precisa de ajuda? contato@janocaminho.com.br
        </a>
      </div>
      <ConfirmationModal
        isOpen={enrollmentPromptOpen}
        onClose={handleSkipAdminBiometric}
        onConfirm={handleEnableAdminBiometric}
        title="Acessar mais rápido?"
        description="Ative a biometria neste aparelho para entrar na operação com digital, rosto ou bloqueio do celular nas próximas vezes."
        confirmLabel="Ativar biometria"
        cancelLabel="Agora não"
        variant="info"
        icon={<LockKey size={32} weight="duotone" />}
      />
      <MfaChallengeModal
        open={Boolean(mfaChallenge)}
        challenge={mfaChallenge}
        audience="admin"
        loading={mfaLoading}
        error={mfaError}
        expired={Boolean(mfaChallenge?.expired)}
        onCancel={() => setMfaChallenge(null)}
        onRestart={() => {
          setMfaChallenge(null);
          setMfaError('');
          setLoginError('');
        }}
        onVerify={handleMfaVerify}
      />
    </AuthLayout>
  );

}
