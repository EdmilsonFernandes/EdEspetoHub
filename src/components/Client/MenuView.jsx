import React from 'react';
import { Plus, Minus, Image as ImageIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export const MenuView = ({ products, cart, onUpdateCart, onProceed }) => (
  <div className="animate-in fade-in">
    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
      {['Todos', 'Espetos', 'Bebidas', 'Porções'].map((category, index) => (
        <button
          key={category}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            index === 0 ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          {category}
        </button>
      ))}
    </div>

    <div className="grid gap-4">
      {products.map((item) => (
        <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4 transition-transform active:scale-[0.99]">
          <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ImageIcon size={24} />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-800 line-clamp-1">{item.name}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="font-bold text-gray-900 text-lg">{formatCurrency(item.price)}</span>

              {cart[item.id] ? (
                <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-2 shadow-inner">
                  <button
                    onClick={() => onUpdateCart(item, -1)}
                    className="w-6 h-6 flex items-center justify-center bg-white rounded text-red-600 shadow-sm"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm min-w-[16px] text-center">{cart[item.id].qty}</span>
                  <button
                    onClick={() => onUpdateCart(item, 1)}
                    className="w-6 h-6 flex items-center justify-center bg-green-600 rounded text-white shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onUpdateCart(item, 1)}
                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                >
                  Adicionar
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    {Object.keys(cart).length > 0 && (
      <div className="fixed bottom-6 left-6 right-6 z-40 max-w-lg mx-auto">
        <button
          onClick={onProceed}
          className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="bg-red-600 px-3 py-1 rounded-lg text-sm font-bold">
              {Object.values(cart).reduce((acc, item) => acc + item.qty, 0)}
            </span>
            <span className="font-bold">Ver sacola</span>
          </div>
          <span className="font-bold text-lg">
            {formatCurrency(Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0))}
          </span>
        </button>
      </div>
    )}
  </div>
);
