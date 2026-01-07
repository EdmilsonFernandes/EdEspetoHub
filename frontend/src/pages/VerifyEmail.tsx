// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verificando seu e-mail...');
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmacao de e-mail</h1>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">{status}</p>
        )}
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
