// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
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
  Clock,
  Trash,
  ShieldCheck,
  NotePencil,
} from "@phosphor-icons/react";
import { formatAddressLines, formatCurrency } from "../../utils/format";
import { getPaymentMethodMeta, getPaymentProviderMeta } from "../../utils/paymentAssets";
import { RouteMapView } from "../RouteMapView";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { getStoreAvatarUrl } from "../../utils/storeAvatar";
import { formatSelectedModifiers, getModifiersTotal } from "../../utils/productModifiers";
import { getBundleDiscountForCartItem, getCartPricing } from "../../utils/orderPricing";
import { DddSelect } from "../common/DddSelect";
import { addressLookupService } from "../../services/addressLookupService";
import { inputAssistProps, textareaAssistProps } from "../../utils/inputAssist";
import { Button } from '../ui/Button';
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

const PROFESSIONAL_PAYMENT_METHODS = [
  { id: "debito_presencial", label: "Débito", description: "Pague na entrega, retirada ou mesa.", group: "local" },
  { id: "credito_presencial", label: "Crédito", description: "Pague na entrega, retirada ou mesa.", group: "local" },
  { id: "pix_presencial", label: "Pix", description: "A loja confirma o Pix no atendimento.", group: "local" },
  { id: "dinheiro", label: "Dinheiro", description: "Pague em dinheiro na entrega, retirada ou mesa.", group: "local" },
];

const POSTAL_PREPAID_PAYMENT_METHODS = new Set([
  "pix",
  "credito",
  "crédito",
  "debito",
  "débito",
  "credit_card",
  "debit_card",
  "cartao",
  "cartão",
]);

const isPostalPrepaidPaymentMethod = (methodId = "") =>
  POSTAL_PREPAID_PAYMENT_METHODS.has(String(methodId || "").trim().toLowerCase());

const DEFAULT_CUSTOMER_ORDER_NOTE_SUGGESTIONS = [
  "Sem cebola",
  "Ponto da carne",
  "Embalar separado",
  "Sem talheres",
];

