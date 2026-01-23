// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  InstagramLogo,
  SquaresFour,
  Plus,
  Clock,
  MapPin,
  MagnifyingGlass,
  Info,
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { ProductModal } from "../Cart/ProductModal";

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

const Header = ({
  branding,
  instagramHandle,
  whatsappNumber,
  contactEmail,
  isOpenNow,
  todayHoursLabel,
  onOpenQueue,
  onOpenAdmin,
  compact,
  onOpenInfo
}) => {
  const storeSlug = branding?.espetoId || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const storeUrl = storeSlug ? `${baseUrl}/${storeSlug}` : "";
  const previewInitials = branding?.brandName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`w-full bg-white/95 backdrop-blur shadow-md px-3 sm:px-4 ${compact ? 'py-2' : 'py-3 sm:py-4'} flex items-center gap-2 sm:gap-4 sticky top-0 z-50 border-b border-gray-100 flex-wrap sm:flex-nowrap`}>
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundImage: "linear-gradient(120deg, var(--color-primary), var(--color-secondary))" }}
      />

      {/* LOGO OFICIAL */}
      {( !compact || (compact && branding?.logoUrl) ) && (
        <div
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-14 sm:h-14'} rounded-full overflow-hidden border shadow-sm bg-white flex-shrink-0 flex items-center justify-center`}
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
      )}

      {/* Nome + infos */}
      <div className="flex-1 leading-tight min-w-0">
        <h1 className={`${compact ? 'text-sm' : 'text-base sm:text-xl'} font-bold text-gray-900 truncate`}>
          {branding?.brandName || "Seu Espeto"}
        </h1>
        {!compact && (
          <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-slate-500">
          {storeSlug && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-[11px] uppercase tracking-wide hover:border-slate-300 hover:text-slate-800 transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Site: <span className="font-semibold normal-case">{storeUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-brand-primary text-brand-primary bg-brand-primary-soft font-semibold hover:underline text-[10px] sm:text-xs"
            >
              <InstagramLogo size={10} weight="duotone" className="hidden sm:block" />
              <InstagramLogo size={9} weight="duotone" className="sm:hidden" />
              <span className="hidden sm:inline">Instagram {instagramHandle}</span>
              <span className="sm:hidden">{instagramHandle}</span>
            </a>
          )}
          </div>
        )}
      </div>

      {/* Buttons - Responsive */}
      <div className="w-full sm:w-auto flex flex-row items-center justify-end gap-2 order-last sm:order-none sm:flex-shrink-0">
        {compact && onOpenInfo && (
          <button
            type="button"
            onClick={onOpenInfo}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            aria-label="Informações da loja"
          >
            <span className="flex items-center gap-1">
              <Info size={12} weight="duotone" />
              Info
            </span>
          </button>
        )}
        {onOpenQueue && (
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-primary text-white"
            >
              Cardapio
            </button>
            <button
              type="button"
              onClick={onOpenQueue}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Churrasqueiro
            </button>
          </div>
        )}
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-semibold border border-brand-secondary text-brand-secondary hover:bg-brand-secondary-soft transition flex items-center gap-1 whitespace-nowrap"
          >
            <SquaresFour size={12} weight="duotone" />
            {!compact && <span className="hidden sm:inline">Admin</span>}
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
  topProducts,
  onUpdateCart,
  branding,
  instagramHandle,
  whatsappNumber,
  contactEmail,
  promoMessage,
  storeUrl,
  isOpenNow,
  todayHoursLabel,
  storeAddress,
  showHeader = true,
  onOpenQueue,
  onOpenAdmin,
  onOpenInfo,
  compactHeader = false
}) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showStoreDetails, setShowStoreDetails] = useState(false);
  const [showSaveHint, setShowSaveHint] = useState(false);
  const mapQuery = storeAddress ? encodeURIComponent(storeAddress) : "";
  const googleMapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
    : "";
  const wazeUrl = mapQuery ? `https://waze.com/ul?q=${mapQuery}&navigate=yes` : "";
  const resolvePromoPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return null;
  };
  const handleShareMenu = async () => {
    if (!storeUrl) return;
    const message = `Confira o cardápio da ${branding?.brandName || "Chama no Espeto"}: ${storeUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: branding?.brandName || "Cardápio",
          text: message,
          url: storeUrl,
        });
        return;
      } catch (error) {
        // ignore and fallback
      }
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

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
  const featuredProduct = useMemo(
    () => (products || []).find((item) => item.isFeatured),
    [products]
  );
  const topItems = useMemo(() => (topProducts || []).slice(0, 3), [topProducts]);

  const itemQtyMap = useMemo(() => {
    const map = new Map();
    Object.values(cart || {}).forEach((entry: any) => {
      if (!entry?.id) return;
      const key = String(entry.id);
      const current = map.get(key) || 0;
      map.set(key, current + (entry.qty || 0));
    });
    return map;
  }, [cart]);

  const filteredGrouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return grouped;
    return grouped
      .map((category) => {
        const items = category.items.filter((item) => {
          const haystack = [
            item?.name,
            item?.description,
            item?.category,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalized);
        });
        return { ...category, items };
      })
      .filter((category) => category.items.length > 0);
  }, [grouped, query]);

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
          compact={compactHeader}
          onOpenInfo={onOpenInfo}
        />
      )}

      <div className="space-y-8 p-4">
        <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
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
          <div className="relative space-y-4">
            {/* Main Header Section */}
            {compactHeader ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full font-semibold text-[11px] flex items-center gap-2 ${
                    isOpenNow
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isOpenNow ? "bg-emerald-600" : "bg-red-600"}`} />
                  {isOpenNow ? "Aberto agora" : "Fechado no momento"}
                </span>
                {todayHoursLabel ? (
                  todayHoursLabel !== "Fechado hoje" ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm">
                      <Clock size={13} className="text-slate-500" />
                      <span className="uppercase tracking-[0.2em] text-[9px] text-slate-400">Hoje</span>
                      <span className="font-bold">{todayHoursLabel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700 shadow-sm">
                      <Clock size={13} className="text-rose-500" />
                      <span className="font-bold">Fechado hoje</span>
                    </span>
                  )
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
              <div>
                {!showHeader && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Bem-vindo ao nosso cardápio
                  </p>
                )}
                {!showHeader && (
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {branding?.brandName || "Seu Espeto"}
                  </h2>
                )}
                {showHeader && (
                  <p className="text-[11px] uppercase tracking-[0.3em] font-semibold text-slate-500">
                    Escolha seu pedido
                  </p>
                )}
              </div>

              {/* Status & Hours */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full font-semibold text-[11px] flex items-center gap-2 ${
                    isOpenNow
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isOpenNow ? "bg-emerald-600" : "bg-red-600"}`} />
                  {isOpenNow ? "Aberto agora" : "Fechado no momento"}
                </span>
                {todayHoursLabel ? (
                  todayHoursLabel !== "Fechado hoje" ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm">
                      <Clock size={13} className="text-slate-500" />
                      <span className="uppercase tracking-[0.2em] text-[9px] text-slate-400">Hoje</span>
                      <span className="font-bold">{todayHoursLabel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700 shadow-sm">
                      <Clock size={13} className="text-rose-500" />
                      <span className="font-bold">Fechado hoje</span>
                    </span>
                  )
                ) : null}
              </div>
              </div>
            )}

            {!compactHeader && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowStoreDetails((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition flex items-center gap-2"
                >
                  <Info size={14} weight="duotone" />
                  {showStoreDetails ? "Ocultar detalhes" : "Detalhes da loja"}
                </button>
              </div>
            )}

            {!compactHeader && showStoreDetails && storeAddress && (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 hover:opacity-90 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} weight="duotone" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Endereço da loja
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{storeAddress}</p>
                    <p className="text-xs text-slate-500">Toque para abrir no mapa</p>
                  </div>
                </a>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                  >
                    Abrir no Google Maps
                  </a>
                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-full text-xs font-semibold border border-brand-primary text-brand-primary bg-brand-primary-soft hover:opacity-90 transition"
                  >
                    Abrir no Waze
                  </a>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            {!compactHeader && showStoreDetails && (
              <div className="flex flex-wrap items-center gap-2 w-full pt-1">
              {normalizeWhatsApp(whatsappNumber) && (
                <a
                  href={`https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-full text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm text-center transition"
                >
                  💬 WhatsApp
                </a>
              )}
              {storeUrl && (
                <button
                  type="button"
                  onClick={handleShareMenu}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
                >
                📲 Compartilhar cardápio
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSaveHint((prev) => !prev)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
              >
                📌 Salvar no celular
              </button>
              <button
                onClick={() =>
                  document.getElementById("menu-list")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-3.5 py-2 rounded-full text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                type="button"
              >
                📋 Ver cardápio
              </button>
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border border-brand-primary text-white bg-brand-primary hover:opacity-90 shadow-sm items-center justify-center gap-2 transition hidden sm:flex"
                >
                  <InstagramLogo size={16} weight="duotone" />
                  <span>Instagram</span>
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
                >
                  ✉️ Email
                </a>
              )}
              </div>
            )}
            {!compactHeader && showStoreDetails && showSaveHint && (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-xs text-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Salvar na tela inicial</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-700">iPhone</p>
                    <p className="text-[11px] text-slate-500">
                      Toque em Compartilhar → Adicionar à Tela de Início.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-700">Android</p>
                    <p className="text-[11px] text-slate-500">
                      Menu do navegador → Adicionar à tela inicial.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                placeholder="Buscar no cardápio (ex: costela)"
              />
            </div>
          </div>
        </section>
        <div id="menu-list" className="space-y-10">
        {promoMessage && (
          <div className="rounded-3xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 via-white to-pink-50 p-4 sm:p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-500 font-semibold">Mensagem do dia</p>
            <p className="text-sm font-semibold text-slate-900 mt-2">{promoMessage}</p>
          </div>
        )}
        {topItems.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-semibold">Mais pedidos hoje</p>
              <span className="text-xs text-slate-500">Top {topItems.length}</span>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible no-scrollbar">
              {topItems.map((item) => (
                <button
                  key={item.productId || item.name}
                  type="button"
                  onClick={() =>
                    openProductModal(
                      products.find((entry) => entry.id === item.productId) ||
                        products.find((entry) => entry.name === item.name) ||
                        item
                    )
                  }
                  className="group flex min-w-[220px] sm:min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left hover:shadow-md transition"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      "🍖"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.qty} pedidos</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {featuredProduct && (
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-500 font-semibold">Promoção do dia</p>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{featuredProduct.name}</h3>
                {featuredProduct.description && (
                  <p className="text-xs text-slate-600 mt-1">{featuredProduct.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {resolvePromoPrice(featuredProduct) ? (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrency(featuredProduct.price || 0)}
                    </span>
                    <span className="text-lg font-black text-emerald-600">
                      {formatCurrency(resolvePromoPrice(featuredProduct))}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-black text-amber-600">
                    {formatCurrency(featuredProduct.price || 0)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openProductModal(featuredProduct)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition"
                >
                  Ver detalhes
                </button>
              </div>
            </div>
          </div>
        )}
        {filteredGrouped.map((category, index) => {
          const accentColors = [
            "#ef4444",
            "#f59e0b",
            "#10b981",
            "#3b82f6",
            "#8b5cf6",
            "#ec4899",
          ];
          const accent = accentColors[index % accentColors.length];
          return (
          <div key={category.key} className="space-y-3">

            {/* Título da categoria */}
            <div
              className="px-4 py-2 rounded-2xl border border-slate-100 bg-white/90 shadow-sm flex items-center justify-between"
              style={{ borderColor: "color-mix(in srgb, var(--color-primary) 20%, #e2e8f0)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-9 w-1.5 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <h2 className="font-bold text-lg capitalize tracking-wide text-slate-800">
                  {category.label}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                {category.items.length === 1 ? '1 item' : `${category.items.length} itens`}
              </span>
            </div>

            {/* Lista de itens */}
            <div className="space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white/95 rounded-2xl shadow-sm border border-slate-100 p-2.5 sm:p-3 flex gap-3 items-center hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
                  onClick={() => openProductModal(item)}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                        sem foto
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-[15px] leading-tight truncate">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                        )}
                        {item.isFeatured && (
                          <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            Promo do dia
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {resolvePromoPrice(item) ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-semibold text-slate-400 line-through">
                              {formatCurrency(item.price)}
                            </span>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                              {formatCurrency(resolvePromoPrice(item))}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm">
                            {formatCurrency(item.price)}
                          </span>
                        )}
                        {itemQtyMap.get(String(item.id)) > 0 && (
                          <span className="inline-flex sm:hidden items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {itemQtyMap.get(String(item.id))}x
                          </span>
                        )}
                      </div>
                    </div>
                    {isEspetoCategory(item.category) && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        Toque para escolher o ponto da carne
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEspetoCategory(item.category)) {
                        onUpdateCart(item, 1, { cookingPoint: "ao ponto", passSkewer: false });
                        return;
                      }
                      onUpdateCart(item, 1);
                    }}
                    title="Adicionar"
                    className="relative w-10 h-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center hover:opacity-90 shadow-md active:scale-95 transition"
                  >
                    {itemQtyMap.get(String(item.id)) > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold border border-amber-300 flex items-center justify-center shadow-md">
                        {itemQtyMap.get(String(item.id))}
                      </span>
                    )}
                    <Plus size={18} weight="duotone" />
                  </button>
                </div>
              ))}
              {category.items.length === 0 && (
                <div className="text-sm text-gray-500 px-2">Sem produtos nessa categoria.</div>
              )}
            </div>

          </div>
        );
        })}
        {filteredGrouped.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Nenhum item encontrado.
          </div>
        )}
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
