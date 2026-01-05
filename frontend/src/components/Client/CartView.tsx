// @ts-nocheck
import React, { useMemo } from "react";
import {
  ChevronLeft,
  Bike,
  Home,
  UtensilsCrossed,
  Send,
  WalletCards,
  CreditCard
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
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-6 text-lg">Detalhes do Pedido</h2>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Seu Nome
            </label>
            <input
              value={customer.name}
              onChange={(e) =>
                onChangeCustomer({ ...customer, name: e.target.value })
              }
              placeholder="Ex: João Silva"
              list="customer-suggestions"
              className="w-full border-b-2 border-gray-100 py-3 text-lg outline-none focus:border-brand-primary placeholder:text-gray-300"
            />
            <datalist id="customer-suggestions">
              {customers.map((entry) => (
                <option key={entry.id || entry.name} value={entry.name}>
                  {entry.phone}
                </option>
              ))}
            </datalist>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              WhatsApp
            </label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(12) 90000-0000"
              className="w-full border-b-2 border-gray-100 py-3 text-lg outline-none focus:border-brand-primary placeholder:text-gray-300"
            />
          </div>

          {/* Tipo de pedido */}
          <div className="flex gap-3 pt-2">
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

          {/* Endereço */}
          {customer.type === "delivery" && (
            <textarea
              value={customer.address}
              onChange={(e) =>
                onChangeCustomer({ ...customer, address: e.target.value })
              }
              placeholder="Endereço completo"
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
            />
          )}

          {customer.type === "table" && (
            <input
              value={customer.table}
              onChange={(e) =>
                onChangeCustomer({ ...customer, table: e.target.value })
              }
              placeholder="Número da mesa"
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary"
            />
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
