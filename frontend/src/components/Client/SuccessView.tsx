// @ts-nocheck
import React, { useEffect, useState } from "react";
import { CheckCircle, QrCode, ArrowLeft, CreditCard, Printer, Copy, Check, ArrowSquareOut, Spinner, SealCheck, WhatsappLogo, ListBullets, XCircle } from "@phosphor-icons/react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { formatPaymentMethod } from "../../utils/format";
import { getPaymentMethodMeta, getPaymentProviderMeta } from "../../utils/paymentAssets";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { getStoreAvatarUrl } from "../../utils/storeAvatar";

const formatCountdown = (ms: number) => {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hours > 0) return `${hours}h ${min.toString().padStart(2, "0")}m`;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

// ─── PIX DEDICATED SCREEN ───────────────────────────────────────────────────
const PixPaymentScreen = ({ onlinePayment, paymentStatus, onNewOrder, storeLabel, storeLogoUrl, storeSlug }) => {
  const isPaid = String(paymentStatus || "").toUpperCase() === "PAID";
  const isFailed = String(paymentStatus || "").toUpperCase() === "FAILED";
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const reported = onlinePayment?.expiresAt ? new Date(onlinePayment.expiresAt).getTime() : 0;
    const expiryMs = (reported - Date.now() > 30_000) ? reported : Date.now() + 5 * 60 * 1000;
    const update = () => setTimeLeft(Math.max(0, expiryMs - Date.now()));
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [onlinePayment?.expiresAt]);

  const isExpired = timeLeft !== null && timeLeft === 0;
  const isNative = Capacitor.isNativePlatform();
  const storeLogo = resolveAssetUrl(storeLogoUrl || "") || getStoreAvatarUrl(storeSlug, storeLabel || "Loja");
  const stickyTop = isNative
    ? "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.7rem)]"
    : "top-0";
  const topPad = isNative
    ? "pt-[max(calc(env(safe-area-inset-top)+0.45rem),0.7rem)]"
    : "pt-0";

  const handleCopy = () => {
    if (!onlinePayment?.qrCodeText) return;
    navigator.clipboard.writeText(onlinePayment.qrCodeText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const qrSrc = onlinePayment?.qrCodeBase64 ||
    (onlinePayment?.qrCodeText
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(onlinePayment.qrCodeText)}`
      : null);

  // urgency colour
  const urgent = timeLeft !== null && timeLeft < 60_000;
  const warning = timeLeft !== null && timeLeft >= 60_000 && timeLeft < 120_000;
  const timerColor = urgent ? "text-rose-600" : warning ? "text-amber-600" : "text-emerald-700";
  const timerBg   = urgent ? "from-rose-50 to-white border-rose-200" : warning ? "from-amber-50 to-white border-amber-200" : "from-emerald-50 to-white border-emerald-200";
  const barColor  = urgent ? "bg-rose-500" : warning ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className={`min-h-screen overflow-x-clip bg-slate-50 ${topPad} ${isNative ? "ds-native-nav-content-lg" : "pb-10"}`}>
      {/* ── Sticky header ── */}
      <div className={`sticky ${stickyTop} z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onNewOrder}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <img src={storeLogo} alt={storeLabel} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, storeLabel || "Loja"); }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pagar via</p>
              <p className="truncate text-sm font-black text-slate-900">PIX · Mercado Pago</p>
            </div>
          </div>
          {/* live status pill */}
          {isPaid ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700 border border-emerald-200">
              <SealCheck size={12} weight="fill" /> Pago
            </span>
          ) : isFailed || isExpired ? (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700 border border-rose-200">
              <XCircle size={12} weight="fill" /> Expirado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 border border-amber-200">
              <Spinner size={10} className="animate-spin" /> Aguardando
            </span>
          )}
        </div>
      </div>

      {/* ── PAID ── */}
      {isPaid && (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
            <SealCheck size={44} weight="duotone" className="text-emerald-600" />
          </span>
          <h2 className="text-2xl font-black text-emerald-800">Pagamento confirmado!</h2>
          <p className="text-sm text-emerald-700/80">Seu pedido já entrou na fila de produção.</p>
        </div>
      )}

      {/* ── FAILED / EXPIRED ── */}
      {(isFailed || isExpired) && !isPaid && (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 shadow-inner">
            <XCircle size={44} weight="duotone" className="text-rose-500" />
          </span>
          <h2 className="text-xl font-black text-rose-800">Código PIX expirado</h2>
          <p className="text-sm text-rose-700/80">Faça um novo pedido para gerar um novo código.</p>
          <button
            onClick={onNewOrder}
            className="mt-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-sm active:scale-[0.98]"
          >
            Novo pedido
          </button>
        </div>
      )}

      {/* ── QR ACTIVE ── */}
      {!isPaid && !isFailed && !isExpired && (
        <div className="flex flex-col items-center gap-0 px-4 pt-5 pb-8">
          {/* Countdown bar */}
          {timeLeft !== null && (
            <div className={`w-full max-w-sm rounded-2xl border bg-gradient-to-b ${timerBg} px-5 py-4 text-center mb-5 shadow-sm`}>
              <p className={`mb-0.5 text-[10px] font-black uppercase tracking-widest ${urgent ? 'text-rose-500' : warning ? 'text-amber-500' : 'text-emerald-600'}`}>
                Tempo para pagar
              </p>
              <p className={`text-[3.25rem] font-black tabular-nums leading-none ${timerColor} ${urgent ? 'animate-pulse' : ''}`}>
                {formatCountdown(timeLeft)}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(100, (timeLeft / (5 * 60 * 1000)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* QR Code card */}
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* QR image */}
            <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
              {qrSrc ? (
                <div className="relative">
                  <img
                    src={qrSrc}
                    alt="QR Code Pix"
                    className="h-56 w-56 rounded-2xl border border-slate-100 object-cover shadow-sm"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-b-2xl bg-white/90 py-1.5 backdrop-blur-sm">
                    <Spinner size={11} className="animate-spin text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500">Aguardando pagamento…</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-slate-100">
                  <QrCode size={48} weight="thin" className="text-slate-400" />
                </div>
              )}
              <p className="text-xs text-slate-500 text-center">Escaneie o QR Code com o app do seu banco</p>
            </div>

            {/* Divider */}
            <div className="mx-6 flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ou copie o código</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Pix code + copy */}
            {onlinePayment?.qrCodeText && (
              <div className="px-6 pb-6 pt-3 space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 font-mono text-[10px] text-slate-600 break-all select-all leading-relaxed max-h-20 overflow-y-auto">
                  {onlinePayment.qrCodeText}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black transition-all active:scale-[0.98] shadow-sm ${
                    copied ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                  {copied ? "Copiado!" : "Copiar código Pix"}
                </button>
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] text-slate-400 text-center">
            Seu pedido será confirmado automaticamente após o pagamento.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── ONLINE PAYMENT BLOCK (card/link) ───────────────────────────────────────
const OnlinePaymentBlock = ({ onlinePayment, paymentStatus }) => {
  const isPaid = String(paymentStatus || "").toUpperCase() === "PAID";
  const isFailed = String(paymentStatus || "").toUpperCase() === "FAILED";
  const isCard = Boolean(onlinePayment?.paymentLink);
  const mercadoPagoMeta = getPaymentProviderMeta("mercado_pago");

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

  if (isCard) {
    return (
      <div className="w-full mb-6">
        <div className="rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-sky-50 bg-sky-50/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-sky-100 overflow-hidden shadow-sm">
              {mercadoPagoMeta.icon ? (
                <img src={mercadoPagoMeta.icon} alt={mercadoPagoMeta.label} className="h-6 w-6 object-contain" />
              ) : (
                <CreditCard size={16} weight="duotone" className="text-sky-700" />
              )}
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
            <button
              type="button"
              onClick={() => {
                const url = onlinePayment.paymentLink;
                if (!url) return;
                if (Capacitor.isNativePlatform()) {
                  Browser.open({ url });
                } else {
                  window.open(url, '_blank');
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] py-3.5 text-sm font-black text-white shadow-[0_8px_20px_-10px_rgba(0,158,227,0.6)] transition hover:brightness-105 active:scale-[0.98]"
            >
              <ArrowSquareOut size={16} weight="bold" />
              Pagar via Mercado Pago
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ─── STATIC PIX (sem Mercado Pago) ──────────────────────────────────────────
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

// ─── MAIN SUCCESS VIEW ───────────────────────────────────────────────────────
export const SuccessView = ({
  orderType,
  paymentMethod,
  onNewOrder,
  onMyOrders,
  onWhatsApp,
  pixKey,
  phone,
  table,
  orderId,
  onTrackOrder,
  onPrintReceipt,
  onlinePayment,
  paymentStatus,
  storeLabel = "",
  storeLogoUrl = "",
  storeSlug = "",
}) => {
  const hasOnlinePayment = Boolean(
    onlinePayment?.qrCodeBase64 || onlinePayment?.qrCodeText || onlinePayment?.paymentLink
  );
  const isPix = Boolean(onlinePayment?.qrCodeBase64 || onlinePayment?.qrCodeText);
  const isStaticPix = !hasOnlinePayment && paymentMethod === "pix";
  const isLocalPayment = !hasOnlinePayment && paymentMethod !== "pix";
  const isPaid = String(paymentStatus || "").toUpperCase() === "PAID";
  const isFailed = String(paymentStatus || "").toUpperCase() === "FAILED";
  const isAwaitingPayment = hasOnlinePayment && !isPaid && !isFailed;
  const isNativePlatform = Capacitor.isNativePlatform();

  // ── Dedicated PIX screen ──────────────────────────────────────────────────
  if (isPix) {
    return (
      <PixPaymentScreen
        onlinePayment={onlinePayment}
        paymentStatus={paymentStatus}
        onNewOrder={onNewOrder}
        storeLabel={storeLabel}
        storeLogoUrl={storeLogoUrl}
        storeSlug={storeSlug}
      />
    );
  }

  // ── Generic success / card ─────────────────────────────────────────────────
  const checkoutTopPaddingClass = isNativePlatform
    ? "pt-[max(calc(env(safe-area-inset-top)+0.45rem),0.7rem)]"
    : "pt-[max(calc(env(safe-area-inset-top)+0.45rem),0.75rem)]";
  const checkoutStickyTopClass = isNativePlatform
    ? "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.7rem)]"
    : "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.75rem)]";
  const storeLogo = resolveAssetUrl(storeLogoUrl || "") || getStoreAvatarUrl(storeSlug, storeLabel || "Loja");

  return (
    <div className={`animate-in fade-in duration-300 relative overflow-x-clip min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.10),transparent_34%),linear-gradient(180deg,#eef5f7_0%,#f8fafc_8.5rem,#f8fafc_100%)] ${checkoutTopPaddingClass} ${isNativePlatform ? "ds-native-nav-content-lg" : "pb-24"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[max(env(safe-area-inset-top),0.85rem)] bg-[linear-gradient(180deg,rgba(238,245,247,0.98),rgba(238,245,247,0.74))]" />
      {/* Sticky header */}
      <div className={`sticky ${checkoutStickyTopClass} z-40 mb-4`}>
        <div className="rounded-[1.85rem] border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.97)_0%,rgba(244,248,252,0.96)_100%)] px-3 py-3 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          {/* Step indicator */}
          <div className="mb-3 flex items-center gap-1">
            {(() => {
              const step4Done = isPaid || !hasOnlinePayment;
              const step4Pending = isAwaitingPayment;
              return [
                { label: 'Sacola', done: true },
                { label: 'Entrega', done: true },
                { label: 'Pagamento', done: true },
                { label: 'Pedido', done: step4Done, pending: step4Pending },
              ].map(({ label, done, pending }: any, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black transition-colors ${done ? 'bg-emerald-500 text-white' : pending ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${done ? 'text-emerald-600' : pending ? 'text-amber-600' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 3 && <div className={`h-px flex-1 transition-colors ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                </React.Fragment>
              ));
            })()}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNewOrder}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-slate-200/80 bg-white text-[#336886] shadow-[0_14px_28px_-18px_rgba(51,104,134,0.3)] transition hover:-translate-y-0.5 hover:bg-sky-50 active:scale-95"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[1.05rem] border border-white bg-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
                <img src={storeLogo} alt={storeLabel || "Loja"} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, storeLabel || "Loja"); }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Pedido</p>
                <p className="truncate text-sm font-black tracking-tight text-slate-950">
                  {isPaid ? 'Confirmado!' : isAwaitingPayment ? 'Conclua o pagamento' : 'Realizado!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-4 sm:px-6">
        {!isAwaitingPayment && (
          <div className={`rounded-3xl border p-5 shadow-sm ${isPaid ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200' : 'bg-gradient-to-b from-sky-50 to-white border-sky-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${isPaid ? 'bg-emerald-100' : 'bg-sky-100'}`}>
                <CheckCircle size={28} weight="duotone" className={isPaid ? 'text-emerald-600' : 'text-sky-600'} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-lg font-black leading-tight ${isPaid ? 'text-emerald-800' : 'text-slate-900'}`}>
                  {isPaid ? 'Pedido confirmado!' : 'Pedido realizado!'}
                </h2>
                <p className={`text-xs leading-relaxed mt-0.5 ${isPaid ? 'text-emerald-700/80' : 'text-slate-500'}`}>
                  {isPaid
                    ? 'Pagamento confirmado. Seu pedido está em produção!'
                    : orderType === 'delivery'
                    ? 'Recebemos seu pedido. Avisaremos quando sair para entrega.'
                    : orderType === 'table'
                    ? `Pedido recebido — Mesa ${table || '—'}.`
                    : 'Seu pedido foi recebido e seguirá para produção.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasOnlinePayment && !isPaid && (
          <OnlinePaymentBlock onlinePayment={onlinePayment} paymentStatus={paymentStatus} />
        )}

        {isStaticPix && <StaticPixBlock pixKey={pixKey} phone={phone} />}

        {isLocalPayment && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Forma de pagamento</p>
            <div className="flex items-center gap-2">
              {(() => {
                const methodMeta = getPaymentMethodMeta(paymentMethod);
                return (
                  <>
                    {methodMeta.icon && <img src={methodMeta.icon} alt={methodMeta.label} className="h-5 w-5 object-contain" />}
                    <span className="text-sm font-semibold text-slate-800">{formatPaymentMethod(paymentMethod)}</span>
                  </>
                );
              })()}
            </div>
            <p className="mt-2 text-xs text-slate-500">Finalize o pagamento no local quando seu pedido estiver pronto.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {onMyOrders && (
            <button
              onClick={onMyOrders}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <ListBullets size={20} weight="duotone" /> Meus pedidos
            </button>
          )}
          {!onMyOrders && (
            <button
              onClick={onNewOrder}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <ArrowLeft size={20} weight="duotone" /> Fazer novo pedido
            </button>
          )}
          <div className="flex gap-3">
            {orderId && onTrackOrder && !isAwaitingPayment && (
              <button
                onClick={onTrackOrder}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98]"
              >
                <CheckCircle size={18} weight="duotone" /> Acompanhar
              </button>
            )}
            {orderId && onPrintReceipt && (
              <button
                onClick={onPrintReceipt}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 py-3.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 active:scale-[0.98]"
              >
                <Printer size={18} weight="duotone" /> Comprovante
              </button>
            )}
            {onWhatsApp && !isAwaitingPayment && (
              <button
                onClick={onWhatsApp}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98]"
              >
                <WhatsappLogo size={18} weight="duotone" /> WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
