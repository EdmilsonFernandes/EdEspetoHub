import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Buildings, Eye, EyeSlash, LockKey, ShieldCheck } from '@phosphor-icons/react';
import { AuthLayout } from '../layouts/AuthLayout';
import { authService } from '../services/authService';
import { inputAssistProps } from '../utils/inputAssist';

export function CondominiumLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('condominiumSession');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.token) navigate('/condominio', { replace: true });
    } catch {
      localStorage.removeItem('condominiumSession');
    }
  }, [navigate]);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await authService.condominiumLogin(form.email, form.password);
      localStorage.setItem('condominiumSession', JSON.stringify(session));
      navigate('/condominio', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível acessar o condomínio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[560px] space-y-3 ds-login-card-enter sm:space-y-4">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-white p-0.5 shadow-[0_16px_38px_-18px_rgba(13,79,102,0.5)] ring-1 ring-[#336886]/12 sm:h-[4.75rem] sm:w-[4.75rem] sm:border-[4px]">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
          </div>
          <div className="mt-3 hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 sm:inline-flex">
            <ShieldCheck size={14} weight="fill" />
            Acesso do condomínio
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 sm:mt-3 sm:text-[2.25rem]">
            Painel do condomínio
          </h1>
          <p className="mx-auto mt-2 hidden max-w-sm text-sm font-semibold leading-6 text-slate-500 sm:block">
            Crie feiras, convide lojas e acompanhe a operação do seu condomínio.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on" className="ds-card-elevated space-y-3 border-white/40 bg-white/84 p-4 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:space-y-5 sm:p-8">
          <div className="hidden rounded-[1.35rem] border border-[#336886]/10 bg-[#336886]/7 p-4 sm:block">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#336886] shadow-sm">
                <Buildings size={22} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">Gestão independente</p>
                <p className="text-xs font-semibold text-slate-500">Cada responsável acessa somente seu condomínio.</p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Usuário ou e-mail</span>
            <input
              {...inputAssistProps.username}
              type="text"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="spazio.azuli"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white sm:py-3.5"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Senha</span>
            <div className="relative">
              <input
                {...inputAssistProps.currentPassword}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Sua senha"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#336886] focus:bg-white sm:py-3.5"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !form.email || !form.password}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-base font-black text-white shadow-[0_18px_34px_-22px_rgba(21,58,76,0.65)] transition hover:bg-[#1e4d62] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:py-4"
          >
            <LockKey size={19} weight="duotone" />
            {loading ? 'Entrando...' : 'Entrar no painel'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/entrar')}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 sm:py-3"
          >
            Escolher outro tipo de acesso
          </button>
          <button
            type="button"
            onClick={() => navigate('/condominio/solicitar')}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-[#153A4C] transition hover:bg-slate-50 sm:py-3"
          >
            Solicitar acesso para meu condomínio
          </button>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-white sm:py-3"
          >
            <ArrowLeft size={16} weight="bold" />
            Voltar para a principal
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
