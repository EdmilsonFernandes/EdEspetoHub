// @ts-nocheck
import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  Bike,
  Home,
  UtensilsCrossed,
  Send,
  WalletCards,
  CreditCard,
  Search,
  User
} from "lucide-react";
import { formatCurrency, formatPhoneInput } from "../../utils/format";

export const CartView = ({
  cart,
  customer,
  customers = [],
  paymentMethod,
  onChangeCustomer,
  onChangePayment,
  onCheckout,
  onBack
}) => {
  const cartItems = Object.values(cart);
  const total = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const isPickup = customer.type === "pickup";
  const isDelivery = customer.type === "delivery";
  const isPix = paymentMethod === "pix";

  const actionLabel = useMemo(() => {
    if (isPickup) return "Gerar Pix e enviar pedido";
    if (isDelivery) return "Finalizar pedido para entrega";
    if (isPix) return "Finalizar pedido (Pix)";
    return "Finalizar pedido na mesa";
  }, [isDelivery, isPickup, isPix]);

  const handlePhoneChange = (nextValue) => {
    const formatted = formatPhoneInput(nextValue);
    onChangeCustomer({ ...customer, phone: formatted });
  };

  const normalizedQuery = customer.name?.trim().toLowerCase() || "";
  const filteredCustomers =
    normalizedQuery.length >= 3
      ? customers.filter((entry) =>
          entry.name?.toLowerCase().includes(normalizedQuery)
        )
      : [];
  const recentCustomers = customers.slice(0, 6);

  const handleNameChange = (value) => {
    const next = { ...customer, name: value };
    const normalized = value.trim().toLowerCase();
    if (normalized.length >= 3) {
      const match = customers.find(
        (entry) => entry.name?.trim().toLowerCase() === normalized
      );
      if (match?.phone) {
        next.phone = formatPhoneInput(match.phone);
      }
    }
    onChangeCustomer(next);
    setSuggestionsOpen(true);
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

  return (
    <div className="animate-in slide-in-from-right">
      {/* voltar */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-brand-primary font-semibold hover:opacity-80"
      >
        <ChevronLeft size={20} /> Continuar comprando
      </button>

      {/* Dados do cliente */}
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Detalhes do Pedido</h2>
            <p className="text-sm text-gray-500">Complete as infos para enviarmos seu pedido.</p>
          </div>
          <span className="text-xs font-semibold text-brand-primary bg-brand-primary-soft px-3 py-1 rounded-full">
            Etapa 1/2
          </span>
        </div>

        <div className="space-y-5">
          {/* Nome */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Seu Nome
            </label>
            <div className="relative mt-2">
              <input
                value={customer.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => filteredCustomers.length && setSuggestionsOpen(true)}
                onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                placeholder="Ex: João Silva"
                className="w-full border-b-2 border-gray-100 py-3 pl-9 text-lg outline-none focus:border-brand-primary placeholder:text-gray-300 bg-transparent"
              />
              <Search size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
              {suggestionsOpen && filteredCustomers.length > 0 && (
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
                        <User size={14} className="text-gray-400" />
                        {entry.name}
                      </span>
                      <span className="text-xs text-gray-500">{entry.phone || "Sem telefone"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {normalizedQuery.length < 3 && recentCustomers.length > 0 && (
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
          <div className="rounded-2xl border border-gray-100 p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              WhatsApp
            </label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(12) 90000-0000"
              className="w-full border-b-2 border-gray-100 py-3 text-lg outline-none focus:border-brand-primary placeholder:text-gray-300 bg-transparent"
            />
          </div>

          {/* Tipo de pedido */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Tipo de pedido
            </p>
            <div className="flex gap-3">
              {["delivery", "pickup", "table"].map((type) => (
                <button
                  key={type}
                  onClick={() => onChangeCustomer({ ...customer, type })}
                  className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    customer.type === type
                      ? "border-brand-primary bg-brand-primary-soft text-brand-primary font-bold"
                      : "border-gray-100 text-gray-400 grayscale"
                  }`}
                >
                  {type === "delivery" && <Bike size={20} />}
                  {type === "pickup" && <Home size={20} />}
                  {type === "table" && <UtensilsCrossed size={20} />}
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
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Endereço de entrega
              </p>
              <textarea
                value={customer.address}
                onChange={(e) =>
                  onChangeCustomer({ ...customer, address: e.target.value })
                }
                placeholder="Rua, número, bairro e referência"
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          )}

          {customer.type === "table" && (
            <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Escolha a mesa
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {tableOptions.map((table) => (
                  <button
                    key={table}
                    type="button"
                    onClick={() => onChangeCustomer({ ...customer, table })}
                    className={`py-2 rounded-lg text-sm font-semibold border transition ${
                      customer.table === table
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-24">
        <h2 className="font-bold text-gray-800 mb-4 text-lg">Resumo</h2>

        {cartItems.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="bg-brand-primary-soft text-brand-primary font-bold w-6 h-6 rounded flex items-center justify-center text-xs">
                {item.qty}
              </span>
              <span className="text-gray-700 font-medium">{item.name}</span>
            </div>
            <span className="font-bold text-gray-900">
              {formatCurrency(item.price * item.qty)}
            </span>
          </div>
        ))}

        <div className="flex justify-between items-center pt-6 mt-2">
          <span className="text-gray-500 font-medium">Total a Pagar</span>
          <span className="text-3xl font-black text-gray-800">
            {formatCurrency(total)}
          </span>
        </div>
        {customer.type === "table" && customer.table && (
          <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
            Mesa {customer.table}
          </div>
        )}

        <div className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">
          {isPickup &&
            "Pagamento via Pix será gerado automaticamente e enviado junto com o pedido."}
          {isDelivery &&
            "Você finaliza o pedido agora e paga na entrega ou conforme combinado."}
          {isPix &&
            "O QR Code do Pix aparecerá após finalizar o pedido."}
          {!isDelivery && !isPickup && !isPix &&
            "Pedido será direcionado para atendimento na mesa."}
        </div>
      </div>

      {/* Forma de Pagamento */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
          <CreditCard size={18} className="text-brand-primary" /> Forma de Pagamento
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "pix", label: "Pix", description: "Registro rápido" },
            { id: "debito", label: "Débito", description: "Pagamento no local" },
            { id: "credito", label: "Crédito", description: "Pagamento no local" }
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => onChangePayment(method.id)}
              className={`border-2 rounded-xl p-3 text-left transition-all ${
                paymentMethod === method.id
                  ? "border-brand-primary bg-brand-primary-soft text-brand-primary"
                  : "border-gray-100 text-gray-500 hover:border-brand-primary"
              }`}
            >
              <div className="font-bold">{method.label}</div>
              <div className="text-xs text-gray-500">{method.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Botão Finalizar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto z-40">
        <button
          onClick={onCheckout}
          className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isPickup ? <WalletCards size={20} /> : <Send size={20} />}
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
