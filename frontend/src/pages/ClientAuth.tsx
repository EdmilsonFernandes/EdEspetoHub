// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Buildings, Eye, EyeSlash, LockKey, MapTrifold, SealCheck, Scooter, ShieldCheck, Storefront, UserCircle, WarningCircle, X, EnvelopeSimple, Phone } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { authService } from '../services/authService';
import { AuthLayout } from '../layouts/AuthLayout';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { MfaChallengeModal } from '../components/Auth/MfaChallengeModal';
import { AuthMascotPanel } from '../components/Auth/AuthMascotPanel';
import { persistTrustedMfaDevice } from '../utils/mfaDevice';
import { inputAssistProps } from '../utils/inputAssist';
import { MFA_CHALLENGE_EXPIRED_MESSAGE, isMfaChallengeExpiredError } from '../utils/mfaErrors';

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

const normalizeVerificationCodeError = (error: any) => {
  const rawMessage = String(error?.message || '').trim();
  const normalized = rawMessage
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('expir')) {
    return 'Código expirado. Reenvie um novo código e tente novamente.';
  }

  if (
    !rawMessage ||
    normalized.includes('parametro') ||
    normalized.includes('invalid') ||
    normalized.includes('token') ||
    normalized.includes('codigo')
  ) {
    return 'Código inválido. Confira os 4 dígitos recebidos no e-mail e tente novamente.';
  }

  return rawMessage;
};

