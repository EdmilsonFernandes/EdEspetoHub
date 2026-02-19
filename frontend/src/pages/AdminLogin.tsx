// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { getPersistedBranding } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { ArrowLeft, Eye, EyeSlash, LockKey, Storefront } from '@phosphor-icons/react';

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
      const sessionData = { token: session.token, user: session.user, store: session.store };
      setAuth(sessionData);
      setBranding({
        primaryColor: session.store?.settings?.primaryColor,
        secondaryColor: session.store?.settings?.secondaryColor,
        logoUrl: session.store?.settings?.logoUrl,
        brandName: session.store?.name,
      });
      const redirectTab = sessionStorage.getItem('admin:redirectTab');
      const redirectSlug = sessionStorage.getItem('admin:redirectSlug');
      if (redirectTab && (!redirectSlug || redirectSlug === session.store?.slug)) {
        sessionStorage.removeItem('admin:redirectTab');
        sessionStorage.removeItem('admin:redirectSlug');
        navigate('/admin/dashboard', { state: { activeTab: redirectTab } });
        return;
      }
      sessionStorage.removeItem('admin:redirectTab');
      sessionStorage.removeItem('admin:redirectSlug');
      navigate('/admin/dashboard');
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

  const platformLogo = '/janocaminho.jpg';

  useEffect(() => {
    if (!hydrated) return;
    if (auth?.token && auth?.user?.role === 'ADMIN') {
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
      navigate('/admin/dashboard');
    }
  }, [auth?.token, auth?.user?.role, hydrated, navigate]);

  useEffect(() => {
    const slug = searchParams.get('slug');
    const tab = searchParams.get('tab');
    if (slug) {
      setLoginForm(prev => ({ ...prev, identifier: slug }));
    }
    if (tab) {
      sessionStorage.setItem('admin:redirectTab', tab);
    }
  }, [searchParams]);

  return (
    <AuthLayout>
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-3">
          <div className="h-14 w-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm shrink-0">
            <img src={platformLogo} alt="Jano Caminho" className="h-full w-full object-contain p-1" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Jano Caminho</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">Plataforma de gestão para sua loja</p>
            <p className="text-xs text-slate-500">Cardápio, fila e pedidos em um único lugar.</p>
          </div>
        </div>

        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-sm">
            <LockKey size={26} weight="duotone" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900 mb-1 tracking-tight">Painel da Loja</h2>
          <p className="text-sm text-gray-500">Acesso do administrador</p>
          <p className="text-sm text-gray-500">Use slug ou e-mail e sua senha para entrar.</p>
        </div>

        {loginError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl space-y-3">
            <p>{loginError}</p>
            {pendingPayment?.paymentUrl && (
              <a
                href={pendingPayment.paymentUrl}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90"
              >
                Acessar pagamento
              </a>
            )}
            {!pendingPayment?.paymentUrl && pendingPayment?.paymentLink && (
              <a
                href={pendingPayment.paymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90"
              >
                Acessar pagamento
              </a>
            )}
          </div>
        )}

        {verifyPrompt && (
          <div className="text-sm border border-amber-200 bg-amber-50 text-amber-800 p-4 rounded-xl space-y-3">
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
                className="px-3 py-2 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 disabled:opacity-60"
              >
                {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código de ativação'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                className="px-3 py-2 rounded-lg border border-amber-300 text-amber-800 font-semibold text-xs bg-white hover:bg-amber-100"
              >
                Já tenho o código
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Slug da loja ou e-mail</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Storefront size={18} weight="duotone" />
              </span>
              <input
                type="text"
                value={loginForm.identifier}
                onChange={e => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors bg-white/80"
                placeholder="Ex: edsertaneja ou dono@loja.com"
                autoCapitalize="none"
              />
            </div>
            <p className="text-xs text-gray-500">Você pode entrar com o slug da loja ou o e-mail do administrador.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Sua senha de acesso"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-gray-200 bg-white/80 flex items-center justify-center text-gray-500 hover:text-gray-800"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs font-semibold text-brand-primary underline hover:no-underline cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            className="w-full text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-brand-gradient hover:opacity-90"
          >
            Entrar no painel
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
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
