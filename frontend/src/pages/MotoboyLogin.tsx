import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowSquareOut, Eye, EyeSlash, Lightning, SignIn, SignOut, UserCircle } from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

export function MotoboyLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyPrompt, setVerifyPrompt] = useState<{ email?: string; emailMasked?: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [persistedSession, setPersistedSession] = useState(() => {
    try {
      const raw = localStorage.getItem('motoboySession');
      const parsed = raw ? JSON.parse(raw) : null;
      const role = String(parsed?.user?.role || '').toUpperCase();
      if (!parsed?.token || role !== 'MOTOBOY') return null;
      return parsed;
    } catch {
      return null;
    }
  });
  const sessionName = String(persistedSession?.user?.fullName || persistedSession?.user?.name || '').trim();
  const sessionEmail = String(persistedSession?.user?.email || '').trim();
  const alreadyLoggedIn = Boolean(persistedSession?.token && sessionEmail);

  useEffect(() => {
    const raw = localStorage.getItem('motoboy:last_email');
    if (raw && !form.email) setForm((prev) => ({ ...prev, email: raw }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (form.email) localStorage.setItem('motoboy:last_email', form.email);
  }, [form.email]);

  const formValid = useMemo(() => {
    return Boolean(String(form.email || '').trim()) && Boolean(String(form.password || '').trim());
  }, [form.email, form.password]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formValid || loading) return;
    setError('');
    setVerifyPrompt(null);
    setLoading(true);
    try {
      const session = await authService.login(form.email, form.password);
      const role = String(session?.user?.role || '').toUpperCase();
      if (role !== 'MOTOBOY') {
        setError('Esta conta não é de entregador.');
        return;
      }
      const sessionData = { token: session.token, user: session.user, store: session.store };
      localStorage.setItem('motoboySession', JSON.stringify(sessionData));
      setAuth(sessionData);
      navigate('/motoboy/home');
    } catch (err: any) {
      if (err?.code === 'AUTH-005') {
        const targetEmail = err?.details?.email || form.email;
        if (targetEmail) {
          localStorage.setItem('signupEmail', String(targetEmail).trim().toLowerCase());
        }
        setVerifyPrompt({
          email: targetEmail,
          emailMasked: err?.details?.emailMasked,
        });
      }
      setError(err?.message || 'Não foi possível entrar agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    const email = String(verifyPrompt?.email || '').trim().toLowerCase();
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setError('');
    try {
      const result = await authService.resendVerification(email);
      setResendCooldown(Number(result?.cooldownSec || 60));
      setError(result?.message || 'Se o e-mail existir, enviaremos instruções.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível reenviar agora.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('motoboySession');
    } catch {
      // ignore
    }
    try {
      setAuth(null);
    } catch {
      // ignore
    }
    setPersistedSession(null);
  };

  return (
    <div className="min-h-screen motoboy-bg px-4 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="lg:hidden">
          <MotoboyHeader title="Entrar" subtitle="Acesse suas entregas em segundos." />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] items-start">
          <aside className="hidden lg:block">
              <div className="premium-card-glass p-6 space-y-5 motoboy-fade-up">
                <div className="h-40 rounded-3xl border border-slate-200 bg-slate-900 overflow-hidden p-2">
                  <img src="/janocaminho.jpg" alt="Jano Caminho" className="h-full w-full object-contain" />
                </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 font-semibold">Area do entregador</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 leading-tight">
                  Operação de entrega com fluxo simples e rápido.
                </h2>
              </div>
              <div className="space-y-2.5">
                {[
                  'Receba corridas e atualize status em tempo real',
                  'Acompanhe ganhos e repasses em um único painel',
                  'Perfil validado com documentos e lojas vinculadas',
                ].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2 text-sm font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {alreadyLoggedIn ? (
              <div className="premium-card-glass p-5 sm:p-6 space-y-4 motoboy-fade-up" style={{ animationDelay: '20ms' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Sessão ativa</p>
                    <h2 className="text-xl font-black text-slate-900">Você já está logado</h2>
                    <p className="text-sm text-slate-600 mt-1">Continue para a área do entregador ou troque de conta.</p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-white/70 border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                    <UserCircle size={22} weight="duotone" />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3">
                  <div className="text-sm font-black text-slate-900 break-words">{sessionName || 'Entregador'}</div>
                  <div className="text-xs text-slate-500 break-all">{sessionEmail}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/motoboy/home')}
                    className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] flex items-center justify-center gap-2"
                  >
                    <ArrowSquareOut size={18} weight="duotone" />
                    Ir para painel
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-press w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] flex items-center justify-center gap-2"
                  >
                    <SignOut size={18} weight="duotone" />
                    Entrar com outra conta
                  </button>
                </div>
              </div>
            ) : (
              <div className="premium-card-glass p-5 sm:p-6 space-y-4 motoboy-fade-up" style={{ animationDelay: '40ms' }}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-3">
                  <div className="h-12 w-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm shrink-0 p-1">
                    <img src="/janocaminho.jpg" alt="Jano Caminho" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Jano Caminho</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">App profissional de entregas</p>
                    <p className="text-xs text-slate-500">Rotas, status e ganhos em tempo real.</p>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Area do Entregador</p>
                    <h2 className="text-xl font-black text-slate-900">Bem-vindo de volta</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Entre para ver a fila, iniciar rota e finalizar entregas.
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-white/70 border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                    <SignIn size={22} weight="duotone" />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-semibold">
                    {error}
                  </div>
                )}

                {verifyPrompt && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-3">
                    <p className="font-semibold">Sua conta ainda não foi ativada.</p>
                    <p>
                      {verifyPrompt.emailMasked
                        ? `Ative o e-mail ${verifyPrompt.emailMasked} para entrar.`
                        : 'Ative seu e-mail para entrar.'}
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading || resendCooldown > 0 || !verifyPrompt.email}
                        className="w-full rounded-xl bg-amber-600 text-white px-4 py-2 text-xs font-bold disabled:opacity-60"
                      >
                        {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código de ativação'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                        className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800"
                      >
                        Já tenho o código
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-extrabold text-slate-700">Email</span>
                    <input
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-extrabold text-slate-700">Senha</span>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-slate-200 bg-white/70 flex items-center justify-center text-slate-600 hover:text-slate-900"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={!formValid || loading}
                    className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lightning size={18} weight="duotone" />
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/motoboy/register')}
                    className="btn-press w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
                  >
                    Criar conta de entregador
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full text-center text-xs font-semibold text-slate-500 underline hover:no-underline"
                >
                  Voltar para o site
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
