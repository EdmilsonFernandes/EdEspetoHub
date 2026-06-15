// @ts-nocheck
import { memo, useEffect, useRef, useState } from 'react';
import { CheckCircle, Copy, Timer } from '@phosphor-icons/react';

/**
 * Card de pagamento PIX compartilhado (padrao-ouro = tela de pedido).
 *
 * Por que nao pisca: o componente e memoizado (so re-renderiza quando os PROPS
 * primitivos mudam) e o contador e um timer 100% local (nunca toca na rede).
 * A unica entrada de rede e `status` — quando vira PAID so o pill atualiza, o
 * QR <img> (key estavel) nunca remonta. Assim a tela de gorjeta/motoboy para de
 * piscar mesmo com o poll do pedido rodando por tras.
 *
 * O copia-e-cola usa o `qrCodeText` (BR Code EMV valido vindo do MP/buildPixPayload),
 * entao bancos/Google Pay detectam e oferecem pagar automaticamente.
 */
type Props = {
  qrCodeBase64?: string | null;
  qrCodeText?: string | null;
  paymentLink?: string | null;
  status: string;
  expiresAt?: string | number | null;
  amountLabel?: string | null;
  title?: string;
  subtitle?: string;
  variant?: 'client' | 'admin';
  onVerifyNow?: () => void;
  autoVerifyMs?: number;
  onPaid?: () => void;
  verifyLabel?: string;
};

const toMs = (v?: string | number | null) => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
};

const fmtCountdown = (ms: number) => {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const PaymentQRCard = memo(function PaymentQRCard({
  qrCodeBase64,
  qrCodeText,
  paymentLink,
  status,
  expiresAt,
  amountLabel,
  title = 'Pague com PIX',
  subtitle,
  variant = 'client',
  onVerifyNow,
  autoVerifyMs,
  onPaid,
  verifyLabel = 'Já paguei',
}: Props) {
  const isPaid = String(status || '').toUpperCase() === 'PAID';
  const isFailed = ['FAILED', 'EXPIRED', 'REJECTED', 'CANCELLED'].includes(String(status || '').toUpperCase());
  const expiryMs = toMs(expiresAt);

  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiryMs - Date.now()));
  const [copied, setCopied] = useState(false);
  const paidHandledRef = useRef(false);

  // Contador 100% local (nao toca na rede) — nao pisca.
  useEffect(() => {
    if (!expiryMs) return undefined;
    const tick = () => setRemainingMs(Math.max(0, expiryMs - Date.now()));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [expiryMs]);

  // Auto-poll opcional (so atualiza status; o QR/countdown nao remontam).
  useEffect(() => {
    if (!autoVerifyMs || !onVerifyNow || isPaid) return undefined;
    const id = window.setInterval(onVerifyNow, autoVerifyMs);
    return () => window.clearInterval(id);
  }, [autoVerifyMs, onVerifyNow, isPaid]);

  // Callback unico quando vira PAGO.
  useEffect(() => {
    if (isPaid && !paidHandledRef.current) {
      paidHandledRef.current = true;
      onPaid?.();
    }
  }, [isPaid, onPaid]);

  const pct = expiryMs > 0 ? Math.max(0, Math.min(100, (remainingMs / (expiryMs - (expiryMs - Math.min(expiryMs, Date.now())))))) : 0;
  const tone =
    remainingMs <= 60_000 ? 'rose' : remainingMs <= 180_000 ? 'amber' : 'emerald';

  const isAdmin = variant === 'admin';

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(String(qrCodeText || ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* silencioso */
    }
  };

  if (isPaid) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-3xl border px-6 py-8 text-center ${isAdmin ? 'border-emerald-100 bg-emerald-50/70' : 'border-emerald-200 bg-emerald-50'}`}>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle size={30} weight="fill" />
        </span>
        <p className="mt-3 text-sm font-black text-emerald-700">Pagamento confirmado</p>
        {amountLabel ? <p className="mt-1 text-xs font-bold text-emerald-600">{amountLabel}</p> : null}
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border ${isAdmin ? 'border-slate-200 bg-white' : 'border-slate-200 bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{title}</p>
          {subtitle ? <p className="truncate text-[11px] font-semibold text-slate-400">{subtitle}</p> : null}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${tone === 'rose' ? 'bg-rose-100 text-rose-700' : tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          <Timer size={12} weight="fill" /> {fmtCountdown(remainingMs)}
        </span>
      </div>

      <div className="px-4 py-4">
        {qrCodeBase64 ? (
          <div className="flex justify-center">
            <img
              src={qrCodeBase64}
              alt="QR Code PIX"
              className="h-52 w-52 rounded-2xl border border-slate-100 object-contain"
            />
          </div>
        ) : qrCodeText ? (
          <div className="flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=208x208&data=${encodeURIComponent(String(qrCodeText))}`}
              alt="QR Code PIX"
              className="h-52 w-52 rounded-2xl border border-slate-100 object-contain"
            />
          </div>
        ) : null}

        {qrCodeText ? (
          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">PIX copia e cola</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={String(qrCodeText).slice(0, 60)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500"
                onClick={handleCopy}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-slate-800"
              >
                <Copy size={12} weight="bold" /> {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        ) : null}

        {paymentLink ? (
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
          >
            Pagar com cartão →
          </a>
        ) : null}

        {isFailed ? (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">
            Pagamento expirou ou falhou. Gere novamente.
          </p>
        ) : null}

        {/* Barra de progresso sutil do tempo */}
        {expiryMs > 0 ? (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${tone === 'rose' ? 'bg-rose-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.max(4, Math.min(100, (remainingMs / 300000) * 100))}%` }}
            />
          </div>
        ) : null}

        {onVerifyNow ? (
          <button
            type="button"
            onClick={onVerifyNow}
            className="mt-3 w-full rounded-xl px-4 py-2 text-[11px] font-black text-slate-400 hover:text-slate-700"
          >
            {verifyLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
});
