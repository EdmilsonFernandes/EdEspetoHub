// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { AuthLayout } from '../layouts/AuthLayout';

import { ArrowLeft, Check, Eye, EyeSlash, LockSimple, WarningCircle } from '@phosphor-icons/react';

export function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      setTimeout(() => navigate('/admin'), 3000);
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar a senha agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-4 ds-login-card-enter w-full">
        <div className="text-center space-y-2.5">
          <div className="mx-auto w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-[#0d4f66] shadow-sm border border-sky-100">
            <LockSimple size={32} weight="duotone" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-slate-400">Segurança da Conta</p>
          <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.03em]">Nova senha</h2>
          <p className="text-sm font-medium text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            Crie uma senha forte e segura para proteger seu acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ds-card-elevated p-6 sm:p-8 space-y-5 bg-white/80 backdrop-blur-xl border-white/40">
          {!token && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100">
              <WarningCircle size={16} weight="fill" />
              <span>Token de recuperação inválido ou ausente.</span>
            </div>
          )}
          
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-900 text-[13px] font-semibold leading-relaxed animate-shake">
              <div className="flex items-center gap-2 mb-1">
                <Check size={18} weight="bold" className="text-emerald-500" />
                <span>Sucesso!</span>
              </div>
              {message} Redirecionando...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-[13px] font-semibold text-rose-600 border border-rose-100 animate-shake">
              <WarningCircle size={16} weight="fill" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="floating-field">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="floating-input"
                placeholder=" "
                disabled={!token || !!message}
                required
              />
              <label htmlFor="new-password" className="floating-label">Nova senha secreta</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                disabled={!token || !!message}
              >
                {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
              </button>
            </div>

            <div className="floating-field">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="floating-input"
                placeholder=" "
                disabled={!token || !!message}
                required
              />
              <label htmlFor="confirm-password" className="floating-label">Confirme a nova senha</label>
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                disabled={!token || !!message}
              >
                {showConfirm ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading || !token || !password || !confirm || !!message}
              className="ds-btn-shine w-full h-14 rounded-2xl bg-[#0d4f66] text-white text-base font-black shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {loading ? 'Atualizando...' : 'Confirmar Nova Senha'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} weight="duotone" />
              Cancelar e voltar
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
