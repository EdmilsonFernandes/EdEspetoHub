import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import {
  QrCode,
  CreditCard,
  Money,
  SpinnerGap,
  XCircle,
  CopySimple,
  DeviceMobileCamera,
  ArrowsClockwise,
  Question,
} from '@phosphor-icons/react';
import { orderService } from '../../services/orderService';
import { buildPixPayload } from '../../utils/pixPayload';
import QRCode from 'qrcode';

/**
 * SDD cobranca-balcao — momento do pagamento no balcão (fila).
 * Pix da loja · Cartão na maquininha Point · Dinheiro — valor ajustável
 * (desconto/acréscimo), expira em 5 min, um método por pedido.
 * Crédito/débito/parcelas o cliente escolhe no terminal (design D3).
 */

type ChargeStatusPayload = {
  orderId: string;
  paymentStatus: string;
  suggestedAmount: number;
  preselectedMethod: string | null;
  charge: {
    id: string;
    method: string;
    status: string;
    amount: number;
    terminalId: string | null;
    qrCodeText: string | null;
    qrCodeBase64: string | null;
    expiresAt: string | null;
  } | null;
  capabilities: { pix: boolean; point: boolean; cash: boolean; reason: string | null };
};

type Terminal = { id: string; serialNumber: string | null; integrationReady: boolean };

type Phase = 'loading' | 'choose' | 'point-form' | 'creating' | 'pix' | 'point' | 'cash-confirm' | 'pix-loja' | 'paid' | 'expired';

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const shortSerial = (terminalId: string | null) => {
  const serial = String(terminalId || '').split('__').pop() || '';
  return serial ? serial.slice(-6) : '—';
};

