// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bicycle,
  Crosshair,
  Phone,
  House,
  ForkKnife,
  PaperPlaneTilt,
  Wallet,
  CreditCard,
  MagnifyingGlass,
  User,
  Truck,
  MapPinLine,
  Clock
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";
import { GoogleRouteMapView } from "../GoogleRouteMapView";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { formatSelectedModifiers, getModifiersTotal } from "../../utils/productModifiers";
import { getBundleDiscountForCartItem, getCartPricing } from "../../utils/orderPricing";
import { apiClient } from "../../config/apiClient";

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

export const CartView = ({
  cart,
  customer,
  customers = [],
  paymentMethod,
  isCondominiumCheckout = false,
  condominiumCheckoutContext = null,
  allowCustomerAutocomplete = false,
  tablePhoneOptional = false,
  occupiedTables = [],
  allowedOrderTypes = [ "delivery", "pickup", "table" ],
  deliveryRadiusKm = null,
  deliveryFee = 0,
  deliveryCheck = { status: "idle", distanceKm: null, durationMin: null },
  deliveryMode = "distance",
  postalEnabled = false,
  postalOriginZip = "",
  postalQuote = null,
  postalQuoteLoading = false,
  selectedPostalServiceCode = "",
  isCustomerLogged = false,
  savedAddresses = [],
  onApplySavedAddress,
  onOpenAddressManager,
  onUseCurrentLocation,
  onChangeDeliveryMode,
  onCalculatePostalQuote,
  onSelectPostalService,
  storeAddress = "",
  storeCoords = null,
  deliveryCoords = null,
  checkoutDisabled = false,
  checkoutDisabledReason = "",
  checkoutLoading = false,
  pricingSummary,
  onChangeCustomer,
  onChangePayment,
  onUpdateCart,
  onCheckout,
  onBack
}) => {
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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [summaryCompact, setSummaryCompact] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [cashNeedsChange, setCashNeedsChange] = useState(false);
  const [cashTenderedInput, setCashTenderedInput] = useState("");
  const [showOutOfRangeSheet, setShowOutOfRangeSheet] = useState(false);
  const [showEmptyCartSheet, setShowEmptyCartSheet] = useState(false);
  const [hasTriedCheckout, setHasTriedCheckout] = useState(false);
  const [showOptionalPhoneFields, setShowOptionalPhoneFields] = useState(false);
  const previousCartItemsCountRef = useRef<number>(cartItems.length);
  const cepLookupLockRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const cepInputRef = useRef<HTMLInputElement | null>(null);
  const premiumInputClass =
    "w-full rounded-2xl bg-slate-100 px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm";

  const visibleOrderTypes = Array.isArray(allowedOrderTypes) && allowedOrderTypes.length
    ? allowedOrderTypes
    : [ "delivery", "pickup", "table" ];
  const isPickup = customer.type === "pickup";
  const isDelivery = customer.type === "delivery";
  const isPostalDelivery = isDelivery && String(deliveryMode || "").toLowerCase() === "postal";
  const isOptionalPhoneMode = customer.type === "table" || customer.type === "pickup";
  const isPix = paymentMethod === "pix";
  const isCredit = paymentMethod === "credito";
  const isDebit = paymentMethod === "debito";
  const isCash = paymentMethod === "dinheiro";
  const deliveryFeeValue = isDelivery ? normalizeNumber(deliveryFee) || 0 : 0;
  const radiusValue = normalizeNumber(deliveryRadiusKm);
  const totalWithFee = total + deliveryFeeValue;
  const cashTenderedValue = isCash ? normalizeNumber(cashTenderedInput) : null;
  const cashChangeDue =
    isCash && cashTenderedValue !== null ? Number(cashTenderedValue) - Number(totalWithFee || 0) : null;

  const cashValidation = useMemo(() => {
    if (!isCash) return { blocked: false, reason: "" };
    if (!cashNeedsChange) return { blocked: false, reason: "" };
    if (cashTenderedValue === null) return { blocked: true, reason: "Informe com quanto vai pagar para calcular o troco." };
    if (cashTenderedValue < totalWithFee) {
      return { blocked: true, reason: "O valor para troco precisa ser maior ou igual ao total do pedido." };
    }
    return { blocked: false, reason: "" };
  }, [isCash, cashNeedsChange, cashTenderedValue, totalWithFee]);

  const actionLabel = useMemo(() => {
    if (isPickup && isPix) return "Gerar Pix e enviar pedido";
    if (isPickup) return "Enviar pedido para retirada";
    if (isDelivery && isPix) return "Finalizar pedido (Pix)";
    if (isDelivery) return "Finalizar pedido para entrega";
    if (isCredit) return "Finalizar pedido (Crédito)";
    if (isDebit) return "Finalizar pedido (Débito)";
    if (isCash) return "Finalizar pedido (Dinheiro)";
    if (isPix) return "Finalizar pedido (Pix)";
    return "Finalizar pedido na mesa";
  }, [isDelivery, isPickup, isPix, isCredit, isDebit, isCash]);
  const postalServices = useMemo(
    () => (Array.isArray(postalQuote?.quote?.services) ? postalQuote.quote.services : []),
    [postalQuote]
  );
  const selectedPostalService = useMemo(() => {
    if (!isPostalDelivery) return null;
    if (!postalServices.length) return null;
    return (
      postalServices.find((service) => String(service?.serviceCode || "") === String(selectedPostalServiceCode || "")) ||
      postalServices[0]
    );
  }, [isPostalDelivery, postalServices, selectedPostalServiceCode]);
  const isDeliveryAddressValidated = !isDelivery || isPostalDelivery || deliveryCheck?.status === "ok";
  const primaryCtaLabel =
    isPostalDelivery && !selectedPostalService
      ? "Calcular frete postal"
      : isDelivery && !isDeliveryAddressValidated
      ? "Validar endereço de entrega"
      : actionLabel;
  const primaryCtaDisabled =
    checkoutDisabled ||
    (isDelivery && !isDeliveryAddressValidated && !isPostalDelivery) ||
    cashValidation.blocked ||
    (isPostalDelivery && !selectedPostalService) ||
    checkoutLoading;
  const isDeliveryValidationMode = isDelivery && !isPostalDelivery && deliveryCheck?.status !== "ok";
  const isPostalQuoteMode = isPostalDelivery && !selectedPostalService;
  const showDeliveryStatus = isDelivery && !isPostalDelivery;
  const deliveryStatus = deliveryCheck?.status === "ok" ? { label: "Endereço validado!", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" } : { label: "Validando endereço...", tone: "bg-amber-50 text-amber-800 border-amber-200" };
  const showRouteMap = isDelivery && !isPostalDelivery && storeCoords && deliveryCoords;
  const showDeliveryDebug = false;
  const deliveryDebug = deliveryCheck?.status === "ok" ? [{ label: "Distância", value: `${deliveryCheck.distanceKm?.toFixed(1)} km` }, { label: "Tempo", value: `${deliveryCheck.durationMin} min` }] : [];
  const hideOutOfRangeInlineReason = false;
  const isLoggedDeliveryFlow = isDelivery && isCustomerLogged;
  const hasSavedAddress = !!customer.address;
  const updateDeliveryField = (field, value) => {
    onChangeCustomer({ ...customer, [field]: value });
  };
  const handleCepLookup = async () => {
    if (cepLookupLockRef.current) return;
    cepLookupLockRef.current = true;
    setCepLoading(true);
    setCepError("");
    try {
      await onCalculatePostalQuote?.();
    } catch (err) {
      setCepError("Erro ao buscar endereço.");
    } finally {
      setCepLoading(false);
      cepLookupLockRef.current = false;
    }
  };
  const handleSelectTable = (table) => {
    onChangeCustomer({ ...customer, table });
  };
  const handleTableInputChange = (table) => {
    onChangeCustomer({ ...customer, table });
  };
  const tableOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-6 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition mb-6 font-semibold text-sm"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Identificação do Cliente */}
      <div className="rounded-2xl premium-card p-3 sm:p-4 mb-4 sm:mb-6 bg-white border border-slate-100 shadow-sm space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Dados do cliente
        </p>
        <input
          value={customer.name || ""}
          onChange={(e) => updateDeliveryField("name", e.target.value)}
          placeholder="Nome completo"
          className={premiumInputClass}
          ref={nameInputRef}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={customer.phone || ""}
            onChange={(e) => updateDeliveryField("phone", e.target.value)}
            placeholder="Telefone/WhatsApp"
            className={premiumInputClass}
            type="tel"
          />
          {customer.type === "delivery" && (
            <input
              value={customer.cep || ""}
              onChange={(e) => updateDeliveryField("cep", e.target.value)}
              placeholder="CEP"
              className={premiumInputClass}
              type="tel"
            />
          )}
        </div>
      </div>

      {/* Entrega/Retirada */}
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-1 gap-4">
          {customer.type === "delivery" && (
            <div className="rounded-2xl premium-card p-3 sm:p-4 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Endereço de entrega
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-1">
                  {isPostalDelivery ? "Postal" : "Entrega"}
                </span>
              </div>

              {/* INÍCIO: Integração Condomínio (Campo adicionado abaixo) */}
              {isCondominiumCheckout && (
                <>
                  <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-1 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => onChangeCustomer({ ...customer, condominiumFulfillmentMode: 'pickup_at_stall' })}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
                        customer.condominiumFulfillmentMode === 'pickup_at_stall' ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:bg-white"
                      }`}
                    >
                      Retirar na barraca
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeCustomer({ ...customer, condominiumFulfillmentMode: 'apartment_delivery' })}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
                        customer.condominiumFulfillmentMode === 'apartment_delivery' ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:bg-white"
                      }`}
                    >
                      Entregar no apartamento
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input value={customer.block || ""} onChange={(e) => onChangeCustomer({ ...customer, block: e.target.value })} placeholder="Bloco" className={premiumInputClass} />
                    <input value={customer.tower || ""} onChange={(e) => onChangeCustomer({ ...customer, tower: e.target.value })} placeholder="Torre" className={premiumInputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input value={customer.apartment || ""} onChange={(e) => onChangeCustomer({ ...customer, apartment: e.target.value })} placeholder="Apto" className={premiumInputClass} />
                    <input value={customer.reference || ""} onChange={(e) => onChangeCustomer({ ...customer, reference: e.target.value })} placeholder="Referência" className={premiumInputClass} />
                  </div>
                </>
              )}
              {/* FIM: Integração Condomínio */}

              <div className="grid grid-cols-1 gap-3">
                <input
                  value={customer.address || ""}
                  onChange={(e) => updateDeliveryField("address", e.target.value)}
                  placeholder="Rua e número"
                  className={premiumInputClass}
                />
                <input
                  value={customer.complement || ""}
                  onChange={(e) => updateDeliveryField("complement", e.target.value)}
                  placeholder="Apto, bloco, referencia"
                  className={premiumInputClass}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="col-span-2">
                  <input value={customer.city || ""} onChange={(e) => updateDeliveryField("city", e.target.value)} placeholder="Cidade" className={premiumInputClass} />
                </div>
                <input value={customer.state || ""} onChange={(e) => updateDeliveryField("state", e.target.value)} placeholder="UF" className={premiumInputClass} />
              </div>
            </div>
          )}
          {/* ... (restante do CartView permanece igual) */}
        </div>
      </div>
      {/* ... (restante do JSX...) */}
    </div>
  );
};