export const CartView = ({
  cart,
  customer,
  customers = [],
  paymentMethod,
  allowCustomerAutocomplete = false,
  tablePhoneOptional = false,
  guestPhoneRequired = false,
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
  onValidateDeliveryAddress,
  onChangeDeliveryMode,
  onCalculatePostalQuote,
  onSelectPostalService,
  storeAddress = "",
  storeCoords = null,
  deliveryCoords = null,
  pickupDistanceKm = null,
  pickupDistanceWarningKm = 15,
  pickupDistanceConfirmationKm = 40,
  checkoutDisabled = false,
  checkoutDisabledReason = "",
  checkoutLoading = false,
  checkoutSlow = false,
  checkoutResume = null,
  pricingSummary,
  paymentSummary = null,
  onChangeCustomer,
  onChangePayment,
  onUpdateCart,
  onCheckout,
  onCheckoutResumeConsumed,
  onBack,
  storeLabel = "",
  storeLogoUrl = "",
  storeSlug = "",
  suggestedProducts = [],
  userRole = "",
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
  const summaryStickyTopClass = systemHeaderOffset
    ? "top-[calc(env(safe-area-inset-top)+9.75rem)]"
    : isNativePlatform
    ? "top-[max(calc(env(safe-area-inset-top)+5.9rem),6.1rem)]"
    : "top-[max(calc(env(safe-area-inset-top)+5.9rem),6.1rem)]";
  const checkoutStoreLogo = resolveAssetUrl(storeLogoUrl || "") || getStoreAvatarUrl(storeSlug, storeLabel || "Loja");
  const mercadoPagoMeta = getPaymentProviderMeta("mercado_pago");
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
  const [showFarPickupSheet, setShowFarPickupSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showCustomerNoteSheet, setShowCustomerNoteSheet] = useState(false);
  const [customerNoteDraft, setCustomerNoteDraft] = useState("");
  const [confirmedFarPickupContext, setConfirmedFarPickupContext] = useState("");
  const [hasTriedCheckout, setHasTriedCheckout] = useState(false);
  const [showOptionalPhoneFields, setShowOptionalPhoneFields] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isEditingTable, setIsEditingTable] = useState(false);
  const previousCartItemsCountRef = useRef<number>(cartItems.length);
  const cepLookupLockRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const cepInputRef = useRef<HTMLInputElement | null>(null);
  const postalAutoQuoteKeyRef = useRef("");
  const premiumInputClass =
    "w-full rounded-2xl bg-slate-100/80 border border-slate-200/50 px-4 py-3 text-slate-800 placeholder:text-slate-400/85 outline-none focus:ring-4 focus:ring-[#336886]/10 focus:border-[#336886]/45 focus:bg-white transition-all duration-300 shadow-sm";

  const normalizedUserRole = String(userRole || "").trim().toLowerCase();
  const isProfessionalUser = [
    "admin",
    "operator",
    "lojista",
    "store_owner",
    "super_admin",
    "motoboy",
    "entregador",
  ].includes(normalizedUserRole);
  const isEndCustomerLogged = Boolean(isCustomerLogged && !isProfessionalUser);
  const showCustomerFulfillmentInsights = isEndCustomerLogged;
  const visibleOrderTypes = (Array.isArray(allowedOrderTypes) && allowedOrderTypes.length
    ? allowedOrderTypes
    : [ "delivery", "pickup", "table" ]
  ).filter((t) => !(isEndCustomerLogged && t === "table"));
  const isPickup = customer.type === "pickup";
  const isDelivery = customer.type === "delivery";
  const isPostalDelivery = isDelivery && String(deliveryMode || "").toLowerCase() === "postal";
  const customerOrderNoteCopy = useMemo(() => {
    if (isPostalDelivery) {
      return {
        helper: "Use para complementar o envio do pacote, sem pedir itens extras.",
        preview: "Ex: complemento do endereço, referência para entrega ou cuidado com o pacote.",
        placeholder: "Ex: casa dos fundos, deixar na portaria, pacote frágil.",
        suggestions: ["Pacote frágil", "Deixar na portaria", "Complemento do endereço", "Não dobrar embalagem"],
      };
    }
    if (customer.type === "delivery") {
      return {
        helper: "Use para orientar a entrega ou uma preferência simples do pedido.",
        preview: "Ex: referência do endereço, deixar na portaria ou preferência de preparo.",
        placeholder: "Ex: deixar na portaria, não tocar campainha, sem cebola.",
        suggestions: ["Deixar na portaria", "Não tocar campainha", "Sem cebola", "Avisar ao chegar"],
      };
    }
    if (customer.type === "pickup") {
      return {
        helper: "Use para combinar retirada ou uma preferência simples de preparo.",
        preview: "Ex: retirar no balcão, embalar separado ou ponto do preparo.",
        placeholder: "Ex: retirar no balcão, embalar separado, ponto bem passado.",
        suggestions: ["Retirar no balcão", "Embalar separado", "Sem talheres", "Ponto bem passado"],
      };
    }
    if (customer.type === "table") {
      return {
        helper: "Use para uma preferência simples da mesa.",
        preview: "Ex: ponto da carne, sem cebola, talher extra ou bebida sem gelo.",
        placeholder: "Ex: ponto da carne, sem cebola, bebida sem gelo.",
        suggestions: ["Ponto da carne", "Sem cebola", "Bebida sem gelo", "Talher extra"],
      };
    }
    return {
      helper: "Use para preferências simples do pedido.",
      preview: "Ex: preferência de preparo, embalagem ou atendimento.",
      placeholder: "Ex: preferência de preparo, embalagem ou atendimento.",
      suggestions: DEFAULT_CUSTOMER_ORDER_NOTE_SUGGESTIONS,
    };
  }, [customer.type, isPostalDelivery]);
  const isOptionalPhoneMode = (customer.type === "table" || customer.type === "pickup") && !guestPhoneRequired;
  const isOnlinePix = paymentMethod === "pix";
  const isManualPix = paymentMethod === "pix_loja";
  const isPix = isOnlinePix || isManualPix;
  const isCredit = paymentMethod === "credito";
  const isDebit = paymentMethod === "debito";
  const isCash = paymentMethod === "dinheiro";
  const isOnlinePaymentMethod = isOnlinePix || isCredit || isDebit;
  const deliveryFeeValue = isDelivery ? normalizeNumber(deliveryFee) || 0 : 0;
  const radiusValue = normalizeNumber(deliveryRadiusKm);
  const pickupDistanceValue = normalizeNumber(pickupDistanceKm);
  const pickupWarningThreshold = normalizeNumber(pickupDistanceWarningKm) || 15;
  const pickupConfirmationThreshold = Math.max(
    pickupWarningThreshold,
    normalizeNumber(pickupDistanceConfirmationKm) || 40
  );
  const totalWithFee = total + deliveryFeeValue;
  const cashTenderedValue = isCash ? normalizeNumber(cashTenderedInput) : null;
  const cashChangeDue =
    isCash && cashTenderedValue !== null ? Number(cashTenderedValue) - Number(totalWithFee || 0) : null;
  const showSuggestedProducts = Boolean(isEndCustomerLogged && suggestedProducts.length > 0);
  const hasPickupDistanceWarning = isPickup && !isProfessionalUser && pickupDistanceValue !== null && pickupDistanceValue >= pickupWarningThreshold;
  const requiresFarPickupConfirmation =
    isPickup &&
    !isProfessionalUser &&
    pickupDistanceValue !== null &&
    pickupDistanceValue >= pickupConfirmationThreshold;
  const pickupDistanceContextKey = useMemo(
    () =>
      [
        storeSlug,
        String(customer?.type || ""),
        String(paymentMethod || ""),
        pickupDistanceValue !== null ? pickupDistanceValue.toFixed(1) : "none",
        String(customer?.street || ""),
        String(customer?.number || ""),
        String(customer?.city || ""),
        String(customer?.state || ""),
      ].join("|"),
    [
      customer?.city,
      customer?.number,
      customer?.state,
      customer?.street,
      customer?.type,
      paymentMethod,
      pickupDistanceValue,
      storeSlug,
    ]
  );
  const fallbackPaymentMethods = useMemo(
    () => [
      { id: "pix", label: "Pix", description: "Via Mercado Pago", group: "online" },
      { id: "debito", label: "Débito", description: "Via Mercado Pago", group: "online" },
      { id: "credito", label: "Crédito", description: "Via Mercado Pago", group: "online" },
      { id: "dinheiro", label: "Dinheiro", description: "Pague na entrega, retirada ou mesa.", group: "local" },
    ],
    []
  );
  const resolvedPaymentMethods = useMemo(() => {
    if (isProfessionalUser && !isPostalDelivery) return PROFESSIONAL_PAYMENT_METHODS;
    const methods = paymentSummary?.methods || null;
    const next = [];
    if (!methods) {
      return isPostalDelivery
        ? fallbackPaymentMethods.filter((method) => isPostalPrepaidPaymentMethod(method.id))
        : fallbackPaymentMethods;
    }
    if (methods.pixOnline) {
      next.push({ id: "pix", label: "Pix", description: "Via Mercado Pago", group: "online" });
    }
    if (methods.creditOnline) {
      next.push({ id: "credito", label: "Crédito", description: "Via Mercado Pago", group: "online" });
    }
    if (methods.debitOnline) {
      next.push({ id: "debito", label: "Débito", description: "Via Mercado Pago", group: "online" });
    }
    if (methods.manualPix) {
      next.push({ id: "pix_loja", label: "Pix da loja", description: "A chave aparece após confirmar o pedido.", group: "local" });
    }
    if (methods.cash !== false) {
      next.push({ id: "dinheiro", label: "Dinheiro", description: "Pague na entrega, retirada ou mesa.", group: "local" });
    }
    const resolved = next.length ? next : [ { id: "dinheiro", label: "Dinheiro", description: "Pague na entrega, retirada ou mesa.", group: "local" } ];
    return isPostalDelivery
      ? resolved.filter((method) => isPostalPrepaidPaymentMethod(method.id))
      : resolved;
  }, [fallbackPaymentMethods, isPostalDelivery, isProfessionalUser, paymentSummary]);
  const paymentGroups = useMemo(() => {
    return resolvedPaymentMethods.reduce(
      (acc, method) => {
        const group = method.group === "online" ? "online" : "local";
        acc[group].push(method);
        return acc;
      },
      { online: [], local: [] } as Record<string, any[]>
    );
  }, [resolvedPaymentMethods]);
  const selectedPaymentMethod = useMemo(
    () => resolvedPaymentMethods.find((method) => method.id === paymentMethod) || resolvedPaymentMethods[0] || null,
    [paymentMethod, resolvedPaymentMethods]
  );
  const activePaymentId = paymentMethod || selectedPaymentMethod?.id || "dinheiro";
  const activePaymentMeta = getPaymentMethodMeta(activePaymentId);
  const activePaymentLabel =
    selectedPaymentMethod?.id === activePaymentId ? selectedPaymentMethod.label : activePaymentMeta.label;
  const activePaymentTone = isOnlinePaymentMethod ? "online" : "local";
  const openPaymentSheet = () => setShowPaymentSheet(true);

  useEffect(() => {
    if (!isPostalDelivery || !resolvedPaymentMethods.length) return;
    if (resolvedPaymentMethods.some((method) => method.id === paymentMethod)) return;
    onChangePayment?.(resolvedPaymentMethods[0].id);
  }, [isPostalDelivery, onChangePayment, paymentMethod, resolvedPaymentMethods]);

  const postalPaymentValidation = useMemo(() => {
    if (!isPostalDelivery) return { blocked: false, reason: "" };
    if (!resolvedPaymentMethods.length) {
      return {
        blocked: true,
        reason: "Envio postal exige pagamento online. Ative Pix ou cartão online nesta loja.",
      };
    }
    if (!isPostalPrepaidPaymentMethod(paymentMethod)) {
      return {
        blocked: true,
        reason: "Escolha Pix ou cartão online para finalizar o envio postal.",
      };
    }
    return { blocked: false, reason: "" };
  }, [isPostalDelivery, paymentMethod, resolvedPaymentMethods.length]);

  const cashValidation = useMemo(() => {
    if (!isCash) return { blocked: false, reason: "" };
    if (!cashNeedsChange) return { blocked: false, reason: "" };
    if (cashTenderedValue === null) return { blocked: true, reason: "Informe com quanto vai pagar para calcular o troco." };
    if (cashTenderedValue < totalWithFee) {
      return { blocked: true, reason: "O valor para troco precisa ser maior ou igual ao total do pedido." };
    }
    return { blocked: false, reason: "" };
  }, [isCash, cashNeedsChange, cashTenderedValue, totalWithFee]);
  const paymentValidation = postalPaymentValidation.blocked ? postalPaymentValidation : cashValidation;
  const formatDistanceKm = (value) => {
    const normalized = normalizeNumber(value);
    if (normalized === null) return "-- km";
    return `${Math.max(0.1, normalized).toFixed(1).replace(".", ",")} km`;
  };

  const actionLabel = useMemo(() => {
    if (isPickup && isOnlinePix) return "Gerar Pix e enviar pedido";
    if (isPickup) return "Enviar pedido para retirada";
    if (isDelivery && isOnlinePix) return "Finalizar pedido (Pix)";
    if (isDelivery) return "Finalizar pedido para entrega";
    if (isCredit) return "Finalizar pedido (Crédito)";
    if (isDebit) return "Finalizar pedido (Débito)";
    if (isCash) return "Finalizar pedido (Dinheiro)";
    if (isOnlinePix) return "Finalizar pedido (Pix)";
    if (isManualPix) return "Finalizar pedido com Pix da loja";
    return "Finalizar pedido na mesa";
  }, [isDelivery, isPickup, isOnlinePix, isManualPix, isCredit, isDebit, isCash]);
  const postalServices = useMemo(
    () => (Array.isArray(postalQuote?.quote?.services) ? postalQuote.quote.services : []),
    [postalQuote]
  );
  const postalQuoteCartSignature = useMemo(
    () =>
      Object.values(cart)
        .filter((item: any) => Number(item?.qty || 0) > 0)
        .map((item: any) => `${String(item?.id || item?.productId || "")}:${Number(item?.qty || 1)}`)
        .join("|"),
    [cart]
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
    isPostalDelivery && postalPaymentValidation.blocked
      ? "Pagamento online necessário"
      : isPostalDelivery && !selectedPostalService
      ? "Calcular frete postal"
      : isDelivery && !isDeliveryAddressValidated
      ? "Validar Endereço"
      : actionLabel;
  const isDeliveryValidationMode = isDelivery && !isPostalDelivery && !isDeliveryAddressValidated;
  const isPostalQuoteMode = isPostalDelivery && !selectedPostalService;
  const primaryCtaDisabled = isDeliveryValidationMode
    ? (cepLoading || checkoutLoading)
    : isPostalQuoteMode
    ? (checkoutLoading || postalQuoteLoading)
    : (checkoutLoading || checkoutDisabled || paymentValidation.blocked);
  const checkoutLoadingLabel = checkoutSlow ? "Internet lenta... confirmando" : "Processando...";

  const [selectedDdd, setSelectedDdd] = useState(() => extractPhoneParts(customer.phone || "").ddd);
  const [localPhoneDigits, setLocalPhoneDigits] = useState(() => extractPhoneParts(customer.phone || "").localNumber);

  useEffect(() => {
    if (isOptionalPhoneMode) {
      setShowOptionalPhoneFields(false);
      return;
    }
    setShowOptionalPhoneFields(true);
  }, [isOptionalPhoneMode]);

  useEffect(() => {
    const previousCount = previousCartItemsCountRef.current;
    if (previousCount > 0 && cartItems.length === 0) {
      setShowEmptyCartSheet(true);
    }
    previousCartItemsCountRef.current = cartItems.length;
  }, [cartItems.length]);

  useEffect(() => {
    const parsed = extractPhoneParts(customer.phone || "");
    if (parsed.ddd !== selectedDdd) {
      setSelectedDdd(parsed.ddd);
    }
    if (parsed.localNumber !== localPhoneDigits) {
      setLocalPhoneDigits(parsed.localNumber);
    }
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

  const normalizeText = (value = "") =>
    value
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const normalizedQuery = normalizeText(customer.name);
  const filteredCustomers =
    allowCustomerAutocomplete && normalizedQuery.length >= 2
      ? customers.filter((entry) => {
          const haystack = `${entry.name || ""} ${entry.phone || ""}`;
          return normalizeText(haystack).includes(normalizedQuery);
        })
      : [];

  const handleNameChange = (value) => {
    const normalizedValue = isProfessionalUser
      ? String(value || "").toLocaleUpperCase("pt-BR")
      : value;
    const next = { ...customer, name: normalizedValue };
    if (allowCustomerAutocomplete) {
      const normalized = normalizeText(normalizedValue);
      if (normalized.length >= 2) {
        const match = customers.find(
          (entry) => normalizeText(entry.name) === normalized
        );
        if (match?.phone) {
          const parts = extractPhoneParts(match.phone || "");
          const safeDdd = BRAZIL_DDDS.includes(parts.ddd) ? parts.ddd : "";
          const safeLocal = String(parts.localNumber || "").replace(/\D/g, "").slice(0, 9);
          setSelectedDdd(safeDdd);
          setLocalPhoneDigits(safeLocal);
          next.phone = buildPhoneFromParts(safeDdd, safeLocal);
        }
      }
    }
    onChangeCustomer(next);
    if (allowCustomerAutocomplete) {
      setSuggestionsOpen(true);
    }
  };

  const handleSelectCustomer = (entry) => {
    const parts = extractPhoneParts(entry.phone || "");
    const safeDdd = BRAZIL_DDDS.includes(parts.ddd) ? parts.ddd : "";
    const safeLocal = String(parts.localNumber || "").replace(/\D/g, "").slice(0, 9);
    const nextName = isProfessionalUser
      ? String(entry.name || "").toLocaleUpperCase("pt-BR")
      : entry.name;
    setSelectedDdd(safeDdd);
    setLocalPhoneDigits(safeLocal);
    onChangeCustomer({
      ...customer,
      name: nextName,
      phone: buildPhoneFromParts(safeDdd, safeLocal),
    });
    setSuggestionsOpen(false);
  };

  const tableOptions = Array.from({ length: 12 }, (_, index) => `${index + 1}`);

  const handleSelectTable = (tableNumber: string) => {
    const normalized = String(tableNumber || "").trim();
    if (!normalized) return;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onChangeCustomer({ ...customer, table: normalized });
  };

  const handleTableInputChange = (value: string) => {
    const normalized = String(value || "").replace(/\D/g, "").trim();
    onChangeCustomer({ ...customer, table: normalized });
  };
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar farinha');
    const modifiers = formatSelectedModifiers(item?.selectedModifiers || []);
    if (modifiers.length) labels.push(`+ ${modifiers.join(', ')}`);
    return labels.length ? labels.join(' • ') : '';
  };

  const resolveCartItemImage = (item) => resolveAssetUrl(item?.imageUrl || "");
  const totalCartUnits = cartItems.reduce((acc, item) => acc + Number(item?.qty || 0), 0);
  const cartPreviewItems = useMemo(() => cartItems.slice(0, 3), [cartItems]);
  const extraCartPreviewCount = Math.max(0, cartItems.length - cartPreviewItems.length);
  const orderTypeVisuals: Record<string, { label: string; helper: string; icon: React.ReactNode }> = {
    delivery: {
      label: "Entrega",
      helper: "No endereço",
      icon: <Bicycle size={16} weight="duotone" />,
    },
    pickup: {
      label: "Retirada",
      helper: "No balcão",
      icon: <House size={16} weight="duotone" />,
    },
    table: {
      label: "Mesa",
      helper: "No salão",
      icon: <ForkKnife size={16} weight="duotone" />,
    },
  };

  const buildDeliveryAddress = (data) => {
    const street = String(data.street || "").trim();
    const number = String(data.number || "").trim();
    const streetWithNumber = street ? (number ? `${street}, ${number}` : street) : "";
    const parts = [
      streetWithNumber,
      data.complement,
      data.neighborhood,
      data.city && data.state ? `${data.city} - ${data.state}` : data.city,
      data.cep && `CEP ${data.cep}`,
    ].filter(Boolean);
    return parts.join(" | ");
  };

  const deliverySummaryTitle = isPostalDelivery
    ? "Envio para o endereço selecionado"
    : "Entrega no endereço selecionado";
  const deliverySummaryDescription = isPostalDelivery
    ? "Confirme o destino e escolha o serviço postal com melhor prazo e valor."
    : "Confira endereço, distância e taxa antes de confirmar seu pedido.";
  const deliveryMetaChips = [
    {
      key: "fee",
      icon: <Truck size={12} weight="duotone" className="text-[#336886]" />,
      label: deliveryFeeValue > 0 ? formatCurrency(deliveryFeeValue) : isPostalDelivery ? "A cotar" : "Sem taxa",
    },
    !isPostalDelivery && deliveryCheck?.distanceKm
      ? {
          key: "distance",
          icon: <MapPinLine size={12} weight="duotone" className="text-emerald-600" />,
          label: `${deliveryCheck.distanceKm.toFixed(1)} km`,
        }
      : null,
    !isPostalDelivery && deliveryCheck?.durationMin
      ? {
          key: "duration",
          icon: <Clock size={12} weight="duotone" className="text-amber-600" />,
          label: `${deliveryCheck.durationMin} min`,
        }
      : null,
    isPostalDelivery && postalOriginZip
      ? {
          key: "origin",
          icon: <MapPinLine size={12} weight="duotone" className="text-slate-500" />,
          label: `Origem ${postalOriginZip}`,
        }
      : null,
  ].filter(Boolean);
  const updateDeliveryField = (field, value) => {
    const next = { ...customer, [field]: value };
    next.address = buildDeliveryAddress(next);
    onChangeCustomer(next);
    if (field === "cep") {
      setCepError("");
    }
  };

  const handleCepLookup = async () => {
    if (cepLookupLockRef.current || cepLoading) return;
    const rawCep = (customer.cep || "").replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    cepLookupLockRef.current = true;
    setCepLoading(true);
    setCepError("");
    try {
      const data = await addressLookupService.lookupZipCode(rawCep);
      const next = {
        ...customer,
        street: data.street || "",
        neighborhood: data.district || "",
        city: data.city || "",
        state: data.state || "",
        lat: data.latitude ?? customer.lat ?? null,
        lng: data.longitude ?? customer.lng ?? null,
      };
      next.address = buildDeliveryAddress(next);
      onChangeCustomer(next);
    } catch (error: any) {
      setCepError(error?.message || "Não foi possível consultar o CEP agora.");
    } finally {
      cepLookupLockRef.current = false;
      setCepLoading(false);
    }
  };


  const normalizedStoreAddress = (storeAddress || "").toString().trim();
  const normalizedCustomerAddress = (customer.address || buildDeliveryAddress(customer) || "").toString().trim();
  const customerAddressLines = useMemo(
    () => formatAddressLines(normalizedCustomerAddress),
    [normalizedCustomerAddress]
  );
  const normalizeAddressForCompare = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const sameAddressAsStore =
    Boolean(normalizedStoreAddress && normalizedCustomerAddress) &&
    normalizeAddressForCompare(normalizedStoreAddress) === normalizeAddressForCompare(normalizedCustomerAddress);
  const deliveryStatus = useMemo(() => {
    if (!isDelivery) return null;
    if (isPostalDelivery) {
      if (!String(customer.cep || "").replace(/\D/g, "")) {
        return {
          tone: "bg-slate-50 text-slate-600 border-slate-200",
          label: "Informe o CEP para cotar o envio postal.",
        };
      }
      if (postalQuoteLoading) {
        return {
          tone: "bg-slate-50 text-slate-600 border-slate-200",
          label: "Calculando opções de PAC/SEDEX...",
        };
      }
      if (!postalServices.length) {
        return {
          tone: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Sem cotação postal ainda. Toque em Calcular frete postal.",
        };
      }
      return {
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: `Frete postal selecionado: ${selectedPostalService?.serviceName || selectedPostalService?.serviceCode || "serviço"}.`,
      };
    }
    if (!normalizedStoreAddress) {
      return {
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Endereço da loja indisponível para validar a entrega.",
      };
    }
    if (!radiusValue) {
      return {
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Entrega liberada (sem limite de raio).",
      };
    }
    if (deliveryCheck?.status === "loading") {
      return {
        tone: "bg-slate-50 text-slate-600 border-slate-200",
        label: "Calculando a distância do endereço...",
      };
    }
    if (deliveryCheck?.status === "out") {
      const distanceLabel = deliveryCheck?.distanceKm
        ? `${deliveryCheck.distanceKm.toFixed(1)} km`
        : "fora do limite";
      return {
        tone: "bg-rose-50 text-rose-700 border-rose-200",
        label: `Ops! A loja entrega até ${radiusValue} km. Seu endereço está a ${distanceLabel}.`,
      };
    }
    if (deliveryCheck?.status === "error") {
      if (sameAddressAsStore) {
        return {
          tone: "bg-sky-50 text-sky-700 border-sky-200",
          label: "O endereço informado é o mesmo da loja. Se preferir, selecione Retirada.",
        };
      }
      return {
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Não foi possível validar o endereço de entrega.",
      };
    }
    if (deliveryCheck?.status === "ok") {
      const distanceLabel = deliveryCheck?.distanceKm
        ? `${deliveryCheck.distanceKm.toFixed(1)} km`
        : "dentro do raio";
      return {
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: `Dentro do raio (${distanceLabel} / ${radiusValue} km).`,
      };
    }
    const hasAddressParts = Boolean(customer.street || customer.city || customer.state || customer.cep);
    if (hasAddressParts && normalizedStoreAddress && !storeCoords) {
      return {
        tone: "bg-slate-50 text-slate-600 border-slate-200",
        label: "Calculando a localização da loja para validar a entrega...",
      };
    }
    return {
      tone: "bg-slate-50 text-slate-600 border-slate-200",
      label: "Preencha o endereço para validar a entrega.",
    };
  }, [customer, deliveryCheck?.distanceKm, deliveryCheck?.status, isDelivery, normalizedStoreAddress, radiusValue, sameAddressAsStore, storeCoords, isPostalDelivery, postalQuoteLoading, postalServices, selectedPostalService]);

  const deliveryDebug = useMemo(() => {
    if (!isDelivery) return null;
    const hasAddressParts = Boolean(customer.street || customer.city || customer.state || customer.cep);
    const distanceLabel = deliveryCheck?.status === "idle" && normalizedStoreAddress
      ? "aguardando coordenadas"
      : deliveryCheck?.status || "idle";
    return [
      {
        label: "Loja",
        value: normalizedStoreAddress ? "OK" : "Sem endereço",
      },
      {
        label: "Cliente",
        value: hasAddressParts ? "OK" : "Incompleto",
      },
      {
        label: "Distância",
        value: distanceLabel,
      },
    ];
  }, [
    customer.city,
    customer.cep,
    customer.state,
    customer.street,
    deliveryCheck?.status,
    isDelivery,
    normalizedStoreAddress,
  ]);
  const savedDeliveryAddresses = useMemo(
    () => (Array.isArray(savedAddresses) ? savedAddresses.slice(0, 3) : []),
    [savedAddresses]
  );
  const isLoggedDeliveryFlow = Boolean(isEndCustomerLogged && isDelivery);
  const isLoggedPickupFlow = Boolean(isEndCustomerLogged && isPickup);
  const isLoggedAssistedFlow = isLoggedDeliveryFlow || isLoggedPickupFlow;
  const hasSavedAddress = savedDeliveryAddresses.length > 0;
  const activeSavedAddress = useMemo(
    () =>
      (Array.isArray(savedAddresses) ? savedAddresses : []).find((address: any) => {
        return (
          String(address?.cep || '').replace(/\D/g, '') === String(customer?.cep || '').replace(/\D/g, '') &&
          String(address?.street || '').trim().toLowerCase() === String(customer?.street || '').trim().toLowerCase() &&
          String(address?.number || '').trim() === String(customer?.number || '').trim()
        );
      }) ||
      savedDeliveryAddresses.find((address: any) => Boolean(address?.isDefault)) ||
      savedDeliveryAddresses[0] ||
      null,
    [customer?.cep, customer?.number, customer?.street, savedAddresses, savedDeliveryAddresses]
  );
  const loggedDeliveryName = String(customer?.name || '').trim();
  const loggedDeliveryPhone = String(customer?.phone || '').trim();
  const hasLoggedContactInfo = Boolean(loggedDeliveryName || loggedDeliveryPhone);
  const canUseLockedContactSummary = Boolean(isLoggedAssistedFlow && hasLoggedContactInfo);
  const useMultiStepFlow = isEndCustomerLogged;
  const compactSummaryShouldStick = !useMultiStepFlow || checkoutStep === 2;

  useEffect(() => {
    if (!useMultiStepFlow || !checkoutResume?.token) return;
    const requestedStep = Number(checkoutResume?.step || 4);
    const nextStep = Math.max(1, Math.min(4, requestedStep));
    setCheckoutStep(nextStep);
    setHasTriedCheckout(false);
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
    onCheckoutResumeConsumed?.();
  }, [checkoutResume?.token, checkoutResume?.step, onCheckoutResumeConsumed, useMultiStepFlow]);

  const loggedDeliveryAddressSummary = useMemo(() => {
    if (!activeSavedAddress) return normalizedCustomerAddress;
    const street = [activeSavedAddress?.street, activeSavedAddress?.number].filter(Boolean).join(', ');
    return [
      street,
      activeSavedAddress?.complement,
      activeSavedAddress?.neighborhood,
      activeSavedAddress?.city && activeSavedAddress?.state
        ? `${activeSavedAddress.city} - ${activeSavedAddress.state}`
        : activeSavedAddress?.city,
      activeSavedAddress?.cep && `CEP ${activeSavedAddress.cep}`,
    ].filter(Boolean).join(' | ');
  }, [activeSavedAddress, normalizedCustomerAddress]);

  const showRouteMap = !isPostalDelivery && Boolean(storeCoords?.lat && deliveryCoords?.lat);
  const showDeliveryStatus = isPostalDelivery
    ? Boolean(deliveryStatus)
    : deliveryStatus && deliveryCheck?.status !== "ok" && (postalEnabled || deliveryCheck?.status !== "out");
  const showDeliveryDebug = false; // Hidden from end users; validation feedback shown via status banner
  const hideOutOfRangeInlineReason = !postalEnabled && !isPostalDelivery && isDelivery && deliveryCheck?.status === "out";

  useEffect(() => {
    if (!postalEnabled && !isPostalDelivery && isDelivery && deliveryCheck?.status === "out") {
      setShowOutOfRangeSheet(true);
      return;
    }
    if (!isDelivery || isPostalDelivery || postalEnabled) {
      setShowOutOfRangeSheet(false);
    }
  }, [isDelivery, deliveryCheck?.status, isPostalDelivery, postalEnabled]);

  useEffect(() => {
    if (!postalEnabled || !isPostalDelivery || postalQuoteLoading || postalServices.length > 0) return;
    const destinationZip = String(customer.cep || "").replace(/\D/g, "");
    if (destinationZip.length !== 8 || !postalQuoteCartSignature) return;
    const quoteKey = `${storeSlug || "store"}:${destinationZip}:${postalQuoteCartSignature}`;
    if (postalAutoQuoteKeyRef.current === quoteKey) return;
    postalAutoQuoteKeyRef.current = quoteKey;
    const timer = window.setTimeout(() => {
      void onCalculatePostalQuote?.({ silent: true });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [
    customer.cep,
    isPostalDelivery,
    onCalculatePostalQuote,
    postalEnabled,
    postalQuoteCartSignature,
    postalQuoteLoading,
    postalServices.length,
    storeSlug,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      setSummaryCompact(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!requiresFarPickupConfirmation) {
      setConfirmedFarPickupContext("");
      setShowFarPickupSheet(false);
      return;
    }
    if (confirmedFarPickupContext && confirmedFarPickupContext !== pickupDistanceContextKey) {
      setConfirmedFarPickupContext("");
    }
  }, [confirmedFarPickupContext, pickupDistanceContextKey, requiresFarPickupConfirmation]);

  const proceedCheckout = async () => {
    await Promise.resolve(
      onCheckout({
        cashTendered:
          isCash && cashNeedsChange && cashTenderedValue !== null ? Number(cashTenderedValue) : null,
      })
    );
  };

  const handleCheckoutAttempt = async () => {
    setHasTriedCheckout(true);
    if (requiresFarPickupConfirmation && confirmedFarPickupContext !== pickupDistanceContextKey) {
      setShowFarPickupSheet(true);
      return;
    }
    await proceedCheckout();
  };

  const customerOrderNoteValue = limitCustomerOrderNoteInput(customer.customerNote || "");
  const handleCustomerOrderNoteChange = (value: string) => {
    onChangeCustomer({ ...customer, customerNote: limitCustomerOrderNoteInput(value) });
  };
  const openCustomerNoteSheet = () => {
    setCustomerNoteDraft(customerOrderNoteValue);
    setShowCustomerNoteSheet(true);
  };
  const applyCustomerNoteSuggestion = (suggestion: string) => {
    setCustomerNoteDraft((current) => {
      const next = current.trim() ? `${current.trim()}; ${suggestion}` : suggestion;
      return limitCustomerOrderNoteInput(next);
    });
  };
  const saveCustomerNoteDraft = () => {
    handleCustomerOrderNoteChange(customerNoteDraft);
    setShowCustomerNoteSheet(false);
  };
  const renderCustomerOrderNoteCard = () => {
    const note = customerOrderNoteValue.trim();

    return (
      <button
        type="button"
        onClick={openCustomerNoteSheet}
        className={`group w-full rounded-[1.55rem] border p-3 text-left transition-all duration-300 active:scale-[0.99] ${
          note
            ? "border-[#336886]/14 bg-[linear-gradient(135deg,#ffffff_0%,#f3fafc_100%)] shadow-[0_18px_38px_-34px_rgba(51,104,134,0.34)]"
            : "border-slate-100 bg-white shadow-[0_18px_38px_-34px_rgba(15,23,42,0.25)] hover:border-[#336886]/16"
        }`}
        data-testid="customer-order-note-card"
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] ring-1 ${
            note ? "bg-[#336886]/10 text-[#336886] ring-[#336886]/12" : "bg-slate-50 text-slate-500 ring-slate-200/70"
          }`}>
            <NotePencil size={18} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black tracking-tight text-slate-950">
                {note ? "Observação adicionada" : "Alguma observação?"}
              </p>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                note ? "bg-white text-[#336886] ring-1 ring-[#cfe0ea]" : "bg-[#336886]/8 text-[#336886] ring-1 ring-[#336886]/10"
              }`}>
                {note ? "Editar" : "+ Adicionar"}
              </span>
            </div>
            <p className={`mt-1 line-clamp-2 text-[12.5px] font-semibold leading-snug ${note ? "text-slate-800" : "text-slate-500"}`}>
              {note || customerOrderNoteCopy.preview}
            </p>
          </div>
          <ArrowLeft size={16} weight="bold" className="shrink-0 rotate-180 text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    );
  };
  const renderCustomerOrderNoteSummaryCard = () => {
    const note = customerOrderNoteValue.trim();

    return (
      <div
        className={`rounded-[1.35rem] border p-3.5 shadow-sm ${
          note
            ? "border-[#336886]/10 bg-[linear-gradient(135deg,#ffffff_0%,#f3fafc_100%)]"
            : "border-slate-100 bg-white"
        }`}
        data-testid="customer-order-note-summary"
      >
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              note ? "bg-[#336886]/8 text-[#336886]" : "bg-slate-100 text-slate-500"
            }`}
          >
            <NotePencil size={18} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black tracking-tight text-slate-950">
                Observação do pedido
              </p>
              <button
                type="button"
                onClick={openCustomerNoteSheet}
                className="jnc-hub-touch shrink-0 rounded-full bg-[#336886]/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] ring-1 ring-[#336886]/10"
              >
                {note ? "Editar" : "+ Adicionar"}
              </button>
            </div>
            {note ? (
              <p className="mt-2 rounded-[1rem] border border-white/70 bg-white/78 px-3 py-2 text-sm font-semibold leading-relaxed text-slate-800 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.25)]">
                {note}
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                Sem observação. Toque para adicionar uma orientação simples ao pedido.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSelectedPaymentSummaryCard = () => {
    if (isPostalDelivery && !resolvedPaymentMethods.length) {
      return (
        <div
          className="relative overflow-hidden rounded-[1.55rem] border border-amber-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff8eb_100%)] p-3.5 shadow-[0_20px_46px_-38px_rgba(245,158,11,0.45)]"
          data-testid="checkout-payment-summary-card"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[1.15rem] border border-amber-200 bg-white text-amber-700 shadow-[0_18px_34px_-26px_rgba(245,158,11,0.38)]">
              <ShieldCheck size={23} weight="duotone" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black tracking-tight text-slate-950 sm:text-base">
                  Pagamento online necessário
                </p>
                <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                  Envio postal
                </span>
              </div>
              <p className="mt-1 text-[11.5px] font-semibold leading-snug text-slate-600">
                Para Correios, ative Pix ou cartão online nesta loja antes de finalizar.
              </p>
            </div>
          </div>
        </div>
      );
    }
    const currentPaymentId = paymentMethod || selectedPaymentMethod?.id || "dinheiro";
    const methodMeta = getPaymentMethodMeta(currentPaymentId);
    const methodLabel = selectedPaymentMethod?.id === currentPaymentId ? selectedPaymentMethod.label : methodMeta.label;
    const methodDescription =
      selectedPaymentMethod?.id === currentPaymentId
        ? selectedPaymentMethod.description
        : isOnlinePaymentMethod
        ? "Via Mercado Pago"
        : isManualPix
        ? "A chave aparece após confirmar o pedido."
        : customer.type === "pickup"
        ? "Você paga ao retirar o pedido."
        : customer.type === "table"
        ? "Você paga no atendimento da mesa."
        : "Você paga quando receber o pedido.";
    const badgeLabel = isOnlinePaymentMethod ? "Seguro" : isManualPix ? "Pix da loja" : customer.type === "pickup" ? "Pague na retirada" : customer.type === "table" ? "Pague na mesa" : "Pague na entrega";
    const badgeClass = isOnlinePaymentMethod
      ? "border-[#336886]/12 bg-[#eef7fb] text-[#336886]"
      : isManualPix
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

    return (
      <div
        className="relative overflow-hidden rounded-[1.55rem] border border-white/80 bg-white p-3.5 shadow-[0_20px_46px_-38px_rgba(15,23,42,0.35)]"
        data-testid="checkout-payment-summary-card"
      >
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#336886]/18 to-transparent" />
        <div className="flex items-start gap-3">
          {renderPaymentMethodIcon(currentPaymentId, { size: "md", selected: true, tone: isOnlinePaymentMethod ? "online" : "local" })}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black tracking-tight text-slate-950 sm:text-base">{methodLabel}</p>
              <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-semibold leading-snug text-slate-500">
              {isCash && cashNeedsChange && cashTenderedValue !== null && cashTenderedValue >= totalWithFee
                ? `Troco para ${formatCurrency(cashTenderedValue)}`
                : methodDescription}
            </p>
            <p className="mt-2 text-[10.5px] font-bold leading-snug text-slate-400">
              Quer usar Pix, cartão ou dinheiro? Toque em alterar forma.
            </p>
          </div>
          <button
            type="button"
            onClick={openPaymentSheet}
            className="jnc-hub-touch inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#153A4C,#336886)] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_-22px_rgba(51,104,134,0.58)] transition hover:brightness-105 active:scale-[0.98]"
          >
            <CreditCard size={13} weight="duotone" />
            <span>Alterar</span>
            <span className="hidden min-[390px]:inline">forma</span>
          </button>
        </div>
      </div>
    );
  };

  const renderCashChangePanel = () => (
    <div className="rounded-[1.45rem] border border-amber-100 bg-[linear-gradient(135deg,#ffffff_0%,#fff8eb_100%)] p-3.5 shadow-[0_18px_38px_-34px_rgba(245,158,11,0.38)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">Troco</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-500">
            Informe só se for pagar com uma nota maior.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCashNeedsChange((prev) => !prev)}
          className={`jnc-hub-touch shrink-0 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${
            cashNeedsChange
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {cashNeedsChange ? "Com troco" : "Sem troco"}
        </button>
      </div>

      {cashNeedsChange && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Vou pagar com</label>
            <input
              value={cashTenderedInput}
              onChange={(event) => setCashTenderedInput(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className={`${premiumInputClass} text-sm`}
            />
          </div>
          <div className="rounded-[1.15rem] border border-slate-100 bg-white px-3 py-2.5 shadow-sm sm:min-w-[145px]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Troco</p>
            <p className="mt-1 text-base font-black text-slate-950 tabular-nums">
              {cashChangeDue !== null && cashChangeDue >= 0 ? formatCurrency(cashChangeDue) : formatCurrency(0)}
            </p>
          </div>
          {cashValidation.blocked && (
            <p className="sm:col-span-2 text-[11px] font-semibold leading-snug text-rose-600">
              {cashValidation.reason}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const getPaymentIconTheme = (methodId = "", tone: "online" | "local" = "local", selected = false) => {
    const normalized = String(methodId || "").toLowerCase().replace(/[\s-]+/g, "_");

    if (normalized.includes("pix")) {
      return {
        surface:
          "border-[#32bcad]/25 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.98),transparent_34%),linear-gradient(135deg,#e8fffb_0%,#ffffff_54%,#dcf8f1_100%)] text-[#087b72] shadow-[0_18px_34px_-24px_rgba(50,188,173,0.62)]",
        fallback: "text-[#087b72]",
      };
    }

    if (normalized.includes("dinheiro") || normalized.includes("cash")) {
      return {
        surface:
          "border-emerald-200/80 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),transparent_36%),linear-gradient(135deg,#ecfdf5_0%,#ffffff_56%,#dcfce7_100%)] text-emerald-700 shadow-[0_18px_34px_-24px_rgba(22,163,74,0.5)]",
        fallback: "text-emerald-700",
      };
    }

    if (normalized.includes("debito") || normalized.includes("debit")) {
      return {
        surface:
          "border-[#5FD35A]/32 bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.98),transparent_35%),linear-gradient(135deg,#eefeea_0%,#ffffff_55%,#e5f7ef_100%)] text-[#207A52] shadow-[0_18px_34px_-24px_rgba(47,155,111,0.48)]",
        fallback: "text-[#207A52]",
      };
    }

    if (normalized.includes("credito") || normalized.includes("credit")) {
      return {
        surface:
          "border-[#336886]/18 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.98),transparent_35%),linear-gradient(135deg,#eef7fb_0%,#ffffff_54%,#e8f1f4_100%)] text-[#153A4C] shadow-[0_18px_34px_-24px_rgba(51,104,134,0.5)]",
        fallback: "text-[#153A4C]",
      };
    }

    return tone === "online"
      ? {
          surface:
            "border-[#336886]/18 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.98),transparent_35%),linear-gradient(135deg,#eef7fb_0%,#ffffff_55%,#e8f1f4_100%)] text-[#153A4C] shadow-[0_18px_34px_-24px_rgba(51,104,134,0.5)]",
          fallback: "text-[#153A4C]",
        }
      : {
          surface:
            "border-slate-200/80 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),transparent_36%),linear-gradient(135deg,#f8fafc_0%,#ffffff_58%,#eef2f7_100%)] text-slate-600 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.28)]",
          fallback: "text-slate-600",
        };
  };

  const renderPaymentMethodIcon = (
    methodId = "",
    options: { size?: "sm" | "md" | "lg"; selected?: boolean; tone?: "online" | "local"; className?: string } = {}
  ) => {
    const { size = "md", selected = false, tone = "local", className = "" } = options;
    const methodMeta = getPaymentMethodMeta(methodId);
    const theme = getPaymentIconTheme(methodId, tone, selected);
    const sizeClass =
      size === "lg"
        ? "h-16 w-16 rounded-[1.35rem]"
        : size === "sm"
        ? "h-11 w-11 rounded-[1rem]"
        : "h-[3.25rem] w-[3.25rem] rounded-[1.15rem]";
    const imageClass = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
    const fallbackSize = size === "lg" ? 28 : size === "sm" ? 19 : 23;

    return (
      <span
        className={`relative flex shrink-0 items-center justify-center overflow-hidden border ${sizeClass} ${theme.surface} ${
          selected ? "ring-2 ring-white/90 ring-offset-2 ring-offset-white" : ""
        } ${className}`}
      >
        <span className="pointer-events-none absolute inset-x-2 top-1 h-4 rounded-full bg-white/55 blur-sm" />
        {methodMeta.icon ? (
          <img
            src={methodMeta.icon}
            alt={methodMeta.label}
            className={`${imageClass} relative z-10 object-contain drop-shadow-[0_10px_12px_rgba(15,23,42,0.12)]`}
            loading="lazy"
          />
        ) : (
          <CreditCard size={fallbackSize} weight="duotone" className={`relative z-10 ${theme.fallback}`} />
        )}
      </span>
    );
  };

  const renderPaymentMethodCard = (method: any, tone: "online" | "local") => {
    const selected = paymentMethod === method.id;
    const accent = tone === "online" ? "#336886" : "#207A52";
    const selectedClasses =
      tone === "online"
        ? "jnc-payment-pressed border-[#336886]/70 text-slate-950 ring-2 ring-[#336886]/10"
        : "jnc-payment-pressed border-emerald-400/80 text-slate-950 ring-2 ring-emerald-200/60";

    return (
      <button
        key={method.id}
        type="button"
        onClick={() => {
          onChangePayment(method.id);
          setShowPaymentSheet(false);
        }}
        className={`jnc-hub-touch group relative overflow-hidden rounded-[1.35rem] border p-3.5 text-left transition-all duration-300 ease-out active:scale-[0.985] ${
          selected
            ? selectedClasses
            : "border-slate-200/80 bg-white/88 text-slate-500 shadow-[0_14px_36px_-34px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:border-[#336886]/22 hover:bg-white hover:shadow-[0_22px_46px_-38px_rgba(51,104,134,0.32)]"
        }`}
        aria-pressed={selected}
      >
        {selected && (
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${accent}, rgba(95,211,90,0.72))` }}
          />
        )}
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="flex items-center gap-3">
          {renderPaymentMethodIcon(method.id, { size: "md", selected, tone })}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-[15px]">
                {method.label}
              </span>
              {selected && (
                <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${
                  tone === "online" ? "bg-[#336886]" : "bg-emerald-600"
                }`}>
                  ✓
                </span>
              )}
              {selected && (
                <span className="hidden shrink-0 rounded-full bg-white/78 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600 ring-1 ring-white/80 min-[390px]:inline-flex">
                  Selecionado
                </span>
              )}
            </div>
            <p className="text-[11px] leading-snug text-slate-500">
              {method.description}
            </p>
            {tone === "online" && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[#336886]/10 bg-[#edf5fa]/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#336886]">
                <ShieldCheck size={10} weight="fill" />
                Protegido
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={`animate-in slide-in-from-right relative overflow-x-hidden no-x-scroll bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.10),transparent_34%),linear-gradient(180deg,#eef5f7_0%,#f8fafc_8.5rem,#f8fafc_100%)] ${checkoutTopPaddingClass} ${isNativePlatform ? "pb-[calc(var(--jnk-native-nav-height,0px)+env(safe-area-inset-bottom)+16rem)]" : "pb-[calc(env(safe-area-inset-bottom)+16rem)]"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[max(env(safe-area-inset-top),0.85rem)] bg-[linear-gradient(180deg,rgba(238,245,247,0.98),rgba(238,245,247,0.74))]" />
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <div className={`sticky ${checkoutStickyTopClass} z-40 mb-4 sm:mb-6`}>
        <div className="rounded-[1.85rem] border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.97)_0%,rgba(244,248,252,0.96)_100%)] px-3 py-3 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          {useMultiStepFlow && (
            <div className="mb-3.5 flex items-center gap-1.5">
              {[{ label: 'Sacola', step: 1 }, { label: 'Entrega', step: 2 }, { label: 'Pagamento', step: 3 }, { label: 'Confirmar', step: 4 }].map(({ label, step }, i) => {
                const isActive = checkoutStep === step;
                const isDone = checkoutStep > step;
                return (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-1.5">
                      <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-black transition-all ${
                        isDone
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.25)] text-white'
                          : isActive
                            ? 'bg-gradient-to-br from-slate-800 to-slate-950 text-white ring-2 ring-slate-950/15 ring-offset-1 shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? '✓' : step}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wide transition-colors ${isActive ? 'text-slate-900 font-extrabold' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                    </div>
                    {i < 3 && (
                      <div className="h-[2px] flex-1 rounded-full overflow-hidden bg-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 ease-out"
                          style={{ width: isDone ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={useMultiStepFlow && checkoutStep > 1 ? () => setCheckoutStep(s => s - 1) : onBack}
              aria-label={useMultiStepFlow && checkoutStep > 1 ? "Voltar à etapa anterior" : "Voltar ao cardápio"}
              title={useMultiStepFlow && checkoutStep > 1 ? "Voltar à etapa anterior" : "Voltar ao cardápio"}
              className="!h-11 !w-11 !rounded-[1.15rem] !px-0 text-[#336886]"
            >
              <ArrowLeft size={18} weight="bold" />
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[1.05rem] border border-white bg-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
                <img
                  src={checkoutStoreLogo}
                  alt={storeLabel || "Loja"}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).src = getStoreAvatarUrl(storeSlug, storeLabel || "Loja");
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Checkout</p>
                <p className="truncate text-sm font-black tracking-tight text-slate-950">
                  {storeLabel || 'Finalizando seu pedido'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo compacto (mobile) */}
      {(!useMultiStepFlow || checkoutStep > 1) && <div className={`sm:hidden mb-4 rounded-2xl border border-slate-100 bg-white px-4 ${summaryCompact ? 'py-2' : 'py-2.5'} flex items-center justify-between ${compactSummaryShouldStick ? `sticky ${summaryStickyTopClass} z-30` : "relative z-10"} transition-all shadow-sm`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center -space-x-2">
            {cartPreviewItems.map((item, index) => {
              const imageUrl = resolveCartItemImage(item);
              return (
                <div
                  key={item.key || item.id || index}
                  className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">🍖</div>
                  )}
                </div>
              );
            })}
            {extraCartPreviewCount > 0 ? (
              <span className="inline-flex h-9 min-w-[2.3rem] items-center justify-center rounded-full border-2 border-white bg-[#153A4C] px-2 text-[10px] font-black text-white shadow-sm">
                +{extraCartPreviewCount}
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Resumo rápido</p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {totalCartUnits} {totalCartUnits === 1 ? "item" : "itens"} na sacola
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">Total</p>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totalWithFee)}</p>
        </div>
      </div>}

      {/* Dados do cliente */}
      {(!useMultiStepFlow || checkoutStep === 2) && <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
              {useMultiStepFlow ? 'Como você quer receber?' : 'Detalhes do Pedido'}
            </h2>
            {!useMultiStepFlow && <p className="text-xs text-slate-500 hidden sm:block">Complete as infos para enviarmos seu pedido.</p>}
          </div>
          <span className="text-[11px] font-extrabold text-brand-primary bg-brand-primary-soft px-3 py-1 rounded-full border border-brand-primary/20">
            {useMultiStepFlow ? 'Etapa 2/4' : 'Etapa 1/2'}
          </span>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Nome */}
          {!canUseLockedContactSummary && !isEndCustomerLogged && (
          <div className="rounded-2xl border border-slate-100 p-3 sm:p-4 bg-white">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Seu Nome
            </label>
              <div className="relative mt-2">
                <input
                  {...inputAssistProps.name}
                  ref={nameInputRef}
                  name="customerName"
                  value={customer.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() =>
                    allowCustomerAutocomplete &&
                    filteredCustomers.length &&
                    setSuggestionsOpen(true)
                  }
                  onBlur={() =>
                    allowCustomerAutocomplete && setTimeout(() => setSuggestionsOpen(false), 150)
                  }
                  placeholder="Nome completo"
                  enterKeyHint="next"
                  className={`w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4 text-base sm:text-lg text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${isProfessionalUser ? 'uppercase' : ''}`}
                />
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {allowCustomerAutocomplete && suggestionsOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                    {filteredCustomers.slice(0, 6).map((entry) => (
                      <button
                        key={entry.id || entry.name}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectCustomer(entry)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="font-semibold text-gray-800 flex items-center gap-2">
                          <User size={14} weight="duotone" className="text-gray-400" />
                          {entry.name}
                        </span>
                        <span className="text-xs text-gray-500">{entry.phone || "Sem telefone"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
          </div>
          )}

          {canUseLockedContactSummary && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {isLoggedDeliveryFlow ? "Cliente da entrega" : "Retirada para"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{loggedDeliveryName || "Cliente cadastrado"}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{loggedDeliveryPhone || "Telefone não informado"}</p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  {isLoggedDeliveryFlow ? <User size={18} weight="duotone" /> : <House size={18} weight="duotone" />}
                </span>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {!isOptionalPhoneMode && !canUseLockedContactSummary && !isEndCustomerLogged && (
            <div className="rounded-2xl border border-slate-100 p-3 sm:p-4 bg-white">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                WhatsApp <span className="text-rose-500 font-extrabold">Obrigatório</span>
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-3 items-end">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">DDD</span>
                  <DddSelect
                    value={selectedDdd || ""}
                    onChange={(ddd) => handleDddChange(ddd)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Número</span>
                  <input
                    {...inputAssistProps.phoneNational}
                    name="customerPhone"
                    type="tel"
                    inputMode="numeric"
                    enterKeyHint="next"
                    value={formatLocalPhoneNumber(localPhoneDigits)}
                    onChange={(e) => handlePhoneLocalNumberChange(e.target.value)}
                    placeholder={selectedDdd ? "90000-0000" : "Selecione o DDD"}
                    disabled={!selectedDdd}
                    className={`${premiumInputClass} mt-1 text-base sm:text-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
          )}

          {isOptionalPhoneMode && !showOptionalPhoneFields && !canUseLockedContactSummary && !isEndCustomerLogged && (
            <div className="rounded-2xl border border-slate-100 p-3 sm:p-4 bg-white">
              <button
                type="button"
                onClick={() => setShowOptionalPhoneFields(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:border-amber-300 active:scale-[0.98]"
              >
                <Phone size={14} weight="duotone" />
                Adicionar WhatsApp / Telefone (Opcional)
              </button>
            </div>
          )}

          {isOptionalPhoneMode && showOptionalPhoneFields && !canUseLockedContactSummary && (
            <div className="rounded-2xl border border-slate-100 p-3 sm:p-4 bg-white">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  WhatsApp (opcional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowOptionalPhoneFields(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                >
                  Ocultar
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-3 items-end">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">DDD</span>
                  <DddSelect
                    value={selectedDdd || ""}
                    onChange={(ddd) => handleDddChange(ddd)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Número</span>
                  <input
                    {...inputAssistProps.phoneNational}
                    name="customerPhone"
                    type="tel"
                    inputMode="numeric"
                    enterKeyHint="next"
                    value={formatLocalPhoneNumber(localPhoneDigits)}
                    onChange={(e) => handlePhoneLocalNumberChange(e.target.value)}
                    placeholder={selectedDdd ? "90000-0000" : "Selecione o DDD"}
                    disabled={!selectedDdd}
                    className={`${premiumInputClass} mt-1 text-base sm:text-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Para pedidos na mesa ou retirada, o telefone pode ficar em branco.
              </p>
            </div>
          )}

          {guestPhoneRequired && !canUseLockedContactSummary && (
            <p className="-mt-1 text-[11px] font-semibold text-slate-500">
              Pedido visitante exige telefone com DDD para reduzir abuso e facilitar contato da loja.
            </p>
          )}

          {/* Tipo de pedido */}
          <div className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)] p-3 sm:p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.28)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Tipo de pedido
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Escolha como quer receber este pedido.
                </p>
              </div>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#153A4C] shadow-sm">
                {orderTypeVisuals[customer.type]?.label || "Pedido"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleOrderTypes.map((type) => {
                const typeMeta = orderTypeVisuals[type] || orderTypeVisuals.delivery;
                const isActive = customer.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => onChangeCustomer({ ...customer, type })}
                    className={`jnc-hub-touch flex min-h-[74px] min-w-0 flex-1 items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-left ${
                      isActive
                        ? "border-slate-900 bg-white text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.45)] active:scale-[0.985]"
                        : "border-transparent bg-white/60 text-slate-500 hover:border-slate-200 hover:bg-white active:scale-[0.985]"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {typeMeta.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black leading-tight tracking-tight">
                        {typeMeta.label}
                      </span>
                      <span className={`mt-0.5 block text-[11px] font-semibold ${isActive ? "text-slate-500" : "text-slate-400"}`}>
                        {typeMeta.helper}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {customer.type === "delivery" && postalEnabled && (
              <div className="mt-3 rounded-[1.35rem] border border-slate-200 bg-white/82 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeDeliveryMode?.("distance")}
                    className={`min-h-[52px] rounded-[1.05rem] px-3 py-2.5 text-left transition ${
                      !isPostalDelivery
                        ? "bg-slate-900 text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.55)]"
                        : "bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-black">
                      <Truck size={15} weight="duotone" />
                      Entrega local
                    </span>
                    <span className={`mt-0.5 block text-[10px] font-semibold ${!isPostalDelivery ? "text-white/72" : "text-slate-400"}`}>
                      Motoboy ou loja
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDeliveryMode?.("postal");
                      window.setTimeout(() => {
                        void onCalculatePostalQuote?.({ silent: true });
                      }, 0);
                    }}
                    className={`min-h-[52px] rounded-[1.05rem] px-3 py-2.5 text-left transition ${
                      isPostalDelivery
                        ? "bg-slate-900 text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.55)]"
                        : "bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-black">
                      <PaperPlaneTilt size={15} weight="duotone" />
                      Envio postal
                    </span>
                    <span className={`mt-0.5 block text-[10px] font-semibold ${isPostalDelivery ? "text-white/72" : "text-slate-400"}`}>
                      Correios
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Retirada info */}
          {showCustomerFulfillmentInsights && customer.type === "pickup" && (
            <div className="rounded-[1.7rem] border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(236,253,245,0.96)_100%)] p-4 shadow-[0_22px_42px_-34px_rgba(5,150,105,0.35)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Retirada no local</p>
                  <p className="mt-1 text-sm font-black leading-tight text-slate-900">
                    {storeAddress || "Retire no balcão da loja"}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Seu pedido segue identificado para retirada. Apresente o número do pedido ao chegar.
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-emerald-100 text-emerald-700 shadow-sm">
                  <House size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 shadow-sm">
                  Sem frete
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm">
                  Pedido identificado
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm">
                  Retirada simples
                </span>
              </div>
            </div>
          )}

          {/* Endereço */}
          {customer.type === "delivery" && (
            <div className="rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_48%,rgba(241,245,249,0.92)_100%)] p-4 sm:p-5 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.28)]">
              {showCustomerFulfillmentInsights && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {isPostalDelivery ? "Envio postal" : "Entrega no endereço"}
                    </p>
                    <h3 className="mt-1 text-[15px] font-black leading-tight text-slate-900">
                      {deliverySummaryTitle}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {deliverySummaryDescription}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deliveryMetaChips.map((chip) => (
                      <span
                        key={chip.key}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm"
                      >
                        {chip.icon}
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isEndCustomerLogged && !isLoggedDeliveryFlow && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold">Endereços salvos</p>
                    <button
                      type="button"
                      onClick={() => onOpenAddressManager?.()}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
                    >
                      Gerenciar
                    </button>
                  </div>
                  {savedDeliveryAddresses.length > 0 ? (
                    <div className="-mx-1 px-1 overflow-x-auto pb-1">
                      <div className="flex gap-2 min-w-max snap-x snap-mandatory">
                      {savedDeliveryAddresses.map((address: any) => (
                        (() => {
                          const isCurrent =
                            String(address?.cep || '').replace(/\D/g, '') === String(customer?.cep || '').replace(/\D/g, '') &&
                            String(address?.street || '').trim().toLowerCase() === String(customer?.street || '').trim().toLowerCase() &&
                            String(address?.number || '').trim() === String(customer?.number || '').trim();
                          return (
                        <button
                          type="button"
                          key={String(address?.id || Math.random())}
                          onClick={() => onApplySavedAddress?.(address)}
                          className={`snap-start w-[258px] max-w-[82vw] rounded-[1.3rem] border px-3 py-3 text-left transition shadow-[0_16px_30px_-24px_rgba(15,23,42,0.24)] ${
                            isCurrent
                              ? "border-brand-primary bg-brand-primary/10"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {address?.label || "Endereço"}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {address?.street}, {address?.number || "s/n"} - {address?.neighborhood}
                              </p>
                            </div>
                            {address?.isDefault && (
                              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              {address?.cep || ""}
                            </span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isCurrent ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-600"}`}>
                              {isCurrent ? "Em uso" : "Usar"}
                            </span>
                          </div>
                        </button>
                          );
                        })()
                      ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenAddressManager?.()}
                      className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600"
                    >
                      Cadastrar primeiro endereço
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-4">
                  {isLoggedDeliveryFlow ? (
                    <div className="rounded-[1.45rem] border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 px-4 py-4 text-sm text-slate-600 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.10)]">
                      {hasSavedAddress ? (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                              <MapPinLine size={18} weight="duotone" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Entregar em</p>
                                <button
                                  type="button"
                                  onClick={() => onOpenAddressManager?.()}
                                  className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition active:scale-[0.97]"
                                >
                                  Alterar
                                </button>
                              </div>
                              <p className="mt-1 text-[15px] font-bold text-slate-900 leading-snug">{activeSavedAddress?.label || 'Endereço principal'}</p>
                              {loggedDeliveryAddressSummary ? (
                                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">{loggedDeliveryAddressSummary}</p>
                              ) : null}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                              <MapPinLine size={18} weight="duotone" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-600">Endereço necessário</p>
                              <p className="mt-1 text-sm font-semibold text-slate-800 leading-snug">Cadastre um endereço para receber seu pedido.</p>
                              <button
                                type="button"
                                onClick={() => onOpenAddressManager?.()}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[11px] font-bold text-amber-700 shadow-sm hover:bg-amber-100 transition active:scale-[0.97]"
                              >
                                <MapPinLine size={13} weight="bold" />
                                Cadastrar endereço
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                  {!isLoggedDeliveryFlow && (
                  <div className={`rounded-[1.35rem] border px-3 py-3 text-xs shadow-[0_14px_24px_-26px_rgba(15,23,42,0.2)] ${
                    isPostalDelivery
                      ? "border-amber-200 bg-amber-50/70 text-amber-800"
                      : "border-sky-200 bg-sky-50/70 text-sky-800"
                  }`}>
                    {isPostalDelivery
                      ? "Insira seu CEP para cotar PAC/SEDEX e escolher o envio."
                      : "Insira seu CEP para conferirmos a distância e o tempo de entrega."}
                  </div>
                  )}
                  {!isLoggedDeliveryFlow && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CEP</label>
                      <div className="relative mt-1">
                        <input
                          {...inputAssistProps.postalCode}
                          ref={cepInputRef}
                          name="postalCode"
                          value={customer.cep || ""}
                          onChange={(e) => updateDeliveryField("cep", e.target.value)}
                          onBlur={handleCepLookup}
                          disabled={cepLoading}
                          placeholder="00000-000"
                          enterKeyHint="next"
                          className={`${premiumInputClass} pr-12 disabled:opacity-60`}
                        />
                        {!!onUseCurrentLocation && !isPostalDelivery && (
                          <button
                            type="button"
                            onClick={onUseCurrentLocation}
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition active:scale-[0.97]"
                            aria-label="Usar minha localização"
                            title="Usar minha localização"
                          >
                            <Crosshair size={14} weight="duotone" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleCepLookup}
                        disabled={cepLoading || checkoutLoading}
                        className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {cepLoading ? "Buscando..." : "Buscar CEP"}
                      </button>
                    </div>
                  </div>
                  )}
                  {hasTriedCheckout && cepError && <p className="text-xs text-red-600">{cepError}</p>}
                  {!isLoggedDeliveryFlow && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rua / Avenida</label>
                          <input
                            {...inputAssistProps.addressLine1}
                            name="addressLine1"
                            value={customer.street || ""}
                            onChange={(e) => updateDeliveryField("street", e.target.value)}
                            placeholder="Rua, avenida"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numero</label>
                          <input
                            {...inputAssistProps.addressLine2}
                            name="addressNumber"
                            value={customer.number || ""}
                            onChange={(e) => updateDeliveryField("number", e.target.value)}
                            placeholder="Numero"
                            inputMode="text"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bairro</label>
                          <input
                            {...inputAssistProps.neighborhood}
                            name="addressNeighborhood"
                            value={customer.neighborhood || ""}
                            onChange={(e) => updateDeliveryField("neighborhood", e.target.value)}
                            placeholder="Bairro"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Complemento</label>
                          <input
                            {...inputAssistProps.addressLine3}
                            name="addressComplement"
                            value={customer.complement || ""}
                            onChange={(e) => updateDeliveryField("complement", e.target.value)}
                            placeholder="Apto, bloco, referencia"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
                          <input
                            {...inputAssistProps.city}
                            name="addressCity"
                            value={customer.city || ""}
                            onChange={(e) => updateDeliveryField("city", e.target.value)}
                            placeholder="Cidade"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">UF</label>
                          <input
                            {...inputAssistProps.state}
                            name="addressState"
                            value={customer.state || ""}
                            onChange={(e) => updateDeliveryField("state", e.target.value)}
                            placeholder="UF"
                            enterKeyHint="done"
                            className={premiumInputClass}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="rounded-[1.6rem] border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 p-4 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] space-y-3">
                    {/* Header with fee badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${deliveryFeeValue > 0 ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Truck size={18} weight="duotone" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">
                            {isPostalDelivery ? "Envio postal" : "Entrega"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {deliveryFeeValue > 0 ? `Taxa: ${formatCurrency(deliveryFeeValue)}` : 'Frete grátis'}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold ${deliveryFeeValue > 0 ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {deliveryFeeValue > 0 ? formatCurrency(deliveryFeeValue) : '🎉 Grátis'}
                      </span>
                    </div>

                    {/* Destination address */}
                    {normalizedCustomerAddress && !isLoggedDeliveryFlow && (
                      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                          <MapPinLine size={14} weight="fill" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Destino</p>
                          <p className="mt-0.5 text-[13px] font-black leading-snug text-slate-900">
                            {customerAddressLines.primary || normalizedCustomerAddress}
                          </p>
                          {(customerAddressLines.secondary || customerAddressLines.locality) && (
                            <p className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-500">
                              {[customerAddressLines.secondary, customerAddressLines.locality].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {customerAddressLines.zipCode && (
                            <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500">
                              {customerAddressLines.zipCode}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Distance and time metrics */}
                    {!isPostalDelivery && deliveryCheck?.distanceKm ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                            <Bicycle size={15} weight="duotone" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Distância</p>
                            <p className="text-[15px] font-black text-slate-900">{deliveryCheck.distanceKm.toFixed(1)} km</p>
                          </div>
                        </div>
                        {deliveryCheck?.durationMin ? (
                          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                              <Clock size={15} weight="duotone" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Tempo</p>
                              <p className="text-[15px] font-black text-slate-900">{deliveryCheck.durationMin} min</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {isPostalDelivery && postalOriginZip ? (
                      <p className="text-xs text-slate-500">CEP de origem: <span className="font-semibold text-slate-700">{postalOriginZip}</span></p>
                    ) : null}
                    {isPostalDelivery && (
                      <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-slate-900">Escolha o frete</h4>
                          <p className="text-xs text-slate-500">
                            Compare prazo e valor para o CEP de destino.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCalculatePostalQuote?.()}
                          disabled={postalQuoteLoading}
                          className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-[1.1rem] bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {postalQuoteLoading && (
                            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          )}
                          {postalQuoteLoading ? "Calculando..." : "Calcular frete postal"}
                        </button>
                        {postalQuoteLoading && (
                          <div className="space-y-2">
                            <div className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-3 h-[74px]" />
                            <div className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-3 h-[74px]" />
                          </div>
                        )}
                        {!postalQuoteLoading && postalServices.length > 0 && (
                          <div className="space-y-2">
                            {postalServices.map((service) => {
                              const selected = String(service?.serviceCode || "") === String(selectedPostalService?.serviceCode || "");
                              return (
                                <button
                                  type="button"
                                  key={String(service?.serviceCode || service?.serviceName || Math.random())}
                                  onClick={() => onSelectPostalService?.(String(service?.serviceCode || ""))}
                                  className={`w-full min-h-11 rounded-[1.1rem] border px-3 py-3 text-left transition ${
                                    selected
                                      ? "border-brand-primary bg-brand-primary/10 shadow-sm"
                                      : "border-slate-200 bg-white hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-900 truncate">
                                        {service?.serviceName || service?.serviceCode || "Serviço"}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Prazo: {Number(service?.estimatedDays || 0) > 0 ? `${service.estimatedDays} dia(s)` : "a confirmar"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-base font-black text-slate-900">
                                        {formatCurrency(Number(service?.price || 0))}
                                      </span>
                                      {selected && (
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white text-[11px] font-black">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {!postalQuoteLoading && !postalServices.length && String(customer.cep || "").replace(/\D/g, "").length === 8 && (
                          <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-2">
                            <p>Não foi possível encontrar opções agora.</p>
                            <button
                              type="button"
                              onClick={() => onCalculatePostalQuote?.()}
                              className="w-full min-h-11 rounded-[1rem] border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800"
                            >
                              Tentar novamente
                            </button>
                          </div>
                        )}
                        {selectedPostalService && (
                          <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                            Frete selecionado: {selectedPostalService?.serviceName || selectedPostalService?.serviceCode || "Serviço"} •{" "}
                            {Number(selectedPostalService?.estimatedDays || 0) > 0
                              ? `${selectedPostalService?.estimatedDays} dia(s)`
                              : "Prazo a confirmar"}{" "}
                            • {formatCurrency(Number(selectedPostalService?.price || 0))}
                          </div>
                        )}
                      </div>
                    )}
                    {showDeliveryStatus && (
                      <div className={`rounded-[1.1rem] border px-3 py-2.5 text-base font-semibold ${deliveryStatus.tone}`}>
                        {deliveryStatus.label}
                    </div>
                  )}
                  {showRouteMap && (
                    <div className="rounded-[1.2rem] border border-slate-200 bg-white p-2 shadow-[0_18px_30px_-28px_rgba(15,23,42,0.28)]">
                      <RouteMapView
                        origin={{ lat: Number(storeCoords.lat), lng: Number(storeCoords.lng) }}
                        destination={{ lat: Number(deliveryCoords.lat), lng: Number(deliveryCoords.lng) }}
                      />
                    </div>
                  )}
                  {showDeliveryDebug && (
                    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Validação da entrega</p>
                      <div className="space-y-1 text-sm text-slate-600">
                        {deliveryDebug.map((row) => (
                          <div key={row.label} className="flex items-center justify-between">
                            <span>{row.label}</span>
                            <span className="font-semibold text-slate-800">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {customer.type === "table" && visibleOrderTypes.includes('table') && (
            <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Mesa do Pedido
                </p>
                {customer.table && !isEditingTable && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTable(true)}
                    className="jnc-hub-touch text-xs font-black uppercase tracking-wider text-[#336886] hover:text-[#153A4C]"
                  >
                    Alterar
                  </button>
                )}
              </div>

              {customer.table && !isEditingTable ? (
                <div className="flex items-center gap-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-lg shadow-sm">
                    {customer.table}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      Mesa {customer.table} Selecionada
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Toque em "Alterar" para trocar de mesa.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {tableOptions.map((table) => {
                      const isSelected = customer.table === table;
                      return (
                      <button
                        key={table}
                        type="button"
                        onClick={() => {
                          handleSelectTable(table);
                          setIsEditingTable(false);
                        }}
                        className={`jnc-hub-touch py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${
                          isSelected
                            ? "bg-amber-500 text-white font-bold border-amber-500 ring-2 ring-amber-300/60 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.35)]"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {table}
                      </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customer.table}
                      onChange={(e) => handleTableInputChange(e.target.value)}
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="done"
                      placeholder="Outro número de mesa"
                      className={`${premiumInputClass} flex-1`}
                    />
                    {customer.table && (
                      <button
                        type="button"
                        onClick={() => setIsEditingTable(false)}
                        className="jnc-hub-touch px-4 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-sm"
                      >
                        OK
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Você pode lançar múltiplos pedidos na mesma mesa.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>}

      {/* Resumo */}
      {(!useMultiStepFlow || checkoutStep === 1) && (
        <div className="space-y-4 mb-4 sm:mb-6">
          <div className="jnc-receipt-card relative overflow-hidden rounded-2xl border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_54px_-44px_rgba(15,23,42,0.34)] ring-1 ring-slate-100/70 transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_62px_-48px_rgba(15,23,42,0.38)] active:scale-[0.99] sm:p-6">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
            {useMultiStepFlow ? 'Sua Sacola' : 'Resumo'}
          </h2>
          {useMultiStepFlow && (
            <button type="button" onClick={onBack} className="text-[11px] font-bold text-[#336886] hover:underline">
              + Adicionar itens
            </button>
          )}
        </div>

        {cartItems.map((item) => (
          <div
            key={item.key || item.id}
            className="flex justify-between items-center gap-2 py-2 sm:py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1">
                <button
                  type="button"
                  onClick={() => onUpdateCart?.(item, -1, buildCartOptions(item))}
                  className="h-6 w-6 rounded-md text-slate-700 hover:bg-slate-100 transition"
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  -
                </button>
                <span className="min-w-[24px] text-center text-xs font-bold text-slate-800">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => onUpdateCart?.(item, 1, buildCartOptions(item))}
                  className="h-6 w-6 rounded-md bg-brand-primary text-white hover:brightness-110 transition"
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  +
                </button>
              </div>
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                {item.imageUrl ? (
                  <img
                    src={resolveAssetUrl(item.imageUrl)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                    🍖
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-800 font-semibold text-base sm:text-lg leading-tight">{item.name}</span>
                {formatItemOptions(item) && (
                  <span className="text-xs sm:text-sm text-slate-600">{formatItemOptions(item)}</span>
                )}
                {getModifiersTotal(item?.selectedModifiers || []) > 0 && (
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Adicionais: + {formatCurrency(getModifiersTotal(item?.selectedModifiers || []) * item.qty)}
                  </span>
                )}
                {getBundleDiscountForCartItem(item) > 0 && (
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Promoção aplicada: - {formatCurrency(getBundleDiscountForCartItem(item))}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                <span className="flex flex-col items-end gap-0.5">
                  <span className="text-[11px] line-through text-gray-400">
                    {formatCurrency(Number(item.originalPrice) * item.qty)}
                  </span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </span>
              ) : (
                <span className="font-bold text-gray-900">
                  {formatCurrency(item.price * item.qty)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onUpdateCart?.(item, -item.qty, buildCartOptions(item))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 active:scale-90"
                aria-label={`Remover ${item.name}`}
              >
                <Trash size={15} weight="duotone" />
              </button>
            </div>
          </div>
        ))}

        {isDelivery && deliveryFeeValue > 0 && (
          <div className="flex justify-between items-center pt-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Truck size={14} weight="duotone" className="text-emerald-500" />
              Frete
            </span>
            <span className="font-semibold text-slate-800">{formatCurrency(deliveryFeeValue)}</span>
          </div>
        )}
        {discountTotal > 0 && (
          <div className="flex justify-between items-center pt-3 text-sm text-slate-600">
            <span>Subtotal sem desconto</span>
            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
        )}
        {discountTotal > 0 && (
          <div className="flex justify-between items-center pt-3 text-sm">
            <span className="inline-flex items-center gap-2 text-emerald-700 font-semibold">
              Promoção por quantidade
            </span>
            <span className="font-bold text-emerald-700">- {formatCurrency(discountTotal)}</span>
          </div>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 sm:mt-2 sm:pt-6">
          <span className="text-gray-500 font-medium">Total a Pagar</span>
          <span className="text-2xl sm:text-3xl font-black text-gray-800">
            {formatCurrency(totalWithFee)}
          </span>
        </div>
        {customer.type === "table" && customer.table && (
          <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
            Mesa {customer.table}
          </div>
        )}
      </div>

      <div className="mb-1">
        {renderCustomerOrderNoteCard()}
      </div>
    </div>)}

      {/* Sugestões (carrossel horizontal – step 1) */}
      {(!useMultiStepFlow || checkoutStep === 1) && showSuggestedProducts && (
        <div className="mb-4 sm:mb-6 rounded-[1.9rem] border border-slate-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.95)_100%)] p-4 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Adicionar ao pedido</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Complete sua sacola com mais alguns favoritos</p>
            </div>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#336886] shadow-sm">
              Sugestões
            </span>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 pl-1 pr-4 scrollbar-hide snap-x snap-mandatory">
            {suggestedProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => onUpdateCart?.(prod, 1, { cookingPoint: '', passSkewer: false, selectedModifiers: [] })}
                className="group flex-none w-[216px] snap-start flex items-center gap-3 rounded-[1.35rem] border border-slate-100 bg-white px-3 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.24)] active:scale-[0.97] transition-all hover:-translate-y-0.5"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-100">
                  {prod.imageUrl ? (
                    <img src={resolveAssetUrl(prod.imageUrl)} alt={prod.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">🍖</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-bold leading-tight text-slate-800">{prod.name}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">Entrou bem com seu pedido</p>
                  <p className="mt-1.5 text-[13px] font-black text-[#153A4C]">{formatCurrency(prod.price)}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] text-white text-base font-black shadow-[0_14px_26px_-18px_rgba(21,58,76,0.55)] transition-colors">
                  +
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact pricing + Forma de Pagamento (multi-step step 3) */}
      {useMultiStepFlow && checkoutStep === 3 && (
        <div className="jnc-receipt-card relative mb-4 overflow-hidden rounded-[1.85rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_54px_-44px_rgba(15,23,42,0.34)] ring-1 ring-slate-100/70 sm:p-6">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-black text-slate-900 text-base tracking-tight">Resumo do pedido</h2>
              <p className="mt-1 text-xs text-slate-500">Revise os itens antes de escolher a forma de pagamento.</p>
            </div>
            <div className="flex items-center -space-x-2">
              {cartPreviewItems.map((item, index) => {
                const imageUrl = resolveCartItemImage(item);
                return (
                  <div
                    key={item.key || item.id || index}
                    className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm"
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">🍖</div>
                    )}
                  </div>
                );
              })}
              {extraCartPreviewCount > 0 ? (
                <span className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full border-2 border-white bg-[#153A4C] px-2 text-[10px] font-black text-white shadow-sm">
                  +{extraCartPreviewCount}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 space-y-2 rounded-[1.4rem] border border-slate-100 bg-slate-50/80 p-3">
            {cartPreviewItems.map((item) => {
              const imageUrl = resolveCartItemImage(item);
              const optionsLabel = formatItemOptions(item);
              return (
                <div key={item.key || item.id} className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">🍖</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {item.qty}x{optionsLabel ? ` • ${optionsLabel}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-slate-800">{formatCurrency(item.price * item.qty)}</span>
                </div>
              );
            })}
            {extraCartPreviewCount > 0 ? (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#336886]/10 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#336886] shadow-sm">
                  +{extraCartPreviewCount} {extraCartPreviewCount === 1 ? "item" : "itens"} no pedido
                </span>
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-2 border-t border-dashed border-slate-200 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{totalCartUnits} {totalCartUnits === 1 ? 'item' : 'itens'}</span>
              <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Promoção</span>
                <span>- {formatCurrency(discountTotal)}</span>
              </div>
            )}
            {isDelivery && deliveryFeeValue > 0 && (
              <div className="flex justify-between text-slate-600">
                <span className="inline-flex items-center gap-1"><Truck size={13} weight="duotone" className="text-emerald-500" />Taxa de entrega</span>
                <span className="font-semibold text-slate-800">{formatCurrency(deliveryFeeValue)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-xl font-black text-slate-900">{formatCurrency(totalWithFee)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Forma de Pagamento */}
      {(!useMultiStepFlow || checkoutStep === 3) && (
        <div className="relative mb-4 overflow-hidden rounded-[1.85rem] border border-white/80 bg-[radial-gradient(circle_at_top_right,rgba(95,211,90,0.14),transparent_26%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,247,249,0.92))] p-4 shadow-[0_26px_60px_-48px_rgba(15,23,42,0.34)] sm:mb-6 sm:p-5">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#336886]/22 to-transparent" />
          <div className="relative z-10 mb-3 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1.1rem] bg-white text-[#336886] shadow-[0_16px_30px_-24px_rgba(51,104,134,0.44)] ring-1 ring-[#336886]/10">
              <Wallet size={21} weight="duotone" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">
                Pagamento
              </p>
              <h2 className="text-base font-black tracking-tight text-slate-950">
                Como você vai pagar?
              </h2>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-500">
                Confira a forma atual ou altere antes de finalizar.
              </p>
            </div>
          </div>
          <div className="relative z-10 space-y-3">
            {renderSelectedPaymentSummaryCard()}
            {isCash && renderCashChangePanel()}
            {isManualPix && (
              <div className="flex items-center gap-3 rounded-[1.25rem] border border-emerald-200/80 bg-emerald-50/80 p-3 shadow-[0_16px_34px_-28px_rgba(32,122,82,0.36)]">
                {renderPaymentMethodIcon("pix_loja", { size: "sm", selected: true, tone: "local" })}
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-emerald-700">Pix da loja</p>
                  <p className="text-[10px] leading-tight text-slate-500">
                    A chave Pix da loja será exibida após confirmar o pedido.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Step 4: Confirmação do pedido */}
      {useMultiStepFlow && checkoutStep === 4 && (
        <div className="space-y-3 mb-4">
          {/* Itens */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Itens do pedido</p>
                <p className="mt-1 text-xs text-slate-500">Confirme os itens e quantidades antes de enviar.</p>
              </div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                {totalCartUnits} {totalCartUnits === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="space-y-2">
              {cartItems.map((item, index) => {
                const imageUrl = resolveCartItemImage(item);
                return (
                  <div key={item.key || item.id || index} className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-slate-100 bg-slate-50/75 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">🍖</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex min-w-[1.6rem] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-700 ring-1 ring-slate-200">
                            {item.qty}x
                          </span>
                          <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                        </div>
                        {formatItemOptions(item) && (
                          <p className="mt-1 truncate text-[11px] text-slate-500">{formatItemOptions(item)}</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-black text-slate-800">{formatCurrency(item.price * item.qty)}</span>
                  </div>
                );
              })}
            </div>
            {extraCartPreviewCount > 0 ? (
              <div className="mt-3 flex justify-start">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#336886]/10 bg-[#336886]/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#336886]">
                  Pedido completo com {cartItems.length} seleções
                </span>
              </div>
            ) : null}
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
              <span className="text-sm font-bold text-slate-700">Subtotal</span>
              <span className="text-sm font-bold text-slate-800">{formatCurrency(total)}</span>
            </div>
            {isDelivery && deliveryFeeValue > 0 && (
              <div className="flex justify-between mt-2">
                <span className="text-sm text-slate-500 flex items-center gap-1"><Truck size={12} weight="duotone" className="text-emerald-500" />Entrega</span>
                <span className="text-sm font-semibold text-slate-700">{formatCurrency(deliveryFeeValue)}</span>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
              <span className="text-base font-black text-slate-900">Total</span>
              <span className="text-base font-black text-slate-900">{formatCurrency(totalWithFee)}</span>
            </div>
          </div>

          {renderCustomerOrderNoteSummaryCard()}

          {/* Entrega / Retirada */}
          {showCustomerFulfillmentInsights && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                  customer.type === 'delivery'
                    ? 'bg-sky-50 text-[#336886]'
                    : customer.type === 'pickup'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                }`}>
                  {customer.type === 'delivery' ? <Bicycle size={18} weight="duotone" /> : customer.type === 'pickup' ? <House size={18} weight="duotone" /> : <ForkKnife size={18} weight="duotone" />}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {customer.type === 'delivery' ? 'Entrega' : customer.type === 'pickup' ? 'Retirada no local' : `Mesa ${customer.table || ''}`}
                  </p>
                  {customer.type === 'delivery' && (
                    <div className="mt-1">
                      <p className="text-sm font-black leading-relaxed text-slate-800">
                        {customerAddressLines.primary || normalizedCustomerAddress || 'Endereço a confirmar'}
                      </p>
                      {(customerAddressLines.secondary || customerAddressLines.locality) && (
                        <p className="text-xs font-semibold leading-relaxed text-slate-500">
                          {[customerAddressLines.secondary, customerAddressLines.locality].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  )}
                  {customer.type === 'pickup' && (
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{storeAddress || 'Retirada no balcão'}</p>
                  )}
                  {customer.type === 'table' && (
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">Pedido identificado para a mesa {customer.table || 'selecionada'}.</p>
                  )}
                </div>
              </div>
              {hasPickupDistanceWarning && (
                <div className="mt-3 rounded-[1.35rem] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.98)_0%,rgba(255,247,237,0.98)_100%)] p-3 shadow-[0_18px_34px_-28px_rgba(245,158,11,0.55)]">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-200/80">
                      <MapPinLine size={18} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Retirada com distância maior</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        Esta loja fica a {formatDistanceKm(pickupDistanceValue)} do seu endereço de referência.
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                        Confirme a retirada apenas se você realmente pretende buscar o pedido no local.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pagamento */}
          <div
            className="rounded-[1.55rem] border border-white/80 bg-white p-3.5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)]"
            data-testid="checkout-review-payment-card"
            style={{ scrollMarginBottom: 'calc(env(safe-area-inset-bottom) + 9rem)' }}
          >
            <div className="flex items-start gap-3.5">
              {renderPaymentMethodIcon(paymentMethod, { size: "md", selected: true, tone: isOnlinePaymentMethod ? "online" : "local" })}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Pagamento</p>
                {(() => {
                  const methodMeta = getPaymentMethodMeta(paymentMethod);
                  return (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 capitalize">{methodMeta.label}</span>
                    </div>
                  );
                })()}
                {isCash && cashNeedsChange && cashTenderedValue !== null && cashTenderedValue >= totalWithFee ? (
                  <p className="mt-1 text-xs text-slate-500">Troco para {formatCurrency(cashTenderedValue)} • devolução {formatCurrency(cashChangeDue)}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {isOnlinePaymentMethod
                    ? 'Cobrança segura via Mercado Pago.'
                    : isManualPix
                    ? 'A chave Pix da loja será exibida após confirmar o pedido.'
                    : customer.type === 'pickup'
                    ? 'Você pagará assim que retirar o pedido.'
                    : customer.type === 'table'
                    ? 'Você pagará no atendimento da mesa.'
                    : 'Você pagará quando receber o pedido.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep(3);
                  openPaymentSheet();
                }}
                className="jnc-hub-touch inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#336886]/12 bg-[#336886]/7 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] transition hover:bg-[#336886]/12 active:scale-[0.98]"
              >
                <CreditCard size={13} weight="duotone" />
                Alterar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Finalizar */}
      <div className={`fixed left-0 right-0 w-full box-border border-t border-slate-100 bg-white/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] backdrop-blur-md max-w-lg mx-auto z-50 shadow-[0_-14px_28px_-22px_rgba(15,23,42,0.28)] ${isNativePlatform ? "ds-native-nav-dock" : "bottom-0"}`} data-testid="checkout-fixed-action">
        {useMultiStepFlow ? (
          <>
            {checkoutStep >= 3 && (
              <p className="text-[11px] text-slate-400 text-center leading-relaxed mb-2">
                Revise uma última vez. Depois disso, o pedido vai direto para a loja.
              </p>
            )}
            {checkoutLoading && checkoutSlow && (
              <p className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold leading-snug text-amber-800">
                Conexão lenta. Estamos confirmando com a loja. Não feche esta tela nem toque de novo.
              </p>
            )}
            <button
              onClick={async () => {
                setCtaPulse(true);
                window.setTimeout(() => setCtaPulse(false), 220);
                if (checkoutStep === 1) {
                  setCheckoutStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }
                if (checkoutStep === 2) {
                  if (isLoggedDeliveryFlow && !hasSavedAddress) {
                    onOpenAddressManager?.();
                    return;
                  }
                  if (isPostalQuoteMode) {
                    await Promise.resolve(onCalculatePostalQuote?.());
                    return;
                  }
                  if (isDeliveryValidationMode) {
                    const validated = await Promise.resolve(onValidateDeliveryAddress?.());
                    if (!validated) return;
                  }
                  setCheckoutStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }
                if (checkoutStep === 3) {
                  setCheckoutStep(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }
                // Step 4: final checkout
                await handleCheckoutAttempt();
              }}
              disabled={checkoutStep === 2
                ? (
                    checkoutLoading ||
                    (isPostalQuoteMode && postalQuoteLoading) ||
                    (customer.type === 'delivery' && !isPostalDelivery && (deliveryCheck?.status === 'out' || deliveryCheck?.status === 'loading')) ||
                    (customer.type === 'table' && !String(customer.table || '').trim())
                  )
                : checkoutStep === 3
                ? (checkoutDisabled || paymentValidation.blocked)
                : checkoutStep === 4
                ? (checkoutLoading || checkoutDisabled || paymentValidation.blocked)
                : false}
              className={`relative w-full overflow-hidden font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                (checkoutStep === 2 && (
                  checkoutLoading ||
                  (isPostalQuoteMode && postalQuoteLoading) ||
                  (customer.type === 'delivery' && !isPostalDelivery && (deliveryCheck?.status === 'out' || deliveryCheck?.status === 'loading')) ||
                  (customer.type === 'table' && !String(customer.table || '').trim())
                )) ||
                (checkoutStep === 3 && (checkoutDisabled || paymentValidation.blocked)) ||
                (checkoutStep === 4 && (checkoutLoading || checkoutDisabled || paymentValidation.blocked))
                  ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                  : checkoutStep === 4
                  ? "bg-[linear-gradient(135deg,#0f172a,#153A4C)] text-white cursor-pointer shadow-[0_20px_42px_-26px_rgba(21,58,76,0.56)]"
                  : checkoutStep === 3
                  ? "bg-[linear-gradient(135deg,#336886,#207A52)] text-white cursor-pointer shadow-[0_18px_36px_-24px_rgba(51,104,134,0.55)]"
                  : "bg-slate-900 text-white cursor-pointer"
              }`}
              style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
            >
              {checkoutStep === 4 ? (
                <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              ) : null}
              {checkoutStep < 3
                ? <>
                    {isLoggedDeliveryFlow && !hasSavedAddress && checkoutStep === 2
                      ? 'Cadastrar endereço'
                      : checkoutStep === 2 && isDeliveryValidationMode
                      ? 'Validar endereço'
                      : checkoutStep === 2 && isPostalQuoteMode
                      ? (postalQuoteLoading ? 'Calculando frete...' : 'Calcular frete postal')
                      : 'Continuar'}
                    <ArrowLeft size={18} weight="bold" className="rotate-180" />
                  </>
                : checkoutStep === 3
                ? <>
                    Revisar pedido
                    <ArrowLeft size={18} weight="bold" className="rotate-180" />
                  </>
                : <>
                    {checkoutLoading
                      ? checkoutLoadingLabel
                      : isOnlinePaymentMethod
                      ? <><img src={mercadoPagoMeta.icon} alt="" className="h-5 w-5 object-contain brightness-0 invert" /> Confirmar e gerar pagamento <span className="opacity-70">•</span> {formatCurrency(totalWithFee)}</>
                      : <>{isOnlinePaymentMethod ? <ShieldCheck size={20} weight="duotone" /> : isPickup ? <Wallet size={20} weight="duotone" /> : <PaperPlaneTilt size={20} weight="duotone" />} {isOnlinePaymentMethod ? 'Confirmar e gerar pagamento' : 'Enviar pedido para a loja'} <span className="opacity-70">•</span> {formatCurrency(totalWithFee)}</>
                    }
                  </>
              }
            </button>
            {hasTriedCheckout && checkoutStep === 4 && (checkoutDisabled || paymentValidation.blocked) && (checkoutDisabledReason || paymentValidation.reason) && (
              <p className="mt-2 text-center text-[11px] text-rose-600 font-semibold">
                {paymentValidation.blocked ? paymentValidation.reason : checkoutDisabledReason}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed mb-2">
              Pedido processado pelo estabelecimento, responsável por produtos, preparo, preços e entrega.
            </p>
            {checkoutLoading && checkoutSlow && (
              <p className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold leading-snug text-amber-800">
                Conexão lenta. Estamos confirmando com a loja. Não feche esta tela nem toque de novo.
              </p>
            )}
            <button
              onClick={async () => {
                setHasTriedCheckout(true);
                setCtaPulse(true);
                window.setTimeout(() => setCtaPulse(false), 220);
                if (isLoggedDeliveryFlow && !hasSavedAddress) {
                  onOpenAddressManager?.();
                  return;
                }
                if (isDeliveryValidationMode) {
                  const rawCep = (customer.cep || "").replace(/\D/g, "");
                  const hasStructuredAddress = Boolean(
                    String(customer.street || "").trim() &&
                    String(customer.city || "").trim() &&
                    String(customer.state || "").trim()
                  );
                  if (!hasStructuredAddress && rawCep.length !== 8) {
                    setCepError("Informe um CEP válido para validar a entrega.");
                    cepInputRef.current?.focus();
                    return;
                  }
                  if (!hasStructuredAddress) {
                    await handleCepLookup();
                    return;
                  }
                  await Promise.resolve(onValidateDeliveryAddress?.());
                  return;
                }
                if (isPostalQuoteMode) {
                  await Promise.resolve(onCalculatePostalQuote?.());
                  return;
                }
                await handleCheckoutAttempt();
              }}
              disabled={primaryCtaDisabled}
              className={`relative w-full overflow-hidden font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                primaryCtaDisabled
                  ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                  : "bg-slate-900 text-white cursor-pointer"
              }`}
              style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
            >
              {!primaryCtaDisabled ? (
                <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              ) : null}
              {isPickup ? <Wallet size={20} weight="duotone" /> : <PaperPlaneTilt size={20} weight="duotone" />}
              {checkoutLoading ? checkoutLoadingLabel : primaryCtaLabel}
            </button>
            {hasTriedCheckout && !isDeliveryValidationMode && (checkoutDisabled || paymentValidation.blocked) && !hideOutOfRangeInlineReason && (checkoutDisabledReason || paymentValidation.reason) && (
              <p className="mt-2 text-center text-[11px] text-rose-600 font-semibold">
                {paymentValidation.blocked ? paymentValidation.reason : checkoutDisabledReason}
              </p>
            )}
          </>
        )}
      </div>

      {showPaymentSheet && (
        <div className="fixed inset-0 z-[78]" data-testid="checkout-payment-method-sheet">
          <button
            type="button"
            onClick={() => {
              setShowPaymentSheet(false);
            }}
            className="absolute inset-0 bg-slate-950/42 backdrop-blur-md"
            aria-label="Fechar formas de pagamento"
          />
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-h-[calc(100dvh-4rem)] max-w-lg overflow-hidden rounded-t-[2rem] border border-white/80 bg-white/92 shadow-[0_-28px_60px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/92 px-4 pb-3 pt-4 backdrop-blur-xl">
              <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-slate-200" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Pagamento</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Trocar forma de pagamento</h3>
                  <p className="mt-1 text-xs font-semibold leading-snug text-slate-500">
                    Selecione uma opção abaixo. O pedido continua igual e a troca aplica na hora.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentSheet(false);
                  }}
                  className="jnc-hub-touch grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 shadow-sm"
                  aria-label="Fechar"
                >
                  X
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] border border-[#336886]/10 bg-[linear-gradient(135deg,#ffffff_0%,#f3fafc_100%)] p-3 shadow-[0_14px_30px_-26px_rgba(51,104,134,0.28)]">
                {renderPaymentMethodIcon(activePaymentId, { size: "sm", selected: true, tone: activePaymentTone })}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                    Forma atual
                  </p>
                  <p className="truncate text-sm font-black text-slate-950">{activePaymentLabel}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#336886]/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#336886]">
                  Ativa
                </span>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              {paymentGroups.online.length === 0 && paymentGroups.local.length === 0 && isPostalDelivery && (
                <section className="rounded-[1.55rem] border border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,248,235,0.92))] p-4 shadow-[0_22px_50px_-44px_rgba(245,158,11,0.34)]">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-200 bg-white text-amber-700 shadow-[0_14px_28px_-24px_rgba(245,158,11,0.42)]">
                      <ShieldCheck size={18} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Envio postal precisa de pagamento online</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                        Correios não permite pagamento na entrega. Ative Pix ou cartão online na loja para liberar este fluxo.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {paymentGroups.online.length > 0 && (
                <section className="rounded-[1.55rem] border border-[#336886]/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(232,244,248,0.86))] p-3.5 shadow-[0_22px_50px_-44px_rgba(51,104,134,0.32)]">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]">
                        Pagar online
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        Processado com segurança antes do pedido seguir para a loja.
                      </p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#336886]/12 bg-white/92 px-2.5 py-1.5 text-[10px] font-black text-slate-600 shadow-[0_14px_26px_-22px_rgba(51,104,134,0.34)]">
                      {mercadoPagoMeta.icon ? (
                        <img src={mercadoPagoMeta.icon} alt={mercadoPagoMeta.label} className="h-4 w-4 object-contain" />
                      ) : (
                        <ShieldCheck size={12} weight="duotone" className="text-emerald-600" />
                      )}
                      <span>Seguro</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {paymentGroups.online.map((method) => renderPaymentMethodCard(method, "online"))}
                  </div>
                </section>
              )}

              {paymentGroups.local.length > 0 && (
                <section className="rounded-[1.55rem] border border-emerald-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(238,250,241,0.86))] p-3.5 shadow-[0_22px_50px_-44px_rgba(32,122,82,0.28)]">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                        Pagar na entrega, retirada ou balcão
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        Ideal para dinheiro, Pix da loja ou cartão na entrega, retirada ou mesa.
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1.5 text-[10px] font-black text-emerald-700">
                      <ShieldCheck size={12} weight="duotone" />
                      Presencial
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {paymentGroups.local.map((method) => renderPaymentMethodCard(method, "local"))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {showCustomerNoteSheet && (
        <div className="fixed inset-0 z-[79]" data-testid="customer-order-note-sheet">
          <button
            type="button"
            onClick={() => setShowCustomerNoteSheet(false)}
            className="absolute inset-0 bg-slate-950/42 backdrop-blur-md"
            aria-label="Fechar observação"
          />
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-h-[calc(100dvh-4rem)] max-w-lg overflow-hidden rounded-t-[2rem] border border-white/80 bg-white/92 shadow-[0_-28px_60px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="border-b border-[#336886]/10 bg-white/86 px-4 pb-3 pt-4 backdrop-blur-xl">
              <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#336886]/18" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">Observação</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Alguma instrução para a loja?</h3>
                  <p className="mt-1 text-xs font-semibold leading-snug text-slate-500">
                    {customerOrderNoteCopy.helper}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomerNoteSheet(false)}
                  className="jnc-hub-touch inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm"
                  aria-label="Fechar"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Atalhos rápidos
                </p>
                <div className="grid grid-cols-2 gap-2">
                {customerOrderNoteCopy.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => applyCustomerNoteSuggestion(suggestion)}
                    className={`jnc-hub-touch rounded-[1rem] border px-3 py-2 text-left text-[11px] font-black shadow-sm transition ${
                      customerNoteDraft.toLowerCase().includes(suggestion.toLowerCase())
                        ? "border-[#336886]/24 bg-[#336886]/8 text-[#153A4C] ring-1 ring-[#336886]/12"
                        : "border-slate-200 bg-white text-[#336886] hover:border-[#336886]/18"
                    }`}
                  >
                    + {suggestion}
                  </button>
                ))}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-100 bg-slate-50/80 p-3 ring-1 ring-white/80">
                <label htmlFor="customer-order-note-input" className="mb-2 block text-xs font-black text-slate-800">
                  Escreva uma observação
                </label>
                <textarea
                  id="customer-order-note-input"
                  {...textareaAssistProps.notes}
                  value={customerNoteDraft}
                  onChange={(event) => setCustomerNoteDraft(limitCustomerOrderNoteInput(event.target.value))}
                  maxLength={CUSTOMER_ORDER_NOTE_MAX_LENGTH}
                  rows={5}
                  placeholder={customerOrderNoteCopy.placeholder}
                  className="min-h-[118px] w-full resize-none rounded-[1.2rem] border border-white bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#336886]/45 focus:ring-4 focus:ring-[#336886]/10"
                  data-testid="customer-order-note-input"
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-[10.5px] font-bold text-slate-400">
                  <span>Evite pedir item extra por aqui; use o cardápio para adicionais.</span>
                  <span className="shrink-0 tabular-nums rounded-full bg-white px-2 py-0.5 shadow-sm">
                    {customerNoteDraft.length}/{CUSTOMER_ORDER_NOTE_MAX_LENGTH}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCustomerNoteDraft("");
                    handleCustomerOrderNoteChange("");
                    setShowCustomerNoteSheet(false);
                  }}
                >
                  {customerNoteDraft.trim() ? "Remover observação" : "Continuar sem observação"}
                </Button>
                <Button
                  onClick={saveCustomerNoteDraft}
                >
                  Salvar observação
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOutOfRangeSheet && !postalEnabled && !isPostalDelivery && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            onClick={() => setShowOutOfRangeSheet(false)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            aria-label="Fechar aviso de raio"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-slate-200 bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-20px_44px_-24px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-black text-slate-900">Não chegamos até aí ainda 😥</p>
            <p className="mt-2 text-sm text-slate-600">
              Sua localização está a {deliveryCheck?.distanceKm ? deliveryCheck.distanceKm.toFixed(1) : '-'} km de nós,
              e nosso limite de entrega é de {radiusValue || '-'} km.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setShowOutOfRangeSheet(false);
                  cepInputRef.current?.focus();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              >
                Trocar Endereço
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCustomer({ ...customer, type: "pickup" });
                  setShowOutOfRangeSheet(false);
                }}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
              >
                Quero retirar na loja
              </button>
            </div>
          </div>
        </div>
      )}

      {showFarPickupSheet && (
        <div className="fixed inset-0 z-[71]">
          <button
            type="button"
            onClick={() => setShowFarPickupSheet(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            aria-label="Fechar confirmação de retirada"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf1_100%)] p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-24px_54px_-28px_rgba(15,23,42,0.52)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-slate-900 text-white shadow-[0_16px_32px_-20px_rgba(15,23,42,0.7)]">
                <House size={22} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Confirmação de retirada</p>
                <p className="mt-1 text-lg font-black leading-tight text-slate-950">
                  Retirada a {formatDistanceKm(pickupDistanceValue)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {storeLabel ? `${storeLabel} fica` : 'Esta loja fica'} a uma distância grande do seu endereço de referência.
                  Confirme apenas se você realmente pretende retirar o pedido no local.
                </p>
                {storeAddress ? (
                  <div className="mt-3 rounded-2xl border border-amber-200/70 bg-white/85 px-3 py-2 shadow-[0_12px_24px_-20px_rgba(245,158,11,0.45)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Local da retirada</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">{storeAddress}</p>
                  </div>
                ) : null}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                  <ShieldCheck size={12} weight="duotone" />
                  Confirmação extra para retirada distante
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowFarPickupSheet(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
              >
                Revisar pedido
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmedFarPickupContext(pickupDistanceContextKey);
                  setShowFarPickupSheet(false);
                  await proceedCheckout();
                }}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-[0_18px_32px_-20px_rgba(15,23,42,0.65)]"
              >
                Confirmo que vou retirar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmptyCartSheet && (
        <div className="fixed inset-0 z-[72]">
          <button
            type="button"
            onClick={() => setShowEmptyCartSheet(false)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            aria-label="Fechar aviso de carrinho vazio"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-slate-200 bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-20px_44px_-24px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-black text-slate-900">Seu pedido ficou sem itens</p>
            <p className="mt-2 text-sm text-slate-600">
              Você removeu todos os itens. Deseja voltar para o catálogo para continuar comprando?
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowEmptyCartSheet(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmptyCartSheet(false);
                  onBack();
                }}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
              >
                Voltar ao catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