export function ChargeSheet({
  open,
  onClose,
  storeId,
  order,
  onPaid,
  storePixKey,
  storeName,
}: {
  open: boolean;
  onClose: () => void;
  storeId: string;
  order: any;
  onPaid?: (orderId: string) => void;
  /** Chave Pix cadastrada pela própria loja (Pix sem integração — manual). */
  storePixKey?: string | null;
  storeName?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [payload, setPayload] = useState<ChargeStatusPayload | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<Terminal[] | null>(null);
  const [terminalsLink, setTerminalsLink] = useState(false);
  const [charge, setCharge] = useState<ChargeStatusPayload['charge']>(null);
  // Forma pré-selecionada na maquininha (Orders API default_type), escolhida na
  // fase "point-form" (dentro do contexto do Cartão — PO 31/08): null = o
  // cliente escolhe na telinha do terminal (fluxo padrão, design D3).
  const [pointPaymentType, setPointPaymentType] = useState<'debit_card' | 'credit_card' | 'qr' | null>(null);
  // true após escolher a forma na point-form (com múltiplas maquininhas,
  // controla se já pode mostrar o seletor de terminal)
  const [pointFormAsked, setPointFormAsked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // onPaid dispara 1x por abertura, venha do polling ou do carregamento manual
  const paidNotifiedRef = useRef(false);
  // onPaid via ref: callers passam arrow inline (nova referência a cada render
  // da fila) — como dependência do useCallback ele recriava applyStatus→
  // loadStatus em cadeia e o effect do open recarregava o sheet em loop
  // (tela piscando e fase do Cartão resetando — bug de prod 31/08 à noite).
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  // Ticker visual de 1s — independente do polling de status (o contador não pode
  // "travar" esperando a rede; bug de prod 29/08: tickava só de 4s em 4s)
  useEffect(() => {
    if (!open || (phase !== 'pix' && phase !== 'point' && phase !== 'pix-loja')) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, phase]);

  const orderId = String(order?.id || '');
  const orderTotal = Number(order?.total || payload?.suggestedAmount || 0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyStatus = useCallback(
    (data: ChargeStatusPayload, opts?: { silent?: boolean }) => {
      setPayload(data);
      if (!opts?.silent) setAmountInput(String(data.suggestedAmount.toFixed(2)).replace('.', ','));
      const active = data.charge;
      if (active && active.status === 'PENDING' && active.expiresAt && new Date(active.expiresAt).getTime() > Date.now()) {
        setCharge(active);
        setPhase(active.method === 'pix' ? 'pix' : active.method === 'point' ? 'point' : 'choose');
      } else if (active && active.status === 'PAID') {
        setCharge(active);
        setPhase('paid');
        // Pago visto por QUALQUER caminho (polling, reabertura, refresh manual)
        // dispara o ciclo — antes só o polling chamava onPaid e o pago tardio
        // (cliente demorou no terminal) ficava sem retirada automática (31/08).
        if (!paidNotifiedRef.current) {
          paidNotifiedRef.current = true;
          onPaidRef.current?.(orderId);
        }
      } else {
        // Cobrança morta (expirada/cancelada/recusada) é HISTÓRICO, não muro —
        // o sheet abre na escolha pronta pra cobrar de novo (bug do loop 29/08:
        // "Expirou ou foi cancelada" reaparecia pra sempre em pedido antigo).
        setCharge(null);
        setPhase('choose');
      }
    },
    [orderId]
  );

  const loadStatus = useCallback(
    async (silent = false) => {
      if (!orderId) return null;
      try {
        const data: any = await orderService.getChargeStatus(storeId, orderId);
        applyStatus(data as ChargeStatusPayload, { silent });
        if (!silent) setError(null);
        return data;
      } catch (err: any) {
        if (!silent) {
          setError(err?.message || 'Não foi possível carregar a cobrança agora.');
          setPhase('choose');
        }
        return null;
      }
    },
    [orderId, storeId, applyStatus]
  );

  useEffect(() => {
    if (!open) {
      stopPolling();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setError(null);
      setTerminals(null);
      setPayload(null);
      setCharge(null);
      paidNotifiedRef.current = false;
      return;
    }
    setPhase('loading');
    loadStatus(false);
  }, [open, loadStatus, stopPolling]);

  // Polling da cobrança ativa (Pix/Point): confirma mesmo se o webhook atrasar (REQ-21 na UI)
  useEffect(() => {
    if (!open || (phase !== 'pix' && phase !== 'point')) {
      stopPolling();
      return;
    }
    pollRef.current = setInterval(() => {
      loadStatus(true).then((data) => {
        if (!data) return;
        const active = (data as ChargeStatusPayload).charge;
        // applyStatus (dentro do loadStatus) já trata PAID (phase+onPaid) e
        // cobrança morta (volta pro choose) — aqui só encerramos o relógio.
        if (active?.status === 'PAID' || (active && active.status !== 'PENDING')) {
          stopPolling();
        }
      });
    }, 4000);
    return stopPolling;
  }, [open, phase, loadStatus, stopPolling]);

  // Auto-fechar no pago (ritmo de balcão — tempo de LER a confirmação:
  // "R$ X recebidos" é o momento de segurança do operador, PO 31/08)
  useEffect(() => {
    if (phase !== 'paid') return;
    closeTimerRef.current = setTimeout(() => onClose(), 2600);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [phase, onClose]);

  // (ANTES do efeito que o lê nas deps — deps de useEffect avaliam no render;
  // mesma classe de TDZ que quebrou prod 29/08 no parseAmount)
  const countdown = useMemo(() => {
    if (!charge?.expiresAt) return null;
    const diff = new Date(charge.expiresAt).getTime() - now;
    if (diff <= 0) return '00:00';
    const totalSeconds = Math.floor(diff / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [charge?.expiresAt, now]);

  // Countdown zerou = cobrança morreu (MP cancela sozinho) — estado transitório
  // com retry REAL (volta pra escolha; nunca fica preso no muro)
  useEffect(() => {
    if ((phase === 'pix' || phase === 'point') && countdown === '00:00') {
      stopPolling();
      setCharge(null);
      setPhase('expired');
    }
  }, [countdown, phase, stopPolling]);

  /** (declarado ANTES dos useMemos que o usam — TDZ quebrou prod 29/08) */
  const parseAmount = (): number | null => {
    const raw = String(amountInput || '').trim().replace(',', '.');
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (Math.round(value * 100) !== value * 100) return null;
    return value;
  };

  /** Pix sem integração: payload BR Code da chave da loja (reuso do fluxo antigo). */
  const pixLojaPayload = useMemo(() => {
    const key = String(storePixKey || '').trim();
    if (!key) return '';
    return buildPixPayload({
      key,
      name: String(storeName || 'Loja'),
      amount: Number(parseAmount() ?? payload?.suggestedAmount ?? 0),
      txid: orderId ? `PEDIDO${orderId.slice(0, 8)}` : 'PEDIDO',
    });
  }, [storePixKey, storeName, amountInput, payload, orderId]);

  /** QR gerado LOCALMENTE (lib qrcode) — pagamento não depende de site externo
   *  (qrserver.com quebrava o QR em prod 29/08). */
  const [pixLojaQr, setPixLojaQr] = useState('');
  useEffect(() => {
    if (!pixLojaPayload) {
      setPixLojaQr('');
      return;
    }
    let alive = true;
    QRCode.toDataURL(pixLojaPayload, { width: 440, margin: 1 })
      .then((url) => {
        if (alive) setPixLojaQr(url);
      })
      .catch(() => {
        if (alive) setPixLojaQr('');
      });
    return () => {
      alive = false;
    };
  }, [pixLojaPayload]);

  const adjustedDelta = useMemo(() => {
    const amount = parseAmount();
    if (amount === null || !payload) return 0;
    return Math.round((amount - Number(payload.suggestedAmount)) * 100) / 100;
  }, [amountInput, payload]);

  const createCharge = async (
    method: 'pix' | 'point' | 'cash' | 'pix_loja',
    terminalId?: string,
    paymentType?: 'debit_card' | 'credit_card' | 'qr'
  ) => {
    const amount = parseAmount();
    if (amount === null) {
      setError('Valor inválido — use um número maior que zero com até 2 casas decimais.');
      return;
    }
    setError(null);
    setPhase('creating');
    try {
      const result: any = await orderService.createCharge(storeId, orderId, {
        method,
        amount,
        terminalId,
        paymentType,
      });
      const active = result?.charge;
      if (method === 'cash' || active?.status === 'PAID') {
        setCharge(active || null);
        setPhase('paid');
        onPaid?.(orderId);
        return;
      }
      setCharge(active || null);
      setPhase(method === 'pix' ? 'pix' : 'point');
      setTerminals(null);
    } catch (err: any) {
      const detailTerminals = (err?.details as any)?.terminals as Terminal[] | undefined;
      if (detailTerminals?.length) {
        setTerminals(detailTerminals);
        setPhase('choose');
        setError('Escolha a maquininha para enviar a cobrança.');
        return;
      }
      // respondWithError põe texto amigável em details.message (message genérico)
      setError(err?.details?.message || err?.message || 'Não foi possível criar a cobrança agora.');
      setTerminalsLink(String(err?.code || '').includes('PAY-020') || /maquininha/i.test(String(err?.details?.message || '')));
      setPhase('choose');
    }
  };

  const cancelCharge = async () => {
    try {
      await orderService.cancelCharge(storeId, orderId);
      setCharge(null);
      setPhase('choose');
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível cancelar a cobrança.');
    }
  };

  const copyPix = async () => {
    if (!charge?.qrCodeText) return;
    try {
      await navigator.clipboard.writeText(charge.qrCodeText);
      setError(null);
    } catch {
      setError('Não consegui copiar — segure e copie o código manualmente.');
    }
  };

  const caps = payload?.capabilities;
  const amount = parseAmount();
  const canCharge = amount !== null && phase === 'choose';

  const methodButton = (
    key: 'pix' | 'point' | 'cash',
    icon: React.ReactNode,
    label: string,
    sub: string,
    enabled: boolean
  ) => (
    <button
      key={key}
      type="button"
      disabled={!canCharge}
      onClick={() => {
        // Método sem conta MP conectada NÃO fica mudo (lição do teste 28/08):
        // o toque explica o que falta em vez de "nada acontecer".
        if (!enabled) {
          setError(
            key === 'cash'
              ? 'Recebimento em dinheiro indisponível agora.'
              : `${label} precisa da conta Mercado Pago da loja conectada — em Configurações → Gateway. Dinheiro continua funcionando.`
          );
          return;
        }
        if (key === 'cash') {
          setPhase('cash-confirm');
          return;
        }
        if (key === 'point') {
          // PO 31/08: a forma (débito/crédito/cliente escolhe) é perguntada
          // DENTRO do contexto do cartão, não em chips soltos fora dele.
          setPointPaymentType(null);
          setPointFormAsked(false);
          setPhase('point-form');
          return;
        }
        createCharge(key);
      }}
      className={`jnc-ds-focus-ring group flex min-h-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition active:scale-[0.97] ${
        enabled && canCharge
          ? 'border-slate-200 bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] hover:border-[var(--jnc-primary,#2f9df7)] hover:shadow-[0_14px_28px_-16px_rgba(47,157,247,0.55)]'
          : 'border-slate-200 bg-slate-50 opacity-55'
      }`}
      aria-label={`Cobrar via ${label}${enabled ? '' : ' (indisponível)'}`}
    >
      <span className="text-[26px] leading-none text-[var(--jnc-primary,#2f9df7)]">{icon}</span>
      <span className="text-sm font-black tracking-tight text-slate-900">{label}</span>
      <span className="text-[10.5px] font-semibold leading-tight text-slate-500">
        {enabled ? sub : caps ? 'conecte o MP' : 'reconectando…'}
      </span>
    </button>
  );

  // Portal pro body: competir de igual pra igual com os drawers/overlays da fila
  // (z-9999) — sem isso o drawer intercepta os cliques do sheet (bug achado no E2E).
  return createPortal(
    <BottomSheet
      mobileCentered
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <DeviceMobileCamera className="text-[var(--jnc-primary,#2f9df7)]" size={22} weight="duotone" />
          Cobrar pedido
        </span>
      }
      description={
        order?.customerName ? `${String(order.customerName).slice(0, 40)} · ${formatBRL(orderTotal)}` : formatBRL(orderTotal)
      }
      footer={
        phase === 'pix' || phase === 'point' ? (
          <div className="flex w-full items-center gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={cancelCharge}>
              Cancelar cobrança
            </Button>
            <Button variant="primary" size="md" className="flex-1" onClick={() => loadStatus(false)}>
              <ArrowsClockwise size={16} /> Atualizar
            </Button>
          </div>
        ) : phase === 'expired' ? (
          <Button variant="primary" size="md" className="w-full" onClick={() => loadStatus(false)}>
            Cobrar de novo
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-4">
        {phase === 'loading' ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-slate-500">
            <SpinnerGap size={30} className="animate-spin text-[var(--jnc-primary,#2f9df7)]" />
            <p className="text-sm font-semibold">Carregando cobrança…</p>
          </div>
        ) : null}

        {phase === 'paid' ? (
          <div className="paid-card relative overflow-hidden rounded-3xl border border-emerald-100 bg-[linear-gradient(165deg,#f0fdf4,#d1fae5)] px-6 py-7 text-center shadow-[0_18px_40px_-28px_rgba(16,185,129,0.55)]">
            <style>{`
              .paid-card { animation: paidPop 420ms cubic-bezier(.2,1.4,.4,1) both; }
              .paid-circle { stroke-dasharray: 151; stroke-dashoffset: 151; animation: paidDraw 340ms 80ms ease-out forwards; }
              .paid-check { stroke-dasharray: 34; stroke-dashoffset: 34; animation: paidDraw 260ms 400ms ease-out forwards; }
              .paid-bar { transform-origin: left; animation: paidBar 2600ms linear forwards; }
              @keyframes paidPop { from { transform: scale(.88); opacity: 0; } 70% { transform: scale(1.02); } to { transform: scale(1); opacity: 1; } }
              @keyframes paidDraw { to { stroke-dashoffset: 0; } }
              @keyframes paidBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
            `}</style>
            <span className="mx-auto mb-3 grid h-16 w-16 place-items-center">
              <svg viewBox="0 0 52 52" className="h-16 w-16" aria-hidden="true">
                <circle cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="2.5" className="paid-circle" />
                <path d="M15 27l7.5 7.5L38 20" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="paid-check" />
              </svg>
            </span>
            <p className="text-[13px] font-black uppercase tracking-[0.22em] text-emerald-700">
              Pagamento aprovado
            </p>
            <p className="mt-1 text-[34px] font-black leading-none tracking-tight text-emerald-900">
              {formatBRL(Number(charge?.amount || amount || 0))}
            </p>
            <p className="mt-2 text-[13px] font-bold text-emerald-800/80">
              recebidos via{' '}
              {charge?.method === 'pix'
                ? 'Pix'
                : charge?.method === 'point'
                  ? 'maquininha'
                  : charge?.method === 'pix_loja'
                    ? 'Pix (chave da loja)'
                    : 'dinheiro'}
              {storeName ? ` — na conta de ${storeName}` : ''}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/60">
              Aprovado às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-emerald-200/70">
              <div className="paid-bar h-full w-full rounded-full bg-emerald-500" />
            </div>
            <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-emerald-700/50">
              fechando automaticamente
            </p>
          </div>
        ) : null}

        {phase === 'expired' ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border border-amber-100 bg-[linear-gradient(160deg,#fffbeb,#fef3c7)] px-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100">
              <XCircle size={30} weight="duotone" className="text-amber-600" />
            </span>
            <p className="text-lg font-black tracking-tight text-amber-900">Tempo esgotado</p>
            <p className="max-w-[280px] text-sm font-semibold leading-relaxed text-amber-800/80">
              A cobrança de 5 minutos expirou sem pagamento — nada foi cobrado do cliente.
            </p>
            <Button
              variant="primary"
              size="md"
              className="mt-1 w-full max-w-[280px]"
              onClick={() => {
                setCharge(null);
                setPhase('choose');
              }}
            >
              <ArrowsClockwise size={16} /> Gerar nova cobrança
            </Button>
          </div>
        ) : null}

        {phase === 'point-form' ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-800">
                Pagamento no cartão
              </p>
              <p className="mt-1 text-[11px] font-semibold text-sky-700/80">
                Como o cliente vai pagar na maquininha?
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {([
                  { type: 'debit_card' as const, label: 'Débito', sub: 'Já abre pronto no terminal' },
                  { type: 'credit_card' as const, label: 'Crédito', sub: 'Parcelas o cliente escolhe na telinha' },
                ]).map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => {
                      setPointPaymentType(option.type);
                      setPointFormAsked(true);
                      if (!terminals?.length) createCharge('point', undefined, option.type);
                    }}
                    className={`jnc-ds-focus-ring flex min-h-[60px] items-center justify-between rounded-xl border-2 px-3 py-2 text-left transition active:scale-[0.98] ${
                      pointPaymentType === option.type
                        ? 'border-[var(--jnc-primary,#2f9df7)] bg-white shadow-sm'
                        : 'border-sky-200 bg-white hover:border-sky-300'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-black tracking-tight text-slate-900">{option.label}</span>
                      <span className="block text-[10.5px] font-semibold text-slate-500">{option.sub}</span>
                    </span>
                    <CreditCard size={18} className="text-[var(--jnc-primary,#2f9df7)]" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPointPaymentType(null);
                    setPointFormAsked(true);
                    if (!terminals?.length) createCharge('point', undefined, undefined);
                  }}
                  className="jnc-ds-focus-ring flex min-h-[60px] items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 active:scale-[0.98]"
                >
                  <span>
                    <span className="block text-sm font-black tracking-tight text-slate-900">Cliente escolhe na maquininha</span>
                    <span className="block text-[10.5px] font-semibold text-slate-500">Terminal pergunta na hora do pagamento</span>
                  </span>
                  <Question size={18} className="text-slate-400" />
                </button>
              </div>
            </div>

            {terminals?.length && pointFormAsked ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-sky-800">
                  Enviar{pointPaymentType ? ` (${pointPaymentType === 'debit_card' ? 'débito' : 'crédito'})` : ''} para:
                </p>
                <div className="flex flex-col gap-2">
                  {terminals.map((terminal) => (
                    <button
                      key={terminal.id}
                      type="button"
                      onClick={() => createCharge('point', terminal.id, pointPaymentType || undefined)}
                      className="jnc-ds-touch jnc-ds-focus-ring flex min-h-11 items-center justify-between rounded-xl border border-sky-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 active:scale-[0.98]"
                    >
                      Maquininha …{shortSerial(terminal.id)}
                      <CreditCard size={18} className="text-[var(--jnc-primary,#2f9df7)]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setPhase('choose')}
              className="jnc-ds-focus-ring self-start rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:text-slate-800"
            >
              ‹ Voltar
            </button>
          </div>
        ) : null}

        {phase === 'choose' || phase === 'creating' || phase === 'cash-confirm' ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.5)]">
              <label htmlFor="charge-amount" className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Valor a cobrar
              </label>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-lg font-black text-slate-400">R$</span>
                <input
                  id="charge-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9,]/g, ''))}
                  disabled={phase !== 'choose'}
                  className="w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-300 focus:ring-0"
                  placeholder="0,00"
                  aria-label="Valor a cobrar em reais"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-400">
                  Total do pedido: {formatBRL(Number(payload?.suggestedAmount || orderTotal))}
                </p>
                {adjustedDelta !== 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-black ${
                      adjustedDelta < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {adjustedDelta < 0 ? 'desconto' : 'acréscimo'} {formatBRL(Math.abs(adjustedDelta))}
                  </span>
                ) : null}
              </div>
            </div>

            {terminals?.length ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-sky-800">Escolha a maquininha</p>
                <div className="flex flex-col gap-2">
                  {terminals.map((terminal) => (
                    <button
                      key={terminal.id}
                      type="button"
                      disabled={phase === 'creating'}
                      onClick={() => createCharge('point', terminal.id, pointPaymentType || undefined)}
                      className="jnc-ds-touch jnc-ds-focus-ring flex min-h-11 items-center justify-between rounded-xl border border-sky-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 active:scale-[0.98]"
                    >
                      Maquininha …{shortSerial(terminal.id)}
                      <CreditCard size={18} className="text-[var(--jnc-primary,#2f9df7)]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {phase !== 'cash-confirm' ? (
              <>
              {caps ? (
                <div
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-bold ${
                    caps.pix
                      ? 'border-emerald-100 bg-emerald-50/70 text-emerald-800'
                      : 'border-amber-100 bg-amber-50/70 text-amber-800'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${caps.pix ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {caps.pix
                    ? 'Mercado Pago conectado — Pix e maquininha ativos nesta loja.'
                    : 'Sem Mercado Pago conectado — Pix MP e maquininha desativados (Dinheiro funciona). Conecte em Configurações → Gateway.'}
                </div>
              ) : phase === 'choose' ? (
                <button
                  type="button"
                  onClick={() => loadStatus(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 active:scale-[0.99]"
                >
                  <ArrowsClockwise size={13} /> Não consegui confirmar a conexão Mercado Pago — tocar para tentar de novo
                </button>
              ) : null}
              <div className="flex gap-2.5">
                {methodButton(
                  'pix',
                  <QrCode weight="duotone" />,
                  'Pix',
                  caps?.pix === false ? 'conecte o MP' : 'QR na hora · confirma sozinho',
                  Boolean(caps?.pix)
                )}
                {methodButton(
                  'point',
                  <CreditCard weight="duotone" />,
                  'Cartão',
                  caps?.point === false ? 'conecte o MP' : 'crédito/débito na maquininha',
                  Boolean(caps?.point)
                )}
                {methodButton('cash', <Money weight="duotone" />, 'Dinheiro', 'registrar recebimento', true)}
              </div>

              {/* Pix da loja é FALLBACK: só aparece quando o Pix MP não está
                  disponível (sem conta MP) — dois botões de Pix lado a lado
                  confundiam o operador (PO 31/08). */}
              {pixLojaPayload && !caps?.pix ? (
                <button
                  type="button"
                  disabled={!canCharge}
                  onClick={() => setPhase('pix-loja')}
                  className="jnc-ds-touch jnc-ds-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-xs font-black text-emerald-800 active:scale-[0.98]"
                >
                  <QrCode size={16} weight="duotone" /> Pix com a chave da loja — confirmo na tela
                </button>
              ) : null}
              </>
            ) : null}

            {phase === 'cash-confirm' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                <p className="text-sm font-bold text-emerald-900">
                  Confirmar recebimento de {formatBRL(Number(amount || 0))} em dinheiro?
                </p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                  Fica registrado quem recebeu e quando.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="md" className="flex-1" onClick={() => setPhase('choose')}>
                    Voltar
                  </Button>
                  <Button variant="primary" size="md" className="flex-1" onClick={() => createCharge('cash')}>
                    Confirmar
                  </Button>
                </div>
              </div>
            ) : null}

            {caps && !caps.pix ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-500">
                {caps.reason}
              </p>
            ) : null}
          </>
        ) : null}

        {phase === 'creating' ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500">
            <SpinnerGap size={18} className="animate-spin text-[var(--jnc-primary,#2f9df7)]" />
            Enviando cobrança…
          </div>
        ) : null}

        {phase === 'pix' && charge ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fff7ed,#ffedd5)] px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Aguardando Pix</p>
              <span className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-sm font-black text-white tabular-nums">
                {countdown}
              </span>
            </div>
            {charge.qrCodeBase64 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)]">
                <img src={charge.qrCodeBase64} alt="QR Code Pix" className="h-56 w-56 object-contain" />
              </div>
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                QR indisponível
              </div>
            )}
            {charge.qrCodeText ? (
              <button
                type="button"
                onClick={copyPix}
                className="jnc-ds-touch jnc-ds-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 active:scale-[0.98]"
              >
                <CopySimple size={16} /> Copiar código Pix
              </button>
            ) : null}
            <p className="text-center text-[11px] font-semibold text-slate-400">
              Peça para o cliente escanear e pagar. Confirma sozinho quando cair.
            </p>
          </div>
        ) : null}

        {phase === 'point' && charge ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between rounded-2xl border border-sky-200 bg-[linear-gradient(135deg,#f0f9ff,#e0f2fe)] px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-800">Aguardando cartão</p>
              <span className="rounded-xl bg-gradient-to-r from-sky-500 to-[var(--jnc-primary,#2f9df7)] px-3 py-1 text-sm font-black text-white tabular-nums">
                {countdown}
              </span>
            </div>
            <div className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-3xl border border-sky-200 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(47,157,247,0.7)]">
              <CreditCard size={44} weight="duotone" className="animate-pulse text-[var(--jnc-primary,#2f9df7)]" />
              <p className="text-lg font-black tracking-tight text-slate-900">
                {formatBRL(Number(charge.amount))}
              </p>
              <p className="text-xs font-bold text-slate-500">
                Enviado para a maquininha …{shortSerial(charge.terminalId)}
              </p>
              <p className="max-w-[260px] text-center text-[11px] font-semibold text-slate-400">
                O cliente escolhe crédito, débito e parcelas no terminal.
              </p>
            </div>
          </div>
        ) : null}

        {phase === 'pix-loja' && pixLojaPayload ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,#d1fae5)] px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">Pix da chave da loja</p>
              <span className="rounded-xl bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">MANUAL</span>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-30px_rgba(5,150,105,0.7)]">
              {pixLojaQr ? (
                <img src={pixLojaQr} alt="QR Code Pix da loja" className="h-56 w-56 object-contain" />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-slate-50 text-xs font-bold text-slate-400">
                  Gerando QR…
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(pixLojaPayload).catch(() => {})}
              className="jnc-ds-touch jnc-ds-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 active:scale-[0.98]"
            >
              <CopySimple size={16} /> Copiar código Pix
            </button>
            <p className="text-center text-[11px] font-semibold text-slate-400">
              Sem confirmação automática — confira a conta da loja e confirme o recebimento.
            </p>
            <div className="flex w-full gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setPhase('choose')}>
                Voltar
              </Button>
              <Button variant="primary" size="md" className="flex-1" onClick={() => createCharge('pix_loja')}>
                Já recebi o Pix
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-600">
            {error}
            {terminalsLink ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.assign('/admin/dashboard?tab=gateway');
                }}
                className="jnc-ds-focus-ring mt-2 block w-full rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white active:scale-[0.98]"
              >
                Ver maquininhas em Pagamentos →
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </BottomSheet>,
    document.body
  );
}
