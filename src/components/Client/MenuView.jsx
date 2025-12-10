import React, { useMemo, useState } from 'react';
import { Plus, Minus, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export const MenuView = ({ products, cart, onUpdateCart, onProceed }) => {
  const [selectedCategory, setSelectedCategory] = useState('Espetos');

  const categories = useMemo(() => {
    const unique = new Set();
    products.forEach((item) => {
      if (!item.category) return;
      const label = item.category.charAt(0).toUpperCase() + item.category.slice(1);
      unique.add(label);
    });

    const ordered = ['Espetos', 'Produtos'];
    const others = Array.from(unique).filter((cat) => !ordered.includes(cat));
    return ['Todos', ...ordered, ...others];
  }, [products]);

  const sortedProducts = useMemo(() => {
    const espetos = [];
    const others = [];

    products.forEach((item) => {
      if (item.category?.toLowerCase().includes('espeto')) {
        espetos.push(item);
      } else {
        others.push(item);
      }
    });

    return [...espetos, ...others];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return sortedProducts;

    if (selectedCategory === 'Espetos') {
      return sortedProducts.filter((item) => item.category?.toLowerCase().includes('espeto'));
    }

    if (selectedCategory === 'Produtos') {
      return sortedProducts.filter((item) => !item.category?.toLowerCase().includes('espeto'));
    }

    return sortedProducts.filter(
      (item) => item.category && item.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [selectedCategory, sortedProducts]);

  return (
    <div className="animate-in fade-in space-y-4">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-3 no-scrollbar">
        <div className="flex gap-2">
          {categories.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <SlidersHorizontal size={16} />
          Filtros
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredProducts.map((item) => (
          <div
            key={item.id}
            className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3 transition-all active:scale-[0.99] hover:shadow-md"
          >
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
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-800 line-clamp-1">{item.name}</h3>
                  {item.category && (
                    <span className="text-[10px] uppercase tracking-wide font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
              </div>
              <div className="flex justify-between items-end mt-2 gap-2">
                <span className="font-bold text-gray-900 text-lg">{formatCurrency(item.price)}</span>

                {cart[item.id] ? (
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-2 shadow-inner">
                    <button
                      onClick={() => onUpdateCart(item, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-white rounded text-red-600 shadow-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">{cart[item.id].qty}</span>
                    <button
                      onClick={() => onUpdateCart(item, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-green-600 rounded text-white shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onUpdateCart(item, 1)}
                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors w-full text-center"
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
        <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 z-40 max-w-xl mx-auto">
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
};
