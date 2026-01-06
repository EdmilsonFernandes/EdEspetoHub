// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { getPersistedBranding, defaultBranding } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiClient } from '../config/apiClient';

export function AdminLogin() {
  const navigate = useNavigate();
  const { setAuth, auth, hydrated } = useAuth();
  const { setBranding } = useTheme();
  const [loginForm, setLoginForm] = useState({ slug: defaultBranding.espetoId, password: '' });
  const [loginError, setLoginError] = useState('');
  const [branding] = useState(getPersistedBranding());

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
      navigate('/admin/dashboard');
    } catch (error) {
      setLoginError(error.message || 'Falha ao autenticar');
    }
  };

  const platformLogo = '/chama-no-espeto.jpeg';

  useEffect(() => {
    if (!hydrated) return;
    if (auth?.token && auth?.user?.role === 'ADMIN') {
      navigate('/admin/dashboard');
    }
  }, [auth?.token, auth?.user?.role, hydrated, navigate]);

  return (
    <div className="min-h-screen bg-brand-secondary-soft flex items-center justify-center p-4">
      <div className="max-w-md w-full relative">
        <div className="absolute -top-24 -right-20 w-56 h-56 bg-brand-primary-soft rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-56 h-56 bg-brand-secondary-soft rounded-full blur-3xl" />
        <form
          onSubmit={handleLogin}
          className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/70 p-6 sm:p-8 space-y-6 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url(${platformLogo})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">Chama no Espeto</h2>
            <p className="text-sm text-gray-500">Acesso do administrador</p>
            <p className="text-sm text-gray-500">Entre com suas credenciais para acessar o painel.</p>
          </div>

          {loginError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl">{loginError}</div>
          )}

          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Identificador da loja (slug)</label>
              <input
                type="text"
                value={loginForm.slug}
                onChange={e => setLoginForm(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="ex.: espetinhodatony"
              />
              <p className="text-xs text-gray-500">Use o slug fácil de memorizar da sua loja.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="admin123"
              />
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-semibold text-brand-primary hover:underline"
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
      </div>
    </div>
  );
}
