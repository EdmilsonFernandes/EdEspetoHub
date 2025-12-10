import React, { useMemo } from 'react';
import { ChevronLeft, Bike, Home, UtensilsCrossed, Send, WalletCards } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export const CartView = ({ cart, customer, customers = [], onChangeCustomer, onCheckout, onBack }) => {
  const cartItems = Object.values(cart);
  const total = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const isPickup = customer.type === 'pickup';
  const isDelivery = customer.type === 'delivery';
  const actionLabel = useMemo(() => {
    if (isPickup) return 'Gerar Pix e enviar pedido';
    if (isDelivery) return 'Finalizar pedido para entrega';
    return 'Finalizar pedido na mesa';
  }, [isDelivery, isPickup]);

  return (
    <div className="animate-in slide-in-from-right">
      <button onClick={onBack} className="mb-6 flex items-center text-gray-600 font-medium hover:text-red-600">
        <ChevronLeft size={20} /> Continuar comprando
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-6 text-lg">Detalhes do Pedido</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seu Nome</label>
            <input
              value={customer.name}
              onChange={(e) => onChangeCustomer({ ...customer, name: e.target.value })}
              placeholder="Ex: João Silva"
              list="customer-suggestions"
              className="w-full border-b-2 border-gray-100 py-3 text-lg outline-none focus:border-red-500 transition-colors placeholder:text-gray-300"
            />
            <datalist id="customer-suggestions">
              {customers.map((entry) => (
                <option key={entry.id || entry.name} value={entry.name}>
                  {entry.phone}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp</label>
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => onChangeCustomer({ ...customer, phone: e.target.value })}
              placeholder="(00) 00000-0000"
              className="w-full border-b-2 border-gray-100 py-3 text-lg outline-none focus:border-red-500 transition-colors placeholder:text-gray-300"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {['delivery', 'pickup', 'table'].map((type) => (
              <button
                key={type}
                onClick={() => onChangeCustomer({ ...customer, type })}
                className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  customer.type === type ? 'border-red-600 bg-red-50 text-red-700 font-bold' : 'border-gray-100 text-gray-400 grayscale'
                }`}
              >
                {type === 'delivery' && <Bike size={20} />}
                {type === 'pickup' && <Home size={20} />}
                {type === 'table' && <UtensilsCrossed size={20} />}
                <span className="text-[10px] uppercase font-bold tracking-wide">
                  {type === 'table' ? 'Mesa' : type === 'pickup' ? 'Retira' : 'Entrega'}
                </span>
              </button>
            ))}
          </div>

          {customer.type === 'delivery' && (
            <textarea
              value={customer.address}
              onChange={(e) => onChangeCustomer({ ...customer, address: e.target.value })}
              placeholder="Endereço completo (Rua, Número, Bairro, Complemento)"
              className="w-full bg-gray-50 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200 min-h-[100px]"
            />
          )}
          {customer.type === 'table' && (
            <input
              type="number"
              value={customer.table}
              onChange={(e) => onChangeCustomer({ ...customer, table: e.target.value })}
              placeholder="Nº da Mesa"
              className="w-full bg-gray-50 p-4 rounded-xl text-center font-bold text-xl outline-none focus:ring-2 focus:ring-red-200"
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-24">
        <h2 className="font-bold text-gray-800 mb-4 text-lg">Resumo</h2>
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <span className="bg-red-100 text-red-700 font-bold w-6 h-6 rounded flex items-center justify-center text-xs">
                {item.qty}
              </span>
              <span className="text-gray-700 font-medium">{item.name}</span>
            </div>
            <span className="font-bold text-gray-900">{formatCurrency(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-6 mt-2">
          <span className="text-gray-500 font-medium">Total a Pagar</span>
          <span className="text-3xl font-black text-gray-800">{formatCurrency(total)}</span>
        </div>

        <div className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">
          {isPickup && 'Pagamento via Pix será gerado automaticamente e enviado junto com o pedido.'}
          {isDelivery && 'Você finaliza o pedido agora e paga na entrega ou conforme combinado.'}
          {!isPickup && !isDelivery && 'Pedido será direcionado para atendimento na mesa sem cobrança antecipada.'}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto z-40">
        <button
          onClick={onCheckout}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isPickup ? <WalletCards size={20} /> : <Send size={20} />}
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
