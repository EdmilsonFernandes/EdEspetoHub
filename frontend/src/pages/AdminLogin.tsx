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
import { ArrowLeft, Eye, EyeSlash, LockKey, User } from '@phosphor-icons/react';

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
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="text-center">
          <img src="/janocaminho.jpg" alt="Já no Caminho" className="mx-auto h-16 sm:h-20 w-auto object-contain rounded-xl drop-shadow-[0_14px_30px_rgba(34,211,238,0.35)]" />
          <h2 className="mt-4 text-2xl sm:text-3xl font-black text-slate-100 mb-1 tracking-tight">Painel de Administração da Loja</h2>
          <p className="text-sm text-slate-300/90">Acesse sua operação com segurança</p>
        </div>

        {loginError && (
          <div className="rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 space-y-3 text-rose-100 text-sm">
            <p className="font-semibold">{loginError}</p>
            {pendingPayment?.paymentUrl && (
              <a
                href={pendingPayment.paymentUrl}
                className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 px-4 py-2 text-xs font-semibold"
              >
                Acessar pagamento
              </a>
            )}
            {!pendingPayment?.paymentUrl && pendingPayment?.paymentLink && (
              <a
                href={pendingPayment.paymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 px-4 py-2 text-xs font-semibold"
              >
                Acessar pagamento
              </a>
            )}
          </div>
        )}

        {verifyPrompt && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 space-y-3 text-amber-100 text-sm">
            <p className="font-semibold">Sua conta ainda não foi ativada.</p>
            <p>
              {verifyPrompt.emailMasked
                ? `Ative o e-mail ${verifyPrompt.emailMasked} para entrar no painel.`
                : 'Ative seu e-mail para entrar no painel.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0 || !verifyPrompt.email}
                className="rounded-xl bg-[linear-gradient(120deg,#22d3ee,#0ea5e9)] text-slate-950 font-semibold text-xs px-3 py-2.5 disabled:opacity-60"
              >
                {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código de ativação'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                className="rounded-xl border border-amber-200/45 bg-slate-900/40 px-3 py-2.5 text-amber-100 font-semibold text-xs hover:bg-amber-200/10 transition"
              >
                Já tenho o código
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">E-mail ou usuário</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={18} weight="duotone" />
              </span>
              <input
                type="text"
                value={loginForm.identifier}
                onChange={e => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-300/20 bg-slate-950/45 text-slate-100 placeholder:text-slate-400/80 pl-10 pr-4 transition-shadow outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-cyan-300/50"
                placeholder="seu@email.com ou usuário"
                autoCapitalize="none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">Senha</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <LockKey size={18} weight="duotone" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-300/20 bg-slate-950/45 text-slate-100 placeholder:text-slate-400/80 pl-10 pr-12 transition-shadow outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-cyan-300/50"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-slate-300/25 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-slate-100"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs font-semibold text-cyan-300 underline hover:no-underline cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        <div className="space-y-3">
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[linear-gradient(120deg,#22d3ee,#0284c7)] text-slate-950 py-3 font-black tracking-[0.01em] shadow-[0_16px_36px_-22px_rgba(6,182,212,0.85)] hover:brightness-110 active:scale-[0.995] transition"
            >
              Acessar painel
            </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-2xl border border-slate-300/25 bg-slate-900/50 text-slate-100 py-3 font-semibold hover:bg-slate-900/70 transition"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <ArrowLeft size={18} weight="duotone" />
              Voltar ao início
            </span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
