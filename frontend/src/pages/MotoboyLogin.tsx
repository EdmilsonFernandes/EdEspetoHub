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
    <div className="min-h-screen motoboy-bg overflow-x-clip px-4 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="lg:hidden">
          <MotoboyHeader title="Entrar" subtitle="Acesse suas entregas em segundos." />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] items-stretch">
          <aside className="hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl min-h-[620px] border border-slate-800/70 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.8)] motoboy-fade-up">
                <div className="absolute inset-0">
                  <img src="/janocaminho.jpg" alt="" aria-hidden className="h-full w-full object-cover object-center" />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(2,6,23,0.68),rgba(2,6,23,0.5))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(2,6,23,0.22),_transparent_46%),radial-gradient(circle_at_top,_rgba(47,157,247,0.3),_transparent_58%),radial-gradient(circle_at_bottom,_rgba(95,211,90,0.2),_transparent_62%)]" />
                <div className="relative z-10 h-full p-7 text-white flex flex-col justify-between">
                  <div className="space-y-5">
                    <p className="text-2xl font-black tracking-tight text-white/95">Já no Caminho</p>
                    <p className="pointer-events-none select-none text-[92px] font-black leading-none tracking-tight text-white/[0.07] -mb-2">
                      JANO
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200 font-semibold">Área do entregador</p>
                    <h2 className="text-[2rem] font-black leading-[1.1]">
                      Operação de entregas rápida, clara e profissional
                    </h2>
                    <p className="text-sm text-slate-200/95 max-w-md">
                      Receba corridas, atualize status e acompanhe ganhos com experiência mobile premium.
                    </p>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-100/95">
                    {[
                      'Corridas em tempo real com status da rota',
                      'Ganhos e repasses em um único painel',
                      'Perfil validado com documentos e lojas vinculadas',
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

          <div className="space-y-5">
            {alreadyLoggedIn ? (
              <div className="ds-card-elevated ds-login-card-enter p-5 sm:p-6 space-y-4 motoboy-fade-up ds-anim-delay-20">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur p-2.5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)]">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-24 sm:h-28 w-full rounded-xl object-cover object-center" />
                  <p className="mt-2 px-1 text-center text-[11px] font-bold tracking-[0.22em] uppercase text-slate-700">
                    Área do entregador
                  </p>
                </div>
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
                    className="btn-press ds-btn ds-btn-primary ds-btn-shine ds-focus-ring w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] flex items-center justify-center gap-2"
                  >
                    <ArrowSquareOut size={18} weight="duotone" />
                    Ir para painel
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-press ds-btn ds-btn-secondary ds-focus-ring w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-800 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] flex items-center justify-center gap-2"
                  >
                    <SignOut size={18} weight="duotone" />
                    Entrar com outra conta
                  </button>
                </div>
              </div>
            ) : (
              <div className="ds-card-elevated ds-login-card-enter p-5 sm:p-6 space-y-4 motoboy-fade-up ds-anim-delay-40">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur p-2.5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)]">
                  <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-24 sm:h-28 w-full rounded-xl object-cover object-center" />
                  <p className="mt-2 px-1 text-center text-[11px] font-bold tracking-[0.22em] uppercase text-slate-700">
                    Área do entregador
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Area do Entregador</p>
                    <h2 className="text-xl font-black text-slate-900">Bem-vindo de volta</h2>
                    <p className="text-sm text-slate-600 mt-1">Use seu e-mail e senha para entrar.</p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-white/70 border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                    <SignIn size={22} weight="duotone" />
                  </div>
                </div>

                {error && (
                  <div className="ds-alert ds-alert-error">
                    {error}
                  </div>
                )}

                {verifyPrompt && (
                  <div className="ds-alert ds-alert-warning space-y-3">
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
                        className="w-full ds-btn ds-btn-primary ds-focus-ring rounded-xl text-white px-4 py-2 text-xs font-bold disabled:opacity-60"
                      >
                        {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código de ativação'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/verify-email', { state: { email: verifyPrompt.email } })}
                        className="w-full ds-btn ds-btn-secondary ds-focus-ring px-4 py-2 text-xs font-bold text-amber-800"
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
                      placeholder="E-mail"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="ds-input"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-extrabold text-slate-700">Senha</span>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="ds-input pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl border border-slate-200 bg-white/70 flex items-center justify-center text-slate-600 hover:text-slate-900 ds-btn ds-focus-ring"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={!formValid || loading}
                    className="w-full ds-btn ds-btn-primary ds-btn-shine ds-focus-ring px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lightning size={18} weight="duotone" />
                    {loading ? 'Entrando...' : 'Entrar para receber entregas'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/motoboy/register')}
                    className="w-full ds-btn ds-btn-secondary ds-focus-ring px-4 py-3 text-sm font-extrabold text-slate-800"
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
