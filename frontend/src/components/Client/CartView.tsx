// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CaretDown,
  Bicycle,
  House,
  ForkKnife,
  PaperPlaneTilt,
  Wallet,
  CreditCard,
  MagnifyingGlass,
  User
} from "@phosphor-icons/react";
import { formatCurrency, formatPhoneInput } from "../../utils/format";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";

export const CartView = ({
  cart,
  customer,
  customers = [],
  paymentMethod,
  allowCustomerAutocomplete = false,
  allowedOrderTypes = [ "delivery", "pickup", "table" ],
  deliveryRadiusKm = null,
  deliveryFee = 0,
  deliveryCheck = { status: "idle", distanceKm: null },
  storeAddress = "",
  checkoutDisabled = false,
  checkoutDisabledReason = "",
  onChangeCustomer,
  onChangePayment,
  onCheckout,
  onBack
}) => {
  const cartItems = Object.values(cart);
  const total = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
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
  const [showTips, setShowTips] = useState(false);
  const [summaryCompact, setSummaryCompact] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const visibleOrderTypes = Array.isArray(allowedOrderTypes) && allowedOrderTypes.length
    ? allowedOrderTypes
    : [ "delivery", "pickup", "table" ];
  const isPickup = customer.type === "pickup";
  const isDelivery = customer.type === "delivery";
  const isPix = paymentMethod === "pix";
  const isCredit = paymentMethod === "credito";
  const isDebit = paymentMethod === "debito";
  const isCash = paymentMethod === "dinheiro";
  const deliveryFeeValue = isDelivery ? normalizeNumber(deliveryFee) || 0 : 0;
  const radiusValue = normalizeNumber(deliveryRadiusKm);
  const totalWithFee = total + deliveryFeeValue;

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

  const handlePhoneChange = (nextValue) => {
    const formatted = formatPhoneInput(nextValue);
    onChangeCustomer({ ...customer, phone: formatted });
  };

  const normalizedQuery = customer.name?.trim().toLowerCase() || "";
  const filteredCustomers =
    allowCustomerAutocomplete && normalizedQuery.length >= 3
      ? customers.filter((entry) =>
          entry.name?.toLowerCase().includes(normalizedQuery)
        )
      : [];
  const recentCustomers = allowCustomerAutocomplete ? customers.slice(0, 6) : [];

  const handleNameChange = (value) => {
    const next = { ...customer, name: value };
    if (allowCustomerAutocomplete) {
      const normalized = value.trim().toLowerCase();
      if (normalized.length >= 3) {
        const match = customers.find(
          (entry) => entry.name?.trim().toLowerCase() === normalized
        );
        if (match?.phone) {
          next.phone = formatPhoneInput(match.phone);
        }
      }
    }
    onChangeCustomer(next);
    if (allowCustomerAutocomplete) {
      setSuggestionsOpen(true);
    }
  };

  const handleSelectCustomer = (entry) => {
    onChangeCustomer({
      ...customer,
      name: entry.name,
      phone: formatPhoneInput(entry.phone || ""),
    });
    setSuggestionsOpen(false);
  };

  const tableOptions = Array.from({ length: 12 }, (_, index) => `${index + 1}`);
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar varinha');
    return labels.length ? labels.join(' • ') : '';
  };

  const buildDeliveryAddress = (data) => {
    const parts = [
      data.street && `${data.street}, ${data.number || "s/n"}`,
      data.complement,
      data.neighborhood,
      data.city && data.state ? `${data.city} - ${data.state}` : data.city,
      data.cep && `CEP ${data.cep}`,
    ].filter(Boolean);
    return parts.join(" | ");
  };

  const updateDeliveryField = (field, value) => {
    const next = { ...customer, [field]: value };
    next.address = buildDeliveryAddress(next);
    onChangeCustomer(next);
    if (field === "cep") {
      setCepError("");
    }
  };

  const handleCepLookup = async () => {
    const rawCep = (customer.cep || "").replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();
      if (data?.erro) {
        setCepError("CEP não encontrado.");
        return;
      }
      const next = {
        ...customer,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        complement: data.complemento || "",
      };
      next.address = buildDeliveryAddress(next);
      onChangeCustomer(next);
    } catch (error) {
      setCepError("Não foi possível consultar o CEP agora.");
    } finally {
      setCepLoading(false);
    }
  };


  const normalizedStoreAddress = (storeAddress || "").toString().trim();
  const deliveryStatus = useMemo(() => {
    if (!isDelivery) return null;
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
        label: `Endereço fora do raio (${distanceLabel} / ${radiusValue} km).`,
      };
    }
    if (deliveryCheck?.status === "error") {
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
    return {
      tone: "bg-slate-50 text-slate-600 border-slate-200",
      label: "Informe o endereço para validar a entrega.",
    };
  }, [deliveryCheck?.distanceKm, deliveryCheck?.status, isDelivery, normalizedStoreAddress, radiusValue]);

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

  return (
    <div className="animate-in slide-in-from-right">
      {/* voltar */}
      <button
        onClick={onBack}
        className="mb-4 sm:mb-6 flex items-center text-brand-primary font-semibold hover:opacity-80 text-sm sm:text-base"
      >
        <ArrowLeft size={20} weight="duotone" /> Continuar comprando
      </button>

      {/* Resumo compacto (mobile) */}
      <div className={`sm:hidden mb-4 rounded-2xl border border-slate-200 bg-white/90 shadow-sm px-4 ${summaryCompact ? 'py-2' : 'py-2.5'} flex items-center justify-between sticky top-2 z-40 backdrop-blur-sm transition-all`}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Resumo rápido</p>
          <p className="text-sm font-semibold text-slate-800">
            {cartItems.reduce((acc, item) => acc + item.qty, 0)} itens
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">Total</p>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totalWithFee)}</p>
        </div>
      </div>

      {/* Dados do cliente */}
      <div className="bg-white rounded-3xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="font-bold text-gray-800 text-base sm:text-lg">Detalhes do Pedido</h2>
            <p className="text-xs text-gray-500 hidden sm:block">Complete as infos para enviarmos seu pedido.</p>
          </div>
          <span className="text-xs font-semibold text-brand-primary bg-brand-primary-soft px-3 py-1 rounded-full">
            Etapa 1/2
          </span>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Nome */}
          <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Seu Nome
            </label>
            <div className="relative mt-2">
              <input
                ref={nameInputRef}
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
                placeholder="Ex: João Silva"
                className="w-full border-b-2 border-gray-100 py-2.5 sm:py-3 pl-9 text-base sm:text-lg outline-none focus:border-brand-primary placeholder:text-gray-300 bg-transparent"
              />
              <MagnifyingGlass size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
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
            {allowCustomerAutocomplete &&
              normalizedQuery.length < 3 &&
              recentCustomers.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Clientes recentes
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentCustomers.map((entry) => (
                    <button
                      key={entry.id || entry.name}
                      type="button"
                      onClick={() => handleSelectCustomer(entry)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      {entry.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              WhatsApp {customer.type === "table" ? "(opcional)" : ""}
            </label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(12) 90000-0000"
              className="w-full border-b-2 border-gray-100 py-2.5 sm:py-3 text-base sm:text-lg outline-none focus:border-brand-primary placeholder:text-gray-300 bg-transparent"
            />
            {customer.type === "table" && (
              <p className="mt-1 text-[11px] text-gray-400">
                Para pedidos na mesa, o telefone pode ficar em branco.
              </p>
            )}
          </div>

          {/* Tipo de pedido */}
          <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Tipo de pedido
            </p>
            <div className="flex gap-2 sm:gap-3">
              {visibleOrderTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onChangeCustomer({ ...customer, type })}
                  className={`flex-1 py-2.5 sm:py-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] ${
                    customer.type === type
                      ? "border-brand-primary bg-gradient-to-br from-brand-primary-soft/70 to-white text-brand-primary shadow-md"
                      : "border-gray-100 text-gray-500 hover:border-brand-primary hover:shadow-sm hover:-translate-y-0.5"
                  }`}
                >
                  <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${customer.type === type ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {type === "delivery" && <Bicycle size={16} weight="duotone" />}
                    {type === "pickup" && <House size={16} weight="duotone" />}
                    {type === "table" && <ForkKnife size={16} weight="duotone" />}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wide">
                    {type === "table"
                      ? "Mesa"
                      : type === "pickup"
                      ? "Retira"
                      : "Entrega"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Endereço */}
          {customer.type === "delivery" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Endereço de entrega
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-1">
                  Entrega
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">CEP</label>
                      <input
                        value={customer.cep || ""}
                        onChange={(e) => updateDeliveryField("cep", e.target.value)}
                        onBlur={handleCepLookup}
                        disabled={cepLoading}
                        placeholder="00000-000"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleCepLookup}
                        disabled={cepLoading}
                        className="w-full px-3 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {cepLoading ? "Buscando..." : "Buscar CEP"}
                      </button>
                    </div>
                  </div>
                  {cepError && <p className="text-xs text-red-600">{cepError}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Rua / Avenida</label>
                      <input
                        value={customer.street || ""}
                        onChange={(e) => updateDeliveryField("street", e.target.value)}
                        placeholder="Rua, avenida"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Numero</label>
                      <input
                        value={customer.number || ""}
                        onChange={(e) => updateDeliveryField("number", e.target.value)}
                        placeholder="Numero"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bairro</label>
                      <input
                        value={customer.neighborhood || ""}
                        onChange={(e) => updateDeliveryField("neighborhood", e.target.value)}
                        placeholder="Bairro"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Complemento</label>
                      <input
                        value={customer.complement || ""}
                        onChange={(e) => updateDeliveryField("complement", e.target.value)}
                        placeholder="Apto, bloco, referencia"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">Cidade</label>
                      <input
                        value={customer.city || ""}
                        onChange={(e) => updateDeliveryField("city", e.target.value)}
                        placeholder="Cidade"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">UF</label>
                      <input
                        value={customer.state || ""}
                        onChange={(e) => updateDeliveryField("state", e.target.value)}
                        placeholder="UF"
                        className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/60 p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Entrega</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {radiusValue ? `Até ${radiusValue} km` : 'Sem limite de raio'}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-1">
                      Frete
                    </span>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Valor do frete</span>
                    <span className={`text-sm font-bold ${deliveryFeeValue > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {deliveryFeeValue > 0 ? formatCurrency(deliveryFeeValue) : 'Grátis'}
                    </span>
                  </div>
                  {customer.address && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                      {customer.address}
                    </div>
                  )}
                  {deliveryStatus && (
                    <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${deliveryStatus.tone}`}>
                      {deliveryStatus.label}
                    </div>
                  )}
                  {deliveryDebug && (
                    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">Status da validação</p>
                      <div className="space-y-1 text-[11px] text-slate-600">
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

          {customer.type === "table" && (
            <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Escolha a mesa
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {tableOptions.map((table) => (
                  <button
                    key={table}
                    type="button"
                    onClick={() => onChangeCustomer({ ...customer, table })}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${
                      customer.table === table
                        ? "bg-white text-slate-900 border-brand-primary ring-2 ring-brand-primary/30 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.2)]"
                        : "bg-white/80 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-brand-primary/40"
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
              <input
                value={customer.table}
                onChange={(e) =>
                  onChangeCustomer({ ...customer, table: e.target.value })
                }
                inputMode="numeric"
                placeholder="Outra mesa (ex: 18)"
                className="w-full p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]">
        <h2 className="font-bold text-gray-800 mb-3 sm:mb-4 text-base sm:text-lg">Resumo</h2>

        {cartItems.map((item) => (
          <div
            key={item.key || item.id}
            className="flex justify-between items-center py-2 sm:py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="bg-brand-primary-soft text-brand-primary font-bold w-6 h-6 rounded flex items-center justify-center text-xs">
                {item.qty}
              </span>
              <div className="flex flex-col">
                <span className="text-gray-700 font-medium text-sm sm:text-base">{item.name}</span>
                {formatItemOptions(item) && (
                  <span className="text-[11px] text-gray-500">{formatItemOptions(item)}</span>
                )}
              </div>
            </div>
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
          </div>
        ))}

        {isDelivery && deliveryFeeValue > 0 && (
          <div className="flex justify-between items-center pt-4 text-sm text-slate-600">
            <span>Frete</span>
            <span className="font-semibold text-slate-800">{formatCurrency(deliveryFeeValue)}</span>
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

      </div>

      {/* Forma de Pagamento */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-base sm:text-lg flex items-center gap-2">
            <CreditCard size={18} className="text-brand-primary" /> Forma de Pagamento
          </h2>
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
            Seguro e rápido
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: "pix", label: "Pix", description: "Registro rápido" },
            { id: "debito", label: "Débito", description: "Pague no local" },
            { id: "credito", label: "Crédito", description: "Pague no local" },
            { id: "dinheiro", label: "Dinheiro", description: "Troco opcional" }
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => onChangePayment(method.id)}
              className={`rounded-2xl p-3 sm:p-4 text-left transition-all border active:scale-[0.98] ${
                paymentMethod === method.id
                  ? "border-brand-primary bg-gradient-to-br from-brand-primary/15 via-white to-white text-brand-primary shadow-lg ring-2 ring-brand-primary/30"
                  : "border-gray-100 text-gray-500 bg-white/70 hover:border-brand-primary/40 hover:shadow-sm hover:-translate-y-0.5"
              }`}
            >
              {(() => {
                const methodMeta = getPaymentMethodMeta(method.id);
                return (
                  <div className="flex items-center gap-3">
                    <span className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-md ${paymentMethod === method.id ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
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
                    <div className="space-y-1">
                      <div className="text-sm sm:text-base font-semibold tracking-tight">{method.label}</div>
                      <div className={`text-[11px] sm:text-xs ${paymentMethod === method.id ? 'text-brand-primary/70' : 'text-gray-500'}`}>
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]">
        <button
          type="button"
          onClick={() => setShowTips((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Dicas do pagamento
          <CaretDown
            size={18}
            className={`transition-transform ${showTips ? "rotate-180" : ""}`}
            weight="duotone"
          />
        </button>
        {showTips && (
          <div className="px-4 pb-4 text-[11px] sm:text-xs text-gray-500 leading-relaxed space-y-2">
            {isPickup &&
              "Pagamento via Pix será gerado automaticamente e enviado junto com o pedido."}
            {isDelivery &&
              "Você finaliza o pedido agora e paga na entrega ou conforme combinado."}
            {isPix &&
              "O QR Code do Pix aparecerá após finalizar o pedido."}
            {isCash &&
              "Pagamento em dinheiro será confirmado no balcão."}
            {!isDelivery && !isPickup && !isPix && !isCash &&
              "Pedido será direcionado para atendimento na mesa."}
          </div>
        )}
      </div>

      {/* Botão Finalizar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-100 max-w-lg mx-auto z-40">
        <button
          onClick={onCheckout}
          disabled={checkoutDisabled}
          className={`w-full font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
            checkoutDisabled
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-brand-primary text-white cursor-pointer"
          }`}
        >
          {isPickup ? <Wallet size={20} weight="duotone" /> : <PaperPlaneTilt size={20} weight="duotone" />}
          {actionLabel}
        </button>
        {checkoutDisabled && checkoutDisabledReason && (
          <p className="mt-2 text-center text-[11px] text-rose-600 font-semibold">{checkoutDisabledReason}</p>
        )}
      </div>
    </div>
  );
};
