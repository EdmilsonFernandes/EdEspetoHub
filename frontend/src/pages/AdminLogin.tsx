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
import { AuthMascotPanel } from '../components/Auth/AuthMascotPanel';
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
  const [loginMessage, setLoginMessage] = useState('');
  const [loginFieldErrors, setLoginFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [pendingPayment, setPendingPayment] = useState(null);
  const [branding] = useState(getPersistedBranding());
  const [showPassword, setShowPassword] = useState(false);
  const [verifyPrompt, setVerifyPrompt] = useState<{ email?: string; emailMasked?: string } | null>(null);
  const [activationCodeDigits, setActivationCodeDigits] = useState(['', '', '', '']);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationMessage, setActivationMessage] = useState('');
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
  const activationCode = activationCodeDigits.join('');

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
    setLoginMessage('');
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
    if (verifyPrompt) return;
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
    verifyPrompt,
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
    setLoginMessage('');
    setPendingPayment(null);
    setVerifyPrompt(null);
    setActivationCodeDigits(['', '', '', '']);
    setActivationError('');
    setActivationMessage('');
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
        setActivationCodeDigits(['', '', '', '']);
        setActivationError('');
        setActivationMessage('Digite o código recebido por e-mail para liberar o painel da loja.');
        window.setTimeout(() => {
          const input = document.getElementById('admin-activation-otp-0') as HTMLInputElement | null;
          input?.focus();
          input?.select?.();
        }, 160);
        return;
      }
      setLoginError(message);
    }
  };

  const normalizeActivationError = (error: any) => {
    const rawMessage = String(error?.message || '').trim();
    const normalized = rawMessage
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalized.includes('expir')) return 'Código expirado. Reenvie um novo código e tente novamente.';
    if (!rawMessage || normalized.includes('parametro') || normalized.includes('token') || normalized.includes('codigo')) {
      return 'Código inválido. Confira os 4 dígitos recebidos no e-mail e tente novamente.';
    }
    return rawMessage;
  };

  const handleActivationDigitChange = (index: number, value: string) => {
    const digitsOnly = String(value || '').replace(/\D/g, '');
    if (!digitsOnly) {
      setActivationCodeDigits((prev) => prev.map((digit, i) => (i === index ? '' : digit)));
      return;
    }
    const nextDigits = digitsOnly.slice(0, 4 - index).split('');
    setActivationCodeDigits((prev) => {
      const next = [...prev];
      nextDigits.forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });
    setActivationError('');
    const nextIndex = Math.min(index + nextDigits.length, 3);
    window.setTimeout(() => {
      const input = document.getElementById(`admin-activation-otp-${nextIndex}`) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }, 0);
  };

  const handleActivationKeyDown = (index: number, event: any) => {
    if (event.key === 'Backspace' && !activationCodeDigits[index] && index > 0) {
      event.preventDefault();
      const input = document.getElementById(`admin-activation-otp-${index - 1}`) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      (document.getElementById(`admin-activation-otp-${index - 1}`) as HTMLInputElement | null)?.focus();
    }
    if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault();
      (document.getElementById(`admin-activation-otp-${index + 1}`) as HTMLInputElement | null)?.focus();
    }
  };

  const handleActivationPaste = (event: any) => {
    const pasted = String(event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    setActivationCodeDigits([pasted[0] || '', pasted[1] || '', pasted[2] || '', pasted[3] || '']);
    setActivationError('');
    const targetIndex = Math.min(Math.max(pasted.length - 1, 0), 3);
    window.setTimeout(() => (document.getElementById(`admin-activation-otp-${targetIndex}`) as HTMLInputElement | null)?.focus(), 0);
  };

  const handleConfirmActivation = async () => {
    const email = String(verifyPrompt?.email || loginForm.identifier || '').trim().toLowerCase();
    if (!email || activationCode.length !== 4 || activationLoading) return;
    setActivationLoading(true);
    setActivationError('');
    setActivationMessage('');
    try {
      await authService.verifyEmail({ email, token: activationCode });
      setActivationMessage('Loja ativada. Estamos entrando no painel...');
      if (loginForm.password) {
        try {
          const session = await authService.adminLogin(email, loginForm.password);
          if (session?.mfaRequired) {
            setMfaError('');
            setMfaChallenge(session);
            setVerifyPrompt(null);
            return;
          }
          await completeAdminLoginFlow(session);
          return;
        } catch {
          // Se o login automático falhar, a ativação continua válida e o usuário entra manualmente.
        }
      }
      setVerifyPrompt(null);
      setLoginForm((prev) => ({ ...prev, identifier: email }));
      setLoginMessage('Loja ativada com sucesso. Entre com sua senha para acessar o painel.');
      setLoginError('');
    } catch (error: any) {
      setActivationError(normalizeActivationError(error));
    } finally {
      setActivationLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    const email = String(verifyPrompt?.email || loginForm.identifier || '').trim().toLowerCase();
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setLoginError('');
    setActivationError('');
    setActivationMessage('');
    try {
      const response = await authService.resendVerification(email);
      setResendCooldown(Number(response?.cooldownSec || 60));
      setActivationMessage(response?.message || `Novo código enviado para ${verifyPrompt?.emailMasked || email}.`);
    } catch (error: any) {
      setActivationError(error?.message || 'Não foi possível reenviar agora.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleUseAnotherEmail = () => {
    setVerifyPrompt(null);
    setActivationCodeDigits(['', '', '', '']);
    setActivationError('');
    setActivationMessage('');
    setLoginError('');
    setLoginMessage('Confira o e-mail usado no cadastro e tente entrar novamente.');
    window.setTimeout(() => {
      const input = document.getElementById('email') as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }, 120);
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
      title="Área do lojista"
      eyebrow="Já no Caminho"
      subtitle="Painel, pedidos e operação"
      backTo={hubMode ? '/hub' : accessPortalPath}
      showHeader
    >
      <div className="space-y-1.5 ds-login-card-enter w-full sm:space-y-4">
        <div className="hidden text-center sm:block">
          <button
            type="button"
            onClick={handleLogoTap}
            className="mx-auto mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/82 text-[#1c4b62] shadow-[0_18px_38px_-26px_rgba(13,79,102,0.5)] transition active:scale-95 sm:hover:scale-[1.03]"
            aria-label="Acesso seguro"
          >
            <LockKey size={23} weight="duotone" />
          </button>
          <h2 className="text-[2rem] font-black tracking-[-0.03em] text-slate-800">
            {hubMode ? 'Acesso da loja' : 'Entrar no painel'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
            Gerencie pedidos, cardápio e operação com sua conta cadastrada.
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
            className="mx-auto hidden min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:text-slate-700 sm:inline-flex sm:px-4 sm:text-[11px] sm:tracking-[0.18em]"
          >
            Trocar tipo de acesso
          </button>
        ) : null}

        {verifyPrompt ? (
          <div className="ds-card-elevated overflow-hidden border-white/40 bg-white/86 p-0 shadow-[0_30px_80px_-40px_rgba(13,79,102,0.5)] backdrop-blur-xl">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#1c4b62,#336886)] px-5 py-5 text-white sm:px-7 sm:py-7">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_70%)]" />
              <div className="relative flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/14 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.75)]">
                  <ShieldCheck size={25} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">Ativação segura</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Ative sua loja</h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-white/80">
                    Enviamos um código de 4 dígitos para{' '}
                    <span className="font-black text-white">{verifyPrompt.emailMasked || verifyPrompt.email}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
              <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-2">
                  {activationCodeDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`admin-activation-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={digit}
                      onChange={(e) => handleActivationDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleActivationKeyDown(index, e)}
                      onPaste={handleActivationPaste}
                      className="h-14 w-12 rounded-2xl border border-slate-200 bg-white text-center text-2xl font-black tracking-[0.1em] text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.5)] outline-none transition focus:border-[#1c4b62] focus:bg-white focus:ring-4 focus:ring-[#1c4b62]/10 sm:h-16 sm:w-16"
                    />
                  ))}
                </div>
                <p className="mt-3 text-center text-[11px] font-bold leading-relaxed text-slate-500">
                  O código expira em 30 minutos. Se não recebeu, reenvie.
                </p>
              </div>

              {activationError ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700">
                  <WarningCircle size={18} weight="fill" />
                  <span>{activationError}</span>
                </div>
              ) : null}

              {activationMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold leading-relaxed text-emerald-700">
                  {activationMessage}
                </div>
              ) : null}

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleConfirmActivation}
                  disabled={activationCode.length !== 4 || activationLoading}
                  className="ds-btn-shine h-12 rounded-2xl bg-[linear-gradient(135deg,#1c4b62,#336886)] text-base font-black text-white shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] transition-all active:scale-[0.98] disabled:opacity-60 sm:h-14"
                >
                  {activationLoading ? 'Validando código...' : 'Confirmar código'}
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendCooldown > 0 || !String(verifyPrompt?.email || loginForm.identifier || '').trim()}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
                >
                  {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                </button>
                <button
                  type="button"
                  onClick={handleUseAnotherEmail}
                  className="rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  Usar outro e-mail
                </button>
              </div>
            </div>
          </div>
        ) : (
        <form
          onSubmit={handleLogin}
          onFocusCapture={prefetchAdminLandingRoutes}
          autoComplete="on"
          className="ds-card-elevated p-4 space-y-3 bg-white/80 backdrop-blur-xl border-white/40 sm:p-7 sm:space-y-5 lg:p-8"
        >
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

          {loginMessage ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
              <ShieldCheck size={16} weight="fill" />
              <span>{loginMessage}</span>
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
                <div className={`h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberDevice ? 'bg-[#1c4b62] border-[#1c4b62]' : 'border-slate-300 group-hover:border-slate-400 bg-white'}`}>
                  {rememberDevice && <Check size={12} weight="bold" className="text-white" />}
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors uppercase tracking-wider">Lembrar acesso</span>
            </label>

            <button
              type="button"
              onClick={() => navigate('/forgot-password?perfil=lojista')}
              className="inline-flex min-h-10 items-center rounded-full px-2 text-xs font-bold uppercase tracking-wider text-[#1c4b62] hover:text-[#153a4c] hover:underline"
            >
              Recuperar senha
            </button>
          </div>

          <div className="space-y-3 pt-1 sm:pt-2">
            <button
              type="submit"
              className="ds-btn-shine w-full h-12 rounded-2xl bg-[linear-gradient(135deg,#1c4b62,#336886)] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group sm:h-14"
            >
              Acessar Painel
              <ArrowLeft size={20} weight="bold" className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>

            {biometricAvailable ? (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/15 bg-[#edf5fa] px-4 py-2.5 text-sm font-black text-[#153A4C] shadow-[0_14px_30px_-26px_rgba(51,104,134,0.45)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
              >
                <LockKey size={18} weight="duotone" />
                {biometricLoading ? 'Lendo biometria...' : 'Usar biometria neste aparelho'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(hubMode ? '/hub' : '/')}
              className="hidden w-full h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all items-center justify-center gap-2 sm:flex sm:h-12 sm:text-base"
            >
              <ArrowLeft size={18} weight="duotone" />
              {hubMode ? 'Voltar para o app' : 'Voltar ao início'}
            </button>
          </div>
          <AuthMascotPanel variant="admin" />
        </form>
        )}

        <a
          href="mailto:contato@janocaminho.com.br"
          className="hidden w-full items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 transition-colors hover:text-[#1c4b62] sm:flex"
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
