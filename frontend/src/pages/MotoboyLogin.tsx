import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowSquareOut, Eye, EyeSlash, Lightning, LockKey, SignOut, Scooter, User, UserCircle } from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { runClientFreshStart } from '../utils/clientFreshStart';

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
      try {
        await runClientFreshStart({ maxAgeMs: 8 * 60 * 60 * 1000 });
      } catch {
        // no-op: login must continue even if client cleanup fails
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
    <div className="min-h-screen overflow-x-clip px-4 py-6 sm:py-10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_44%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_56%),linear-gradient(155deg,#020617,#0b1220_52%,#0f172a)]">
      <div className="max-w-5xl mx-auto">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] items-stretch">
          <aside className="hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl min-h-[640px] border border-sky-200/20 shadow-[0_34px_80px_-48px_rgba(8,145,178,0.65)]">
              <div className="absolute inset-0">
                <img src="/janocaminho.jpg" alt="" aria-hidden className="h-full w-full object-cover object-center opacity-[0.34]" />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(2,6,23,0.72),rgba(15,23,42,0.56))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.26),_transparent_56%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.2),_transparent_62%)]" />
              <div className="relative z-10 h-full p-8 text-white flex flex-col justify-between">
                <div className="space-y-5">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-20 w-auto object-contain rounded-xl drop-shadow-[0_12px_30px_rgba(34,211,238,0.35)]" />
                  <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200 font-semibold">Área do Entregador</p>
                  <h2 className="text-[2rem] font-black leading-[1.08]">
                    Operação de entrega rápida, clara e profissional
                  </h2>
                  <p className="text-sm text-slate-200/95 max-w-md">
                    Receba corridas, atualize status da rota e acompanhe ganhos com experiência mobile premium.
                  </p>
                </div>
                <div className="space-y-2.5 text-xs text-slate-100/95">
                  {[
                    'Corridas em tempo real com rastreio atualizado',
                    'Ganhos e repasses em um painel único',
                    'Conta validada para operar com segurança',
                  ].map((item) => (
                    <p key={item} className="inline-flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full border border-white/25 bg-white/10 inline-flex items-center justify-center">
                        <Lightning size={12} weight="duotone" />
                      </span>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-sky-200/20 bg-[linear-gradient(165deg,rgba(15,23,42,0.86),rgba(15,23,42,0.64))] p-5 sm:p-7 shadow-[0_32px_80px_-44px_rgba(6,182,212,0.5)] backdrop-blur-xl space-y-5">
              <div className="text-center">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="mx-auto h-16 sm:h-20 w-auto object-contain rounded-xl drop-shadow-[0_12px_28px_rgba(34,211,238,0.35)]" />
                <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-cyan-200 font-semibold">Área do Entregador</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-100">
                  {alreadyLoggedIn ? 'Sessão ativa do entregador' : 'Bem-vindo de volta, Entregador'}
                </h2>
                <p className="mt-1 text-sm text-slate-300/90">
                  {alreadyLoggedIn ? 'Continue para o painel ou troque de conta.' : 'Entre para receber deliveries e acompanhar sua rota.'}
                </p>
              </div>

              {alreadyLoggedIn ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-300/20 bg-slate-900/40 px-4 py-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-slate-300/20 bg-slate-900/60 flex items-center justify-center text-cyan-200">
                      <UserCircle size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-100 break-words">{sessionName || 'Entregador'}</div>
                      <div className="text-xs text-slate-300/80 break-all">{sessionEmail}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/motoboy/home')}
                      className="w-full rounded-2xl bg-[linear-gradient(120deg,#22d3ee,#14b8a6)] text-slate-950 px-4 py-3 text-sm font-black shadow-[0_16px_36px_-22px_rgba(20,184,166,0.85)] hover:brightness-110 active:scale-[0.995] transition flex items-center justify-center gap-2"
                    >
                      <ArrowSquareOut size={18} weight="duotone" />
                      Acessar painel
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-2xl border border-rose-200/35 bg-rose-500/10 px-4 py-3 text-sm font-extrabold text-rose-100 hover:bg-rose-500/20 transition flex items-center justify-center gap-2"
                    >
                      <SignOut size={18} weight="duotone" />
                      Trocar conta
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-rose-100 text-sm font-semibold">
                      {error}
                    </div>
                  )}

                  {verifyPrompt && (
                    <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 space-y-3 text-amber-100 text-sm">
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
                          className="w-full rounded-xl bg-[linear-gradient(120deg,#22d3ee,#14b8a6)] text-slate-950 px-4 py-2.5 text-xs font-bold disabled:opacity-60"
                        >
                          {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código de ativação'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                          className="w-full rounded-xl border border-amber-200/45 bg-slate-900/40 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-amber-200/10 transition"
                        >
                          Já tenho o código
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-extrabold text-slate-200">Email</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <User size={18} weight="duotone" />
                        </span>
                        <input
                          type="email"
                          placeholder="E-mail"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="h-12 w-full rounded-2xl border border-slate-300/20 bg-slate-950/45 text-slate-100 placeholder:text-slate-400/80 pl-10 pr-4 transition-shadow outline-none focus:ring-2 focus:ring-emerald-300/35 focus:border-emerald-300/40"
                        />
                      </div>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-extrabold text-slate-200">Senha</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <LockKey size={18} weight="duotone" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Senha"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="h-12 w-full rounded-2xl border border-slate-300/20 bg-slate-950/45 text-slate-100 placeholder:text-slate-400/80 pl-10 pr-12 transition-shadow outline-none focus:ring-2 focus:ring-emerald-300/35 focus:border-emerald-300/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-slate-300/25 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-slate-100"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
                        </button>
                      </div>
                    </label>

                    <button
                      type="submit"
                      disabled={!formValid || loading}
                      className="w-full rounded-2xl bg-[linear-gradient(120deg,#2dd4bf,#14b8a6)] text-slate-950 px-4 py-3 text-sm font-black shadow-[0_16px_36px_-22px_rgba(20,184,166,0.85)] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.995] transition flex items-center justify-center gap-2"
                    >
                      <Scooter size={18} weight="duotone" />
                      {loading ? 'Entrando...' : 'Entrar para receber deliveries'}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/motoboy/register')}
                      className="w-full rounded-2xl border border-slate-300/25 bg-slate-900/55 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-slate-900/75 transition"
                    >
                      Criar conta de entregador
                    </button>
                  </form>
                </>
              )}

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-center text-xs font-semibold text-cyan-200 underline hover:no-underline"
              >
                Voltar para o site
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
