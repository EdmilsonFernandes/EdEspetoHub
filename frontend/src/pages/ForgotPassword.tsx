// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { AuthLayout } from '../layouts/AuthLayout';

import { ArrowLeft, EnvelopeSimple, WarningCircle } from '@phosphor-icons/react';

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
      setMessage(result?.message || 'Se o e-mail existir, enviaremos as instruções.');
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o e-mail agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-4 ds-login-card-enter w-full">
        <div className="text-center space-y-2.5">
          <div className="mx-auto w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-[#0d4f66] shadow-sm border border-sky-100">
            <EnvelopeSimple size={32} weight="duotone" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-slate-400">Recuperação de Acesso</p>
          <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.03em]">Esqueci minha senha</h2>
          <p className="text-sm font-medium text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            Digite seu e-mail e enviaremos um link seguro para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ds-card-elevated p-6 sm:p-8 space-y-5 bg-white/80 backdrop-blur-xl border-white/40">
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-900 text-[13px] font-semibold leading-relaxed animate-shake">
              {message}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100 animate-shake">
              <WarningCircle size={16} weight="fill" />
              <span>{error}</span>
            </div>
          )}

          <div className="floating-field">
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="floating-input"
              placeholder=" "
              required
            />
            <label htmlFor="reset-email" className="floating-label">Seu e-mail cadastrado</label>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading || !email}
              className="ds-btn-shine w-full h-14 rounded-2xl bg-[#0d4f66] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} weight="duotone" />
              Voltar ao Login
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
