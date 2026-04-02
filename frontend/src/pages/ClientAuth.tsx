// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, ArrowLeft } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { storeService } from '../services/storeService';

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

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#020617_0%,#0f172a_100%)] text-white px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 hover:text-white mb-6"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 inline-flex items-center justify-center">
              <UserCircle size={22} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300 font-black">Área do cliente</p>
              <h1 className="text-xl font-black">{mode === 'register' ? 'Criar conta' : 'Entrar'}</h1>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-xl px-3 py-2 text-xs font-bold border ${mode === 'login' ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-white border-white/20'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-xl px-3 py-2 text-xs font-bold border ${mode === 'register' ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-white border-white/20'}`}
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
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm placeholder:text-slate-300"
              />
            )}
            {mode === 'register' && (
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Telefone (opcional)"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm placeholder:text-slate-300"
              />
            )}
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="E-mail"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm placeholder:text-slate-300"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Senha"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm placeholder:text-slate-300"
            />

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black">Ir para loja</label>
              <select
                value={selectedStoreSlug}
                onChange={(e) => setSelectedStoreSlug(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm"
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

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-60"
            >
              {loading ? 'Processando...' : mode === 'register' ? 'Criar e entrar' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

