// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('Token inválido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const result = await authService.resetPassword(token, password);
      setMessage(result?.message || 'Senha atualizada com sucesso.');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar a senha.');
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
          <h1 className="text-2xl font-bold text-slate-800">Redefinir senha</h1>
          <p className="text-sm text-slate-500">Digite a nova senha para sua conta.</p>
        </div>
        {!token && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
            Token inválido ou ausente.
          </div>
        )}
        {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg">{message}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">{error}</div>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
          disabled={!token}
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmar senha"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
          disabled={!token}
          required
        />
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full bg-brand-primary text-white font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Atualizar senha'}
        </button>
      </form>
    </div>
  );
}
