<<<<<<< HEAD
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
=======
﻿// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

const COOLDOWN_SECONDS = 60;

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const platformLogo = '/janocaminho.jpg';

  const [status, setStatus] = useState('Enviamos um e-mail com o link e o código de ativação.');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

  const hasEmail = useMemo(() => Boolean(String(email || '').trim()), [email]);
  const hasToken = useMemo(() => Boolean(String(token || '').trim()), [token]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const fromStateEmail = location.state?.email;
    const fromQueryEmail = searchParams.get('email');
    const savedEmail = localStorage.getItem('signupEmail') || localStorage.getItem('motoboy:last_email');
    const fallback = fromStateEmail || fromQueryEmail || savedEmail || '';
    if (fallback) setEmail(String(fallback));
  }, [location.state, searchParams]);

  const runVerify = async (rawToken?: string, targetEmail?: string) => {
    const currentToken = String(rawToken || token || '').trim();
    const currentEmail = String(targetEmail || email || '').trim();
    if (!currentToken) {
      setError('Cole o código/token para ativar sua conta.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const result = await authService.verifyEmail({
        token: currentToken,
        email: currentEmail || undefined,
      });
      setStatus('Conta ativada com sucesso.');
      setToken('');
      if (result?.redirectUrl) {
        setTimeout(() => navigate(result.redirectUrl), 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Não foi possível ativar agora. Confira o código e tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const queryToken = String(searchParams.get('token') || '').trim();
    if (!queryToken) {
      setStatus('Enviamos um e-mail com o link e o código de ativação.');
      return;
    }
    setToken(queryToken);
>>>>>>> main

    const run = async () => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      try {
<<<<<<< HEAD
        const result = await authService.verifyEmail(token);
        setStatus('E-mail confirmado com sucesso.');
        if (result?.redirectUrl) {
          setTimeout(() => navigate(result.redirectUrl), 2000);
        }
      } catch (err) {
        setError(err.message || 'Não foi possível confirmar seu e-mail agora.');
=======
        await runVerify(queryToken, email);
>>>>>>> main
      } finally {
        verifyingRef.current = false;
      }
    };

    run();
<<<<<<< HEAD
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
      setError(err.message || 'Não foi possível reenviar o e-mail agora.');
=======
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleResend = async () => {
    if (!hasEmail || sending || cooldown > 0) return;
    setSending(true);
    setError('');
    try {
      const targetEmail = email.trim().toLowerCase();
      const result = await authService.resendVerification(targetEmail);
      localStorage.setItem('signupEmail', targetEmail);
      setStatus(result?.message || 'Se o e-mail existir, enviaremos as instruções de ativação.');
      setCooldown(Number(result?.cooldownSec || COOLDOWN_SECONDS));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível reenviar agora.');
>>>>>>> main
    } finally {
      setSending(false);
    }
  };

<<<<<<< HEAD
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
=======
  const handleManualVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    await runVerify();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <img src={platformLogo} alt="Já no Caminho" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1 text-center">Ativar conta</h1>
        <p className="text-sm text-slate-600 text-center mb-4">{error ? error : status}</p>

        <form onSubmit={handleManualVerify} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@dominio.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Código/token de ativação</label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o código/token recebido no e-mail"
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!hasToken || verifying}
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-brand-primary text-white hover:opacity-90 disabled:opacity-60"
          >
            {verifying ? 'Ativando...' : 'Ativar'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={!hasEmail || sending || cooldown > 0}
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {sending ? 'Reenviando...' : cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
>>>>>>> main
        >
          Voltar para o inicio
        </button>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> main
