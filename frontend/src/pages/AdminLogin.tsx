// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { getPersistedBranding } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthLayout } from '../layouts/AuthLayout';

export function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, auth, hydrated } = useAuth();
  const { setBranding } = useTheme();
  const [loginForm, setLoginForm] = useState({ slug: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [branding] = useState(getPersistedBranding());
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async event => {
    event?.preventDefault();
    setLoginError('');

    try {
      const session = await authService.adminLogin(loginForm.slug, loginForm.password);
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
    } catch (error) {
      setLoginError(error.message || 'Falha ao autenticar');
    }
  };

  const platformLogo = '/logo.svg';

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
      setLoginForm(prev => ({ ...prev, slug }));
    }
    if (tab) {
      sessionStorage.setItem('admin:redirectTab', tab);
    }
  }, [searchParams]);

  return (
    <AuthLayout>
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">Chama no Espeto</h2>
          <p className="text-sm text-gray-500">Acesso do administrador</p>
          <p className="text-sm text-gray-500">Entre com suas credenciais para acessar o painel.</p>
        </div>

        {loginError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl">{loginError}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Identificador da loja (slug)</label>
            <input
              type="text"
              value={loginForm.slug}
              onChange={e => setLoginForm(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Digite o slug da sua loja"
            />
            <p className="text-xs text-gray-500">Use o slug fácil de memorizar da sua loja.</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
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
            🔑 Entrar no painel
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
