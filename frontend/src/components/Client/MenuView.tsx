// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { ChefHat, Instagram, LayoutDashboard, Link, Plus, X, Clock, MapPin, CreditCard, DollarSign, Zap } from "lucide-react";
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

const isEspetoCategory = (category) => {
  const normalized = (category || "").toString().trim().toLowerCase();
  return normalized.includes("espeto");
};

const ProductModal = ({ product, isOpen, onClose, onAddToCart }) => {
  const [cookingPoint, setCookingPoint] = useState("ao ponto");
  const [passSkewer, setPassSkewer] = useState(false);
  const showEspetoOptions = product ? isEspetoCategory(product.category) : false;

  useEffect(() => {
    setCookingPoint("ao ponto");
    setPassSkewer(false);
  }, [product?.id]);

  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 transition-opacity duration-200 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-all duration-200 transform ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg z-10"
          >
            <X size={16} />
          </button>

          {product?.imageUrl ? (
            <img
              draggable={false}
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-64 object-cover rounded-t-2xl"
            />
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded-t-2xl flex items-center justify-center text-gray-400">
              Sem imagem
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{product?.name}</h3>
            <p className="text-2xl font-bold text-brand-primary mt-1">{formatCurrency(product?.price)}</p>
          </div>

          {product?.desc && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Descrição</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{product?.desc}</p>
            </div>
          )}

          {showEspetoOptions && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Ponto da carne</label>
                <select
                  value={cookingPoint}
                  onChange={(event) => setCookingPoint(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="bem passada">Bem passada</option>
                  <option value="ao ponto">Ao ponto</option>
                  <option value="mal passada">Mal passada</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={passSkewer}
                  onChange={(event) => setPassSkewer(event.target.checked)}
                />
                Passar varinha
              </label>
            </div>
          )}

          <button
            onClick={() => {
              onAddToCart(product, 1, showEspetoOptions ? { cookingPoint, passSkewer } : undefined);
              handleClose();
            }}
            className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition"
          >
            <Plus size={18} />
            Adicionar ao pedido
          </button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ branding, instagramHandle, whatsappNumber, isOpenNow, todayHoursLabel, onOpenQueue, onOpenAdmin }) => {
  const storeSlug = branding?.espetoId || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const storeUrl = storeSlug ? `${baseUrl}/chamanoespeto/${storeSlug}` : "";
  const previewInitials = branding?.brandName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full bg-white/95 backdrop-blur shadow-md px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-4 sticky top-0 z-50 border-b border-gray-100 flex-wrap sm:flex-nowrap">
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundImage: "linear-gradient(120deg, var(--color-primary), var(--color-secondary))" }}
      />

      {/* LOGO OFICIAL */}
      <div
        className="w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border shadow-sm bg-white flex-shrink-0 flex items-center justify-center"
        style={{ borderColor: branding?.primaryColor, color: branding?.primaryColor, backgroundColor: '#fff' }}
      >
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-sm sm:text-lg">{previewInitials || "ES"}</span>
        )}
      </div>

      {/* Nome + infos */}
      <div className="flex-1 leading-tight min-w-0">
        <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{branding?.brandName || "Seu Espeto"}</h1>
        <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-slate-500">
          {storeSlug && (
            <span className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-[11px] uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Id: <span className="font-semibold normal-case">{storeSlug}</span>
            </span>
          )}
          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-brand-primary text-brand-primary bg-brand-primary-soft font-semibold hover:underline text-[10px] sm:text-xs"
            >
              <Instagram size={10} className="hidden sm:block" />
              <Instagram size={9} className="sm:hidden" />
              <span className="hidden sm:inline">Instagram {instagramHandle}</span>
              <span className="sm:hidden">{instagramHandle}</span>
            </a>
          )}
        </div>
      </div>

      {/* Buttons - Responsive */}
      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 order-last sm:order-none sm:flex-shrink-0">
        {onOpenQueue && (
          <button
            onClick={onOpenQueue}
            className="hidden md:flex flex-1 md:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-semibold bg-brand-secondary text-white shadow-sm hover:shadow-md transition items-center gap-1 whitespace-nowrap"
          >
            <ChefHat size={12} className="hidden lg:block" />
            <ChefHat size={11} className="lg:hidden" />
            <span className="hidden lg:inline">Visao do churrasqueiro</span>
            <span className="hidden md:inline lg:hidden text-[10px]">Churrasqueiro</span>
          </button>
        )}
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-semibold border border-brand-secondary text-brand-secondary hover:bg-brand-secondary-soft transition flex items-center gap-1 whitespace-nowrap"
          >
            <LayoutDashboard size={12} className="hidden sm:block" />
            <LayoutDashboard size={10} className="sm:hidden" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeProductModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const grouped = useMemo(() => {
    const defaults = [
      { key: "espetos", label: "Espetos" },
      { key: "bebidas", label: "Bebidas" },
      { key: "porcoes", label: "Porções" },
      { key: "outros", label: "Outros" },
    ];
    const normalize = (value) => (value || "outros").toString().trim().toLowerCase();
    const labelize = (value) => {
      const key = normalize(value);
      const known = defaults.find((entry) => entry.key === key);
      if (known) return known.label;
      return key
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    };

    const map = {};
    products.forEach((item) => {
      const key = normalize(item.category);
      if (!map[key]) {
        map[key] = { key, label: labelize(key), items: [] };
      }
      map[key].items.push(item);
    });

    const ordered = [
      ...defaults.filter((entry) => map[entry.key]),
      ...Object.keys(map)
        .filter((key) => !defaults.find((entry) => entry.key === key))
        .sort()
        .map((key) => ({ key, label: labelize(key) })),
    ].map((entry) => ({
      key: entry.key,
      label: entry.label,
      items: map[entry.key]?.items || [],
    }));

    return ordered.filter((category) => category.items.length > 0);
  }, [products]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 12%, white) 0%, #f8fafc 45%)",
      }}
    >

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
        <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-4 sm:p-6 shadow-sm">
          <div
            className="absolute -top-24 -right-20 h-56 w-56 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)",
            }}
          />
          <div className="relative space-y-5">
            {/* Main Header Section */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Bem-vindo ao nosso cardápio
                </p>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-1">
                  {branding?.brandName || "Seu Espeto"}
                </h2>
              </div>

              {/* Status & Hours */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3.5 py-2 rounded-full font-semibold text-sm flex items-center gap-2 ${
                    isOpenNow
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isOpenNow ? "bg-emerald-600" : "bg-red-600"}`} />
                  {isOpenNow ? "Aberto agora" : "Fechado no momento"}
                </span>
                {todayHoursLabel && todayHoursLabel !== "Fechado hoje" && (
                  <span className="px-3.5 py-2 rounded-full border border-slate-200 text-slate-600 bg-white font-semibold text-sm flex items-center gap-2">
                    <Clock size={14} />
                    {todayHoursLabel}
                  </span>
                )}
              </div>
            </div>


            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
              {normalizeWhatsApp(whatsappNumber) && (
                <a
                  href={`https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-4 py-3 rounded-full text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg text-center transition"
                >
                  💬 Falar no WhatsApp
                </a>
              )}
              <button
                onClick={() =>
                  document.getElementById("menu-list")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="flex-1 px-4 py-3 rounded-full text-sm font-bold border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                type="button"
              >
                📋 Ver cardápio completo
              </button>
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-full text-sm font-bold border border-brand-primary text-white bg-brand-primary hover:opacity-90 shadow-lg items-center justify-center gap-2 transition hidden sm:flex"
                >
                  <Instagram size={16} />
                  <span>Instagram</span>
                </a>
              )}
            </div>
          </div>
        </section>
        <div id="menu-list" className="space-y-10">
        {grouped.map((category) => (
          <div key={category.key} className="space-y-3">

            {/* Título da categoria */}
            <div
              className="px-4 py-2 rounded-2xl border border-slate-100 bg-white/80 shadow-sm flex items-center justify-between"
              style={{ borderColor: "color-mix(in srgb, var(--color-primary) 20%, #e2e8f0)" }}
            >
              <h2 className="font-bold text-lg capitalize tracking-wide text-slate-800">
                {category.label}
              </h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                {category.items.length === 1 ? '1 item' : `${category.items.length} itens`}
              </span>
            </div>

            {/* Lista de itens */}
            <div className="space-y-4">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/95 rounded-2xl shadow-sm border border-slate-100 p-3 flex gap-4 items-center hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
                  onClick={() => openProductModal(item)}
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
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-gray-900 text-[15px]">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                    )}
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-primary-soft text-brand-primary">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  {/* Botão de adicionar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEspetoCategory(item.category)) {
                        openProductModal(item);
                        return;
                      }
                      onUpdateCart(item, 1);
                    }}
                    title="Adicionar"
                    className="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center hover:opacity-90 shadow-md active:scale-95 transition"
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

      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={closeProductModal}
        onAddToCart={onUpdateCart}
      />
    </div>
  );
};
