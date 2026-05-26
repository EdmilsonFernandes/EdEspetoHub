// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  ClipboardText,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Key,
  LockSimple,
  PaperPlaneTilt,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { authService } from '../services/authService';
import { AuthLayout } from '../layouts/AuthLayout';
import { inputAssistProps } from '../utils/inputAssist';

type RecoveryStep = 'email' | 'password' | 'code' | 'success';

const RECOVERY_CONTEXT = {
  cliente: {
    title: 'Recuperar senha',
    subtitle: 'Acesso do cliente',
    backTo: '/cliente?mode=login',
    loginPath: '/cliente?mode=login',
    eyebrow: 'Conta do cliente',
    headline: 'Vamos recuperar seu acesso',
    description: 'Informe seu e-mail. Depois você cria a nova senha e recebe o código para confirmar.',
  },
  entregador: {
    title: 'Recuperar senha',
    subtitle: 'Acesso do entregador',
    backTo: '/motoboy/login',
    loginPath: '/motoboy/login',
    eyebrow: 'Área do entregador',
    headline: 'Recupere seu acesso de entregador',
    description: 'Use o e-mail cadastrado. Depois você recebe um código seguro para voltar ao app.',
  },
  lojista: {
    title: 'Recuperar senha',
    subtitle: 'Acesso da loja',
    backTo: '/admin',
    loginPath: '/admin',
    eyebrow: 'Área da loja',
    headline: 'Recupere o acesso da loja',
    description: 'Digite o e-mail do acesso. O código será enviado depois que você definir a nova senha.',
  },
};

const normalizeAudience = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['cliente', 'customer', 'client'].includes(normalized)) return 'cliente';
  if (['entregador', 'motoboy', 'delivery'].includes(normalized)) return 'entregador';
  return 'lojista';
};

const cleanCode = (value: string) => String(value || '').replace(/\D/g, '').slice(0, 6);

