// @ts-nocheck
import React, { useState } from 'react';
import { authService } from '../services/authService';

export function ForgotPassword() {
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Esqueci minha senha</h1>
          <p className="text-sm text-slate-500">Enviaremos um link para redefinir a senha.</p>
        </div>
        {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg">{message}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">{error}</div>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary text-white font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Enviando...' : 'Enviar link'}
        </button>
      </form>
    </div>
  );
}
