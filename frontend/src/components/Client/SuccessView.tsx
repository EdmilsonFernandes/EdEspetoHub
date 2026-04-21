// @ts-nocheck
import React, { useEffect, useState } from "react";
import { CheckCircle, QrCode, ArrowLeft, CreditCard, Printer, Copy, Check, ArrowSquareOut, Spinner, SealCheck } from "@phosphor-icons/react";
import { formatPaymentMethod } from "../../utils/format";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";

const formatCountdown = (ms: number) => {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const OnlinePaymentBlock = ({ onlinePayment, paymentStatus }) => {
  const isPaid = String(paymentStatus || "").toUpperCase() === "PAID";
  const isFailed = String(paymentStatus || "").toUpperCase() === "FAILED";
  const isPix = Boolean(onlinePayment?.qrCodeBase64 || onlinePayment?.qrCodeText);
  const isCard = Boolean(!isPix && onlinePayment?.paymentLink);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!onlinePayment?.expiresAt) return;
    const update = () => {
      const diff = new Date(onlinePayment.expiresAt).getTime() - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [onlinePayment?.expiresAt]);

  const isExpired = timeLeft !== null && timeLeft === 0;

  const handleCopy = () => {
    if (!onlinePayment?.qrCodeText) return;
    navigator.clipboard.writeText(onlinePayment.qrCodeText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ─── PAID ───────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="w-full mb-6 animate-in zoom-in duration-500">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6 shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
            <SealCheck size={32} weight="duotone" className="text-emerald-600" />
          </span>
          <p className="text-base font-black text-emerald-800">Pagamento confirmado!</p>
          <p className="text-xs text-emerald-700/80 text-center">
            Seu pagamento foi recebido. O pedido já está na fila de produção.
          </p>
        </div>
      </div>
    );
  }

  // ─── FAILED ─────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className="w-full mb-6">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center shadow-sm">
          <p className="text-sm font-black text-rose-800">Pagamento não confirmado</p>
          <p className="text-xs text-rose-700/80">
            Não foi possível confirmar seu pagamento. Entre em contato com a loja.
          </p>
        </div>
      </div>
    );
  }

  // ─── PIX QR CODE ────────────────────────────────────────
  if (isPix) {
    const qrSrc = onlinePayment.qrCodeBase64 ||
      `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(onlinePayment.qrCodeText || "")}`;

    return (
      <div className="w-full mb-6 animate-in fade-in duration-400">
        <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-emerald-50 bg-emerald-50/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <QrCode size={18} weight="duotone" className="text-emerald-700" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Pix via Mercado Pago</p>
              <p className="text-[11px] text-emerald-700/70">Escaneie o QR code ou copie o código</p>
            </div>
            {timeLeft !== null && !isExpired && (
              <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums ${timeLeft < 60000 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                {formatCountdown(timeLeft)}
              </span>
            )}
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-4 p-5">
            {isExpired ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm font-black text-slate-700">Código Pix expirado</p>
                <p className="text-xs text-slate-500">Crie um novo pedido para gerar um novo código.</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <img
                    src={qrSrc}
                    alt="QR Code Pix"
                    className="h-52 w-52 rounded-xl border border-slate-100 object-cover shadow-sm"
                  />
                  {/* Aguardando overlay */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-b-xl bg-white/90 py-1.5 backdrop-blur-sm">
                    <Spinner size={12} className="animate-spin text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400">Aguardando pagamento…</span>
                  </div>
                </div>

                {onlinePayment.qrCodeText && (
                  <div className="w-full space-y-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 font-mono text-[10px] text-slate-600 break-all select-all leading-relaxed">
                      {onlinePayment.qrCodeText}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all active:scale-[0.98] ${
                        copied
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                      {copied ? "Copiado!" : "Copiar código Pix"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── CARD (payment link) ─────────────────────────────────
  if (isCard) {
    return (
      <div className="w-full mb-6">
        <div className="rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-sky-50 bg-sky-50/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100">
              <CreditCard size={18} weight="duotone" className="text-sky-700" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-800">Pagamento via Mercado Pago</p>
              <p className="text-[11px] text-sky-700/70">Finalize o pagamento para confirmar seu pedido</p>
            </div>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-black text-amber-700">
              <Spinner size={10} className="animate-spin" />
              Aguardando
            </span>
          </div>
          <div className="p-5">
            <p className="mb-4 text-xs text-slate-500 text-center">
              Seu pedido foi registrado. Clique abaixo para efetuar o pagamento com cartão via Mercado Pago.
            </p>
            <a
              href={onlinePayment.paymentLink}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] py-3.5 text-sm font-black text-white shadow-[0_8px_20px_-10px_rgba(0,158,227,0.6)] transition hover:brightness-105 active:scale-[0.98]"
            >
              <ArrowSquareOut size={16} weight="bold" />
              Pagar agora
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Fallback: Pix da loja (sem Mercado Pago)
const StaticPixBlock = ({ pixKey, phone }) => {
  const PIX_KEY_MOCK =
    "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913EspetinhoDatony6008SaoPaulo62070503***6304";
  const qrData = pixKey || phone || PIX_KEY_MOCK;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrData)}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrData).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full mb-8">
      <div className="flex flex-col items-center gap-3 mb-4 text-center">
        <div className="p-3 bg-gray-50 rounded-full">
          <QrCode size={24} weight="duotone" className="text-gray-700" />
        </div>
        <span className="font-bold text-gray-700">Pix para pagamento</span>
        <p className="text-xs text-gray-500">Use o QR Code ou copie a chave abaixo.</p>
      </div>
      <div className="flex justify-center mb-4">
        <img src={qrUrl} alt="QR Code Pix" className="w-48 h-48 rounded-lg border" />
      </div>
      <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs text-gray-700 break-all select-all border border-gray-200 mb-3">
        {qrData}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`flex w-full items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${copied ? "bg-emerald-600 text-white" : "bg-brand-primary text-white hover:opacity-90"}`}
      >
        {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
        {copied ? "Copiado!" : "Copiar chave Pix"}
      </button>
    </div>
  );
};

const PaymentBadge = ({ paymentMethod }) => {
  const method = (paymentMethod || "").toLowerCase();
  const isPix = method === "pix";
  const isDebit = method === "debito";
  const isCash = method === "dinheiro";
  const label = formatPaymentMethod(paymentMethod);
  const methodMeta = getPaymentMethodMeta(paymentMethod);
  const tone = isPix
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isDebit
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : isCash
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-indigo-50 text-indigo-700 border-indigo-200";

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold mb-6 ${tone}`}>
      {methodMeta.icon ? (
        <img src={methodMeta.icon} alt={label} className="h-4 w-4 object-contain" />
      ) : (
        <CreditCard size={14} weight="duotone" />
      )}
      <span>Pagamento: {label}</span>
    </div>
  );
};

export const SuccessView = ({
  orderType,
  paymentMethod,
  onNewOrder,
  pixKey,
  phone,
  table,
  orderId,
  onTrackOrder,
  onPrintReceipt,
  onlinePayment,
  paymentStatus,
}) => {
  const hasOnlinePayment = Boolean(
    onlinePayment?.qrCodeBase64 || onlinePayment?.qrCodeText || onlinePayment?.paymentLink
  );
  const isStaticPix = !hasOnlinePayment && paymentMethod === "pix";
  const isLocalPayment = !hasOnlinePayment && paymentMethod !== "pix";
  const isPaid = String(paymentStatus || "").toUpperCase() === "PAID";

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6 animate-in zoom-in">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm transition-colors duration-700 ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-primary-soft text-brand-primary'}`}>
        <CheckCircle size={48} weight="duotone" />
      </div>

      <h2 className="text-3xl font-black text-gray-800 mb-2">
        {isPaid ? 'Pedido Confirmado!' : 'Pedido Realizado!'}
      </h2>

      <p className="text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
        {isPaid
          ? 'Pagamento confirmado. Seu pedido está em produção!'
          : orderType === "delivery"
          ? "Recebemos seu pedido de entrega. Avisaremos quando sair para entrega."
          : orderType === "table"
          ? `Seu pedido foi recebido e seguirá para a produção. Mesa ${table || "-"}.`
          : "Seu pedido foi recebido e seguirá para a produção."}
      </p>

      <PaymentBadge paymentMethod={paymentMethod} />

      {/* Online payment UI (Mercado Pago) */}
      {hasOnlinePayment && (
        <div className="w-full max-w-sm">
          <OnlinePaymentBlock onlinePayment={onlinePayment} paymentStatus={paymentStatus} />
        </div>
      )}

      {/* Static Pix (no MP) */}
      {isStaticPix && <StaticPixBlock pixKey={pixKey} phone={phone} />}

      {/* Cash / card on delivery */}
      {isLocalPayment && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full mb-8 text-left max-w-sm">
          <h3 className="font-bold text-gray-800 mb-2">Pagamento na entrega/retirada</h3>
          <p className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
            Forma registrada:
            {(() => {
              const methodMeta = getPaymentMethodMeta(paymentMethod);
              return (
                <span className="font-bold uppercase inline-flex items-center gap-2">
                  {methodMeta.icon && (
                    <img src={methodMeta.icon} alt={methodMeta.label} className="h-4 w-4 object-contain" />
                  )}
                  {formatPaymentMethod(paymentMethod)}
                </span>
              );
            })()}
            . Quando seu pedido estiver pronto, finalize o pagamento no local.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {orderId && onPrintReceipt && (
          <button
            onClick={onPrintReceipt}
            className="flex items-center justify-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 font-bold px-6 py-3 rounded-xl transition-colors hover:bg-amber-100"
          >
            <Printer size={18} weight="duotone" /> Imprimir comprovante
          </button>
        )}
        {orderId && onTrackOrder && (
          <button
            onClick={onTrackOrder}
            className="flex items-center justify-center gap-2 text-white bg-emerald-600 font-bold px-6 py-3 rounded-xl transition-colors hover:opacity-90"
          >
            <CheckCircle size={18} weight="duotone" /> Acompanhar pedido
          </button>
        )}
        <button
          onClick={onNewOrder}
          className="flex items-center justify-center gap-2 text-white bg-brand-primary font-bold px-6 py-3 rounded-xl transition-colors hover:opacity-90"
        >
          <ArrowLeft size={18} weight="duotone" /> Voltar para os pedidos
        </button>
      </div>
    </div>
  );
};
