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
import { ArrowLeft, Eye, EyeSlash, LockKey, User, WarningCircle } from '@phosphor-icons/react';

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
      setAuth(sessionData);
      setBranding({
        primaryColor: session.store?.settings?.primaryColor,
        secondaryColor: session.store?.settings?.secondaryColor,
        logoUrl: session.store?.settings?.logoUrl,
        brandName: session.store?.name,
      });
      if (redirectTab && (!redirectSlug || redirectSlug === session.store?.slug)) {
        sessionStorage.removeItem('admin:redirectTab');
        sessionStorage.removeItem('admin:redirectSlug');
        navigate('/admin/dashboard', { state: { activeTab: redirectTab } });
        return;
      }
      sessionStorage.removeItem('admin:redirectTab');
      sessionStorage.removeItem('admin:redirectSlug');
      const loginRole = String(session?.user?.role || '').toUpperCase();
      if (loginRole === 'ADMIN') {
        navigate('/admin/dashboard', { state: { activeTab: 'resumo' } });
        return;
      }
      navigate('/admin/queue');
    } catch (error: any) {
      const message = error.message || 'Não foi possível autenticar agora.';
      if (error?.code === 'PAY-010') {
        setPendingPayment({
          paymentUrl: error?.details?.paymentUrl,
          paymentLink: error?.details?.paymentLink,
        });
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
    if (auth?.token && (role === 'ADMIN' || role === 'OPERATOR' || role === 'CHURRASQUEIRO')) {
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
      <div className="space-y-4 login-page-enter">
        <div className="text-center space-y-2">
          <img src="/janocaminho.jpg" alt="Já no Caminho" className="mx-auto h-12 w-auto rounded-lg" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Acesso da plataforma</p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800">Login Admin Loja</h2>
        </div>

        <div className="auth-segment">
          <button type="button" className="auth-segment-btn active">Loja</button>
          <button type="button" onClick={() => navigate('/motoboy/login')} className="auth-segment-btn">Entregador</button>
          <button type="button" onClick={() => navigate('/superadmin')} className="auth-segment-btn">Super Admin</button>
        </div>

        <form onSubmit={handleLogin} className="login-card-premium p-5 sm:p-6 space-y-4">
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
              <User size={17} weight="duotone" />
            </span>
            <input
              id="admin-identifier"
              type="text"
              value={loginForm.identifier}
              onChange={e => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
              className="floating-input with-icon"
              placeholder=" "
              autoCapitalize="none"
            />
            <label htmlFor="admin-identifier" className="floating-label with-icon">Usuário ou e-mail</label>
          </div>
          {loginError ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 -mt-2">
              <WarningCircle size={14} weight="fill" />
              <span>{loginError}</span>
            </div>
          ) : null}
          {pendingPayment?.paymentUrl && (
            <a href={pendingPayment.paymentUrl} className="inline-flex text-xs font-semibold text-amber-700 hover:underline">
              Ir para pagamento pendente
            </a>
          )}
          {!pendingPayment?.paymentUrl && pendingPayment?.paymentLink && (
            <a href={pendingPayment.paymentLink} target="_blank" rel="noreferrer" className="inline-flex text-xs font-semibold text-amber-700 hover:underline">
              Ir para pagamento pendente
            </a>
          )}

          <div className="floating-field">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
              <LockKey size={17} weight="duotone" />
            </span>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={loginForm.password}
              onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              className="floating-input with-icon"
              placeholder=" "
            />
            <label htmlFor="admin-password" className="floating-label with-icon">Senha</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            Esqueci minha senha
          </button>

          <button
            type="submit"
            className="w-full h-12 rounded-[10px] border-0 bg-[#ea580c] text-white font-black shadow-[0_16px_28px_-18px_rgba(234,88,12,0.85)] hover:brightness-105 active:scale-[0.99] transition"
          >
            Acessar painel
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full h-11 rounded-[10px] border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <ArrowLeft size={17} weight="duotone" />
              Voltar ao início
            </span>
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
