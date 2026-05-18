import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle, DeviceMobile, LockKey, ShieldCheck, X } from '@phosphor-icons/react';

type MfaChallenge = {
  challengeToken: string;
  account?: string;
  trustDeviceAvailable?: boolean;
  trustedDeviceExpirationDays?: number;
};

type Props = {
  open: boolean;
  challenge: MfaChallenge | null;
  loading?: boolean;
  error?: string;
  onCancel: () => void;
  onVerify: (payload: { code: string; trustDevice: boolean }) => Promise<void> | void;
};

export function MfaChallengeModal({ open, challenge, loading, error, onCancel, onVerify }: Props) {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[2rem] border border-white/50 bg-white/95 shadow-[0_32px_90px_-30px_rgba(15,23,42,0.75)]">
        <div className="relative bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.20),transparent_34%),linear-gradient(135deg,#f8fbfc,#ffffff)] px-5 pb-5 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.7)] transition hover:text-slate-800"
            aria-label="Fechar MFA"
          >
            <X size={18} weight="bold" />
          </button>
          <div className="flex items-start gap-4 pr-10">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#153A4C] text-white shadow-[0_22px_44px_-28px_rgba(21,58,76,0.9)]">
              <ShieldCheck size={30} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]">Seguranca da conta</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">Confirme sua identidade</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                Abra Authy, Google Authenticator ou Microsoft Authenticator e digite o codigo de 6 digitos.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 pb-5 pt-4">
          {challenge.account ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <DeviceMobile size={20} weight="duotone" className="text-[#336886]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Conta protegida</p>
                <p className="text-sm font-black text-slate-700">{challenge.account}</p>
              </div>
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Codigo MFA</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center text-3xl font-black tracking-[0.35em] text-slate-900 outline-none transition focus:border-[#336886] focus:ring-4 focus:ring-[#336886]/10"
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </label>

          {challenge.trustDeviceAvailable ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#336886]/10 bg-[#336886]/5 px-4 py-3">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(event) => setTrustDevice(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#336886] focus:ring-[#336886]"
              />
              <span className="text-sm font-semibold leading-relaxed text-slate-600">
                Confiar neste aparelho por {challenge.trustedDeviceExpirationDays || 30} dias. Depois do primeiro MFA, a biometria local pode liberar este dispositivo.
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
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-[#153A4C] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_22px_44px_-26px_rgba(21,58,76,0.95)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? <LockKey size={18} weight="duotone" /> : <CheckCircle size={18} weight="duotone" />}
            {loading ? 'Validando...' : 'Confirmar acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}
