// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  SquaresFour,
  X,
  Plus,
  MagnifyingGlass,
  MapPin,
  ChefHat,
  Sparkle,
  ShoppingCart,
  ForkKnife,
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { ProductModal } from "../Cart/ProductModal";
import { GoogleMapView } from "../GoogleMapView";

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

const categoryVisualMeta = (key = "") => {
  const normalized = String(key || "").toLowerCase();
  if (normalized.includes("espeto")) return { icon: ChefHat, tone: "text-slate-600 bg-white border-slate-200" };
  if (normalized.includes("bebida")) return { icon: ShoppingCart, tone: "text-slate-600 bg-white border-slate-200" };
  if (normalized.includes("por")) return { icon: ForkKnife, tone: "text-slate-600 bg-white border-slate-200" };
  if (normalized.includes("lanche")) return { icon: Sparkle, tone: "text-slate-600 bg-white border-slate-200" };
  return { icon: SquaresFour, tone: "text-slate-700 bg-white border-slate-200" };
};

const categoryGlyph = (key = "") => {
  const normalized = String(key || "").toLowerCase();
  if (normalized.includes("espeto")) return "🥩";
  if (normalized.includes("bebida")) return "🥤";
  if (normalized.includes("lanche")) return "🍔";
  if (normalized.includes("sobremesa")) return "🍰";
  if (normalized.includes("entrada")) return "🍽️";
  return "📋";
};

