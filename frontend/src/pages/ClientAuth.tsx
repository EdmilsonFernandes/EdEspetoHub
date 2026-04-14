// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, Eye, EyeSlash, LockKey } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { AuthLayout } from '../layouts/AuthLayout';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [autoBiometricTried, setAutoBiometricTried] = useState(false);
  const [enrollmentPromptOpen, setEnrollmentPromptOpen] = useState(false);
  const [pendingBiometricSession, setPendingBiometricSession] = useState<any | null>(null);
  const [biometricFailureDiagnostics, setBiometricFailureDiagnostics] = useState<any | null>(null);
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

  const forceBiometric = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('bio') || '') === '1';
  }, [location.search]);

  const biometricDebugMode = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('debugbio') || '') === '1';
  }, [location.search]);

  const biometricDebug = useMemo(() => {
    const supported = nativeBiometricService.isSupported();
    const profile = nativeBiometricService.getStoredCustomerProfile();
    const storedSession = nativeBiometricService.getStoredCustomerSession();
    return {
      supported,
      profileUserId: String(profile?.userId || ''),
      profileEmail: String(profile?.email || ''),
      sessionToken: Boolean(storedSession?.token),
      sessionEmail: String(storedSession?.user?.email || ''),
      hasValidEnrollment: nativeBiometricService.hasValidStoredCustomerEnrollment(),
      forceBiometric,
      biometricAvailable,
    };
  }, [biometricAvailable, forceBiometric]);

  useEffect(() => {
    document.title = 'Área do Cliente | Já no Caminho';
  }, []);

  useEffect(() => {
    const refreshBiometricAvailability = () => {
      setBiometricAvailable(nativeBiometricService.isSupported() && nativeBiometricService.hasValidStoredCustomerEnrollment());
    };

    refreshBiometricAvailability();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      refreshBiometricAvailability();
      if (attempts >= 12) {
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener('focus', refreshBiometricAvailability);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshBiometricAvailability);
    };
  }, []);

  useEffect(() => {
    setMode(getModeFromSearch(location.search));
    setAutoBiometricTried(false);
  }, [location.search]);

  const finishLogin = (result: any) => {
    nativeBiometricService.syncCustomerSession(result);

    if (nextPath) {
      navigate(nextPath, { replace: true });
      return;
    }
    navigate(hubMode ? '/hub' : '/cliente/conta', { replace: true });
  };

  const handleEnableBiometricEnrollment = () => {
    if (pendingBiometricSession?.token) {
      const enabled = nativeBiometricService.enableCustomer(pendingBiometricSession);
      setBiometricAvailable(enabled);
      if (!enabled) {
        setError('Não foi possível ativar a biometria neste aparelho.');
      }
    }
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (pendingBiometricSession?.token) {
      finishLogin(pendingBiometricSession);
    }
  };

  const handleSkipBiometricEnrollment = () => {
    const session = pendingBiometricSession;
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (session?.token) {
      finishLogin(session);
    }
  };

  const handleBiometricLogin = async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    setError('');
    setMessage('');
    setBiometricFailureDiagnostics(null);
    try {
      const session = await nativeBiometricService.loginCustomerWithBiometrics('Confirme sua identidade para entrar na sua conta');
      finishLogin(session);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível entrar com biometria.');
      setBiometricFailureDiagnostics(nativeBiometricService.getCustomerDiagnostics());
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'login') return;
    if (!biometricAvailable || biometricLoading || loading || autoBiometricTried) return;
    const hasTypedCredentials = !forceBiometric && (Boolean(String(form.email || '').trim()) || Boolean(String(form.password || '').trim()));
    if (hasTypedCredentials) return;

    setAutoBiometricTried(true);
    const timer = window.setTimeout(() => {
      void handleBiometricLogin();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    autoBiometricTried,
    biometricAvailable,
    biometricLoading,
    form.email,
    form.password,
    forceBiometric,
    loading,
    mode,
  ]);

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
      nativeBiometricService.syncCustomerSession(result);

      if (nativeBiometricService.shouldOfferEnrollment(result)) {
        setPendingBiometricSession(result);
        setEnrollmentPromptOpen(true);
        return;
      }
      if (nativeBiometricService.hasStoredCustomerProfile()) {
        nativeBiometricService.enableCustomer(result);
      }
      finishLogin(result);
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
    <AuthLayout>
      <div className="space-y-4 ds-login-card-enter w-full">
        <div className="text-center space-y-2.5">
          <button type="button" onClick={() => navigate(hubMode ? '/hub' : '/')} className="mx-auto block hover:scale-105 transition-transform active:scale-95">
            <img src="/janocaminho-logo.png" alt="Já no Caminho" className="mx-auto h-16 w-auto drop-shadow-md" />
          </button>
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-slate-400">Acesso da plataforma</p>
          <div className="flex items-center justify-center gap-3">
            <LockKey size={32} weight="duotone" className="text-[#0d4f66]" />
            <h2 className="text-[2rem] sm:text-[2.2rem] font-black text-slate-800 tracking-[-0.03em]">Login</h2>
          </div>
        </div>

        <div className="auth-segment">
          <button type="button" onClick={() => navigate('/admin')} className="auth-segment-btn">Lojista</button>
          <button type="button" className="auth-segment-btn active">Cliente</button>
          <button type="button" onClick={() => navigate('/motoboy/login')} className="auth-segment-btn">Entregador</button>
        </div>

        <div className="ds-card-elevated p-6 sm:p-8 space-y-5 bg-white/80 backdrop-blur-xl border-white/40">
          {biometricDebugMode ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <p className="font-black uppercase tracking-[0.18em] text-amber-700">Diagnóstico biometria</p>
              <div className="mt-2 space-y-1 font-medium">
                <p>Suporte nativo: {biometricDebug.supported ? 'sim' : 'nao'}</p>
                <p>Perfil salvo: {biometricDebug.profileUserId ? 'sim' : 'nao'}</p>
                <p>Perfil email: {biometricDebug.profileEmail || '-'}</p>
                <p>Sessao salva: {biometricDebug.sessionToken ? 'sim' : 'nao'}</p>
                <p>Sessao email: {biometricDebug.sessionEmail || '-'}</p>
                <p>Enrollment valido: {biometricDebug.hasValidEnrollment ? 'sim' : 'nao'}</p>
                <p>Bio forcada: {biometricDebug.forceBiometric ? 'sim' : 'nao'}</p>
                <p>Disponivel na UI: {biometricDebug.biometricAvailable ? 'sim' : 'nao'}</p>
              </div>
            </div>
          ) : null}

          {mode === 'login' && biometricAvailable ? (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/12 bg-[#336886]/8 px-4 py-3 text-sm font-black text-[#336886] shadow-[0_18px_34px_-28px_rgba(51,104,134,0.35)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockKey size={18} weight="duotone" />
              {biometricLoading ? 'Lendo biometria...' : 'Entrar com biometria'}
            </button>
          ) : null}

          {biometricFailureDiagnostics ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
              <p className="font-black uppercase tracking-[0.18em] text-rose-700">Falha biometria</p>
              <div className="mt-2 space-y-1 font-medium">
                <p>Suporte nativo: {biometricFailureDiagnostics.supported ? 'sim' : 'nao'}</p>
                <p>Perfil salvo: {biometricFailureDiagnostics.profile?.userId ? 'sim' : 'nao'}</p>
                <p>Perfil email: {String(biometricFailureDiagnostics.profile?.email || '-')}</p>
                <p>Sessao salva: {biometricFailureDiagnostics.session?.token ? 'sim' : 'nao'}</p>
                <p>Sessao email: {String(biometricFailureDiagnostics.session?.user?.email || '-')}</p>
                <p>Enrollment valido: {biometricFailureDiagnostics.validEnrollment ? 'sim' : 'nao'}</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 inline-flex items-center justify-center shadow-inner">
              <UserCircle size={22} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-black">Área do cliente</p>
              <h1 className="text-xl font-black">{mode === 'register' ? 'Criar conta' : 'Entrar'}</h1>
            </div>
          </div>

          <div className="flex gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
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
              id="email"
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
                id="password"
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

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

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
      <ConfirmationModal
        isOpen={enrollmentPromptOpen}
        onClose={handleSkipBiometricEnrollment}
        onConfirm={handleEnableBiometricEnrollment}
        title="Entrar mais rápido?"
        description="Ative a biometria neste aparelho para acessar sua conta com digital, rosto ou bloqueio do celular nas próximas vezes."
        confirmLabel="Ativar biometria"
        cancelLabel="Agora não"
        variant="info"
        icon={<LockKey size={32} weight="duotone" />}
      />
    </AuthLayout>
  );
}
