// @ts-nocheck
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Eye, EyeSlash, Key, LockKey } from '@phosphor-icons/react';
import { AuthLayout } from '../layouts/AuthLayout';
import { destinationPartnerPortalService } from '../services/destinationPartnerPortalService';
import { inputAssistProps } from '../utils/inputAssist';

export function DestinationPartnerActivate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get('token') || '').trim(), [params]);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: any) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Convite não encontrado. Abra o link recebido por e-mail.');
      return;
    }
    if (form.password.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setLoading(true);
    try {
      await destinationPartnerPortalService.activate(token, form.password);
      navigate('/parceiro', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível ativar seu acesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showHeader title="Ativar parceiro" eyebrow="Já no Caminho" subtitle="Crie sua senha de acesso" backTo="/entrar">
      <form onSubmit={submit} className="w-full max-w-[520px] rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.60)] backdrop-blur-xl sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#153A4C] text-white shadow-[0_16px_34px_-22px_rgba(21,58,76,0.7)]">
            <Key size={22} weight="duotone" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]/75">Portal de destinos</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Defina sua senha</h1>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Depois disso você já consegue atualizar fotos, contatos e informações do seu cadastro.</p>
          </div>
        </div>

        <div className="space-y-3">
          {['password', 'confirmPassword'].map((field, index) => (
            <label key={field} className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {index === 0 ? 'Nova senha' : 'Confirmar senha'}
              </span>
              <div className="relative">
                <input
                  {...inputAssistProps.newPassword}
                  type={showPassword ? 'text' : 'password'}
                  value={form[field]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  placeholder={index === 0 ? 'Crie uma senha segura' : 'Digite a senha novamente'}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white"
                />
                {index === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                ) : null}
              </div>
            </label>
          ))}
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3.5 text-base font-black text-white shadow-[0_18px_34px_-22px_rgba(21,58,76,0.65)] transition hover:bg-[#1e4d62] active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <LockKey size={19} weight="duotone" /> : <CheckCircle size={20} weight="duotone" />}
          {loading ? 'Ativando...' : 'Ativar meu acesso'}
        </button>
      </form>
    </AuthLayout>
  );
}
