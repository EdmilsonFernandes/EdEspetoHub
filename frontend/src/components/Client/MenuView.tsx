// @ts-nocheck
import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/format";

// =======================================
// HEADER PREMIUM COM LOGO OFICIAL
// =======================================
const Header = ({ branding, instagramHandle }) => {
  const previewInitials = branding?.brandName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full bg-white shadow-md px-4 py-4 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">

      {/* LOGO OFICIAL */}
      <div
        className="w-14 h-14 rounded-full overflow-hidden border shadow-sm bg-white flex items-center justify-center"
        style={{ borderColor: branding?.primaryColor, color: branding?.primaryColor, backgroundColor: '#fff' }}
      >
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-lg">{previewInitials || "ES"}</span>
        )}
      </div>

      {/* Nome + Insta */}
      <div className="flex-1 leading-tight">
        <h1 className="text-xl font-bold text-gray-900">{branding?.brandName || "Seu Espeto"}</h1>

        {instagramHandle && (
          <a
            href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm font-semibold hover:underline"
          >
            {instagramHandle}
          </a>
        )}
      </div>

      {/* STATUS */}
      <div className="px-3 py-1 rounded-full accent-pill text-sm font-bold shadow-sm">
        Aberto
      </div>
    </div>
  );
};

// =======================================
// MENU ORGANIZADO POR CATEGORIA (COM FOTOS)
// =======================================
export const MenuView = ({ products, cart, onUpdateCart, branding, instagramHandle }) => {

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

      <Header branding={branding} instagramHandle={instagramHandle} />

      <div className="space-y-10 p-4">

        {Object.keys(grouped).map((category) => (
          <div key={category} className="space-y-3">

            {/* Título da categoria */}
            <div
              className="px-4 py-2 rounded border-l-4"
              style={{ borderColor: branding?.primaryColor, background: 'rgba(0,0,0,0.02)' }}
            >
              <h2 className="font-bold text-lg capitalize tracking-wide" style={{ color: branding?.primaryColor }}>
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
                    <p className="text-primary font-bold text-lg mt-[-1px]">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Botão de adicionar */}
                  <button
                    onClick={() => onUpdateCart(item, 1)}
                    className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 shadow-md active:scale-95 transition"
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
