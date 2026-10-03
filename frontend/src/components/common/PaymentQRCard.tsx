import { memo, useEffect, useRef, useState } from 'react';
import { Check, CheckCircle, Clock, Copy, Spinner, Timer } from '@phosphor-icons/react';
import { getPaymentProviderMeta } from '../../utils/paymentAssets';
import { copyToClipboard } from '../../utils/clipboard';

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
 *
 * Padrao premium (spec 03/10): resumo com valor em destaque, copia-e-cola em
 * destaque acima do QR (mobile-first), QR em card branco sempre (legivel em dark),
 * estados de geracao/aprovacao/expiracao, logo do gateway no rodape.
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
  /** Provider real do gateway (mercado_pago | openpix | asaas) — mostra logo no rodape. */
  provider?: string | null;
  /** true enquanto o QR esta sendo gerado (spinner + "Gerando seu PIX…"). */
  isLoading?: boolean;
  /** Estado expirado/falhou: acao para gerar um novo PIX. */
  onRegenerate?: () => void;
  /** Estado de erro de geracao: mensagem amigavel + tentar novamente. */
  errorMessage?: string | null;
  onRetry?: () => void;
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

const truncateCode = (code: string, max = 48) =>
  code.length > max ? `${code.slice(0, max)}…` : code;

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
  provider,
  isLoading = false,
  onRegenerate,
  errorMessage,
  onRetry,
}: Props) {
  const isPaid = String(status || '').toUpperCase() === 'PAID';
  const isFailed = ['FAILED', 'EXPIRED', 'REJECTED', 'CANCELLED'].includes(String(status || '').toUpperCase());
  const isExpiredByTime = !isPaid && !isFailed && expiryRefLogic(expiresAt);
  const expiryMs = toMs(expiresAt);

  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiryMs - Date.now()));
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const paidHandledRef = useRef(false);
  const copiedTimerRef = useRef<number | null>(null);

  // Contador 100% local (nao toca na rede) — nao pisca.
  useEffect(() => {
    if (!expiryMs) return undefined;
    const tick = () => setRemainingMs(Math.max(0, expiryMs - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
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

  // Limpa o timer de "Copiado!" ao desmontar.
  useEffect(() => () => {
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
  }, []);

  const tone =
    remainingMs <= 60_000 ? 'rose' : remainingMs <= 180_000 ? 'amber' : 'emerald';

  const isAdmin = variant === 'admin';

  const handleCopy = async () => {
    const ok = await copyToClipboard(String(qrCodeText || ''));
    if (!ok) return;
    setCopied(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!onVerifyNow || verifying) return;
    setVerifying(true);
    try {
      onVerifyNow();
    } finally {
      // O poll do pai decide quando parar; liberamos o botao logo em seguida.
      window.setTimeout(() => setVerifying(false), 1200);
    }
  };

  const providerMeta = getPaymentProviderMeta(provider || undefined);
  const showProviderFooter = Boolean(provider && providerMeta.icon);

  const hasError = Boolean(errorMessage);

  // ── Aprovado: check grande + valor + acao de continuidade ──────────────────
  if (isPaid) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-3xl border px-6 py-10 text-center ${isAdmin ? 'border-emerald-100 bg-emerald-50/70' : 'border-emerald-200 bg-emerald-50'}`}>
        <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <CheckCircle size={44} weight="fill" />
        </span>
        <p className="mt-4 text-lg font-black text-emerald-700">Pagamento aprovado!</p>
        {amountLabel ? (
          <p className="mt-1 text-sm font-bold text-emerald-600">{amountLabel}</p>
        ) : null}
        {showProviderFooter ? (
          <p className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700/70">
            Processado por
            <img src={providerMeta.icon} alt={providerMeta.label} className="h-3.5 object-contain" />
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm`}>
      {/* ── Cabecalho: titulo + countdown ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{title}</p>
          {subtitle ? <p className="truncate text-[11px] font-semibold text-slate-400">{subtitle}</p> : null}
        </div>
        {expiryMs > 0 ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums ${tone === 'rose' ? 'bg-rose-100 text-rose-700' : tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
          >
            <Timer size={12} weight="fill" /> Expira em {fmtCountdown(remainingMs)}
          </span>
        ) : null}
      </div>

      {/* ── Resumo da compra: valor em destaque ───────────────────────────── */}
      {amountLabel ? (
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Valor a pagar</p>
          <p className="text-3xl font-black leading-tight tracking-tight text-slate-900 tabular-nums">{amountLabel}</p>
        </div>
      ) : null}

      <div className="px-4 py-4">
        {/* ── Gerando QR ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Spinner size={28} className="animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-slate-500">Gerando seu PIX…</p>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-500">
              <Clock size={26} weight="duotone" />
            </span>
            <p className="px-2 text-sm font-bold text-rose-700">{errorMessage}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* ── Copia-e-cola em destaque (acima do QR — mobile-first) ────── */}
            {qrCodeText ? (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">PIX copia e cola</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="min-w-0 flex-1 cursor-pointer truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-500"
                    onClick={handleCopy}
                    title="Copiar código PIX"
                  >
                    {truncateCode(String(qrCodeText))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition-all active:scale-[0.98] ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                  {copied ? 'Copiado!' : 'Copiar código PIX'}
                </button>
              </div>
            ) : null}

            {/* ── QR Code: card branco SEMPRE (legivel em dark mode) ──────── */}
            {qrCodeBase64 || qrCodeText ? (
              <div className="mt-4 flex w-full justify-center">
                <div className="w-full max-w-[220px] rounded-2xl bg-white p-4 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
                  <img
                    src={
                      qrCodeBase64 ||
                      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(String(qrCodeText))}`
                    }
                    alt="QR Code PIX"
                    className="aspect-square w-full min-w-[200px] rounded-lg bg-white object-contain"
                  />
                </div>
              </div>
            ) : null}

            {/* ── Aguardando pagamento ────────────────────────────────────── */}
            {isFailed || isExpiredByTime ? null : (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-slate-500">
                <Spinner size={11} className="animate-spin text-slate-400" />
                Aguardando pagamento…
              </p>
            )}

            {paymentLink ? (
              <a
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 hover:bg-slate-100"
              >
                Pagar com cartão →
              </a>
            ) : null}

            {/* ── Expirado / falhou ───────────────────────────────────────── */}
            {isFailed || isExpiredByTime ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-xl bg-rose-50 px-3 py-4 text-center">
                <p className="flex items-center gap-1.5 text-sm font-black text-rose-700">
                  <Clock size={15} weight="fill" /> O PIX expirou
                </p>
                <p className="text-[11px] font-semibold text-rose-600/80">
                  Gere um novo código para concluir o pagamento.
                </p>
                {onRegenerate ? (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 active:scale-[0.98]"
                  >
                    Gerar novo PIX
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Barra de progresso sutil do tempo — janela Pix 30 min (decisão 18/08) */}
            {expiryMs > 0 && !isFailed && !isExpiredByTime ? (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${tone === 'rose' ? 'bg-rose-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.max(4, Math.min(100, (remainingMs / 1800000) * 100))}%` }}
                />
              </div>
            ) : null}

            {onVerifyNow ? (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="mt-3 min-h-[44px] w-full rounded-xl px-4 text-[11px] font-black text-slate-400 transition hover:text-slate-700 disabled:opacity-60"
              >
                {verifying ? 'Verificando…' : verifyLabel}
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* ── Rodape: logo do gateway real ────────────────────────────────────── */}
      {showProviderFooter && !isPaid ? (
        <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <span className="text-[10px] font-semibold text-slate-400">Processado por</span>
          <img src={providerMeta.icon} alt={providerMeta.label} className="h-4 object-contain" />
        </div>
      ) : null}
    </div>
  );
});

/** Expirou por tempo (sem status terminal ainda). */
function expiryRefLogic(expiresAt?: string | number | null) {
  const ms = toMs(expiresAt);
  return ms > 0 && ms - Date.now() <= 0;
}