export function ClientAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>(getModeFromSearch(location.search));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyPrompt, setVerifyPrompt] = useState<{ email?: string; emailMasked?: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeDigits, setCodeDigits] = useState([ '', '', '', '' ]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [lastAutoSubmittedCode, setLastAutoSubmittedCode] = useState('');
  const [verifyFlowLabel, setVerifyFlowLabel] = useState<'register' | 'login'>('register');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [autoBiometricTried, setAutoBiometricTried] = useState(false);
  const [enrollmentPromptOpen, setEnrollmentPromptOpen] = useState(false);
  const [professionalAccessOpen, setProfessionalAccessOpen] = useState(false);
  const [pendingBiometricSession, setPendingBiometricSession] = useState<any | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<any | null>(null);
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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

  const hubSuffix = useMemo(() => {
    const params = new URLSearchParams();
    if (hubMode) params.set('hub', '1');
    if (nextPath) params.set('next', nextPath);
    return params.toString() ? `?${params.toString()}` : '';
  }, [hubMode, nextPath]);
  const professionalAccessOptions = useMemo(() => [
    {
      id: 'lojista',
      title: 'Lojista',
      description: 'Pedidos, cardápio, fila e operação da loja.',
      route: `/admin${hubSuffix}`,
      icon: Storefront,
      tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    },
    {
      id: 'entregador',
      title: 'Entregador',
      description: 'Rotas, coletas, entregas e ganhos.',
      route: `/motoboy/login${hubSuffix}`,
      icon: Scooter,
      tone: 'border-amber-100 bg-amber-50 text-amber-700',
    },
    {
      id: 'parceiro',
      title: 'Parceiro',
      description: 'Chalés, pousadas, serviços e turismo local.',
      route: '/parceiro',
      icon: MapTrifold,
      tone: 'border-sky-100 bg-sky-50 text-sky-700',
    },
    {
      id: 'condominio',
      title: 'Condomínio',
      description: 'Feiras, eventos locais e gestão do condomínio.',
      route: '/condominio/login',
      icon: Buildings,
      tone: 'border-violet-100 bg-violet-50 text-violet-700',
    },
    {
      id: 'interno',
      title: 'Acesso interno',
      description: 'Super Admin e gestão da plataforma.',
      route: '/superadmin',
      icon: ShieldCheck,
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
    },
  ], [hubSuffix]);

  const verificationCode = useMemo(() => codeDigits.join(''), [codeDigits]);
  const storedBiometricProfile = useMemo(() => nativeBiometricService.getStoredCustomerProfile(), [biometricAvailable]);

  useEffect(() => {
    document.title = 'Área do Cliente | Já no Caminho';
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('verified') === '1') {
      setMessage('Conta ativada com sucesso. Agora é só entrar.');
    }
    if (params.get('reason') === 'session_expired') {
      setMessage('');
      setError('Seu acesso expirou ou foi atualizado. Entre novamente para continuar. Se usava biometria, ative de novo após o login.');
    }
  }, [location.search]);

  useEffect(() => {
    if (!verifyPrompt) {
      setCodeDigits([ '', '', '', '' ]);
      setCodeLoading(false);
      setLastAutoSubmittedCode('');
      setVerifyFlowLabel('register');
      return;
    }
    const timer = window.setTimeout(() => {
      const firstInput = document.getElementById('customer-otp-0') as HTMLInputElement | null;
      firstInput?.focus();
      firstInput?.select?.();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [verifyPrompt]);

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const finishLogin = (result: any) => {
    nativeBiometricService.syncCustomerSession(result);

    if (nextPath) {
      navigate(nextPath, { replace: true });
      return;
    }
    navigate('/hub', { replace: true });
  };

  const finishAuthenticatedCustomerSession = (result: any) => {
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
  };

  const handleEnableBiometricEnrollment = () => {
    if (pendingBiometricSession?.token) {
      const enabled = nativeBiometricService.enableCustomer(pendingBiometricSession);
      setBiometricAvailable(enabled);
      if (!enabled) {
        setError('Não foi possível ativar a biometria neste aparelho.');
      }
    }
    const session = pendingBiometricSession;
    setEnrollmentPromptOpen(false);
    setPendingBiometricSession(null);
    if (session?.token) {
      finishLogin(session);
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
    try {
      const session = await nativeBiometricService.loginCustomerWithBiometrics('Confirme sua identidade para entrar na sua conta');
      finishLogin(session);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível entrar com biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleMfaVerify = async ({ code, trustDevice }: { code: string; trustDevice: boolean }) => {
    if (!mfaChallenge?.challengeToken || mfaLoading) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const result = await authService.verifyMfaChallenge({
        challengeToken: mfaChallenge.challengeToken,
        code,
        trustDevice,
      }, { authMode: 'customer' });
      persistTrustedMfaDevice(result?.trustedDevice);
      setMfaChallenge(null);
      finishAuthenticatedCustomerSession(result);
    } catch (e: any) {
      if (isMfaChallengeExpiredError(e)) {
        setMessage('');
        setError('');
        setMfaError(MFA_CHALLENGE_EXPIRED_MESSAGE);
        setMfaChallenge((current: any) => (current ? { ...current, expired: true } : current));
        return;
      }
      setMfaError(e?.message || 'Código inválido. Tente novamente.');
    } finally {
      setMfaLoading(false);
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
    const emailValue = String(form.email || '').trim();
    const passwordValue = String(form.password || '');
    const nextFieldErrors: { email?: string; password?: string } = {};

    if (!emailValue) {
      nextFieldErrors.email = 'Informe seu e-mail ou usuário.';
    } else if (!isValidEmail(emailValue)) {
      nextFieldErrors.email = 'E-mail inválido.';
    }
    if (!passwordValue) {
      nextFieldErrors.password = 'Informe sua senha.';
    }
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setMessage('');
      setVerifyPrompt(null);
      setError(nextFieldErrors.email || nextFieldErrors.password || 'Confira os campos obrigatórios.');
      return;
    }

    setFieldErrors({});
    setLoading(true);
    setError('');
    setMessage('');
    setVerifyPrompt(null);
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
        const targetEmail = String(result?.email || form.email || '').trim().toLowerCase();
        if (targetEmail) {
          localStorage.setItem('signupEmail', targetEmail);
        }
        setVerifyPrompt({
          email: targetEmail,
          emailMasked: result?.emailMasked,
        });
        setVerifyFlowLabel('register');
        setResendCooldown(Number(result?.cooldownSec || 60));
        setMessage('Enviamos um código de 4 dígitos para concluir seu cadastro.');
        return;
      }

      result = await customerAccountService.login({
        email: String(form.email || '').trim(),
        password: String(form.password || ''),
      });
      if (result?.mfaRequired) {
        setMfaError('');
        setMfaChallenge(result);
        return;
      }
      finishAuthenticatedCustomerSession(result);
    } catch (e: any) {
      if (e?.code === 'AUTH-005') {
        const targetEmail = String(e?.details?.email || form.email || '').trim().toLowerCase();
        if (targetEmail) {
          localStorage.setItem('signupEmail', targetEmail);
        }
        setVerifyPrompt({
          email: targetEmail,
          emailMasked: e?.details?.emailMasked,
        });
        setVerifyFlowLabel('login');
        setMessage('Sua conta ainda precisa ser confirmada. Reenvie o código se precisar e finalize o acesso aqui mesmo.');
      }
      setError(e?.message || 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = String(verifyPrompt?.email || form.email || '').trim().toLowerCase();
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setError('');
    try {
      const result = await customerAccountService.resendEmailCode(email);
      localStorage.setItem('signupEmail', email);
      setVerifyPrompt((prev) => ({
        ...(prev || {}),
        email,
        emailMasked: result?.emailMasked || prev?.emailMasked || email,
      }));
      setLastAutoSubmittedCode('');
      setResendCooldown(Number(result?.cooldownSec || 60));
      setMessage(result?.message || 'Novo código enviado. Digite os 4 números para concluir o acesso.');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível reenviar agora.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeDigitChange = (index: number, value: string) => {
    const nextValue = String(value || '').replace(/\D/g, '').slice(-1);
    if (error) setError('');
    setCodeDigits((prev) => {
      const next = [ ...prev ];
      next[index] = nextValue;
      return next;
    });

    if (nextValue && index < 3) {
      const nextInput = document.getElementById(`customer-otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
      nextInput?.select?.();
    }
  };

  const handleCodeKeyDown = (index: number, event: any) => {
    if (error) setError('');
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`customer-otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
      prevInput?.select?.();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevInput = document.getElementById(`customer-otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
    if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault();
      const nextInput = document.getElementById(`customer-otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  };

  const handleCodePaste = (event: any) => {
    const pasted = String(event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    if (error) setError('');
    setCodeDigits([
      pasted[0] || '',
      pasted[1] || '',
      pasted[2] || '',
      pasted[3] || '',
    ]);
    const targetIndex = Math.min(Math.max(pasted.length - 1, 0), 3);
    const targetInput = document.getElementById(`customer-otp-${targetIndex}`) as HTMLInputElement | null;
    targetInput?.focus();
  };

  useEffect(() => {
    if (!verifyPrompt) return;
    if (verificationCode.length !== 4 || codeLoading) return;
    if (verificationCode === lastAutoSubmittedCode) return;
    const codeToSubmit = verificationCode;
    const timer = window.setTimeout(() => {
      setLastAutoSubmittedCode(codeToSubmit);
      void handleVerifyCode();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [verificationCode, codeLoading, verifyPrompt, lastAutoSubmittedCode]);

  const handleVerifyCode = async () => {
    const email = String(verifyPrompt?.email || form.email || '').trim().toLowerCase();
    if (!email || verificationCode.length !== 4 || codeLoading) return;
    setCodeLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await customerAccountService.verifyEmailCode({
        email,
        code: verificationCode,
      });
      setVerifyPrompt(null);
      setMessage('Conta confirmada com sucesso. Entrando...');
      finishAuthenticatedCustomerSession(result);
    } catch (e: any) {
      try {
        window.navigator?.vibrate?.(120);
      } catch {
        // no-op
      }
      setError(normalizeVerificationCodeError(e));
    } finally {
      setCodeLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const email = String(form.email || '').trim();
    navigate(`/forgot-password?perfil=cliente${email ? `&email=${encodeURIComponent(email)}` : ''}`);
  };

  return (
    <AuthLayout
      title="Área do cliente"
      eyebrow="Já no Caminho"
      subtitle={mode === 'register' ? 'Cadastre seu acesso' : 'Acesse pedidos e endereços'}
      backTo={hubMode ? '/hub' : '/'}
      showHeader
    >
      <div className="space-y-1.5 ds-login-card-enter w-full sm:space-y-4">
        <div className="hidden text-center sm:block">
          <div className="mx-auto mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/82 text-[#0d4f66] shadow-[0_18px_38px_-26px_rgba(13,79,102,0.5)]">
            <LockKey size={23} weight="duotone" />
          </div>
          <h2 className="text-[2rem] font-black tracking-[-0.03em] text-slate-800">
            {mode === 'register' ? 'Criar conta' : 'Entrar'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
            {mode === 'register'
              ? 'Cadastre seu acesso para acompanhar pedidos e salvar endereços.'
              : 'Acesse pedidos, endereços e compras com e-mail e senha.'}
          </p>
        </div>

        <div className="ds-card-elevated space-y-3 border-white/40 bg-white/82 p-4 backdrop-blur-xl sm:space-y-5 sm:p-7 lg:p-8">
          {mode === 'login' ? (
            <div className="relative overflow-hidden rounded-[1.35rem] border border-white/75 bg-[radial-gradient(circle_at_8%_0%,rgba(95,211,90,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,248,251,0.88))] p-3 shadow-[0_18px_42px_-34px_rgba(21,58,76,0.38)]">
              <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#336886]/10 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white p-0.5 shadow-[0_14px_30px_-22px_rgba(21,58,76,0.52)]">
                  <img src="/janocaminho.jpg" alt="" className="h-full w-full rounded-[0.85rem] object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Login de cliente</span>
                  <span className="mt-0.5 block text-sm font-extrabold tracking-[-0.02em] text-slate-900">Pedidos, endereços e compras em um só lugar</span>
                </span>
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700 sm:inline-flex">
                  Seguro
                </span>
              </div>
            </div>
          ) : null}
          <div className="flex gap-2 rounded-[1.1rem] border border-slate-200 bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => {
                setFieldErrors({});
                setError('');
                setMode('login');
              }}
              className={`flex-1 rounded-[0.9rem] px-3 py-2 text-xs font-bold transition-all sm:py-2.5 ${mode === 'login' ? 'bg-white text-[#153A4C] shadow-sm ring-1 ring-[#336886]/10' : 'text-slate-600 hover:bg-white/70'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldErrors({});
                setError('');
                setMode('register');
              }}
              className={`flex-1 rounded-[0.9rem] px-3 py-2 text-xs font-bold transition-all sm:py-2.5 ${mode === 'register' ? 'bg-white text-[#153A4C] shadow-sm ring-1 ring-[#336886]/10' : 'text-slate-600 hover:bg-white/70'}`}
            >
              Cadastro
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            autoComplete="on"
            className="space-y-2.5 sm:space-y-3"
          >
            {mode === 'register' && (
              <div className="relative">
                <UserCircle size={18} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...inputAssistProps.name}
                  name="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:py-3"
                />
              </div>
            )}
            {mode === 'register' && (
              <div className="relative">
                <Phone size={18} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...inputAssistProps.phone}
                  name="phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: formatPhoneBr(e.target.value) }))}
                  placeholder="Telefone (opcional)"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:py-3"
                />
              </div>
            )}
            <div className="relative">
              <EnvelopeSimple size={18} weight="duotone" className="absolute left-3 top-[1.32rem] text-slate-400 sm:top-[1.45rem]" />
              <input
                {...inputAssistProps.email}
                id="email"
                name="email"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="E-mail"
                enterKeyHint={mode === 'register' ? 'next' : 'done'}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'customer-email-error' : undefined}
                className={`w-full rounded-2xl border py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 sm:py-3 ${
                  fieldErrors.email
                    ? 'border-rose-300 bg-rose-50/80 focus:ring-rose-200'
                    : 'border-slate-200 bg-slate-50 focus:ring-slate-300'
                }`}
              />
              {fieldErrors.email ? <p id="customer-email-error" className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.email}</p> : null}
            </div>
            <div className="relative">
              <LockKey size={18} weight="duotone" className="absolute left-3 top-[1.32rem] text-slate-400 sm:top-[1.45rem]" />
              <input
                {...(mode === 'register' ? inputAssistProps.newPassword : inputAssistProps.currentPassword)}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => {
                  setForm((p) => ({ ...p, password: e.target.value }));
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Senha"
                enterKeyHint="done"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'customer-password-error' : undefined}
                className={`w-full rounded-2xl border py-2.5 pl-11 pr-12 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 sm:py-3 ${
                  fieldErrors.password
                    ? 'border-rose-300 bg-rose-50/80 focus:ring-rose-200'
                    : 'border-slate-200 bg-slate-50 focus:ring-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
              </button>
              {fieldErrors.password ? <p id="customer-password-error" className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.password}</p> : null}
            </div>

            {mode === 'login' ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0d4f66] hover:text-[#0b3f52] hover:underline sm:text-xs"
                >
                  Esqueci minha senha
                </button>
              </div>
            ) : null}

            {mode === 'register' && (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5 sm:p-3">
                <label className="flex items-start gap-2 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-[11px]">
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
                <label className="flex items-start gap-2 text-[10px] font-semibold leading-relaxed text-slate-600 sm:text-[11px]">
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

            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-600">{error}</p> : null}
            {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-600">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="ds-btn-shine w-full rounded-2xl bg-[linear-gradient(135deg,#0d4f66,#336886)] px-4 py-3 text-sm font-black text-white shadow-[0_20px_40px_-16px_rgba(13,79,102,0.45)] transition-all active:scale-[0.99] disabled:opacity-60 sm:py-3.5"
            >
              {loading ? 'Processando...' : mode === 'register' ? 'Criar conta' : 'Entrar'}
            </button>

            {mode === 'login' && biometricAvailable ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading || loading}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/15 bg-[#edf5fa] px-4 py-2.5 text-sm font-black text-[#153A4C] shadow-[0_14px_30px_-26px_rgba(51,104,134,0.45)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                >
                  <LockKey size={18} weight="duotone" />
                  {biometricLoading ? 'Lendo biometria...' : 'Usar biometria neste aparelho'}
                </button>
                {storedBiometricProfile?.email ? (
                  <p className="hidden text-center text-[10px] font-semibold leading-relaxed text-slate-400 sm:block">
                    Biometria vinculada: {storedBiometricProfile.email}
                  </p>
                ) : null}
              </div>
            ) : null}
            <AuthMascotPanel variant="client" mode={mode} />
          </form>

          {mode === 'login' ? (
            <div className="border-t border-slate-100/90 pt-3">
              <button
                type="button"
                onClick={() => setProfessionalAccessOpen(true)}
                className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[1.25rem] border border-[#336886]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(238,247,250,0.90))] px-3.5 py-3 text-left shadow-[0_16px_34px_-30px_rgba(21,58,76,0.34)] transition-all hover:border-[#336886]/25 hover:bg-white active:scale-[0.99]"
              >
                <span className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#5FD35A]/12 blur-2xl" />
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white bg-white text-[#153A4C] shadow-[0_14px_28px_-22px_rgba(21,58,76,0.42)]">
                  <Storefront size={19} weight="duotone" />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#336886]">Acesso profissional</span>
                  <span className="mt-0.5 block text-sm font-black leading-4 tracking-[-0.02em] text-slate-900">Sou profissional</span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-slate-500">Lojista, entregador, parceiro ou gestão.</span>
                </span>
                <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#336886]/10 bg-white/80 text-[#336886] transition group-hover:translate-x-0.5">
                  <ArrowRight size={15} weight="bold" />
                </span>
              </button>
            </div>
          ) : null}
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
      {professionalAccessOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(51,104,134,0.22),transparent_36%),rgba(2,6,23,0.52)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:px-4 sm:py-6 animate-in fade-in duration-200">
          <button
            type="button"
            aria-label="Fechar acessos profissionais"
            className="absolute inset-0"
            onClick={() => setProfessionalAccessOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="professional-access-title"
            className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.25rem)] w-full max-w-lg flex-col overflow-y-auto overscroll-contain rounded-[1.85rem] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,248,251,0.96)_62%,rgba(236,244,248,0.94))] p-3.5 shadow-[0_38px_120px_-38px_rgba(15,23,42,0.78)] ring-1 ring-white/40 animate-in zoom-in-95 duration-200 sm:p-5"
          >
            <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#336886]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 left-2 h-40 w-40 rounded-full bg-emerald-300/16 blur-3xl" />
            <div className="relative flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#336886]/10 bg-white/78 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#153A4C] shadow-[0_12px_28px_-24px_rgba(21,58,76,0.38)]">
                  <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full border border-white bg-white">
                    <img src="/janocaminho.jpg" alt="" className="h-full w-full object-cover" />
                  </span>
                  Perfis da plataforma
                </div>
                <h2 id="professional-access-title" className="mt-2.5 text-[clamp(1.05rem,5.4vw,1.35rem)] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-3xl">
                  Acessos profissionais
                </h2>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500 max-[380px]:sr-only sm:text-sm sm:leading-6">
                  Loja, entrega, parceiro e gestão ficam aqui. Cliente continua entrando pela tela principal.
                </p>
              </div>
                <button
                  type="button"
                  onClick={() => setProfessionalAccessOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-800 sm:h-10 sm:w-10"
                  aria-label="Fechar"
                >
                <X size={17} weight="bold" />
              </button>
            </div>

            <div className="relative mt-3 pr-1">
              <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                {professionalAccessOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setProfessionalAccessOpen(false);
                        navigate(option.route);
                      }}
                      className={`group flex w-full items-center gap-2.5 rounded-[1.15rem] border border-white/75 bg-white/88 p-2 text-left shadow-[0_18px_38px_-32px_rgba(15,23,42,0.38)] ring-1 ring-slate-900/[0.03] transition hover:border-[#336886]/18 hover:bg-white hover:shadow-[0_24px_54px_-36px_rgba(21,58,76,0.48)] active:scale-[0.99] sm:hover:-translate-y-0.5 sm:flex-col sm:items-start sm:p-3.5 ${option.id === 'interno' ? 'sm:col-span-2 sm:flex-row sm:items-center' : ''}`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[1rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:h-12 sm:w-12 ${option.tone}`}>
                        <Icon size={20} weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1 sm:w-full">
                        <span className="flex items-center justify-between gap-2">
                          <span className="block text-sm font-black tracking-[-0.02em] text-slate-950 sm:text-base">{option.title}</span>
                          <ArrowRight size={17} weight="bold" className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#336886] sm:block" />
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500 max-[380px]:sr-only sm:text-xs sm:leading-5">{option.description}</span>
                      </span>
                      <ArrowRight size={17} weight="bold" className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#336886] sm:hidden" />
                    </button>
                  );
                })}
              </div>
            </div>

          </section>
        </div>
      ) : null}
      {verifyPrompt ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
          <div className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-7rem)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] shadow-[0_36px_120px_-28px_rgba(15,23,42,0.55)] sm:max-h-[min(48rem,calc(100dvh-3rem))]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f3b53_0%,#0d4f66_55%,#2c8c9f_100%)] px-6 pb-8 pt-6 text-white">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_68%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/78">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(134,239,172,0.16)]" />
                    Dentro do app
                  </div>
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/12 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.75)]">
                    <EnvelopeSimple size={28} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">Validar e-mail</p>
                    <h3 className="mt-2 text-[1.7rem] font-black leading-none tracking-[-0.03em]">Código de 4 dígitos</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyPrompt(null)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/16"
                >
                  Fechar
                </button>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-white/80">
                {(() => {
                  const target = String(verifyPrompt.emailMasked || verifyPrompt.email || '').trim();
                  return target ? (
                    <>
                      Enviamos o código para{' '}
                      <span className="inline-flex rounded-full border border-white/18 bg-white/12 px-2.5 py-1 font-black text-white">
                        {target}
                      </span>
                      .
                    </>
                  ) : (
                    'Enviamos o código para o e-mail informado.'
                  );
                })()}
              </p>
              <p className="relative mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                {verifyFlowLabel === 'register' ? 'Último passo para ativar sua conta' : 'Confirme para finalizar seu login'}
              </p>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
              <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                  <SealCheck size={16} weight="duotone" className="text-[#0d4f66]" />
                  Confirmação segura
                </div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  {verifyFlowLabel === 'register'
                    ? 'Digite o código recebido para concluir seu cadastro sem sair do app.'
                    : 'Digite o código recebido para confirmar a conta e concluir o login sem sair do app.'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`customer-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={digit}
                      onChange={(e) => handleCodeDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      onPaste={handleCodePaste}
                      className="h-16 w-14 rounded-2xl border border-slate-200 bg-slate-50 text-center text-2xl font-black tracking-[0.1em] text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.5)] outline-none transition focus:border-[#0d4f66] focus:bg-white focus:ring-4 focus:ring-[#0d4f66]/10 sm:w-16"
                    />
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-slate-500">
                  Se não recebeu, toque em <span className="font-black text-slate-700">Reenviar código</span>. Assim que o código correto bater, sua conta é confirmada e o acesso continua daqui.
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 shadow-[0_12px_30px_-24px_rgba(225,29,72,0.65)] animate-in fade-in slide-in-from-top-1 duration-150">
                  <WarningCircle size={18} weight="fill" />
                  <span>{error}</span>
                </div>
              ) : null}
              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              ) : null}

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 4 || codeLoading}
                  className="rounded-2xl bg-[linear-gradient(135deg,#0f3b53,#0d4f66,#2c8c9f)] px-4 py-3.5 text-sm font-black text-white shadow-[0_24px_50px_-24px_rgba(15,59,83,0.55)] transition active:scale-[0.99] disabled:opacity-60"
                >
                  {codeLoading ? 'Confirmando código...' : 'Confirmar e entrar'}
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendCooldown > 0 || !verifyPrompt.email}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {resendLoading ? 'Reenviando...' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <MfaChallengeModal
        open={Boolean(mfaChallenge)}
        challenge={mfaChallenge}
        audience="customer"
        loading={mfaLoading}
        error={mfaError}
        expired={Boolean(mfaChallenge?.expired)}
        onCancel={() => setMfaChallenge(null)}
        onRestart={() => {
          setMfaChallenge(null);
          setMfaError('');
          setMessage('');
          setError('');
        }}
        onVerify={handleMfaVerify}
      />
    </AuthLayout>
  );
}
