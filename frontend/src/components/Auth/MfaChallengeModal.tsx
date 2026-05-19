import { FormEvent, useEffect, useRef, useState } from 'react';
import { Copy, DeviceMobile, ShieldCheck, X } from '@phosphor-icons/react';
import { readMfaClipboardText } from '../../utils/mfaClipboard';

type MfaChallenge = {
  challengeToken: string;
  account?: string;
  trustDeviceAvailable?: boolean;
  trustedDeviceExpirationDays?: number;
};

type Props = {
  open: boolean;
  challenge: MfaChallenge | null;
  audience?: 'admin' | 'customer' | 'motoboy' | 'superadmin';
  loading?: boolean;
  error?: string;
  onCancel: () => void;
  onVerify: (payload: { code: string; trustDevice: boolean }) => Promise<void> | void;
};

const audienceCopy: Record<NonNullable<Props['audience']>, { eyebrow: string; title: string; helper: string }> = {
  admin: {
    eyebrow: 'Painel da loja',
    title: 'Acesso seguro da loja',
    helper: 'Informe o código de 6 dígitos do autenticador.',
  },
  customer: {
    eyebrow: 'Conta do cliente',
    title: 'Proteção do seu pedido',
    helper: 'Informe o código de 6 dígitos do autenticador.',
  },
  motoboy: {
    eyebrow: 'Área do entregador',
    title: 'Rota protegida',
    helper: 'Informe o código de 6 dígitos do autenticador.',
  },
  superadmin: {
    eyebrow: 'Controle da plataforma',
    title: 'Acesso protegido',
    helper: 'Informe o código de 6 dígitos do autenticador.',
  },
};

