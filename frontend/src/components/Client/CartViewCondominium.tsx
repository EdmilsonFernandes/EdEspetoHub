// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  Phone,
  House,
  PaperPlaneTilt,
  Wallet,
  CreditCard,
  MagnifyingGlass,
  User,
  Storefront,
  Building
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { formatSelectedModifiers, getModifiersTotal } from "../../utils/productModifiers";
import { getBundleDiscountForCartItem, getCartPricing } from "../../utils/orderPricing";
import { DddSelect } from "../common/DddSelect";
import { textareaAssistProps } from "../../utils/inputAssist";
import { CUSTOMER_ORDER_NOTE_MAX_LENGTH, limitCustomerOrderNoteInput } from "../../utils/customerOrderNote";

const BRAZIL_DDDS = [
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
];

const extractPhoneParts = (value = "") => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const hasPrefixedDdd = /^\(\d{2}\)/.test(raw);
  const ddd = hasPrefixedDdd ? digits.slice(0, 2) : "";
  const hasValidDdd = BRAZIL_DDDS.includes(ddd);
  return {
    ddd: hasValidDdd ? ddd : "",
    localNumber: hasValidDdd ? digits.slice(2, 11) : digits.slice(0, 9),
  };
};

const formatLocalPhoneNumber = (value = "") => {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const buildPhoneFromParts = (ddd = "", local = "") => {
  const safeDdd = String(ddd || "").replace(/\D/g, "").slice(0, 2);
  const localDigits = String(local || "").replace(/\D/g, "").slice(0, 9);
  if (!safeDdd || !localDigits) return "";
  return `(${safeDdd}) ${formatLocalPhoneNumber(localDigits)}`;
};

export const CartViewCondominium = ({
  cart,
  customer,
  customers = [],
  paymentMethod,
  condominiumCheckoutContext = null,
  allowCustomerAutocomplete = false,
  guestPhoneRequired = false,
  checkoutDisabled = false,
  checkoutDisabledReason = "",
  checkoutLoading = false,
  pricingSummary,
  onChangeCustomer,
  onChangePayment,
  onUpdateCart,
  onCheckout,
  onBack,
  systemHeaderOffset = false,
}) => {
  const isNativePlatform = Capacitor.isNativePlatform();
  const checkoutTopPaddingClass = systemHeaderOffset
    ? "pt-3 sm:pt-4"
    : isNativePlatform
    ? "pt-[max(calc(env(safe-area-inset-top)+0.8rem),1.05rem)]"
    : "pt-[max(calc(env(safe-area-inset-top)+1rem),1.25rem)]";
  const checkoutStickyTopClass = systemHeaderOffset
    ? "top-[calc(env(safe-area-inset-top)+4.1rem)]"
    : isNativePlatform
    ? "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.7rem)]"
    : "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.75rem)]";
  const cartItems = Object.values(cart);
  const fallbackPricing = getCartPricing(cart);
  const subtotal = pricingSummary?.subtotal ?? fallbackPricing.subtotal;
  const discountTotal = pricingSummary?.discountTotal ?? fallbackPricing.discountTotal;
  const total = pricingSummary?.total ?? fallbackPricing.discountedSubtotal;
  
  const buildCartOptions = (entry: any) => ({
    cookingPoint: entry?.cookingPoint || "",
    passSkewer: Boolean(entry?.passSkewer),
    selectedModifiers: Array.isArray(entry?.selectedModifiers) ? entry.selectedModifiers : [],
  });

  const normalizeNumber = (value) => {
    if (value === null || value === undefined) return null;
    const raw = value.toString().trim();
    if (!raw) return null;
    const parsed = Number(raw.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const [ctaPulse, setCtaPulse] = useState(false);
  const [cashNeedsChange, setCashNeedsChange] = useState(false);
  const [cashTenderedInput, setCashTenderedInput] = useState("");
  const [hasTriedCheckout, setHasTriedCheckout] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const premiumInputClass =
    "w-full rounded-2xl bg-slate-100 px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm";

  // Lógica de condomínio
  const condominiumLogo = resolveAssetUrl(
    condominiumCheckoutContext?.condominium?.logoUrl ||
    condominiumCheckoutContext?.condominium?.bannerUrl ||
    ""
  );
  const isApartmentDelivery = customer.condominiumFulfillmentMode === 'apartment_delivery';
  const apartmentDeliveryAllowed = condominiumCheckoutContext?.link?.allowApartmentDelivery !== false;
  const condominiumFeeValue = isApartmentDelivery ? (normalizeNumber(condominiumCheckoutContext?.feeValue) || 0) : 0;
  const totalWithFee = total + condominiumFeeValue;
  const checkoutAudienceLabel = isApartmentDelivery ? 'Morador' : 'Visitante';
  const fulfillmentSummaryLabel = isApartmentDelivery ? 'Entrega no apartamento' : 'Retirada na barraca';
  const checkoutEventLabel = String(condominiumCheckoutContext?.event?.name || '').trim();

  useEffect(() => {
    if (!apartmentDeliveryAllowed && isApartmentDelivery) {
      onChangeCustomer({ ...customer, condominiumFulfillmentMode: 'pickup_at_stall', type: 'pickup' });
    }
  }, [apartmentDeliveryAllowed, isApartmentDelivery]);

  const isPix = paymentMethod === "pix";
  const isCash = paymentMethod === "dinheiro";
  const cashTenderedValue = isCash ? normalizeNumber(cashTenderedInput) : null;
  const cashChangeDue = isCash && cashTenderedValue !== null ? Number(cashTenderedValue) - Number(totalWithFee || 0) : null;

  const [selectedDdd, setSelectedDdd] = useState(() => extractPhoneParts(customer.phone || "").ddd);
  const [localPhoneDigits, setLocalPhoneDigits] = useState(() => extractPhoneParts(customer.phone || "").localNumber);

  useEffect(() => {
    const parsed = extractPhoneParts(customer.phone || "");
    if (parsed.ddd !== selectedDdd) setSelectedDdd(parsed.ddd);
    if (parsed.localNumber !== localPhoneDigits) setLocalPhoneDigits(parsed.localNumber);
  }, [customer.phone]);

  const syncPhone = (nextDdd: string, nextLocal: string) => {
    const safeDdd = BRAZIL_DDDS.includes(nextDdd) ? nextDdd : "";
    const localDigits = (nextLocal || "").replace(/\D/g, "").slice(0, 9);
    const formatted = buildPhoneFromParts(safeDdd, localDigits);
    onChangeCustomer({ ...customer, phone: formatted });
  };

  const handlePhoneLocalNumberChange = (nextValue) => {
    const localDigits = nextValue.replace(/\D/g, "").slice(0, 9);
    setLocalPhoneDigits(localDigits);
    syncPhone(selectedDdd, localDigits);
  };

  const handleDddChange = (nextDdd) => {
    const safeDdd = BRAZIL_DDDS.includes(nextDdd) ? nextDdd : "";
    setSelectedDdd(safeDdd);
    syncPhone(safeDdd, localPhoneDigits);
  };

  const handleNameChange = (value) => {
    onChangeCustomer({ ...customer, name: value });
    if (allowCustomerAutocomplete) setSuggestionsOpen(true);
  };

  const handleSelectCustomer = (entry) => {
    const parts = extractPhoneParts(entry.phone || "");
    const safeDdd = BRAZIL_DDDS.includes(parts.ddd) ? parts.ddd : "";
    const safeLocal = String(parts.localNumber || "").replace(/\D/g, "").slice(0, 9);
    setSelectedDdd(safeDdd);
    setLocalPhoneDigits(safeLocal);
    onChangeCustomer({
      ...customer,
      name: entry.name,
      phone: buildPhoneFromParts(safeDdd, safeLocal),
    });
    setSuggestionsOpen(false);
  };

  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar farinha');
    const modifiers = formatSelectedModifiers(item?.selectedModifiers || []);
    if (modifiers.length) labels.push(`+ ${modifiers.join(', ')}`);
    return labels.length ? labels.join(' • ') : '';
  };

  const cashValidation = useMemo(() => {
    if (!isCash || !cashNeedsChange) return { blocked: false, reason: "" };
    if (cashTenderedValue === null) return { blocked: true, reason: "Informe com quanto vai pagar." };
    if (cashTenderedValue < totalWithFee) return { blocked: true, reason: "Valor insuficiente para troco." };
    return { blocked: false, reason: "" };
  }, [isCash, cashNeedsChange, cashTenderedValue, totalWithFee]);

  const validateFields = () => {
    if (!customer.name?.trim()) return "Informe seu nome.";
    if (guestPhoneRequired && (!customer.phone?.trim() || customer.phone.length < 10)) return "Informe um WhatsApp válido.";
    if (isApartmentDelivery) {
      if (!customer.block?.trim()) return "Informe o bloco/torre.";
      if (!customer.apartment?.trim()) return "Informe o apartamento.";
    }
    return null;
  };

  const validationError = validateFields();
  const customerOrderNoteValue = limitCustomerOrderNoteInput(customer.customerNote || "");
  const handleCustomerOrderNoteChange = (value: string) => {
    onChangeCustomer({ ...customer, customerNote: limitCustomerOrderNoteInput(value) });
  };

  return (
    <div className={`animate-in slide-in-from-right relative overflow-x-hidden no-x-scroll bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.10),transparent_34%),linear-gradient(180deg,#eef5f7_0%,#f8fafc_8.5rem,#f8fafc_100%)] ${checkoutTopPaddingClass} ${isNativePlatform ? "ds-native-nav-content-lg" : "pb-24"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[max(env(safe-area-inset-top),0.85rem)] bg-[linear-gradient(180deg,rgba(238,245,247,0.98),rgba(238,245,247,0.74))]" />
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <div className={`sticky ${checkoutStickyTopClass} z-40 mb-4 sm:mb-6`}>
        <div className="rounded-[1.85rem] border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.97)_0%,rgba(244,248,252,0.96)_100%)] px-3 py-3 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-slate-200/80 bg-white text-[#336886] shadow-[0_14px_28px_-18px_rgba(51,104,134,0.3)] transition hover:-translate-y-0.5 hover:bg-sky-50 active:scale-95"
              aria-label="Voltar ao cardápio"
              title="Voltar ao cardápio"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[1.05rem] border border-white bg-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
                {condominiumLogo ? (
                  <img src={condominiumLogo} alt={condominiumCheckoutContext?.condominium?.name || 'Condomínio'} className="h-full w-full object-contain p-1.5" />
                ) : (
                  <Building size={22} weight="duotone" className="text-[#336886]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Checkout Condomínio</p>
                <p className="truncate text-sm font-black tracking-tight text-slate-950">
                  {condominiumCheckoutContext?.condominium?.name || 'Finalizando seu pedido'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do cliente */}
      <div className="relative mb-4 overflow-hidden rounded-[2rem] border border-white/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,248,252,0.94)_58%,rgba(255,255,255,0.94)_100%)] p-4 shadow-[0_24px_52px_-38px_rgba(15,23,42,0.24)] sm:mb-6 sm:p-6">
        <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-[#336886]/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
              {condominiumLogo ? (
                <img src={condominiumLogo} alt={condominiumCheckoutContext?.condominium?.name || 'Condomínio'} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Building size={22} weight="duotone" className="text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Pedido do condomínio</p>
              <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">Quem vai receber</h2>
              <p className="truncate text-xs text-slate-500">
                {checkoutEventLabel || condominiumCheckoutContext?.condominium?.name || 'Finalize seu pedido com contexto completo'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-[#336886]/12 bg-white/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-sm">
              {checkoutAudienceLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {fulfillmentSummaryLabel}
            </span>
          </div>
        </div>

        <div className="relative space-y-4">
          {/* Nome */}
          <div className="rounded-[1.55rem] border border-slate-100 bg-white/90 p-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.22)] sm:p-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seu Nome</label>
            <div className="relative mt-2">
              <input
                ref={nameInputRef}
                value={customer.name || ""}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nome completo"
                className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4 text-base text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900"
              />
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="rounded-[1.55rem] border border-slate-100 bg-white/90 p-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.22)] sm:p-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              WhatsApp {guestPhoneRequired ? <span className="text-rose-500 font-extrabold">Obrigatório</span> : null}
            </label>
            <div className="mt-2 grid grid-cols-[100px_1fr] gap-3">
              <DddSelect
                value={selectedDdd || ""}
                onChange={(ddd) => handleDddChange(ddd)}
              />
              <input
                type="tel"
                inputMode="numeric"
                value={formatLocalPhoneNumber(localPhoneDigits)}
                onChange={(e) => handlePhoneLocalNumberChange(e.target.value)}
                placeholder="90000-0000"
                className={premiumInputClass}
              />
            </div>
            {guestPhoneRequired ? (
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Pedido visitante exige telefone com DDD para reduzir abuso e facilitar contato da loja.
              </p>
            ) : null}
          </div>

          {/* Modo de Entrega */}
          <div className="rounded-[1.55rem] border border-slate-100 bg-white/90 p-3 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.22)] sm:p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Como deseja receber?</p>
            <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
              <button
                onClick={() => onChangeCustomer({ ...customer, condominiumFulfillmentMode: 'pickup_at_stall', type: 'pickup' })}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  !isApartmentDelivery ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Storefront size={18} weight={!isApartmentDelivery ? "fill" : "duotone"} />
                <span className="text-[10px] uppercase font-bold">Retirar na Barraca</span>
              </button>
              <button
                onClick={() => {
                  if (!apartmentDeliveryAllowed) return;
                  onChangeCustomer({ ...customer, condominiumFulfillmentMode: 'apartment_delivery', type: 'pickup' });
                }}
                disabled={!apartmentDeliveryAllowed}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  isApartmentDelivery ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <Building size={18} weight={isApartmentDelivery ? "fill" : "duotone"} />
                <span className="text-[10px] uppercase font-bold">No Apartamento</span>
              </button>
            </div>
            {!apartmentDeliveryAllowed && (
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Nesta feira, a loja está atendendo apenas retirada na barraca.
              </p>
            )}
          </div>

          {/* Campos de Morador */}
          {isApartmentDelivery && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.4rem] border border-slate-100 p-3 bg-white/90 shadow-[0_14px_24px_-26px_rgba(15,23,42,0.2)]">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bloco/Torre</label>
                  <input
                    value={customer.block || ""}
                    onChange={(e) => onChangeCustomer({ ...customer, block: e.target.value })}
                    placeholder="Ex: A"
                    className="w-full mt-1 bg-transparent text-lg font-bold outline-none"
                  />
                </div>
                <div className="rounded-[1.4rem] border border-slate-100 p-3 bg-white/90 shadow-[0_14px_24px_-26px_rgba(15,23,42,0.2)]">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apartamento</label>
                  <input
                    value={customer.apartment || ""}
                    onChange={(e) => onChangeCustomer({ ...customer, apartment: e.target.value })}
                    placeholder="Ex: 101"
                    className="w-full mt-1 bg-transparent text-lg font-bold outline-none"
                  />
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-100 p-3 bg-white/90 shadow-[0_14px_24px_-26px_rgba(15,23,42,0.2)]">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ponto de Referência</label>
                <input
                  value={customer.reference || ""}
                  onChange={(e) => onChangeCustomer({ ...customer, reference: e.target.value })}
                  placeholder="Ex: Próximo à piscina"
                  className="w-full mt-1 bg-transparent text-sm font-medium outline-none"
                />
              </div>
              {condominiumFeeValue > 0 && (
                <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Taxa de entrega no apto</span>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(condominiumFeeValue)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-[2rem] border border-amber-100 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,251,235,0.78))] p-4 shadow-[0_20px_40px_-34px_rgba(245,158,11,0.3)] sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Observação para a loja</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Opcional. Avise algo simples sobre preparo, retirada ou entrega no apartamento.
        </p>
        <textarea
          {...textareaAssistProps.notes}
          value={customerOrderNoteValue}
          onChange={(event) => handleCustomerOrderNoteChange(event.target.value)}
          maxLength={CUSTOMER_ORDER_NOTE_MAX_LENGTH}
          rows={3}
          placeholder="Ex: sem ketchup. Chamar no interfone quando chegar."
          className="mt-3 min-h-[88px] w-full resize-none rounded-2xl border border-amber-100 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100"
          data-testid="customer-order-note-input"
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
          <span>Essa mensagem vai junto com o pedido.</span>
          <span className="shrink-0 tabular-nums">{customerOrderNoteValue.length}/{CUSTOMER_ORDER_NOTE_MAX_LENGTH}</span>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-4 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.2)] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Resumo da compra</p>
            <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">Pedido pronto para confirmar</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        {cartItems.map((item) => (
          <div key={item.key || item.id} className="flex justify-between items-center gap-2 py-2 border-b border-slate-50 last:border-0">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {item.qty}x
              </span>
              <div className="h-11 w-11 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shrink-0">
                {item.imageUrl ? (
                  <img
                    src={resolveAssetUrl(item.imageUrl)}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                    🍖
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-slate-800 font-semibold text-sm">{item.name}</span>
                {formatItemOptions(item) && <span className="truncate text-[11px] text-slate-500">{formatItemOptions(item)}</span>}
              </div>
            </div>
            <span className="shrink-0 font-bold text-slate-900 text-sm">{formatCurrency(item.price * item.qty)}</span>
          </div>
        ))}
        
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {isApartmentDelivery && condominiumFeeValue > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
              <span>Taxa de Entrega</span>
              <span>{formatCurrency(condominiumFeeValue)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-slate-600">Total</span>
            <span className="text-xl font-black text-slate-900">{formatCurrency(totalWithFee)}</span>
          </div>
        </div>
      </div>

      {/* Pagamento */}
      <div className="mb-4 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.2)] sm:p-6">
        <h2 className="font-black text-slate-900 mb-4 text-base flex items-center gap-2">
          <CreditCard size={18} className="text-brand-primary" /> Forma de Pagamento
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {["pix", "debito", "credito", "dinheiro"].map((method) => {
            const meta = getPaymentMethodMeta(method);
            const isSelected = paymentMethod === method;
            return (
              <button
                key={method}
                onClick={() => onChangePayment(method)}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                  isSelected ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary" : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-brand-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                  {meta.icon ? <img src={meta.icon} className="h-4 w-4 object-contain" /> : <CreditCard size={16} />}
                </div>
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-brand-primary' : 'text-slate-500'}`}>
                  {method === 'pix' ? 'Pix' : method === 'debito' ? 'Débito' : method === 'credito' ? 'Crédito' : 'Dinheiro'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isCash && cashNeedsChange && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mb-4">
          <label className="text-xs font-bold text-amber-800 uppercase">Troco para quanto?</label>
          <input
            value={cashTenderedInput}
            onChange={(e) => setCashTenderedInput(e.target.value)}
            inputMode="decimal"
            placeholder="Ex: 50,00"
            className="w-full mt-2 bg-white rounded-xl px-4 py-2.5 text-lg font-bold text-slate-800 outline-none border border-amber-200"
          />
        </div>
      )}

      {/* Botão Finalizar */}
      <div className={`fixed left-0 right-0 z-50 border-t border-slate-100 bg-white/90 p-4 backdrop-blur-md ${isNativePlatform ? "ds-native-nav-dock" : "bottom-0"}`}>
        <div className="mx-auto max-w-lg rounded-[1.65rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-3 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.22)]">
        <button
          onClick={() => {
            setHasTriedCheckout(true);
            if (validationError) return;
            setCtaPulse(true);
            window.setTimeout(() => setCtaPulse(false), 200);
            
            // Payload específico de condomínio
            const condominiumOrder = {
              condominiumId: condominiumCheckoutContext?.condominium?.id,
              eventId: condominiumCheckoutContext?.event?.id,
              fulfillmentMode: customer.condominiumFulfillmentMode || 'pickup_at_stall',
              block: customer.block,
              tower: customer.tower,
              apartment: customer.apartment,
              reference: customer.reference,
            };

            onCheckout({
              cashTendered: isCash && cashNeedsChange ? normalizeNumber(cashTenderedInput) : null,
              condominiumOrder
            });
          }}
          disabled={checkoutLoading || checkoutDisabled || cashValidation.blocked || (hasTriedCheckout && !!validationError)}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            checkoutLoading || checkoutDisabled || cashValidation.blocked || (hasTriedCheckout && !!validationError)
              ? "bg-slate-300 text-slate-500"
              : "bg-slate-900 text-white"
          }`}
          style={ctaPulse ? { animation: 'btnPop 200ms ease' } : undefined}
        >
          <PaperPlaneTilt size={20} weight="bold" />
          {checkoutLoading ? 'Enviando...' : isApartmentDelivery ? 'Pedir no Apartamento' : 'Pedir e Retirar'}
        </button>
        <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
          {isApartmentDelivery ? 'A loja receberá seus dados do morador e o ponto de entrega.' : 'A retirada ficará vinculada ao seu nome e WhatsApp.'}
        </p>
        {hasTriedCheckout && validationError && (
          <p className="mt-2 text-center text-xs font-bold text-rose-600">{validationError}</p>
        )}
        {hasTriedCheckout && !validationError && (checkoutDisabledReason || cashValidation.reason) && (
          <p className="mt-2 text-center text-xs font-bold text-rose-600">
            {cashValidation.reason || checkoutDisabledReason}
          </p>
        )}
        </div>
      </div>
    </div>
  );
};
