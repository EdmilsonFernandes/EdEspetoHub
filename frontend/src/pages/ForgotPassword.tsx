// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { AuthLayout } from '../layouts/AuthLayout';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      setMessage(result?.message || 'Se o e-mail existir, enviaremos instruções.');
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-1">Esqueci minha senha</h2>
          <p className="text-sm text-gray-500">Enviaremos um link para redefinir a senha.</p>
        </div>

        {message && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">{message}</div>
        )}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl">{error}</div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
            placeholder="Digite seu email"
            required
          />
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-brand-gradient hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Enviando...' : '📧 Enviar link'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
