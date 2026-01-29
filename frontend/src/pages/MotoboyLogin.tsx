import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

export function MotoboyLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const session = await authService.login(form.email, form.password);
      const sessionData = { token: session.token, user: session.user, store: session.store };
      setAuth(sessionData);
      navigate('/motoboy/current');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar agora.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800">Área do Entregador</h1>
          <p className="text-sm text-slate-500">Entre para acessar as entregas.</p>
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Seu email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => navigate('/motoboy/register')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Criar conta de entregador
          </button>
        </form>
      </div>
    </div>
  );
}