export function MfaChallengeModal({ open, challenge, audience = 'admin', loading, error, onCancel, onVerify }: Props) {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [pasteHint, setPasteHint] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submittedCodeRef = useRef('');
  const submittingRef = useRef(false);
  const copy = audienceCopy[audience] || audienceCopy.admin;

  useEffect(() => {
    if (!open) return;
    setCode('');
    setTrustDevice(false);
    setPasteHint('');
    submittedCodeRef.current = '';
    submittingRef.current = false;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, challenge?.challengeToken]);

  if (!open || !challenge) return null;

  const sanitizeCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);
  const manualPasteHint = 'Não deu para ler automaticamente. Toque no campo e use Colar do teclado.';

  const focusCodeInput = () => {
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
  };

  const verifyCode = async (nextCode: string, options?: { force?: boolean }) => {
    const cleanCode = sanitizeCode(nextCode);
    if (cleanCode.length !== 6 || loading) return;
    if (submittingRef.current) return;
    if (!options?.force && submittedCodeRef.current === cleanCode) return;
    submittedCodeRef.current = cleanCode;
    submittingRef.current = true;
    setPasteHint('');
    try {
      await onVerify({ code: cleanCode, trustDevice });
    } finally {
      submittingRef.current = false;
    }
  };

  const updateCode = (value: string, options?: { autoVerify?: boolean }) => {
    const cleanCode = sanitizeCode(value);
    setCode(cleanCode);
    setPasteHint('');
    if (cleanCode.length < 6) {
      submittedCodeRef.current = '';
      return;
    }
    if (options?.autoVerify !== false) {
      void verifyCode(cleanCode);
    }
  };

  const pasteCode = async () => {
    if (loading) return;
    focusCodeInput();
    setPasteHint('Tentando colar o código...');
    try {
      const clipboardText = await readMfaClipboardText();
      const cleanCode = sanitizeCode(String(clipboardText || ''));
      if (!cleanCode) {
        setPasteHint('Copie o código do autenticador e toque em Colar Código.');
        return;
      }
      updateCode(cleanCode);
    } catch {
      setPasteHint(manualPasteHint);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await verifyCode(code, { force: true });
  };

  const codeDigits = Array.from({ length: 6 }, (_, index) => code[index] || '0');
  const trustedDeviceDays = Number(challenge.trustedDeviceExpirationDays);
  const trustedDeviceLabel =
    Number.isFinite(trustedDeviceDays) && trustedDeviceDays > 0
      ? `Salvar acesso neste aparelho por ${trustedDeviceDays} dias.`
      : 'Salvar acesso neste aparelho.';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(51,104,134,0.34),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.72),rgba(15,23,42,0.86))] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-white/55 bg-white/95 shadow-[0_34px_100px_-28px_rgba(2,6,23,0.85)] ring-1 ring-[#336886]/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-4 h-36 w-36 rounded-full bg-emerald-300/18 blur-3xl" />
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(132,204,22,0.18),transparent_28%),linear-gradient(135deg,#081520_0%,#153A4C_52%,#336886_100%)] px-5 pb-5 pt-5 text-white">
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white/75 shadow-[0_14px_30px_-24px_rgba(2,6,23,0.95)] backdrop-blur transition hover:bg-white/20 hover:text-white"
            aria-label="Fechar verificação em duas etapas"
          >
            <X size={18} weight="bold" />
          </button>
          <div className="flex items-start gap-4 pr-10">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-[1.65rem] bg-white/35 blur-xl" />
              <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[1.25rem] border border-white/35 bg-white shadow-[0_24px_48px_-26px_rgba(2,6,23,0.95)]">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-[#153A4C] bg-lime-300 text-[#153A4C] shadow-lg">
                <ShieldCheck size={15} weight="fill" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200/90">{copy.eyebrow}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">{copy.title}</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-sky-50/78">
                {copy.helper}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="relative space-y-4 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
          {challenge.account ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#336886]/10 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6fa_100%)] px-4 py-3 shadow-inner shadow-white">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#336886] shadow-sm ring-1 ring-slate-100">
                <DeviceMobile size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Conta protegida</p>
                <p className="truncate text-sm font-black text-slate-700">{challenge.account}</p>
              </div>
            </div>
          ) : null}

          {challenge.trustDeviceAvailable ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#336886]/10 bg-[#336886]/5 px-3 py-3 shadow-inner shadow-white">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(event) => setTrustDevice(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#336886] focus:ring-[#336886]"
              />
              <span className="text-sm font-semibold leading-relaxed text-slate-600">{trustedDeviceLabel}</span>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Código do app autenticador</span>
            <div className="relative" onClick={focusCodeInput}>
              <div className="grid min-w-0 grid-cols-6 gap-1.5 sm:gap-2" aria-hidden="true">
                {codeDigits.map((digit, index) => (
                  <div
                    key={`mfa-digit-${index}`}
                    className={`grid aspect-square min-w-0 place-items-center rounded-2xl border bg-white text-[clamp(1.15rem,5.8vw,1.5rem)] font-black shadow-[0_16px_34px_-30px_rgba(15,23,42,0.7)] transition ${
                      code.length === index
                        ? 'border-[#336886] text-slate-900 ring-4 ring-[#336886]/10'
                        : code.length > index
                          ? 'border-[#336886]/25 text-slate-900'
                          : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {digit}
                  </div>
                ))}
              </div>
              <input
                ref={inputRef}
                value={code}
                onChange={(event) => updateCode(event.target.value)}
                onPaste={(event) => {
                  const pasted = event.clipboardData?.getData('text') || '';
                  if (!pasted) return;
                  event.preventDefault();
                  updateCode(pasted);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
                aria-label="Código do app autenticador"
                autoComplete="one-time-code"
              />
            </div>
            <button
              type="button"
              onClick={pasteCode}
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#336886]/10 bg-white px-4 text-sm font-black text-[#153A4C] shadow-[0_18px_36px_-30px_rgba(15,23,42,0.55)] transition active:scale-[0.98] disabled:opacity-50"
              aria-label="Colar Código"
            >
              <Copy size={16} weight="duotone" />
              Colar Código
            </button>
            <span className={`block text-left text-[11px] font-bold leading-relaxed ${pasteHint ? 'text-[#153A4C]' : 'text-slate-400'}`}>
              {pasteHint || (loading ? 'Validando automaticamente...' : code.length === 6 ? 'Código completo. Use o botão se precisar tentar de novo.' : 'Ao completar 6 dígitos, validamos automaticamente.')}
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center rounded-[1.35rem] bg-[#179C84] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_22px_44px_-26px_rgba(23,156,132,0.95)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {loading ? 'Validando...' : 'Confirmar acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}
