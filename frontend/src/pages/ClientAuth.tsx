// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, ArrowLeft } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { storeService } from '../services/storeService';

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

export function ClientAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>(getModeFromSearch(location.search));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreSlug, setSelectedStoreSlug] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('next') || '').trim();
  }, [location.search]);

  useEffect(() => {
    document.title = 'Área do Cliente | Já no Caminho';
  }, []);

  useEffect(() => {
    let mounted = true;
    storeService
      .listPortfolio()
      .then((data: any) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data.filter((s: any) => s?.slug) : [];
        setStores(list);
        if (!selectedStoreSlug && list.length) setSelectedStoreSlug(String(list[0].slug));
      })
      .catch(() => {
        if (!mounted) return;
        setStores([]);
      });
    return () => {
      mounted = false;
    };
  }, [selectedStoreSlug]);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      let result: any;
      if (mode === 'register') {
        result = await customerAccountService.register({
          fullName: String(form.fullName || '').trim(),
          email: String(form.email || '').trim(),
          phone: String(form.phone || '').trim(),
          password: String(form.password || ''),
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
      if (selectedStoreSlug) {
        navigate(`/${selectedStoreSlug}`, { replace: true });
        return;
      }
      navigate('/cliente/conta', { replace: true });
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
    <main className="min-h-screen bg-[linear-gradient(165deg,#020617_0%,#0b1324_42%,#0f172a_100%)] text-white px-4 py-8">
      <div className="max-w-md mx-auto relative">
        <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 hover:text-white mb-6"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>

        <div className="relative rounded-[2rem] border border-white/15 bg-white/8 backdrop-blur-xl p-5 sm:p-6 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.9)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-white/15 inline-flex items-center justify-center shadow-inner">
              <UserCircle size={22} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300 font-black">Área do cliente</p>
              <h1 className="text-xl font-black">{mode === 'register' ? 'Criar conta' : 'Entrar'}</h1>
            </div>
          </div>

          <div className="flex gap-2 mb-4 rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/85 hover:bg-white/10'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/85 hover:bg-white/10'}`}
            >
              Cadastro
            </button>
          </div>

          <div className="space-y-3">
            {mode === 'register' && (
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Nome completo"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
              />
            )}
            {mode === 'register' && (
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: formatPhoneBr(e.target.value) }))}
                placeholder="Telefone (opcional)"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
              />
            )}
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="E-mail"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Senha"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
            />

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black">Ir para loja</label>
              <select
                value={selectedStoreSlug}
                onChange={(e) => setSelectedStoreSlug(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50"
              >
                {stores.length === 0 ? (
                  <option value="">Selecionar depois</option>
                ) : (
                  stores.map((store: any) => (
                    <option key={String(store.id || store.slug)} value={String(store.slug)}>
                      {String(store.name || store.slug)} ({String(store.slug)})
                    </option>
                  ))
                )}
              </select>
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="w-full rounded-xl bg-[linear-gradient(120deg,#f8fafc,#e2e8f0)] px-4 py-3 text-sm font-black text-slate-900 shadow-[0_14px_26px_-16px_rgba(255,255,255,0.6)] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Processando...' : mode === 'register' ? 'Criar e entrar' : 'Entrar'}
            </button>
            {mode === 'login' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-center text-xs font-semibold text-sky-200 hover:text-sky-100"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
