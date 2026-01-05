// @ts-nocheck
import React, { useMemo } from "react";
import { Plus, ChefHat, LayoutDashboard } from "lucide-react";
import { formatCurrency } from "../../utils/format";

// =======================================
// HEADER PREMIUM COM LOGO OFICIAL
// =======================================
const normalizeWhatsApp = (value) => {
  if (!value) return "";
  const digits = value.toString().replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const Header = ({ branding, instagramHandle, whatsappNumber, isOpenNow, todayHoursLabel, onOpenQueue, onOpenAdmin }) => {
  const openStatus = isOpenNow !== false;
  const statusStyle = openStatus
    ? "bg-brand-primary-soft text-brand-primary border-brand-primary"
    : "bg-brand-secondary-soft text-brand-secondary border-brand-secondary";
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
            className="text-brand-primary text-sm font-semibold hover:underline"
          >
            {instagramHandle}
          </a>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide flex items-center gap-2 border ${statusStyle}`}
          >
            <span
              className={`w-2 h-2 rounded-full shadow-sm ${
                openStatus ? "bg-brand-primary status-blink" : "bg-brand-secondary"
              }`}
            />
            {openStatus ? "Aberto" : "Fechado"}
          </div>
          {todayHoursLabel && (
            <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-brand-secondary text-brand-secondary bg-white">
              {todayHoursLabel}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {normalizeWhatsApp(whatsappNumber) && (
            <a
              href={`https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-full text-xs font-semibold bg-green-600 text-white shadow-sm hover:shadow-md transition"
            >
              WhatsApp
            </a>
          )}
          {onOpenQueue && (
            <button
              onClick={onOpenQueue}
              className="px-3 py-2 rounded-full text-xs font-semibold bg-brand-secondary text-white shadow-sm hover:shadow-md transition flex items-center gap-1"
            >
              <ChefHat size={14} /> Visao do churrasqueiro
            </button>
          )}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-3 py-2 rounded-full text-xs font-semibold border border-brand-secondary text-brand-secondary hover:bg-brand-secondary-soft transition flex items-center gap-1"
            >
              <LayoutDashboard size={14} /> Area admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =======================================
// MENU ORGANIZADO POR CATEGORIA (COM FOTOS)
// =======================================
export const MenuView = ({
  products,
  cart,
  onUpdateCart,
  branding,
  instagramHandle,
  whatsappNumber,
  isOpenNow,
  todayHoursLabel,
  showHeader = true,
  onOpenQueue,
  onOpenAdmin
}) => {

  const grouped = useMemo(() => {
    const categories = [
      { key: "espetos", label: "Espetos" },
      { key: "bebidas", label: "Bebidas" },
      { key: "porcoes", label: "Porções" },
      { key: "outros", label: "Outros" },
    ];

    const map = categories.reduce((acc, category) => {
      acc[category.key] = { label: category.label, items: [] };
      return acc;
    }, {});

    products.forEach((item) => {
      const raw = (item.category || "outros").toString().toLowerCase();
      const normalized = map[raw] ? raw : "outros";
      map[normalized].items.push(item);
    });

    return categories
      .map((category) => ({
      key: category.key,
      label: category.label,
      items: map[category.key].items,
    }))
      .filter((category) => category.items.length > 0);
  }, [products]);

  return (
    <div className="bg-gray-50 min-h-screen">

      {showHeader && (
        <Header
          branding={branding}
          instagramHandle={instagramHandle}
          whatsappNumber={whatsappNumber}
          isOpenNow={isOpenNow}
          todayHoursLabel={todayHoursLabel}
          onOpenQueue={onOpenQueue}
          onOpenAdmin={onOpenAdmin}
        />
      )}

      <div className="space-y-10 p-4">

        {grouped.map((category) => (
          <div key={category.key} className="space-y-3">

            {/* Título da categoria */}
            <div
              className="px-4 py-2 rounded border-l-4"
              style={{ borderColor: branding?.primaryColor, background: 'rgba(0,0,0,0.02)' }}
            >
              <h2 className="font-bold text-lg capitalize tracking-wide" style={{ color: branding?.primaryColor }}>
                {category.label}
              </h2>
            </div>

            {/* Lista de itens */}
            <div className="space-y-4">
              {category.items.map((item) => (
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
                    <p className="text-brand-primary font-bold text-lg mt-[-1px]">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Botão de adicionar */}
                  <button
                    onClick={() => onUpdateCart(item, 1)}
                    className="w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center hover:opacity-90 shadow-md active:scale-95 transition"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              ))}
              {category.items.length === 0 && (
                <div className="text-sm text-gray-500 px-2">Sem produtos nessa categoria.</div>
              )}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
};
