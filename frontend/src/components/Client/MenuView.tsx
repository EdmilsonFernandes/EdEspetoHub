// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  SquaresFour,
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
  if (normalized.includes("espeto")) return { icon: ChefHat, tone: "text-rose-700 bg-rose-50 border-rose-200" };
  if (normalized.includes("bebida")) return { icon: ShoppingCart, tone: "text-sky-700 bg-sky-50 border-sky-200" };
  if (normalized.includes("por")) return { icon: ForkKnife, tone: "text-amber-700 bg-amber-50 border-amber-200" };
  if (normalized.includes("lanche")) return { icon: Sparkle, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  return { icon: SquaresFour, tone: "text-slate-700 bg-slate-50 border-slate-200" };
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

  return (
    <div className={`w-full sticky top-0 z-50 ${compact ? 'pb-2' : 'pb-3'} pt-2`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div
          className={`relative overflow-hidden rounded-2xl border border-white/70 px-3 sm:px-5 ${compact ? 'py-2' : 'py-3 sm:py-3.5'} shadow-[0_14px_32px_-22px_rgba(15,23,42,0.36)]`}
          style={{
            backgroundImage: `linear-gradient(118deg, color-mix(in srgb, ${branding?.primaryColor || '#0ea5e9'} 34%, #0f172a 66%), color-mix(in srgb, ${branding?.accentColor || '#22c55e'} 18%, #0f172a 82%))`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/45 via-slate-900/16 to-slate-950/52" />
          <div className="pointer-events-none absolute top-0 left-4 right-4 h-1 rounded-full ds-header-gradient-line" />

          <div className="relative flex flex-wrap items-start gap-3 sm:gap-4 sm:flex-nowrap">
            {(!compact || (compact && branding?.logoUrl)) && (
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/40 bg-white/10 backdrop-blur-sm shadow-[0_10px_22px_-16px_rgba(14,165,233,0.6)] flex-shrink-0 flex items-center justify-center">
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.brandName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-base sm:text-lg text-white">{previewInitials || "JC"}</span>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className={`${compact ? 'text-sm' : 'text-lg sm:text-xl'} font-black text-white truncate`}>
                {branding?.brandName || "Sua Loja"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {segmentLabel !== "Comércio" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white">
                    {segmentLabel}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    isOpenNow
                      ? 'border-emerald-200/80 bg-emerald-500/25 text-emerald-50'
                      : 'border-amber-200/80 bg-amber-500/25 text-amber-50'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isOpenNow ? 'bg-emerald-200' : 'bg-amber-200'}`} />
                  {isOpenNow ? 'Aberto agora' : 'Fechado no momento'}
                </span>
                {todayHoursLabel && (
                  <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-slate-100 max-w-[20ch] truncate">
                    Hoje {todayHoursLabel}
                  </span>
                )}
              </div>
              {!compact && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {storeSlug && (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-100 hover:bg-white/25 transition max-w-full"
                    >
                      Site: <span className="normal-case truncate max-w-[24ch]">{storeUrl.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {instagramHandle && (
                    <a
                      href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-pink-200/60 bg-pink-500/20 px-2.5 py-1 text-[11px] font-semibold text-pink-50 hover:bg-pink-500/30 transition"
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
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500/30 transition"
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
                <div className="flex items-center rounded-full border border-white/40 bg-white/20 p-0.5 backdrop-blur-sm">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-900 shadow-sm"
                  >
                    Vitrine
                  </button>
                  <button
                    type="button"
                    onClick={onOpenQueue}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-white hover:text-slate-100"
                  >
                    Operação
                  </button>
                </div>
              )}
              {onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-2 rounded-full text-xs font-semibold border border-white/40 bg-white/10 text-white hover:bg-white/20 transition flex items-center gap-1 whitespace-nowrap"
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

  return (
    <div className="ds-page-gradient overflow-x-clip">

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
        <section className="relative overflow-hidden rounded-2xl premium-card-glass p-4">
          <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full opacity-20 ds-menu-orb-primary" />
          <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full opacity-20 ds-menu-orb-secondary" />
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
              <div className="rounded-2xl premium-card-glass p-4">
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
                        className="px-3 py-2 rounded-full text-xs font-semibold border border-brand-primary text-brand-primary bg-brand-primary-soft hover:opacity-90 transition"
                      >
                        Abrir no Waze
                      </a>
                    </div>
                  </div>
                  {mapMarkers.length > 0 && (
                    <div className="rounded-2xl premium-card p-2">
                      <GoogleMapView markers={mapMarkers} zoom={15} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="ds-input rounded-full py-2 pl-9 pr-4 text-sm"
                placeholder="Buscar produtos por nome ou categoria"
              />
            </div>
          </div>
        </section>
        {filteredGrouped.length > 1 && (
          <div
            className={`sticky ${showHeader ? "top-[72px] sm:top-[92px]" : "top-3"} z-40 -mx-4 px-4 pb-2`}
          >
            <div className="rounded-2xl premium-card-glass px-3 py-2 ds-tabs">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {filteredGrouped.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => scrollToCategory(category.key)}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-brand-primary hover:text-brand-primary transition"
                  >
                    {(() => {
                      const meta = categoryVisualMeta(category.key);
                      const Icon = meta.icon;
                      return (
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${meta.tone}`}>
                          <Icon size={11} weight="duotone" />
                        </span>
                      );
                    })()}
                    {category.label}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      {category.items.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div id="menu-list" className="space-y-10">
        {promoMessage && (
          <div className="rounded-3xl premium-card-soft p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-500 font-semibold">Mensagem do dia</p>
            <p className="text-sm font-semibold text-slate-900 mt-2">{promoMessage}</p>
          </div>
        )}
        {topItems.length > 0 && (
          <div className="rounded-3xl premium-card-glass p-4 sm:p-5">
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
                  className="group flex min-w-[220px] sm:min-w-0 items-center gap-3 rounded-2xl premium-card px-3 py-2 text-left transition"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                    {item.imageUrl ? (
                      <img src={resolveAssetUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
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
          <div className="rounded-3xl premium-card-soft p-4 sm:p-5">
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
              className="px-4 py-2 rounded-2xl premium-card-glass ds-category-head flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className={`h-9 w-1.5 rounded-full ${accent}`} />
                {(() => {
                  const meta = categoryVisualMeta(category.key);
                  const Icon = meta.icon;
                  return (
                    <>
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${meta.tone}`}>
                        <Icon size={16} weight="duotone" />
                      </span>
                      <h2 className="font-bold text-lg capitalize tracking-wide text-slate-800">
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
                  className="group bg-white/95 rounded-2xl premium-card p-3 sm:p-4 grid grid-cols-[1fr_auto] gap-3 hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
                  onClick={() => openProductModal(item)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold text-slate-900 text-[15px] leading-tight line-clamp-2">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      {resolvePromoPrice(item) ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-400 line-through">
                            {formatCurrency(item.price)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                            {formatCurrency(resolvePromoPrice(item))}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                      {itemQtyMap.get(String(item.id)) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {itemQtyMap.get(String(item.id))} no carrinho
                        </span>
                      )}
                    </div>
                    {item.isFeatured && (
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        <Sparkle size={10} weight="fill" />
                        Promo do dia
                      </span>
                    )}
                    {Array.isArray(item?.modifiers) && item.modifiers.some((modifier) => modifier?.active !== false) && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-brand-primary bg-brand-primary-soft border border-brand-primary/20 px-2.5 py-1 rounded-full">
                        <Plus size={12} weight="bold" />
                        Tem adicionais
                      </div>
                    )}
                    {item?.bundlePromoActive && Number(item?.bundlePromoQty) >= 2 && Number(item?.bundlePromoPrice) > 0 && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <Sparkle size={12} weight="duotone" />
                        {item.bundlePromoQty} por {formatCurrency(Number(item.bundlePromoPrice))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="w-[108px] h-[108px] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
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

                      if (itemQty <= 0) {
                        return (
                          <button
                            onClick={handleIncrement}
                            title="Adicionar"
                            className="relative h-10 min-w-[102px] px-3 rounded-xl ds-btn ds-btn-primary ds-focus-ring text-white flex items-center justify-center gap-1 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.6)] text-xs font-extrabold"
                          >
                            <Plus size={14} weight="duotone" />
                            Adicionar
                          </button>
                        );
                      }

                      return (
                        <div
                          className="h-10 min-w-[112px] rounded-xl border border-brand-primary/35 bg-white/95 shadow-[0_14px_26px_-20px_rgba(14,165,233,0.7)] px-1.5 flex items-center justify-between gap-1"
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
                            className="h-7 w-7 rounded-lg bg-brand-primary text-white hover:brightness-110 transition flex items-center justify-center"
                            aria-label={`Adicionar uma unidade de ${item.name}`}
                          >
                            +
                          </button>
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
            className="w-full bg-brand-gradient text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.01] transition-all text-sm sm:text-base"
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