export function ForgotPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const context = useMemo(() => RECOVERY_CONTEXT[normalizeAudience(params.get('perfil'))], [params]);
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState(() => String(params.get('email') || '').trim().toLowerCase());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const codeSubmitInFlightRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const codeDigits = useMemo(() => Array.from({ length: 6 }, (_, index) => code[index] || ''), [code]);

  const sendResetCode = async (options?: { stayOnStep?: boolean }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    setError('');
    setMessage('');
    if (!normalizedEmail) {
      setError('Informe seu e-mail para continuar.');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setCooldown(60);
      setMessage('Enviamos um código para seu e-mail. Copie os 6 números e cole aqui.');
      if (!options?.stayOnStep) {
        setStep('code');
        window.setTimeout(() => codeInputRef.current?.focus(), 120);
      }
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o código agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    setError('');
    setMessage('');
    if (!normalizedEmail) {
      setError('Informe seu e-mail para continuar.');
      return;
    }
    setEmail(normalizedEmail);
    setStep('password');
    window.setTimeout(() => document.getElementById('new-password')?.focus(), 80);
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem. Revise e tente novamente.');
      return;
    }
    await sendResetCode();
  };

  const submitCode = async (codeOverride?: string) => {
    const normalizedCode = cleanCode(codeOverride ?? code);
    setError('');
    setMessage('');
    if (normalizedCode.length !== 6) {
      setError('Digite o código de 6 dígitos enviado por e-mail.');
      return;
    }
    if (codeSubmitInFlightRef.current) return;
    codeSubmitInFlightRef.current = true;
    setLoading(true);
    try {
      await authService.resetPasswordWithCode(email, normalizedCode, password);
      setPassword('');
      setConfirm('');
      setCode('');
      setStep('success');
      setMessage('Senha alterada com sucesso. Você já pode entrar com a nova senha.');
      window.setTimeout(() => navigate(context.loginPath, { replace: true }), 700);
    } catch (err) {
      setError(err?.message || 'Código inválido ou expirado. Peça um novo código e tente novamente.');
    } finally {
      setLoading(false);
      codeSubmitInFlightRef.current = false;
    }
  };

  const handleCodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitCode();
  };

  const applyCode = (value: string, autoSubmit = false) => {
    const nextCode = cleanCode(value);
    setCode(nextCode);
    if (autoSubmit && nextCode.length === 6) {
      window.setTimeout(() => submitCode(nextCode), 0);
    }
  };

  const pasteCode = async () => {
    setError('');
    try {
      const text = await navigator.clipboard?.readText?.();
      const nextCode = cleanCode(text || '');
      if (!nextCode) {
        codeInputRef.current?.focus();
        setError('Não encontrei um código válido copiado. Toque no campo e use colar do teclado.');
        return;
      }
      applyCode(nextCode, true);
    } catch {
      codeInputRef.current?.focus();
      setError('Não deu para ler automaticamente. Toque no campo e use colar do teclado.');
    }
  };

  return (
    <AuthLayout
      title={context.title}
      eyebrow="Já no Caminho"
      subtitle={context.subtitle}
      backTo={context.backTo}
      showHeader
    >
      <div className="w-full space-y-3 ds-login-card-enter sm:space-y-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-white/70 bg-white/78 text-[#153A4C] shadow-[0_18px_38px_-26px_rgba(21,58,76,0.55)] sm:h-16 sm:w-16">
            {step === 'email' ? <EnvelopeSimple size={30} weight="duotone" /> : step === 'password' ? <LockSimple size={30} weight="duotone" /> : <Key size={30} weight="duotone" />}
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]/75">{context.eyebrow}</p>
          <h2 className="mt-1 text-[1.7rem] font-black leading-tight tracking-[-0.04em] text-slate-900 sm:text-[2.15rem]">
            {step === 'email' ? context.headline : step === 'password' ? 'Crie sua nova senha' : step === 'code' ? 'Confirme o código' : 'Senha atualizada'}
          </h2>
          <p className="mx-auto mt-2 max-w-[21rem] text-sm font-semibold leading-relaxed text-slate-500">
            {step === 'email'
              ? context.description
              : step === 'password'
              ? 'Agora escolha uma senha nova. Ao continuar, enviaremos o código para seu e-mail.'
              : step === 'code'
              ? `Enviamos o código para ${email}. Cole ou digite os 6 números.`
              : 'Você será direcionado para entrar novamente.'}
          </p>
        </div>

        <div className="ds-card-elevated border-white/55 bg-white/86 p-5 shadow-[0_28px_70px_-42px_rgba(21,58,76,0.45)] backdrop-blur-xl sm:p-7">
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { key: 'email', label: 'E-mail' },
              { key: 'password', label: 'Senha' },
              { key: 'code', label: 'Código' },
            ].map((item, index) => {
              const activeIndex = step === 'email' ? 0 : step === 'password' ? 1 : 2;
              const isDone = index < activeIndex || step === 'success';
              const isActive = index === activeIndex && step !== 'success';
              return (
                <div
                  key={item.key}
                  className={`rounded-2xl px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] transition ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      : isActive
                      ? 'bg-[#e8f3f7] text-[#153A4C] ring-1 ring-[#cfe4ed]'
                      : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100'
                  }`}
                >
                  {item.label}
                </div>
              );
            })}
          </div>

          {message ? (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">
              <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-emerald-500" />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 animate-shake">
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="rounded-2xl border border-[#d7e7ef] bg-[#f5fafc] px-3 py-2.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                  <ShieldCheck size={15} weight="fill" />
                  Código seguro por e-mail
                </div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Primeiro confirme o e-mail e crie a nova senha. O código será enviado no próximo passo.
                </p>
              </div>
              <div className="floating-field">
                <input
                  {...inputAssistProps.email}
                  id="reset-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="floating-input"
                  placeholder=" "
                  required
                />
                <label htmlFor="reset-email" className="floating-label">E-mail cadastrado</label>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="ds-btn-shine flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3.5 text-sm font-black text-white shadow-[0_22px_45px_-24px_rgba(21,58,76,0.70)] transition active:scale-[0.98] disabled:opacity-60 sm:h-14 sm:text-base"
              >
                <PaperPlaneTilt size={19} weight="duotone" />
                Continuar
              </button>
            </form>
          ) : null}

          {step === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="floating-field">
                <input
                  {...inputAssistProps.newPassword}
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="floating-input pr-12"
                  placeholder=" "
                  required
                />
                <label htmlFor="new-password" className="floating-label">Nova senha</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                </button>
              </div>
              <div className="floating-field">
                <input
                  {...inputAssistProps.newPassword}
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="floating-input pr-12"
                  placeholder=" "
                  required
                />
                <label htmlFor="confirm-password" className="floating-label">Confirmar nova senha</label>
                <button
                  type="button"
                  onClick={() => setShowConfirm((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirm ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="ds-btn-shine flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3.5 text-sm font-black text-white shadow-[0_22px_45px_-24px_rgba(21,58,76,0.70)] transition active:scale-[0.98] disabled:opacity-60 sm:h-14 sm:text-base"
              >
                {loading ? 'Enviando código...' : 'Enviar código por e-mail'}
              </button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition active:scale-[0.98]"
              >
                Trocar e-mail
              </button>
            </form>
          ) : null}

          {step === 'code' ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-code" className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Código recebido
                </label>
                <div className="relative">
                  <label htmlFor="reset-code" className="grid cursor-text grid-cols-6 gap-2">
                    {codeDigits.map((digit, index) => (
                      <span
                        key={index}
                        className={`flex h-14 items-center justify-center rounded-2xl border text-xl font-black tracking-tight shadow-[0_14px_28px_-24px_rgba(15,23,42,0.5)] transition sm:h-14 ${
                          digit ? 'border-[#b8d8e5] bg-white text-[#153A4C]' : 'border-slate-200 bg-slate-50 text-slate-300'
                        }`}
                      >
                        {digit || '0'}
                      </span>
                    ))}
                  </label>
                  <input
                    {...inputAssistProps.otp}
                    ref={codeInputRef}
                    id="reset-code"
                    value={code}
                    onChange={(event) => applyCode(event.target.value, true)}
                    onPaste={(event) => {
                      event.preventDefault();
                      applyCode(event.clipboardData.getData('text'), true);
                    }}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                    maxLength={6}
                    aria-label="Código de 6 dígitos"
                  />
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-slate-500">
                  Ao colar os 6 números, validamos automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={pasteCode}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#cfe4ed] bg-[#f2f8fb] px-4 py-3 text-sm font-black text-[#153A4C] transition active:scale-[0.98]"
              >
                <ClipboardText size={18} weight="duotone" />
                Colar código
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="ds-btn-shine flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3.5 text-sm font-black text-white shadow-[0_22px_45px_-24px_rgba(21,58,76,0.70)] transition active:scale-[0.98] disabled:opacity-60 sm:h-14 sm:text-base"
              >
                {loading ? 'Confirmando...' : 'Confirmar código e alterar senha'}
              </button>
              <button
                type="button"
                onClick={() => sendResetCode({ stayOnStep: true })}
                disabled={loading || cooldown > 0}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition active:scale-[0.98] disabled:opacity-55"
              >
                {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
              </button>
            </form>
          ) : null}

          {step === 'success' ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle size={36} weight="fill" />
              </div>
              <button
                type="button"
                onClick={() => navigate(context.loginPath, { replace: true })}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3.5 text-sm font-black text-white shadow-[0_22px_45px_-24px_rgba(21,58,76,0.70)]"
              >
                Entrar com nova senha
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </AuthLayout>
  );
}
