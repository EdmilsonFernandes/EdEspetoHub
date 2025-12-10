import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/format";

// =======================================
// HEADER PREMIUM COM LOGO OFICIAL
// =======================================
const Header = () => {
  return (
    <div className="w-full bg-white shadow-md px-4 py-4 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">

      {/* LOGO OFICIAL */}
      <div className="w-14 h-14 rounded-full overflow-hidden border border-red-600 shadow-sm bg-white">
        <img
          src="/logo-datony.svg"
          alt="Espetinho Datony"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Nome + Insta */}
      <div className="flex-1 leading-tight">
        <h1 className="text-xl font-bold text-gray-900">Espetinho Datony</h1>

        <a
          href="https://instagram.com/espetinhodatony"
          target="_blank"
          className="text-red-600 text-sm font-semibold hover:underline"
        >
          @espetinhodatony
        </a>
      </div>

      {/* STATUS */}
      <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold shadow-sm">
        Aberto
      </div>
    </div>
  );
};

// =======================================
// MENU ORGANIZADO POR CATEGORIA (COM FOTOS)
// =======================================
export const MenuView = ({ products, cart, onUpdateCart }) => {

  const grouped = useMemo(() => {
    const map = {};
    products.forEach((item) => {
      const cat = item.category || "Outros";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });

    // Ordenação Z -> A
    const sortedMap = {};
    Object.keys(map)
      .sort((a, b) => b.localeCompare(a)) // O segredo está aqui: b comparado com a
      .forEach((key) => {
        sortedMap[key] = map[key];
      });

    return sortedMap;
  }, [products]);

  return (
    <div className="bg-gray-50 min-h-screen">

      <Header />

      <div className="space-y-10 p-4">

        {Object.keys(grouped).map((category) => (
          <div key={category} className="space-y-3">

            {/* Título da categoria */}
            <div className="px-4 py-2 bg-red-50 border-l-4 border-red-600 rounded">
              <h2 className="text-red-700 font-bold text-lg capitalize tracking-wide">
                {category}
              </h2>
            </div>

            {/* Lista de itens */}
            <div className="space-y-4">
              {grouped[category].map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex gap-4 items-center hover:shadow-md active:scale-[0.99] transition cursor-pointer"
                >

                  {/* Foto do prato */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 shadow-sm">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        sem foto
                      </div>
                    )}
                  </div>

                  {/* Nome e preço */}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-[15px]">
                      {item.name}
                    </p>
                    <p className="text-red-600 font-bold text-lg mt-[-1px]">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Botão de adicionar */}
                  <button
                    onClick={() => onUpdateCart(item, 1)}
                    className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-md active:scale-95 transition"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              ))}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
};
