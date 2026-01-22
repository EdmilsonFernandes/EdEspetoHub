// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const platformLogo = '/chama-no-espeto.jpeg';
  const [status, setStatus] = useState('Verificando seu e-mail...');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('signupEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('Confira seu e-mail e clique no link de confirmação.');
      return;
    }

    const run = async () => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      try {
        const result = await authService.verifyEmail(token);
        setStatus('E-mail confirmado com sucesso.');
        if (result?.redirectUrl) {
          setTimeout(() => navigate(result.redirectUrl), 2000);
        }
      } catch (err) {
        setError(err.message || 'Não foi possível confirmar seu e-mail.');
      } finally {
        verifyingRef.current = false;
      }
    };

    run();
  }, [navigate, searchParams]);

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      const targetEmail = email.trim();
      await authService.resendVerification(targetEmail);
      if (targetEmail) {
        localStorage.setItem('signupEmail', targetEmail);
      }
      setStatus('Se o e-mail existir, enviaremos instruções.');
    } catch (err) {
      setError(err.message || 'Não foi possível reenviar o e-mail.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
        <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <img src={platformLogo} alt="Chama no Espeto" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmação de e-mail</h1>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">{status}</p>
        )}

        <div className="mt-4 space-y-2 text-left">
          <label className="text-xs font-semibold text-slate-600">Reenviar confirmação</label>
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
