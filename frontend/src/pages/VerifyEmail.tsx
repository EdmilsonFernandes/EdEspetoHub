// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verificando seu e-mail...');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('Confira seu e-mail e clique no link de confirmacao.');
      return;
    }

    const run = async () => {
      try {
        const result = await authService.verifyEmail(token);
        setStatus('E-mail confirmado com sucesso.');
        if (result?.redirectUrl) {
          setTimeout(() => navigate(result.redirectUrl), 2000);
        }
      } catch (err) {
        setError(err.message || 'Nao foi possivel confirmar seu e-mail.');
      }
    };

    run();
  }, [navigate, searchParams]);

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      await authService.resendVerification(email);
      setStatus('Se o e-mail existir, enviaremos instrucoes.');
    } catch (err) {
      setError(err.message || 'Nao foi possivel reenviar o e-mail.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmacao de e-mail</h1>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">{status}</p>
        )}

        <div className="mt-4 space-y-2 text-left">
          <label className="text-xs font-semibold text-slate-600">Reenviar confirmacao</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu-email@dominio.com"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
          />
          <button
            onClick={handleResend}
            disabled={!email || sending}
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-brand-primary text-white hover:opacity-90 disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Reenviar e-mail'}
          </button>
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          Voltar para o inicio
        </button>
      </div>
    </div>
  );
}
