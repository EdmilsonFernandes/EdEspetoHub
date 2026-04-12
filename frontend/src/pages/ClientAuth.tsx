// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, ArrowLeft, Eye, EyeSlash } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';

const formatPhoneBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const getModeFromSearch = (search: string) => {
  const params = new URLSearchParams(search || '');
  const mode = String(params.get('mode') || 'login').toLowerCase();
  return mode === 'register' || mode === 'cadastro' ? 'register' : 'login';
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());

export function ClientAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>(getModeFromSearch(location.search));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('next') || '').trim();
  }, [location.search]);

  const hubMode = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('hub') || '') === '1';
  }, [location.search]);

  useEffect(() => {
    document.title = 'Área do Cliente | Já no Caminho';
  }, []);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      let result: any;
      if (mode === 'register') {
        if (!isValidEmail(form.email)) {
          throw new Error('Informe um e-mail válido.');
        }
        if (!form.termsAccepted || !form.lgpdAccepted) {
          throw new Error('Aceite os termos de uso e a política de privacidade para criar sua conta.');
        }
        result = await customerAccountService.register({
          fullName: String(form.fullName || '').trim(),
          email: String(form.email || '').trim(),
          phone: String(form.phone || '').trim(),
          password: String(form.password || ''),
          termsAccepted: Boolean(form.termsAccepted),
          lgpdAccepted: Boolean(form.lgpdAccepted),
        });
      } else {
        result = await customerAccountService.login({
          email: String(form.email || '').trim(),
          password: String(form.password || ''),
        });
      }
      if (!result?.token) throw new Error('Falha ao autenticar.');
      localStorage.setItem('customerSession', JSON.stringify(result));

      if (nextPath) {
        navigate(nextPath, { replace: true });
        return;
      }
      navigate(hubMode ? '/hub' : '/cliente/conta', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = String(form.email || '').trim();
    if (!email) {
      setError('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await customerAccountService.forgotPassword(email);
      setMessage('Enviamos o link de recuperação para seu e-mail.');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível enviar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8">
      <div className="max-w-md mx-auto relative">
        <button
          type="button"
          onClick={() => navigate(hubMode ? '/hub' : '/')}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>

        <div className="relative rounded-[2rem] border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.28)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 inline-flex items-center justify-center shadow-inner">
              <UserCircle size={22} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-black">Área do cliente</p>
              <h1 className="text-xl font-black">{mode === 'register' ? 'Criar conta' : 'Entrar'}</h1>
            </div>
          </div>

          <div className="flex gap-2 mb-4 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:bg-white/70'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:bg-white/70'}`}
            >
              Cadastro
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            {mode === 'register' && (
              <input
                name="fullName"
                autoComplete="name"
                autoCapitalize="words"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Nome completo"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            )}
            {mode === 'register' && (
              <input
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: formatPhoneBr(e.target.value) }))}
                placeholder="Telefone (opcional)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            )}
            <input
              name="email"
              autoComplete="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="E-mail"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={mode === 'register' ? 'next' : 'done'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="relative">
              <input
                name="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Senha"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-12 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
              </button>
            </div>

            {mode === 'register' && (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <label className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={(e) => setForm((p) => ({ ...p, termsAccepted: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                  />
                  <span>
                    Li e aceito os <a href="/terms" target="_blank" rel="noreferrer" className="font-black text-slate-900 underline underline-offset-2">Termos de Uso</a>.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.lgpdAccepted}
                    onChange={(e) => setForm((p) => ({ ...p, lgpdAccepted: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                  />
                  <span>
                    Autorizo o uso dos meus dados conforme a <a href="/terms#lgpd" target="_blank" rel="noreferrer" className="font-black text-slate-900 underline underline-offset-2">Política de Privacidade e LGPD</a>.
                  </span>
                </label>
              </div>
            )}

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_26px_-16px_rgba(15,23,42,0.6)] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Processando...' : mode === 'register' ? 'Criar e entrar' : 'Entrar'}
            </button>
            {mode === 'login' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-center text-xs font-semibold text-sky-700 hover:text-sky-800"
              >
                Esqueci minha senha
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