const Header = ({
  branding,
  segment,
  instagramHandle,
  whatsappNumber,
  onOpenQueue,
  onOpenAdmin,
  compact,
  isOpenNow,
  todayHoursLabel
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

  const segmentLabelMap = {
    restaurante: "Restaurante",
    hamburgueria: "Hamburgueria",
    lanchonete: "Lanchonete",
    pizzaria: "Pizzaria",
    adega: "Adega",
    mercado: "Mercado",
    hortifruti: "Hortifruti",
    farmacia: "Farmácia",
    confeitaria: "Confeitaria",
    outros: "Comércio",
  };
  const segmentLabel = segmentLabelMap[String(segment || "").toLowerCase()] || "Comércio";
  const closingHour = todayHoursLabel
    ? todayHoursLabel
        .split("-")
        .map((part) => part.trim())
        .filter(Boolean)[1] || todayHoursLabel
    : "";

  return (
    <div className={`w-full sticky top-0 z-50 ${compact ? 'pb-2' : 'pb-3'} pt-2`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div
          className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-3 sm:px-5 ${compact ? 'py-2' : 'py-3 sm:py-3.5'} shadow-sm`}
        >

          <div className="relative flex flex-wrap items-start gap-3 sm:gap-4 sm:flex-nowrap">
            {(!compact || (compact && branding?.logoUrl)) && (
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex-shrink-0 flex items-center justify-center">
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.brandName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-base sm:text-lg text-slate-700">{previewInitials || "JC"}</span>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className={`${compact ? 'text-sm' : 'text-lg sm:text-xl'} font-black text-slate-800 truncate`}>
                {branding?.brandName || "Sua Loja"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {segmentLabel !== "Comércio" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    {segmentLabel}
                  </span>
                )}
                <div className="inline-flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                  <span className={`h-2 w-2 rounded-full ${isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-orange-500"}`} />
                  <span>
                    {isOpenNow ? "Aberto" : "Fechado"}
                    {closingHour ? `  ${isOpenNow ? "Fecha às" : "Hoje até"} ${closingHour}` : ""}
                  </span>
                </div>
              </div>
              {!compact && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {storeSlug && (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition max-w-full"
                    >
                      Site: <span className="normal-case truncate max-w-[24ch]">{storeUrl.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {instagramHandle && (
                    <a
                      href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      <img src="/insta.avif" alt="Instagram" className="h-3.5 w-3.5 rounded-full" />
                      {instagramHandle}
                    </a>
                  )}
                  {normalizeWhatsApp(whatsappNumber) && (
                    <a
                      href={`https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100 transition"
                    >
                      <img src="/whatspp.jpg" alt="WhatsApp" className="h-3.5 w-3.5 rounded-full" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="w-full sm:w-auto flex flex-row items-center justify-end gap-2 order-last sm:order-none sm:flex-shrink-0">
              {onOpenQueue && (
                <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-900 shadow-sm"
                  >
                    Vitrine
                  </button>
                  <button
                    type="button"
                    onClick={onOpenQueue}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Operação
                  </button>
                </div>
              )}
              {onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 whitespace-nowrap"
                >
                  <SquaresFour size={12} weight="duotone" />
                  {!compact && <span className="hidden sm:inline">Painel</span>}
                </button>
              )}
            </div>
          </div>
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
  topProducts,
  onUpdateCart,
  branding,
  segment,
  instagramHandle,
  whatsappNumber,
  promoMessage,
  storeAddress,
  storeCoords,
  isOpenNow,
  todayHoursLabel,
  showHeader = true,
  onOpenQueue,
  onOpenAdmin,
  onProceed,
  compactHeader = false
}) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showStoreDetails, setShowStoreDetails] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState("");
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const categoryRefs = React.useRef({});
  const formatStoreAddress = (address = "") => {
    const raw = address.toString().trim();
    if (!raw) return { line1: "", line2: "", cep: "" };
    const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
    const cepPart = parts.find((part) => /cep/i.test(part));
    const cep = cepPart ? cepPart.replace(/cep/i, "").replace(/[:\-]/g, "").trim() : "";
    const filtered = parts.filter((part) => part !== cepPart);
    const line1 = filtered[0] || raw;
    const line2 = filtered.slice(1).join(" · ");
    return { line1, line2, cep };
  };
  const formattedAddress = formatStoreAddress(storeAddress);
  const mapQuery = storeAddress ? encodeURIComponent(storeAddress) : "";
  const googleMapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
    : "";
  const wazeUrl = mapQuery ? `https://waze.com/ul?q=${mapQuery}&navigate=yes` : "";
  const mapMarkers = storeCoords
    ? [{ lat: Number(storeCoords.lat), lng: Number(storeCoords.lng), label: "Loja" }]
    : [];
  const resolvePromoPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return null;
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
  const cartItemsCount = useMemo(
    () =>
      Object.values(cart || {}).reduce(
        (acc: number, entry: any) => acc + Number(entry?.qty || 0),
        0
      ),
    [cart]
  );
  const cartTotalValue = useMemo(
    () =>
      Object.values(cart || {}).reduce((acc: number, entry: any) => {
        const qty = Number(entry?.qty || 0);
        const unitPrice = Number(entry?.price || 0);
        return acc + unitPrice * qty;
      }, 0),
    [cart]
  );

  const buildCartOptions = (entry: any) => ({
    cookingPoint: entry?.cookingPoint || "",
    passSkewer: Boolean(entry?.passSkewer),
    selectedModifiers: Array.isArray(entry?.selectedModifiers) ? entry.selectedModifiers : [],
  });

  const resolveQuickAdjustEntry = (item: any) => {
    const entries = Object.values(cart || {}).filter((entry: any) => entry?.id === item?.id);
    if (!entries.length) return null;

    const hasActiveModifiers = Array.isArray(item?.modifiers)
      ? item.modifiers.some((modifier: any) => modifier?.active !== false)
      : false;

    if (hasActiveModifiers) {
      return entries[0] as any;
    }

    if (isEspetoCategory(item?.category)) {
      const preferred = entries.find(
        (entry: any) =>
          (entry?.cookingPoint || "") === "ao ponto" && !entry?.passSkewer
      );
      return (preferred || entries[0]) as any;
    }

    const plain = entries.find(
      (entry: any) =>
        !entry?.cookingPoint &&
        !entry?.passSkewer &&
        (!Array.isArray(entry?.selectedModifiers) || entry.selectedModifiers.length === 0)
    );
    return (plain || entries[0]) as any;
  };

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

  const registerCategoryRef = (key) => (node) => {
    if (node) {
      categoryRefs.current[key] = node;
    }
  };

  const scrollToCategory = (key) => {
    const target = categoryRefs.current[key];
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (!filteredGrouped.length) return;
    if (!filteredGrouped.some((category) => category.key === activeCategoryKey)) {
      setActiveCategoryKey(filteredGrouped[0].key);
    }
  }, [filteredGrouped, activeCategoryKey]);

  return (
    <div className="bg-slate-50 overflow-x-clip">

      {showHeader && (
        <Header
          branding={branding}
          segment={segment}
          instagramHandle={instagramHandle}
          whatsappNumber={whatsappNumber}
          onOpenQueue={onOpenQueue}
          onOpenAdmin={onOpenAdmin}
          compact={compactHeader}
          isOpenNow={isOpenNow}
          todayHoursLabel={todayHoursLabel}
        />
      )}

      <div className={`space-y-8 p-4 max-w-6xl mx-auto ${cartItemsCount > 0 ? 'pb-28 sm:pb-8' : ''}`}>
        <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="relative space-y-4">
            {!showHeader && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Bem-vindo à sua vitrine
                </p>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  {branding?.brandName || "Seu Espeto"}
                </h2>
              </div>
            )}

            {!compactHeader && storeAddress && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowStoreDetails((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                >
                  {showStoreDetails ? "Ocultar detalhes" : "Detalhes da loja"}
                </button>
              </div>
            )}

            {!compactHeader && showStoreDetails && storeAddress && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[1.1fr_0.9fr] sm:items-start">
                  <div className="space-y-3">
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
                        <div className="text-sm font-semibold text-slate-900">
                          <p>{formattedAddress.line1}</p>
                          {formattedAddress.line2 && (
                            <p className="text-xs font-medium text-slate-600">{formattedAddress.line2}</p>
                          )}
                          {formattedAddress.cep && (
                            <p className="text-xs text-slate-500">CEP {formattedAddress.cep}</p>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">Toque para abrir no mapa</p>
                      </div>
                    </a>
                    <div className="flex flex-wrap gap-2">
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
                        className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                      >
                        Abrir no Waze
                      </a>
                    </div>
                  </div>
                  {mapMarkers.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                      <GoogleMapView markers={mapMarkers} zoom={15} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-2xl border border-transparent bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-[13px] placeholder:font-medium placeholder:text-slate-400 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/20 transition-all"
                placeholder="Buscar produtos por nome ou categoria"
              />
            </div>
          </div>
        </section>
        {filteredGrouped.length > 1 && (
          <div
            className={`sticky ${showHeader ? "top-[72px] sm:top-[92px]" : "top-0"} z-40 -mx-4 px-4 pb-2 pt-1`}
          >
            <div className="rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-md shadow-sm ds-tabs px-2 py-2">
              <div className="relative w-full flex items-center mb-0">
                <div className="flex-1 flex overflow-x-auto gap-3 pr-20 no-scrollbar scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filteredGrouped.map((category) => {
                    const isActive = activeCategoryKey === category.key;

                    return (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => {
                          setActiveCategoryKey(category.key);
                          scrollToCategory(category.key);
                        }}
                        className={
                          isActive
                            ? "flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold transition-all"
                            : "flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-600 font-medium border border-slate-200 transition-all"
                        }
                      >
                        <span className="text-xs leading-none" aria-hidden="true">
                          {categoryGlyph(category.key)}
                        </span>
                        <span className="whitespace-nowrap">{category.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-white/15 text-white/90" : "bg-slate-100 text-slate-400"}`}>
                          {category.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-28 flex items-center justify-end pr-4 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent pointer-events-none">
                  <button
                    type="button"
                    aria-label="Abrir categorias"
                    onClick={() => setIsCategorySheetOpen(true)}
                    className="w-12 h-12 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center text-slate-800 pointer-events-auto border border-slate-100 active:scale-95 transition-all"
                  >
                    <SquaresFour size={24} weight="duotone" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="menu-list" className="space-y-10">
        {promoMessage && (
          <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-500 font-semibold">Mensagem do dia</p>
            <p className="text-sm font-semibold text-slate-900 mt-2">{promoMessage}</p>
          </div>
        )}
        {topItems.length > 0 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800">
                <Sparkle size={16} weight="fill" className="text-amber-500" />
                Mais pedidos hoje
              </p>
              <span className="text-xs text-slate-500">Top {topItems.length}</span>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible no-scrollbar scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {topItems.map((item) => {
                const mappedProduct =
                  products.find((entry) => entry.id === item.productId) ||
                  products.find((entry) => entry.name === item.name);
                const displayPrice =
                  mappedProduct && resolvePromoPrice(mappedProduct)
                    ? resolvePromoPrice(mappedProduct)
                    : mappedProduct?.price ?? item?.price;

                return (
                  <button
                    key={item.productId || item.name}
                    type="button"
                    onClick={() =>
                      openProductModal(
                        mappedProduct || item
                      )
                    }
                    className="group min-w-[240px] sm:min-w-0 rounded-2xl border border-slate-100 bg-white shadow-sm px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="aspect-square w-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                        {item.imageUrl ? (
                          <img src={resolveAssetUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          "🍖"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-500">{item.qty} pedidos</p>
                        {displayPrice ? (
                          <p className="mt-1 text-sm font-bold tracking-tight text-slate-800">
                            {formatCurrency(displayPrice)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {featuredProduct && (
          <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
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
                  <span className="text-lg font-black tracking-tight text-slate-800">
                    {formatCurrency(featuredProduct.price || 0)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openProductModal(featuredProduct)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Ver detalhes
                </button>
              </div>
            </div>
          </div>
        )}
        {filteredGrouped.map((category, index) => {
          const accentColors = [
            "ds-accent-red",
            "ds-accent-amber",
            "ds-accent-emerald",
            "ds-accent-blue",
            "ds-accent-violet",
            "ds-accent-pink",
          ];
          const accent = accentColors[index % accentColors.length];
          return (
          <div key={category.key} className="space-y-3" id={`cat-${category.key}`} ref={registerCategoryRef(category.key)}>

            {/* Título da categoria */}
            <div
              className="px-4 py-2 rounded-2xl border border-slate-100 bg-white shadow-sm ds-category-head flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const meta = categoryVisualMeta(category.key);
                  const Icon = meta.icon;
                  return (
                    <>
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${meta.tone}`}>
                        <Icon size={16} weight="duotone" />
                      </span>
                      <h2 className="font-bold text-xl capitalize tracking-tight text-slate-800">
                        {category.label}
                      </h2>
                    </>
                  );
                })()}
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
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 grid grid-cols-[1fr_auto] gap-3 hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
                  onClick={() => openProductModal(item)}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="font-semibold text-slate-900 text-[15px] leading-tight line-clamp-2">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                    {itemQtyMap.get(String(item.id)) > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {itemQtyMap.get(String(item.id))} no carrinho
                      </span>
                    )}
                    {item.isFeatured && (
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <Sparkle size={10} weight="fill" />
                        Promo do dia
                      </span>
                    )}
                    {Array.isArray(item?.modifiers) && item.modifiers.some((modifier) => modifier?.active !== false) && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        <Plus size={12} weight="bold" />
                        Tem adicionais
                      </div>
                    )}
                    {item?.bundlePromoActive && Number(item?.bundlePromoQty) >= 2 && Number(item?.bundlePromoPrice) > 0 && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        <Sparkle size={12} weight="duotone" />
                        {item.bundlePromoQty} por {formatCurrency(Number(item.bundlePromoPrice))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[118px]">
                    <div className="aspect-square w-[108px] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                      {item.imageUrl ? (
                        <img
                          src={resolveAssetUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                          sem foto
                        </div>
                      )}
                    </div>
                    {(() => {
                      const itemQty = itemQtyMap.get(String(item.id)) || 0;
                      const hasActiveModifiers = Array.isArray(item?.modifiers)
                        ? item.modifiers.some((modifier: any) => modifier?.active !== false)
                        : false;

                      const handleIncrement = (event: React.MouseEvent) => {
                        event.stopPropagation();
                        if (hasActiveModifiers) {
                          openProductModal(item);
                          return;
                        }
                        if (isEspetoCategory(item.category)) {
                          onUpdateCart(item, 1, { cookingPoint: "ao ponto", passSkewer: false });
                          return;
                        }
                        onUpdateCart(item, 1);
                      };

                      const handleDecrement = (event: React.MouseEvent) => {
                        event.stopPropagation();
                        const entry = resolveQuickAdjustEntry(item);
                        if (!entry) return;
                        onUpdateCart(item, -1, buildCartOptions(entry));
                      };

                      const priceNode = (
                        <div className="flex flex-col items-end leading-none">
                          {resolvePromoPrice(item) ? (
                            <>
                              <span className="text-[11px] font-semibold text-slate-400 line-through">
                                {formatCurrency(item.price)}
                              </span>
                              <span className="text-lg font-bold tracking-tight text-slate-800">
                                {formatCurrency(resolvePromoPrice(item))}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold tracking-tight text-slate-800">
                              {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>
                      );

                      if (itemQty <= 0) {
                        return (
                          <div className="w-full flex items-center justify-end gap-2">
                            {priceNode}
                            <button
                              onClick={handleIncrement}
                              title="Adicionar"
                              className="h-9 px-4 py-1.5 rounded-full border border-amber-500 text-amber-600 hover:bg-amber-50 text-sm font-medium transition-all active:scale-[0.98] inline-flex items-center justify-center gap-1"
                            >
                              <Plus size={14} weight="duotone" />
                              Adicionar
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="w-full flex items-center justify-end gap-2">
                          {priceNode}
                          <div
                            className="h-10 min-w-[112px] rounded-lg border border-slate-200 bg-white px-1.5 flex items-center justify-between gap-1 shadow-sm"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={handleDecrement}
                              className="h-7 w-7 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition flex items-center justify-center"
                              aria-label={`Remover uma unidade de ${item.name}`}
                            >
                              -
                            </button>
                            <span className="min-w-[26px] text-center text-xs font-black text-slate-900">{itemQty}</span>
                            <button
                              type="button"
                              onClick={handleIncrement}
                              className="h-7 w-7 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition flex items-center justify-center"
                              aria-label={`Adicionar uma unidade de ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
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
          <div className="rounded-2xl ds-empty-state p-6 text-sm text-slate-500">
            Nenhum item encontrado.
          </div>
        )}
        <div className="pt-1 pb-2 text-center">
          <a
            href="https://www.janocaminho.com.br"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
          >
            Desenvolvido por Já no Caminho
          </a>
        </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${isCategorySheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <button
          type="button"
          aria-label="Fechar menu de categorias"
          onClick={() => setIsCategorySheetOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <div
          className={`absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out ${isCategorySheetOpen ? "translate-y-0" : "translate-y-full"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="text-lg font-bold text-slate-800">Todas as categorias</h3>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setIsCategorySheetOpen(false)}
              className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:border-slate-300 transition inline-flex items-center justify-center"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 pt-3 max-h-[65vh] overflow-y-auto">
            {filteredGrouped.map((category) => {
              const isActive = activeCategoryKey === category.key;

              return (
                <button
                  key={`sheet-${category.key}`}
                  type="button"
                  onClick={() => {
                    setActiveCategoryKey(category.key);
                    scrollToCategory(category.key);
                    setIsCategorySheetOpen(false);
                  }}
                  className={`rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none" aria-hidden="true">
                      {categoryGlyph(category.key)}
                    </span>
                    <span className="text-sm font-medium truncate">{category.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        cart={cart}
        isOpen={isModalOpen}
        onClose={closeProductModal}
        onAddToCart={onUpdateCart}
      />

      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:max-w-md sm:left-auto sm:right-6">
          <button
            onClick={() => onProceed?.()}
            className="w-full bg-slate-900 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm flex justify-between items-center transform hover:scale-[1.01] transition-all text-sm sm:text-base"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span
                className="px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: branding?.primaryColor || "#0ea5e9" }}
              >
                {cartItemsCount}
              </span>
              <span className="font-bold truncate">Ver sacola</span>
            </div>
            <span className="font-bold text-base sm:text-lg ml-2 flex-shrink-0">{formatCurrency(cartTotalValue)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

