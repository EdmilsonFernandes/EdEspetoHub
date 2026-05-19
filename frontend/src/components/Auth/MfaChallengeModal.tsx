import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle, DeviceMobile, Fingerprint, LockKey, ShieldCheck, Sparkle, X } from '@phosphor-icons/react';

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

const audienceCopy: Record<NonNullable<Props['audience']>, { eyebrow: string; title: string; helper: string; badge: string }> = {
  admin: {
    eyebrow: 'Painel da loja',
    title: 'Acesso seguro da loja',
    helper: 'Confirme o codigo do app autenticador para entrar na operacao.',
    badge: 'Loja protegida',
  },
  customer: {
    eyebrow: 'Conta do cliente',
    title: 'Protecao do seu pedido',
    helper: 'Digite o codigo do app autenticador para liberar sua conta.',
    badge: 'Cliente seguro',
  },
  motoboy: {
    eyebrow: 'Area do entregador',
    title: 'Rota protegida',
    helper: 'Confirme o codigo do app autenticador para acessar suas entregas.',
    badge: 'Entregador validado',
  },
  superadmin: {
    eyebrow: 'Controle da plataforma',
    title: 'Acesso critico protegido',
    helper: 'Confirme o codigo do app autenticador para acessar o painel principal.',
    badge: 'Plataforma segura',
  },
};

export function MfaChallengeModal({ open, challenge, audience = 'admin', loading, error, onCancel, onVerify }: Props) {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const copy = audienceCopy[audience] || audienceCopy.admin;

  useEffect(() => {
    if (!open) return;
    setCode('');
    setTrustDevice(true);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, challenge?.challengeToken]);

  if (!open || !challenge) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.replace(/\D/g, '').length !== 6 || loading) return;
    await onVerify({ code: code.replace(/\D/g, ''), trustDevice });
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-[radial-gradient(circle_at_20%_0%,rgba(51,104,134,0.32),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.58),rgba(15,23,42,0.72))] px-3 py-3 backdrop-blur-md sm:items-center">
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[2.25rem] border border-white/55 bg-white/95 shadow-[0_34px_100px_-28px_rgba(2,6,23,0.85)] ring-1 ring-[#336886]/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-4 h-36 w-36 rounded-full bg-emerald-300/18 blur-3xl" />
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(132,204,22,0.18),transparent_28%),linear-gradient(135deg,#081520_0%,#153A4C_52%,#336886_100%)] px-5 pb-5 pt-5 text-white">
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white/75 shadow-[0_14px_30px_-24px_rgba(2,6,23,0.95)] backdrop-blur transition hover:bg-white/20 hover:text-white"
            aria-label="Fechar verificacao em duas etapas"
          >
            <X size={18} weight="bold" />
          </button>
          <div className="flex items-start gap-4 pr-10">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-[1.65rem] bg-white/35 blur-xl" />
              <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-[1.55rem] border border-white/35 bg-white shadow-[0_24px_48px_-26px_rgba(2,6,23,0.95)]">
                <img src="/janocaminho.jpg" alt="Ja no Caminho" className="h-full w-full object-cover" />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-[#153A4C] bg-lime-300 text-[#153A4C] shadow-lg">
                <ShieldCheck size={15} weight="fill" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200/90">{copy.eyebrow}</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">{copy.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-sky-50/78">
                {copy.helper}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white/88 backdrop-blur">
                  <Sparkle size={11} weight="fill" className="text-lime-200" />
                  {copy.badge}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white/88 backdrop-blur">
                  <Fingerprint size={11} weight="duotone" className="text-sky-100" />
                  Biometria apos validar
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="relative space-y-4 px-5 pb-5 pt-4">
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

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Codigo do app autenticador</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="w-full rounded-3xl border border-[#336886]/15 bg-white px-5 py-4 text-center text-3xl font-black tracking-[0.35em] text-slate-900 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.6)] outline-none transition focus:border-[#336886] focus:ring-4 focus:ring-[#336886]/12"
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </label>

          {challenge.trustDeviceAvailable ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#336886]/10 bg-[#336886]/5 px-4 py-3 shadow-inner shadow-white">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(event) => setTrustDevice(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#336886] focus:ring-[#336886]"
              />
              <span className="text-sm font-semibold leading-relaxed text-slate-600">
                Confiar neste aparelho por {challenge.trustedDeviceExpirationDays || 30} dias. Depois da primeira verificacao, a biometria local pode liberar este dispositivo.
              </span>
            </label>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-[linear-gradient(135deg,#102b3a_0%,#153A4C_48%,#336886_100%)] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_22px_44px_-26px_rgba(21,58,76,0.95)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? <LockKey size={18} weight="duotone" /> : <CheckCircle size={18} weight="duotone" />}
            {loading ? 'Validando...' : 'Confirmar acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}
