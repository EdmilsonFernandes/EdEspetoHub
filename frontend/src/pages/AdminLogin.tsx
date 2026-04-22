// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const ADMIN_REMEMBER_IDENTIFIER_KEY = 'auth:last-admin-identifier';

export function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, auth, hydrated } = useAuth();
  const { setBranding } = useTheme();
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState('');
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
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('auth:remember-admin') !== 'false';
  });
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('auth:superadmin-unlocked') === 'true';
  });

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
    if (loginRole === 'ADMIN' || loginRole === 'OPERATOR') {
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

  const handleLogin = async event => {
    event?.preventDefault();
    setLoginError('');
    setPendingPayment(null);
    setVerifyPrompt(null);

    try {
      const session = await authService.adminLogin(loginForm.identifier, loginForm.password);
      const redirectTab = sessionStorage.getItem('admin:redirectTab');
      const redirectSlug = sessionStorage.getItem('admin:redirectSlug');
      try {
        await runClientFreshStart({
          maxAgeMs: 8 * 60 * 60 * 1000,
          currentBuildId: APP_BUILD_INFO.buildId,
        });
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
    <AuthLayout>
      <div className="space-y-4 ds-login-card-enter w-full">
        <div className="text-center space-y-2.5">
          <button type="button" onClick={handleLogoTap} className="mx-auto flex flex-col items-center gap-3 hover:scale-[1.03] transition-transform active:scale-95">
            <div className="h-[4.75rem] w-[4.75rem] overflow-hidden rounded-full border-[4px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)] ring-1 ring-[#336886]/12">
              <img src="/janocaminho.png" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
            </div>
            <div className="text-center leading-tight">
              <p className="text-base font-black tracking-tight text-slate-900">Já no Caminho</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#336886]/80">Área do lojista</p>
            </div>
          </button>
          <div className="flex items-center justify-center gap-3">
            <LockKey size={32} weight="duotone" className="text-[#0d4f66]" />
            <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.03em]">
              {hubMode ? 'Login Lojista' : 'Login'}
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
          <div className="auth-segment">
            <button type="button" className="auth-segment-btn active">Lojista</button>
            <button type="button" onClick={() => navigate(`/cliente?mode=login${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''}`)} className="auth-segment-btn">Cliente</button>
            <button type="button" onClick={() => navigate(`/motoboy/login${hubSuffix}`)} className="auth-segment-btn">Entregador</button>
            <button type="button" onClick={() => navigate('/condominio/login')} className="auth-segment-btn">Condomínio</button>
            {superAdminUnlocked ? (
              <button type="button" onClick={() => navigate('/superadmin')} className="auth-segment-btn">Master</button>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleLogin} autoComplete="on" className="ds-card-elevated p-6 sm:p-8 space-y-5 bg-white/80 backdrop-blur-xl border-white/40">
          {biometricAvailable ? (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
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
                value={loginForm.identifier}
                onChange={e => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
                className="floating-input"
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
              <label htmlFor="email" className="floating-label">E-mail ou usuário</label>
            </div>

            <div className="floating-field">
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
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
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
              </button>
            </div>
          </div>

          {loginError ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100 animate-shake">
              <WarningCircle size={16} weight="fill" />
              <span>{loginError}</span>
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

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              className="ds-btn-shine w-full h-14 rounded-2xl bg-[#0d4f66] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              Acessar Painel
              <ArrowLeft size={20} weight="bold" className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => navigate(hubMode ? '/hub' : '/')}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} weight="duotone" />
              {hubMode ? 'Voltar ao hub' : 'Voltar ao início'}
            </button>
          </div>
        </form>

        <a
          href="mailto:contato@janocaminho.com.br"
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-[#0d4f66] transition-colors py-2"
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
    </AuthLayout>
  );

}
