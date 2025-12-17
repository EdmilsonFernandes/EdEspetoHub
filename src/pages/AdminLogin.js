import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { getPersistedBranding, defaultBranding } from '../constants';

export function AdminLogin() {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ username: '', password: '', espetoId: defaultBranding.espetoId });
  const [loginError, setLoginError] = useState('');
  const [branding] = useState(getPersistedBranding());

  const handleLogin = async (event) => {
    event?.preventDefault();
    setLoginError('');

    try {
      const session = await authService.login(loginForm.username, loginForm.password, loginForm.espetoId);
      const sessionData = { ...session, username: loginForm.username, espetoId: loginForm.espetoId };
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      navigate('/admin/dashboard');
    } catch (error) {
      setLoginError(error.message || 'Falha ao autenticar');
    }
  };

  const brandInitials = branding.brandName?.split(' ').map((part) => part?.[0]).join('').slice(0, 2).toUpperCase() || 'ED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg mx-auto mb-4"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                brandInitials
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Acesso do administrador</h2>
            <p className="text-sm text-gray-500">Entre com suas credenciais para acessar o painel.</p>
          </div>

          {loginError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl">
              {loginError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Usuário</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                placeholder="admin"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                placeholder="admin123"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">ID da loja</label>
              <input
                type="text"
                value={loginForm.espetoId}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, espetoId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                placeholder="ex.: espetinhodatony"
              />
              <p className="text-xs text-gray-500">Identificador único da sua loja no sistema.</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              className="w-full text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{ backgroundColor: branding.primaryColor }}
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
