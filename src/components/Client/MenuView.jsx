import React, { useMemo, useState } from 'react';
import { Plus, Minus, CupSoda, Beef, Martini, SlidersHorizontal } from 'lucide-react';
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
    const bebidas = [];
    const others = [];

    products.forEach((item) => {
      if (item.category?.toLowerCase().includes('espeto')) {
        espetos.push(item);
      } else if (item.category?.toLowerCase().includes('bebida')) {
        bebidas.push(item);
      } else {
        others.push(item);
      }
    });

    return [...espetos, ...bebidas, ...others];
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

  const groupedProducts = useMemo(() => {
    const groups = new Map();
    filteredProducts.forEach((item) => {
      const label = item.category
        ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
        : 'Outros';
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push(item);
    });
    return Array.from(groups.entries());
  }, [filteredProducts]);

  const groupIcon = (category) => {
    if (category.toLowerCase().includes('espeto')) return <Beef size={18} />;
    if (category.toLowerCase().includes('bebida')) return <Martini size={18} />;
    return <CupSoda size={18} />;
  };

  return (
    <div className="animate-in fade-in space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-red-500 font-semibold uppercase">Cardápio</p>
            <h2 className="text-lg font-black text-gray-800">Escolha seus favoritos</h2>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <SlidersHorizontal size={16} />
            Filtros
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200'
                    : 'bg-red-50 text-red-700 border-red-100 hover:border-red-200'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {groupedProducts.map(([category, items]) => (
          <section key={category} className="space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-bold text-lg">
              <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                {groupIcon(category)}
              </span>
              {category}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-base">{item.name}</h3>
                      {item.category && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500 uppercase">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.desc || 'Feito na brasa na hora para você.'}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <span className="text-sm font-extrabold text-red-600">{formatCurrency(item.price)}</span>
                    {cart[item.id] ? (
                      <div className="flex items-center gap-2 bg-red-50 rounded-full px-2 py-1 border border-red-100">
                        <button
                          onClick={() => onUpdateCart(item, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-red-600 border border-red-200"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-sm min-w-[20px] text-center">{cart[item.id].qty}</span>
                        <button
                          onClick={() => onUpdateCart(item, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white shadow"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onUpdateCart(item, 1)}
                        className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition"
                        aria-label={`Adicionar ${item.name}`}
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 z-40 max-w-4xl mx-auto">
          <button
            onClick={onProceed}
            className="w-full bg-red-600 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center transform hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
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
