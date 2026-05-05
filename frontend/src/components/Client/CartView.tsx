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
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { getPaymentMethodMeta, getPaymentProviderMeta } from "../../utils/paymentAssets";
import { RouteMapView } from "../RouteMapView";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { getStoreAvatarUrl } from "../../utils/storeAvatar";
import { formatSelectedModifiers, getModifiersTotal } from "../../utils/productModifiers";
import { getBundleDiscountForCartItem, getCartPricing } from "../../utils/orderPricing";
import { DddSelect } from "../common/DddSelect";
import { addressLookupService } from "../../services/addressLookupService";

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
  { id: "debito_presencial", label: "Débito", description: "Pagamento no atendimento", group: "local" },
  { id: "credito_presencial", label: "Crédito", description: "Pagamento no atendimento", group: "local" },
  { id: "pix_presencial", label: "Pix", description: "Pagamento confirmado no atendimento", group: "local" },
  { id: "dinheiro", label: "Dinheiro", description: "Pagamento no atendimento", group: "local" },
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
}) => {
  const isNativePlatform = Capacitor.isNativePlatform();
  const checkoutTopPaddingClass = isNativePlatform
    ? "pt-[max(calc(env(safe-area-inset-top)+0.8rem),1.05rem)]"
    : "pt-[max(calc(env(safe-area-inset-top)+1rem),1.25rem)]";
  const checkoutStickyTopClass = isNativePlatform
    ? "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.7rem)]"
    : "top-[max(calc(env(safe-area-inset-top)+0.45rem),0.75rem)]";
  const summaryStickyTopClass = isNativePlatform
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
  const [confirmedFarPickupContext, setConfirmedFarPickupContext] = useState("");
  const [hasTriedCheckout, setHasTriedCheckout] = useState(false);
  const [showOptionalPhoneFields, setShowOptionalPhoneFields] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const previousCartItemsCountRef = useRef<number>(cartItems.length);
  const cepLookupLockRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const cepInputRef = useRef<HTMLInputElement | null>(null);
  const premiumInputClass =
    "w-full rounded-2xl bg-slate-100 px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm";

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
      { id: "dinheiro", label: "Dinheiro", description: "Pagamento no atendimento", group: "local" },
    ],
    []
  );
  const resolvedPaymentMethods = useMemo(() => {
    if (isProfessionalUser) return PROFESSIONAL_PAYMENT_METHODS;
    const methods = paymentSummary?.methods || null;
    if (!methods) return fallbackPaymentMethods;
    const next = [];
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
      next.push({ id: "pix_loja", label: "Pix da loja", description: "Chave exibida após confirmar", group: "local" });
    }
    if (methods.cash !== false) {
      next.push({ id: "dinheiro", label: "Dinheiro", description: "Pagamento no atendimento", group: "local" });
    }
    return next.length ? next : [ { id: "dinheiro", label: "Dinheiro", description: "Pagamento no atendimento", group: "local" } ];
  }, [fallbackPaymentMethods, isProfessionalUser, paymentSummary]);
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

  const cashValidation = useMemo(() => {
    if (!isCash) return { blocked: false, reason: "" };
    if (!cashNeedsChange) return { blocked: false, reason: "" };
    if (cashTenderedValue === null) return { blocked: true, reason: "Informe com quanto vai pagar para calcular o troco." };
    if (cashTenderedValue < totalWithFee) {
      return { blocked: true, reason: "O valor para troco precisa ser maior ou igual ao total do pedido." };
    }
    return { blocked: false, reason: "" };
  }, [isCash, cashNeedsChange, cashTenderedValue, totalWithFee]);
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
      ? "Validar Endereço"
      : actionLabel;
  const isDeliveryValidationMode = isDelivery && !isPostalDelivery && !isDeliveryAddressValidated;
  const isPostalQuoteMode = isPostalDelivery && !selectedPostalService;
  const primaryCtaDisabled = isDeliveryValidationMode
    ? (cepLoading || checkoutLoading)
    : isPostalQuoteMode
    ? (checkoutLoading || postalQuoteLoading)
    : (checkoutLoading || checkoutDisabled || cashValidation.blocked);

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
    : "Revise o endereço, valide a distância e siga com o pedido sem perder contexto.";
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
    : deliveryStatus && deliveryCheck?.status !== "ok" && deliveryCheck?.status !== "out";
  const showDeliveryDebug = false; // Hidden from end users; validation feedback shown via status banner
  const hideOutOfRangeInlineReason = !isPostalDelivery && isDelivery && deliveryCheck?.status === "out";

  useEffect(() => {
    if (!isPostalDelivery && isDelivery && deliveryCheck?.status === "out") {
      setShowOutOfRangeSheet(true);
      return;
    }
    if (!isDelivery) {
      setShowOutOfRangeSheet(false);
    }
  }, [isDelivery, deliveryCheck?.status, isPostalDelivery]);

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

  return (
    <div className={`animate-in slide-in-from-right relative overflow-x-hidden no-x-scroll bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.10),transparent_34%),linear-gradient(180deg,#eef5f7_0%,#f8fafc_8.5rem,#f8fafc_100%)] ${checkoutTopPaddingClass} ${isNativePlatform ? "ds-native-nav-content-lg" : "pb-24"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[max(env(safe-area-inset-top),0.85rem)] bg-[linear-gradient(180deg,rgba(238,245,247,0.98),rgba(238,245,247,0.74))]" />
      <style>{`@keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      <div className={`sticky ${checkoutStickyTopClass} z-40 mb-4 sm:mb-6`}>
        <div className="rounded-[1.85rem] border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.97)_0%,rgba(244,248,252,0.96)_100%)] px-3 py-3 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          {useMultiStepFlow && (
            <div className="mb-3 flex items-center gap-1">
              {[{ label: 'Sacola', step: 1 }, { label: 'Entrega', step: 2 }, { label: 'Pagamento', step: 3 }, { label: 'Confirmar', step: 4 }].map(({ label, step }, i) => {
                const isActive = checkoutStep === step;
                const isDone = checkoutStep > step;
                return (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-1">
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black transition-colors ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {isDone ? '✓' : step}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wide transition-colors ${isActive ? 'text-slate-900' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                    </div>
                    {i < 3 && <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={useMultiStepFlow && checkoutStep > 1 ? () => setCheckoutStep(s => s - 1) : onBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-slate-200/80 bg-white text-[#336886] shadow-[0_14px_28px_-18px_rgba(51,104,134,0.3)] transition hover:-translate-y-0.5 hover:bg-sky-50 active:scale-95"
              aria-label={useMultiStepFlow && checkoutStep > 1 ? "Voltar à etapa anterior" : "Voltar ao cardápio"}
              title={useMultiStepFlow && checkoutStep > 1 ? "Voltar à etapa anterior" : "Voltar ao cardápio"}
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
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
      {(!useMultiStepFlow || checkoutStep > 1) && <div className={`sm:hidden mb-4 rounded-2xl border border-slate-100 bg-white px-4 ${summaryCompact ? 'py-2' : 'py-2.5'} flex items-center justify-between sticky ${summaryStickyTopClass} z-30 transition-all shadow-sm`}>
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
                  autoComplete="name"
                  autoCapitalize="words"
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
                    name="customerPhone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
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
                    name="customerPhone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
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
                    className={`flex min-h-[74px] min-w-0 flex-1 items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                      isActive
                        ? "border-slate-900 bg-white text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.45)]"
                        : "border-transparent bg-white/60 text-slate-500 hover:border-slate-200 hover:bg-white"
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
              {postalEnabled && (
                <div className={`${showCustomerFulfillmentInsights ? 'mt-4' : 'mt-0'} rounded-[1.2rem] border border-slate-200 bg-slate-100/80 p-1.5 grid grid-cols-2 gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]`}>
                  <button
                    type="button"
                    onClick={() => onChangeDeliveryMode?.("distance")}
                    className={`rounded-[1rem] px-3 py-2.5 text-xs font-black transition ${
                      !isPostalDelivery
                        ? "bg-white text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)]"
                        : "bg-transparent text-slate-500 hover:bg-white/70"
                    }`}
                  >
                    Entrega local
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDeliveryMode?.("postal")}
                    className={`rounded-[1rem] px-3 py-2.5 text-xs font-black transition ${
                      isPostalDelivery
                        ? "bg-white text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)]"
                        : "bg-transparent text-slate-500 hover:bg-white/70"
                    }`}
                  >
                    Envio postal
                  </button>
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
                          ref={cepInputRef}
                          name="postalCode"
                          value={customer.cep || ""}
                          onChange={(e) => updateDeliveryField("cep", e.target.value)}
                          onBlur={handleCepLookup}
                          disabled={cepLoading}
                          placeholder="00000-000"
                          autoComplete="postal-code"
                          inputMode="numeric"
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
                            name="addressLine1"
                            value={customer.street || ""}
                            onChange={(e) => updateDeliveryField("street", e.target.value)}
                            placeholder="Rua, avenida"
                            autoComplete="address-line1"
                            autoCapitalize="words"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numero</label>
                          <input
                            name="addressNumber"
                            value={customer.number || ""}
                            onChange={(e) => updateDeliveryField("number", e.target.value)}
                            placeholder="Numero"
                            autoComplete="address-line2"
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
                            name="addressNeighborhood"
                            value={customer.neighborhood || ""}
                            onChange={(e) => updateDeliveryField("neighborhood", e.target.value)}
                            placeholder="Bairro"
                            autoComplete="address-level3"
                            autoCapitalize="words"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Complemento</label>
                          <input
                            name="addressComplement"
                            value={customer.complement || ""}
                            onChange={(e) => updateDeliveryField("complement", e.target.value)}
                            placeholder="Apto, bloco, referencia"
                            autoComplete="address-line3"
                            autoCapitalize="words"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
                          <input
                            name="addressCity"
                            value={customer.city || ""}
                            onChange={(e) => updateDeliveryField("city", e.target.value)}
                            placeholder="Cidade"
                            autoComplete="address-level2"
                            autoCapitalize="words"
                            enterKeyHint="next"
                            className={premiumInputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">UF</label>
                          <input
                            name="addressState"
                            value={customer.state || ""}
                            onChange={(e) => updateDeliveryField("state", e.target.value)}
                            placeholder="UF"
                            autoComplete="address-level1"
                            autoCapitalize="characters"
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
                    {customer.address && !isLoggedDeliveryFlow && (
                      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                          <MapPinLine size={14} weight="fill" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Destino</p>
                          <p className="mt-0.5 text-[13px] font-semibold leading-snug text-slate-900">{customer.address}</p>
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
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Escolha a mesa
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {tableOptions.map((table) => {
                  const isSelected = customer.table === table;
                  return (
                  <button
                    key={table}
                    type="button"
                    onClick={() => handleSelectTable(table)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${
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
              <input
                value={customer.table}
                onChange={(e) => handleTableInputChange(e.target.value)}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                placeholder="Número da mesa"
                className={`${premiumInputClass} sm:py-4`}
              />
              <p className="text-xs text-slate-500">
                Você pode lançar múltiplos pedidos na mesma mesa.
              </p>
            </div>
          )}
        </div>
      </div>}

      {/* Resumo */}
      {(!useMultiStepFlow || checkoutStep === 1) && <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-4 sm:mb-6 transition-all hover:-translate-y-0.5 active:scale-[0.99] shadow-sm">
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

        <div className="flex justify-between items-center pt-4 sm:pt-6 mt-1 sm:mt-2">
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

      </div>}

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
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-4 shadow-sm">
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
          <div className="space-y-2 text-sm">
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
      {(!useMultiStepFlow || checkoutStep === 3) && <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6 mb-4 sm:mb-6 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.3)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2 tracking-tight">
              <CreditCard size={18} className="text-slate-900" /> Forma de Pagamento
            </h2>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
              Escolha como deseja confirmar este pedido.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {paymentGroups.online.length > 0 && (
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Online</p>
                  <p className="mt-1 text-[11px] text-slate-500">Cobrança processada com segurança.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm">
                  {mercadoPagoMeta.icon ? (
                    <img src={mercadoPagoMeta.icon} alt={mercadoPagoMeta.label} className="h-4 w-4 object-contain" />
                  ) : (
                    <ShieldCheck size={12} weight="duotone" className="text-emerald-600" />
                  )}
                  <span className="hidden sm:inline">Mercado Pago</span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <ShieldCheck size={10} weight="duotone" className="text-emerald-600" />
                    Seguro
                  </span>
                </div>
              </div>
              <div className={`grid gap-3 ${paymentGroups.online.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                {paymentGroups.online.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => onChangePayment(method.id)}
                    className={`rounded-[1.35rem] border p-4 text-left transition-all active:scale-[0.985] ${
                      paymentMethod === method.id
                        ? "border-orange-400 bg-orange-50/70 text-slate-900 shadow-[0_16px_36px_-28px_rgba(249,115,22,0.55)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:shadow-[0_14px_30px_-30px_rgba(15,23,42,0.3)]"
                    }`}
                  >
                    {(() => {
                      const methodMeta = getPaymentMethodMeta(method.id);
                      return (
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            paymentMethod === method.id
                              ? "border-orange-200 bg-white text-orange-500"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}>
                            {methodMeta.icon ? (
                              <img
                                src={methodMeta.icon}
                                alt={methodMeta.label}
                                className="h-5 w-5 object-contain"
                              />
                            ) : (
                              <CreditCard size={16} />
                            )}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm sm:text-[15px] font-bold tracking-tight text-slate-900">{method.label}</div>
                            <div className="text-[11px] leading-relaxed text-slate-500">
                              {method.description}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentGroups.local.length > 0 && (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Na loja</p>
                <p className="mt-1 text-[11px] text-slate-500">Pagamento confirmado no atendimento ou na retirada.</p>
              </div>
              <div className={`grid gap-3 ${paymentGroups.local.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                {paymentGroups.local.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => onChangePayment(method.id)}
                    className={`rounded-[1.35rem] border p-4 text-left transition-all active:scale-[0.985] ${
                      paymentMethod === method.id
                        ? "border-orange-400 bg-orange-50/70 text-slate-900 shadow-[0_16px_36px_-28px_rgba(249,115,22,0.55)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:shadow-[0_14px_30px_-30px_rgba(15,23,42,0.3)]"
                    }`}
                  >
                    {(() => {
                      const methodMeta = getPaymentMethodMeta(method.id);
                      return (
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            paymentMethod === method.id
                              ? "border-orange-200 bg-white text-orange-500"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}>
                            {methodMeta.icon ? (
                              <img
                                src={methodMeta.icon}
                                alt={methodMeta.label}
                                className="h-5 w-5 object-contain"
                              />
                            ) : (
                              <CreditCard size={16} />
                            )}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm sm:text-[15px] font-bold tracking-tight text-slate-900">{method.label}</div>
                            <div className="text-[11px] leading-relaxed text-slate-500">
                              {method.description}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isManualPix && (
          <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-emerald-200 overflow-hidden">
              <img src={getPaymentMethodMeta("pix_loja").icon} alt="Pix da loja" className="h-5 w-5 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-emerald-700">Pix da loja</p>
              <p className="text-[10px] text-slate-500 leading-tight">
                A chave Pix da loja será exibida após confirmar o pedido.
              </p>
            </div>
          </div>
        )}
      </div>}

      {(!useMultiStepFlow || checkoutStep === 3) && isCash && (
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-amber-50/35 to-white rounded-2xl border border-amber-100 p-4 sm:p-6 mb-4 sm:mb-6 transition-all hover:-translate-y-0.5 active:scale-[0.99] space-y-3 shadow-[0_28px_56px_-44px_rgba(245,158,11,0.4)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400/80 via-amber-500/60 to-white" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm sm:text-base font-extrabold text-slate-800">Troco</p>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Se for pagar com uma nota maior, informe aqui para o entregador levar o troco certinho.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCashNeedsChange((prev) => !prev)}
              className={`btn-press px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${
                cashNeedsChange
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-white/70 text-slate-700 border-slate-200"
              }`}
            >
              {cashNeedsChange ? "Precisa de troco" : "Sem troco"}
            </button>
          </div>

          {cashNeedsChange && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Vou pagar com (R$)</label>
                <input
                  value={cashTenderedInput}
                  onChange={(event) => setCashTenderedInput(event.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${premiumInputClass} text-sm`}
                />
                <p className="text-[11px] text-slate-500">
                  Total do pedido:{" "}
                  <span className="font-bold text-slate-700">{formatCurrency(totalWithFee || 0)}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-extrabold">Troco</p>
                <p className="mt-2 text-lg font-black text-slate-900 tabular-nums">
                  {cashChangeDue !== null && cashChangeDue >= 0 ? formatCurrency(cashChangeDue) : formatCurrency(0)}
                </p>
                {cashValidation.blocked && (
                  <p className="mt-1 text-[11px] text-rose-600 font-semibold">{cashValidation.reason}</p>
                )}
                {!cashValidation.blocked && cashTenderedValue !== null && cashTenderedValue >= totalWithFee && (
                  <p className="mt-1 text-[11px] text-emerald-700 font-semibold">Entregador leva troco certinho.</p>
                )}
              </div>
            </div>
          )}
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
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                      {[customer.street, customer.number, customer.neighborhood, customer.city].filter(Boolean).join(', ') || customer.address || '—'}
                    </p>
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
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                isOnlinePaymentMethod ? 'bg-sky-50 text-[#009ee3]' : isManualPix ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                <CreditCard size={18} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Pagamento</p>
                {(() => {
                  const methodMeta = getPaymentMethodMeta(paymentMethod);
                  return (
                    <div className="mt-1 flex items-center gap-2">
                      {methodMeta.icon ? (
                        <img src={methodMeta.icon} alt={methodMeta.label} className="h-5 w-5 object-contain" />
                      ) : (
                        <CreditCard size={16} weight="duotone" className="text-slate-500" />
                      )}
                      <span className="text-sm font-semibold text-slate-800 capitalize">{methodMeta.label}</span>
                    </div>
                  );
                })()}
                {isCash && cashNeedsChange && cashTenderedValue !== null && cashTenderedValue >= totalWithFee ? (
                  <p className="mt-1 text-xs text-slate-500">Troco para {formatCurrency(cashTenderedValue)} • devolução {formatCurrency(cashChangeDue)}</p>
                ) : null}
                {isOnlinePaymentMethod ? (
                  <p className="mt-1 text-xs text-slate-500">Cobrança segura via Mercado Pago.</p>
                ) : isManualPix ? (
                  <p className="mt-1 text-xs text-slate-500">A chave Pix da loja será exibida após confirmar o pedido.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Finalizar */}
      <div className={`fixed left-0 right-0 w-full box-border p-4 border-t border-slate-100 bg-white/90 backdrop-blur-md max-w-lg mx-auto z-50 shadow-[0_-14px_28px_-22px_rgba(15,23,42,0.28)] ${isNativePlatform ? "ds-native-nav-dock" : "bottom-0"}`}>
        {useMultiStepFlow ? (
          <>
            {checkoutStep >= 3 && (
              <p className="text-[11px] text-slate-400 text-center leading-relaxed mb-2">
                Pedido processado pelo estabelecimento, responsável por produtos, preparo, preços e entrega.
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
                    (customer.type === 'delivery' && (deliveryCheck?.status === 'out' || deliveryCheck?.status === 'loading')) ||
                    (customer.type === 'table' && !String(customer.table || '').trim())
                  )
                : checkoutStep === 3
                ? (checkoutDisabled || cashValidation.blocked)
                : checkoutStep === 4
                ? (checkoutLoading || checkoutDisabled || cashValidation.blocked)
                : false}
              className={`w-full font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                (checkoutStep === 2 && (
                  checkoutLoading ||
                  (customer.type === 'delivery' && (deliveryCheck?.status === 'out' || deliveryCheck?.status === 'loading')) ||
                  (customer.type === 'table' && !String(customer.table || '').trim())
                )) ||
                (checkoutStep === 3 && (checkoutDisabled || cashValidation.blocked)) ||
                (checkoutStep === 4 && (checkoutLoading || checkoutDisabled || cashValidation.blocked))
                  ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                  : checkoutStep === 4
                  ? isOnlinePaymentMethod ? "bg-[#009ee3] text-white cursor-pointer" : "bg-emerald-600 text-white cursor-pointer"
                  : "bg-slate-900 text-white cursor-pointer"
              }`}
              style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
            >
              {checkoutStep < 3
                ? <>
                    {isLoggedDeliveryFlow && !hasSavedAddress && checkoutStep === 2
                      ? 'Cadastrar endereço'
                      : checkoutStep === 2 && isDeliveryValidationMode
                      ? 'Validar endereço'
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
                      ? 'Processando...'
                      : isOnlinePaymentMethod
                      ? <><img src={mercadoPagoMeta.icon} alt="" className="h-5 w-5 object-contain brightness-0 invert" /> {isOnlinePix ? 'Gerar Pix via Mercado Pago' : 'Pagar via Mercado Pago'} <span className="opacity-70">•</span> {formatCurrency(totalWithFee)}</>
                      : <>{isPickup ? <Wallet size={20} weight="duotone" /> : <PaperPlaneTilt size={20} weight="duotone" />} {'Confirmar pedido'} <span className="opacity-70">•</span> {formatCurrency(totalWithFee)}</>
                    }
                  </>
              }
            </button>
            {hasTriedCheckout && checkoutStep === 4 && (checkoutDisabled || cashValidation.blocked) && (checkoutDisabledReason || cashValidation.reason) && (
              <p className="mt-2 text-center text-[11px] text-rose-600 font-semibold">
                {cashValidation.blocked ? cashValidation.reason : checkoutDisabledReason}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed mb-2">
              Pedido processado pelo estabelecimento, responsável por produtos, preparo, preços e entrega.
            </p>
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
              className={`w-full font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                primaryCtaDisabled
                  ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                  : "bg-slate-900 text-white cursor-pointer"
              }`}
              style={ctaPulse ? { animation: 'btnPop 220ms ease' } : undefined}
            >
              {isPickup ? <Wallet size={20} weight="duotone" /> : <PaperPlaneTilt size={20} weight="duotone" />}
              {checkoutLoading ? "Processando..." : primaryCtaLabel}
            </button>
            {hasTriedCheckout && !isDeliveryValidationMode && (checkoutDisabled || cashValidation.blocked) && !hideOutOfRangeInlineReason && (checkoutDisabledReason || cashValidation.reason) && (
              <p className="mt-2 text-center text-[11px] text-rose-600 font-semibold">
                {cashValidation.blocked ? cashValidation.reason : checkoutDisabledReason}
              </p>
            )}
          </>
        )}
      </div>

      {showOutOfRangeSheet && (
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
