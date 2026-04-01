// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  SquaresFour,
  X,
  Plus,
  Minus,
  SignOut,
  MagnifyingGlass,
  MapPin,
  ChefHat,
  Sparkle,
  ShoppingCart,
  ForkKnife,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { ProductModal } from "../Cart/ProductModal";
import { GoogleMapView } from "../GoogleMapView";
import { AppVersionBadge } from "../common/AppVersionBadge";

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

const categoryDotTone = (key = "") => {
  const normalized = String(key || "").toLowerCase();
  if (normalized.includes("espeto")) return "bg-rose-500";
  if (normalized.includes("bebida")) return "bg-blue-500";
  if (normalized.includes("lanche")) return "bg-amber-500";
  if (normalized.includes("sobremesa")) return "bg-pink-500";
  if (normalized.includes("entrada")) return "bg-emerald-500";
  return "bg-violet-500";
};

const getContrastTextColor = (hexColor = "") => {
  const normalized = String(hexColor || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "#0f172a";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
};

const CatalogQueueSwitch = ({ onOpenQueue }: { onOpenQueue?: () => void }) => {
  if (!onOpenQueue) return null;
  return (
    <div className="relative rounded-full bg-[#F2F2F7] p-1 shadow-[inset_0_1px_1px_rgba(15,23,42,0.06)]">
      <div className="relative grid grid-cols-2 items-center">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-all duration-250 ease-out" />
        <button
          type="button"
          className="relative z-10 px-4 py-2.5 rounded-full text-sm font-semibold text-slate-900 text-center"
        >
          Catálogo
        </button>
        <button
          type="button"
          onClick={onOpenQueue}
          className="relative z-10 px-4 py-2.5 rounded-full text-sm font-normal text-slate-500 hover:text-slate-700 text-center transition-colors duration-200"
        >
          Pedidos
        </button>
      </div>
    </div>
  );
};

const Header = ({
  branding,
  segment,
  instagramHandle,
  whatsappNumber,
  onOpenQueue,
  onOpenAdmin,
  onLogout,
  userRole,
  isAuthenticated,
  compact,
  isOpenNow,
  todayHoursLabel
}) => {
  const normalizedRole = String(userRole || "").toLowerCase();
  const isAdminUser = normalizedRole === "admin";
  const isOperatorUser = normalizedRole === "operator" || normalizedRole === "churrasqueiro";
  const isLogged = Boolean(isAuthenticated || isAdminUser || isOperatorUser);
  const [mobileCollapsedStable, setMobileCollapsedStable] = useState(false);
  const collapseLockUntilRef = React.useRef(0);
  const collapsedRef = React.useRef(false);
  const lastYRef = React.useRef(0);
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
  const headerBanner = resolveAssetUrl(branding?.bannerUrl || "");
  const headerPrimaryColor = branding?.primaryColor || "#0f172a";
  const closingHour = todayHoursLabel
    ? todayHoursLabel
        .split("-")
        .map((part) => part.trim())
        .filter(Boolean)[1] || todayHoursLabel
    : "";

  useEffect(() => {
    if (!compact) return;
    let frame = 0;
    let ticking = false;
    let unlockTimer: ReturnType<typeof setTimeout> | null = null;
    const collapseAt = 96;
    const expandAt = 36;
    const deltaThreshold = 8;

    collapsedRef.current = false;
    lastYRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    collapseLockUntilRef.current = 0;

    const lockTransition = () => {
      collapseLockUntilRef.current = Date.now() + 420;
      if (unlockTimer) clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => {
        collapseLockUntilRef.current = 0;
      }, 430);
    };

    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const now = Date.now();
      const delta = y - lastYRef.current;
      if (Math.abs(delta) < deltaThreshold) return;
      if (now < collapseLockUntilRef.current) {
        lastYRef.current = y;
        return;
      }

      const goingDown = delta > 0;
      const goingUp = delta < 0;
      const collapsed = collapsedRef.current;
      if (!collapsed && goingDown && y >= collapseAt) {
        collapsedRef.current = true;
        lockTransition();
        setMobileCollapsedStable(true);
      } else if (collapsed && goingUp && y <= expandAt) {
        collapsedRef.current = false;
        lockTransition();
        setMobileCollapsedStable(false);
      }
      lastYRef.current = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (unlockTimer) clearTimeout(unlockTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [compact]);

  useEffect(() => {
    if (!compact) setMobileCollapsedStable(false);
  }, [compact]);

  return (
    <div className={`w-full sticky top-0 z-50 ${compact ? 'pb-1' : 'pb-3'} pt-2`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`relative rounded-b-3xl overflow-hidden transition-all duration-300 ${
              compact
                ? mobileCollapsedStable
                  ? "h-0 opacity-0"
                  : "h-[118px] opacity-100"
                : "h-[210px] sm:h-[240px] lg:h-[300px]"
            }`}
            style={
              headerBanner
                ? {
                    backgroundImage: `url(${headerBanner})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { backgroundColor: headerPrimaryColor }
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-black/10" />
            {compact && !mobileCollapsedStable && (
              <div className="sm:hidden absolute inset-x-0 bottom-0 px-4 pb-3">
                <div className="pr-14">
                  <h1 className="text-base font-black text-white truncate">{branding?.brandName || "Sua Loja"}</h1>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-white/95 font-semibold">
                    <span className={`h-2 w-2 rounded-full ${isOpenNow ? "bg-emerald-400 animate-pulse" : "bg-amber-300"}`} />
                    <span>
                      {isOpenNow ? "Aberto" : "Fechado"}
                      {closingHour ? ` · ${isOpenNow ? "Fecha" : "Hoje até"} ${closingHour}` : ""}
                    </span>
                  </div>
                </div>
                <div className="absolute right-4 top-1 h-11 w-11 rounded-full overflow-hidden border-2 border-white bg-white shadow-lg flex items-center justify-center">
                  {branding?.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-xs text-slate-700">{previewInitials || "JC"}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`relative px-4 sm:px-6 pb-4 pt-11 sm:pt-4 ${compact ? "hidden sm:block" : ""}`}>
            <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-4 border-white bg-white shadow-xl flex items-center justify-center">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-xl text-slate-700">{previewInitials || "JC"}</span>
              )}
            </div>

            <div className="sm:pl-32 flex flex-col items-center text-center sm:items-start sm:text-left">
              <h1 className={`${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-black text-slate-900 truncate max-w-full`}>
                {branding?.brandName || "Sua Loja"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {segmentLabel !== "Comércio" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    {segmentLabel}
                  </span>
                )}
                <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 font-semibold">
                  <span className={`h-2 w-2 rounded-full ${isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-orange-500"}`} />
                  <span>
                    {isOpenNow ? "Aberto" : "Fechado"}
                    {closingHour ? `  ${isOpenNow ? "Fecha às" : "Hoje até"} ${closingHour}` : ""}
                  </span>
                </div>
              </div>

              {!compact && (
                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
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

            {isLogged && (
              <div className="mt-3 sm:mt-0 sm:absolute sm:right-6 sm:bottom-4 flex flex-row items-center justify-center sm:justify-end gap-2">
              <CatalogQueueSwitch onOpenQueue={onOpenQueue} />
              {isAdminUser && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 whitespace-nowrap"
                >
                  <SquaresFour size={12} weight="duotone" />
                  {!compact && <span className="hidden sm:inline">Painel</span>}
                </button>
              )}
              {isOperatorUser && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-2 rounded-full text-xs font-semibold border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 transition inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <SignOut size={12} weight="bold" />
                  Sair
                </button>
              )}
            </div>
            )}
          </div>
          {compact && !mobileCollapsedStable && isLogged && (
            <div className="sm:hidden relative px-3 pb-2">
              <div className="flex flex-row items-center justify-end gap-2">
                <CatalogQueueSwitch onOpenQueue={onOpenQueue} />
                {isAdminUser && onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 whitespace-nowrap"
                  >
                    <SquaresFour size={12} weight="duotone" />
                    Painel
                  </button>
                )}
                {isOperatorUser && onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-3 py-2 rounded-full text-xs font-semibold border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 transition inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <SignOut size={12} weight="bold" />
                    Sair
                  </button>
                )}
              </div>
            </div>
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
  onLogout,
  onProceed,
  compactHeader = false,
  staffView = false,
  isOrderingEnabled = true,
  userRole,
  isAuthenticated = false,
}) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showStoreDetails, setShowStoreDetails] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState("");
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [qtyPulseId, setQtyPulseId] = useState<string | null>(null);
  const [activeQtyControlId, setActiveQtyControlId] = useState<string | null>(null);
  const [flyToCartItems, setFlyToCartItems] = useState<
    Array<{
      id: string;
      startX: number;
      startY: number;
      deltaX: number;
      deltaY: number;
      imageUrl?: string;
      active: boolean;
    }>
  >([]);
  const [cartPulse, setCartPulse] = useState(false);
  const qtyControlIdleTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const cartButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const canOrder = isOrderingEnabled !== false;
  const catalogPrimaryColor = branding?.primaryColor || "#f59e0b";
  const catalogSecondaryColor = branding?.secondaryColor || branding?.accentColor || "#0f172a";
  const catalogPrimaryText = getContrastTextColor(catalogPrimaryColor);
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
    const normalize = (value) => (value || "outros").toString().trim().toLowerCase();
    const normalizeKey = (value) =>
      normalize(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const canonicalCategoryLabels: Record<string, string> = {
      refeicoes: "Refeições",
      refeicao: "Refeição",
      porcoes: "Porções",
      porcao: "Porção",
      acai: "Açaí",
      acais: "Açaís",
      bebidas: "Bebidas",
      cervejas: "Cervejas",
      destilados: "Destilados",
      lanches: "Lanches",
      sobremesas: "Sobremesas",
      entradas: "Entradas",
      outros: "Outros",
    };
    const labelize = (value) => {
      const key = normalizeKey(value);
      const compactKey = key.replace(/\s+/g, "");
      if (canonicalCategoryLabels[compactKey]) return canonicalCategoryLabels[compactKey];
      if (canonicalCategoryLabels[key]) return canonicalCategoryLabels[key];
      return key
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    };

    const map = {};
    products.forEach((item) => {
      const key = normalize(item.category);
      if (!map[key]) {
        map[key] = {
          key,
          label: labelize(item.category || key),
          items: [],
          priority: Number.isFinite(Number(item?.categoryPriority)) ? Number(item.categoryPriority) : 99,
        };
      }
      map[key].items.push(item);
      const itemPriority = Number(item?.categoryPriority);
      if (Number.isFinite(itemPriority)) {
        map[key].priority = Math.min(map[key].priority, itemPriority);
      }
    });

    const ordered = Object.values(map)
      .sort((a: any, b: any) => {
        const pa = Number.isFinite(Number(a?.priority)) ? Number(a.priority) : 99;
        const pb = Number.isFinite(Number(b?.priority)) ? Number(b.priority) : 99;
        if (pa !== pb) return pa - pb;
        return String(a?.label || "").localeCompare(String(b?.label || ""), "pt-BR");
      })
      .map((entry: any) => ({
        key: entry.key,
        label: entry.label,
        items: entry.items || [],
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
      target.scrollIntoView({ behavior: staffView ? "auto" : "smooth", block: "start" });
    }
  };

  const resolveStockState = (item) => {
    const manageStock = Boolean(item?.manageStock);
    const stockQuantityRaw = Number(item?.stockQuantity ?? 0);
    const stockQuantity = Number.isFinite(stockQuantityRaw) ? Math.max(0, Math.floor(stockQuantityRaw)) : 0;
    const lowStockAlertRaw = Number(item?.lowStockAlert ?? 3);
    const lowStockAlert = Number.isFinite(lowStockAlertRaw) ? Math.max(1, Math.floor(lowStockAlertRaw)) : 3;
    const soldOut = manageStock && stockQuantity <= 0;
    const lowStock = manageStock && stockQuantity > 0 && stockQuantity <= lowStockAlert;
    return { manageStock, stockQuantity, lowStockAlert, soldOut, lowStock };
  };

  const pulseQty = (id: string) => {
    setQtyPulseId(id);
    window.setTimeout(() => setQtyPulseId((prev) => (prev === id ? null : prev)), 220);
  };

  const scheduleQtyControlIdle = (id: string) => {
    const timers = qtyControlIdleTimersRef.current;
    if (timers[id]) window.clearTimeout(timers[id]);
    timers[id] = window.setTimeout(() => {
      setActiveQtyControlId((prev) => (prev === id ? null : prev));
      delete timers[id];
    }, 3000);
  };

  const openQtyControl = (id: string) => {
    setActiveQtyControlId(id);
    scheduleQtyControlIdle(id);
  };

  const closeQtyControl = (id: string) => {
    const timers = qtyControlIdleTimersRef.current;
    if (timers[id]) {
      window.clearTimeout(timers[id]);
      delete timers[id];
    }
    setActiveQtyControlId((prev) => (prev === id ? null : prev));
  };

  useEffect(() => {
    return () => {
      const timers = qtyControlIdleTimersRef.current;
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
      qtyControlIdleTimersRef.current = {};
    };
  }, []);

  const animateItemToCart = (originEl: HTMLElement | null, item: any) => {
    const cartEl = cartButtonRef.current;
    if (!originEl || !cartEl) return;
    const originRect = originEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();
    const size = 22;
    const startX = originRect.left + originRect.width / 2 - size / 2;
    const startY = originRect.top + originRect.height / 2 - size / 2;
    const endX = cartRect.left + Math.min(cartRect.width * 0.22, 42) - size / 2;
    const endY = cartRect.top + cartRect.height / 2 - size / 2;
    const flyId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const imageUrl = item?.imageUrl ? resolveAssetUrl(item.imageUrl) : "";

    setFlyToCartItems((prev) => [
      ...prev,
      {
        id: flyId,
        startX,
        startY,
        deltaX: endX - startX,
        deltaY: endY - startY,
        imageUrl,
        active: false,
      },
    ]);

    window.requestAnimationFrame(() => {
      setFlyToCartItems((prev) =>
        prev.map((fly) => (fly.id === flyId ? { ...fly, active: true } : fly))
      );
    });

    window.setTimeout(() => {
      setFlyToCartItems((prev) => prev.filter((fly) => fly.id !== flyId));
      setCartPulse(true);
      window.setTimeout(() => setCartPulse(false), 260);
    }, 620);
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
          onLogout={onLogout}
          userRole={userRole}
          isAuthenticated={isAuthenticated}
          compact={compactHeader}
          isOpenNow={isOpenNow}
          todayHoursLabel={todayHoursLabel}
        />
      )}

      {filteredGrouped.length > 1 && (
        <div
          className={`sticky ${showHeader ? "top-0 sm:top-[92px]" : "top-0"} z-40 px-4 pb-2 pt-1 max-w-6xl mx-auto`}
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm ds-tabs px-2 py-2">
            <div className="relative w-full flex items-center gap-2">
              <div
                className={`${
                  filteredGrouped.length > 2
                    ? "flex-1 overflow-x-auto no-scrollbar scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory"
                    : "flex-1"
                }`}
              >
                <div
                  className={`${
                    filteredGrouped.length <= 2
                      ? "grid grid-cols-2 gap-2 w-full"
                      : `flex items-center gap-2 ${filteredGrouped.length > 2 ? "w-max pr-1" : "w-full"}`
                  }`}
                >
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
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all snap-start ${
                        isActive ? "font-semibold shadow-sm scale-105" : "font-medium"
                      } ${filteredGrouped.length <= 2 ? "w-full min-w-0" : ""}`}
                      style={
                        isActive
                          ? { backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }
                          : { backgroundColor: "#f8fafc", color: catalogSecondaryColor }
                      }
                    >
                      <span className="text-[17px] leading-none" aria-hidden="true">
                        {categoryGlyph(category.key)}
                      </span>
                      <span className="whitespace-nowrap text-xs sm:text-sm">{category.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "" : "bg-white border border-slate-200"}`}
                        style={isActive ? { backgroundColor: "rgba(255,255,255,0.2)", color: catalogPrimaryText } : { color: "#64748b" }}
                      >
                        {category.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>
              {filteredGrouped.length > 2 && (
                <>
                  <div className="pointer-events-none absolute right-14 top-1 bottom-1 w-10 bg-gradient-to-l from-white/95 via-white/75 to-transparent rounded-r-2xl" />
                <button
                  type="button"
                  aria-label="Abrir categorias"
                  onClick={() => setIsCategorySheetOpen(true)}
                  className="h-9 px-3 rounded-full bg-white shadow-sm inline-flex items-center justify-center gap-1 text-slate-700 border border-slate-200 active:scale-95 transition-all"
                  style={{ color: catalogSecondaryColor }}
                >
                  <SquaresFour size={16} weight="duotone" />
                  <span className="text-xs font-semibold">Mais</span>
                </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-6 sm:space-y-8 px-3 sm:px-4 py-3 sm:py-4 max-w-6xl mx-auto ${cartItemsCount > 0 ? 'pb-28 sm:pb-8' : ''}`}>
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
        <div id="menu-list" className="space-y-10">
        {promoMessage && (
          <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-500 font-semibold">Mensagem do dia</p>
            <p className="text-sm font-semibold text-slate-900 mt-2">{promoMessage}</p>
          </div>
        )}
        {!staffView && topItems.length > 0 && (
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
                {!staffView && featuredProduct.description && (
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
        {!canOrder && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Pedidos online desativados para esta loja. Consulte o cardápio e faça o pedido no balcão/mesa.
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
              {category.items.map((item) => {
                const hasActiveModifiers = Array.isArray(item?.modifiers)
                  ? item.modifiers.some((modifier: any) => modifier?.active !== false)
                  : false;
                const hasConfigurableOptions = hasActiveModifiers || isEspetoCategory(item?.category);
                const hasLongDescription = String(item?.description || '').trim().length > 90;
                const hasAnyDescription = String(item?.description || '').trim().length > 0;
                const allowStaffModal = hasConfigurableOptions || hasAnyDescription;
                const stockState = resolveStockState(item);
                const itemId = String(item.id);
                const itemQty = itemQtyMap.get(itemId) || 0;
                const canIncrease = !stockState.soldOut && (!stockState.manageStock || itemQty < stockState.stockQuantity);
                const isQtyControlExpanded = activeQtyControlId === itemId && itemQty > 0;

                const handleOpenOptions = (event?: React.MouseEvent) => {
                  event?.stopPropagation();
                  if (!hasConfigurableOptions) return;
                  openProductModal(item);
                };

                const handleOpenDetails = (event?: React.MouseEvent) => {
                  event?.stopPropagation();
                  openProductModal(item);
                };

                const handleIncrement = (event: React.MouseEvent) => {
                  const originButton = event.currentTarget as HTMLElement;
                  event.stopPropagation();
                  openQtyControl(itemId);
                  if (!canIncrease) {
                    if (isEspetoCategory(item.category)) {
                      onUpdateCart(item, 1, { cookingPoint: "ao ponto", passSkewer: false });
                      return;
                    }
                    onUpdateCart(item, 1);
                    return;
                  }
                  pulseQty(itemId);
                  animateItemToCart(originButton, item);
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
                  pulseQty(itemId);
                  onUpdateCart(item, -1, buildCartOptions(entry));
                  if (itemQty <= 1) {
                    closeQtyControl(itemId);
                    return;
                  }
                  scheduleQtyControlIdle(itemId);
                };

                return (
                <div
                  key={item.id}
                  className={`group bg-white rounded-3xl border border-transparent shadow-sm p-3.5 sm:p-4 grid grid-cols-[1fr_auto] gap-3 md:hover:scale-[1.01] md:hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition ${!staffView ? "cursor-pointer" : "cursor-default"}`}
                  onClick={() => {
                    if (!staffView) openProductModal(item);
                  }}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!staffView || allowStaffModal) {
                          openProductModal(item);
                        }
                      }}
                      className={`text-left font-bold text-gray-900 text-base sm:text-lg leading-tight line-clamp-2 ${(!staffView || allowStaffModal) ? 'cursor-pointer hover:text-gray-700' : 'cursor-default'}`}
                    >
                      {item.name}
                    </button>
                    {item.description && (
                      <p className="text-sm sm:text-[15px] text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                    {item.isFeatured && (
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <Sparkle size={10} weight="fill" />
                        Promo do dia
                      </span>
                    )}
                    {hasConfigurableOptions && (
                      <button
                        type="button"
                        onClick={handleOpenOptions}
                        className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full hover:bg-slate-50 transition cursor-pointer"
                      >
                        <SlidersHorizontal size={12} weight="bold" />
                        {isEspetoCategory(item?.category) ? "Customizar espeto" : "Ver opções"}
                      </button>
                    )}
                    {stockState.soldOut && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ESGOTADO
                      </span>
                    )}
                    {!stockState.soldOut && stockState.lowStock && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Apenas {stockState.stockQuantity} unidade{stockState.stockQuantity === 1 ? '' : 's'}
                      </span>
                    )}
                    {staffView && !hasConfigurableOptions && hasAnyDescription && (
                      <button
                        type="button"
                        onClick={handleOpenDetails}
                        className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full hover:bg-slate-200 transition cursor-pointer"
                      >
                        {hasLongDescription ? 'Ver descrição completa' : 'Ver detalhes'}
                      </button>
                    )}
                    {item?.bundlePromoActive && Number(item?.bundlePromoQty) >= 2 && Number(item?.bundlePromoPrice) > 0 && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        <Sparkle size={12} weight="duotone" />
                        {item.bundlePromoQty} por {formatCurrency(Number(item.bundlePromoPrice))}
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col items-end gap-2 ${staffView ? "min-w-[132px]" : "min-w-[118px]"}`}>
                    <div className={`relative aspect-[4/3] sm:aspect-square ${staffView ? "w-[120px]" : "w-[108px]"}`}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!staffView || allowStaffModal) {
                            openProductModal(item);
                          }
                        }}
                        className={`h-full w-full rounded-3xl overflow-hidden bg-gray-100 border border-slate-100 shadow-sm ${(!staffView || allowStaffModal) ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                      {stockState.soldOut && (
                        <span className="absolute z-10 top-2 left-2 rounded-full bg-rose-600 text-white text-[10px] font-bold px-2 py-1">
                          ESGOTADO
                        </span>
                      )}
                      {item.imageUrl ? (
                        <img
                          src={resolveAssetUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ForkKnife size={18} weight="duotone" />
                        </div>
                      )}
                      </button>
                      {canOrder && (
                        <>
                          {itemQty <= 0 && (
                            <button
                              type="button"
                              onClick={handleIncrement}
                              title={stockState.soldOut ? "Esgotado" : "Adicionar"}
                              disabled={stockState.soldOut}
                              className="absolute bottom-1 right-1 h-9 w-9 rounded-full border shadow-md ring-2 ring-white inline-flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: catalogPrimaryColor, borderColor: catalogPrimaryColor, color: catalogPrimaryText }}
                              aria-label={`Adicionar ${item.name}`}
                            >
                              <Plus size={17} weight="bold" />
                            </button>
                          )}
                          {itemQty > 0 && !isQtyControlExpanded && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openQtyControl(itemId);
                              }}
                              className="absolute bottom-1 right-1 h-9 min-w-[36px] rounded-full border shadow-md ring-2 ring-white inline-flex items-center justify-center px-2 transition-all duration-300 active:scale-95"
                              style={{ backgroundColor: catalogPrimaryColor, borderColor: catalogPrimaryColor, color: catalogPrimaryText }}
                              aria-label={`Quantidade ${itemQty} de ${item.name}`}
                            >
                              <span className="text-sm font-black leading-none">{itemQty}</span>
                            </button>
                          )}
                          {itemQty > 0 && isQtyControlExpanded && (
                            <div
                              className="absolute bottom-1 right-1 h-9 rounded-full border border-slate-200 bg-white shadow-md ring-2 ring-white inline-flex items-center gap-1 px-1.5 transition-all duration-300"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={handleDecrement}
                                className="h-6 w-6 rounded-full border transition inline-flex items-center justify-center"
                                style={{ borderColor: `${catalogPrimaryColor}33`, color: catalogSecondaryColor, backgroundColor: "#ffffff" }}
                                aria-label={`Remover uma unidade de ${item.name}`}
                              >
                                <Minus size={12} weight="bold" />
                              </button>
                              <span
                                className={`min-w-[22px] text-center text-xs font-black leading-none ${
                                  qtyPulseId === itemId ? "scale-110" : ""
                                }`}
                                style={{ color: qtyPulseId === itemId ? catalogPrimaryColor : catalogSecondaryColor }}
                              >
                                {itemQty}
                              </span>
                              <button
                                type="button"
                                onClick={handleIncrement}
                                disabled={stockState.soldOut}
                                className="h-6 w-6 rounded-full transition inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }}
                                aria-label={`Adicionar uma unidade de ${item.name}`}
                              >
                                <Plus size={12} weight="bold" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {(() => {
                      const priceNode = (
                        <div className="flex flex-col items-end leading-none">
                          {resolvePromoPrice(item) ? (
                            <>
                              <span className="text-[11px] font-semibold text-slate-400 line-through">
                                {formatCurrency(item.price)}
                              </span>
                              <span className="text-xl font-bold tracking-tight text-slate-900">
                                {formatCurrency(resolvePromoPrice(item))}
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold tracking-tight text-slate-900">
                              {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>
                      );

                      if (!canOrder) {
                        return (
                          <div className="w-full flex flex-col items-end gap-2">
                            {priceNode}
                            <span className="text-[11px] font-semibold text-slate-500 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                              Pedidos só no balcão
                            </span>
                          </div>
                        );
                      }

                      if (itemQty <= 0) {
                        return (
                          <div className="w-full flex items-center justify-end gap-2">
                            {priceNode}
                            {stockState.soldOut && (
                              <span className="text-[11px] font-semibold text-slate-500 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                Esgotado
                              </span>
                            )}
                          </div>
                        );
                      }

                      return <div className="w-full flex items-center justify-end">{priceNode}</div>;
                    })()}
                  </div>
                </div>
              )})}
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
            <span className="h-4 w-4 rounded-full overflow-hidden border border-slate-200">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
            </span>
            Desenvolvido por Já no Caminho
            <span className="normal-case tracking-normal text-[10px]">
              <AppVersionBadge prefix=" | " />
            </span>
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
                  className="rounded-xl border p-3 text-left transition active:scale-[0.98]"
                  style={
                    isActive
                      ? { backgroundColor: catalogPrimaryColor, color: catalogPrimaryText, borderColor: catalogPrimaryColor }
                      : { backgroundColor: "#f8fafc", color: catalogSecondaryColor, borderColor: "#f1f5f9" }
                  }
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
        readOnly={!canOrder || resolveStockState(selectedProduct).soldOut}
        readOnlyMessage={!canOrder ? "Pedidos apenas no balcão/mesa." : "Produto esgotado no momento."}
      />

      <div
        className={`fixed bottom-6 left-1/2 z-40 w-[92%] max-w-md -translate-x-1/2 transition-all duration-300 ${
          cartItemsCount > 0 && canOrder ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        }`}
      >
        {canOrder && (
          <button
            ref={cartButtonRef}
            onClick={() => onProceed?.()}
            className={`w-full px-4 py-3 rounded-full flex justify-between items-center active:scale-[0.99] transition-all text-sm sm:text-base ${
              cartPulse ? "scale-[1.03]" : "scale-100"
            }`}
            style={{
              backgroundColor: catalogPrimaryColor,
              color: catalogPrimaryText,
              boxShadow: `0 16px 32px -18px ${catalogPrimaryColor}80`,
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span
                className="h-7 min-w-7 px-2 rounded-full text-xs font-extrabold inline-flex items-center justify-center"
                style={{ color: catalogPrimaryColor, backgroundColor: "#ffffff" }}
              >
                {cartItemsCount}
              </span>
              <span className="font-bold truncate">Ver sacola</span>
            </div>
            <span className="font-bold text-base sm:text-lg ml-2 flex-shrink-0">{formatCurrency(cartTotalValue)}</span>
          </button>
        )}
      </div>

      <div className="pointer-events-none fixed inset-0 z-[70]">
        {flyToCartItems.map((fly) => (
          <div
            key={fly.id}
            className="absolute rounded-full overflow-hidden border border-white/70 shadow-md"
            style={{
              left: `${fly.startX}px`,
              top: `${fly.startY}px`,
              width: "22px",
              height: "22px",
              transform: fly.active
                ? `translate3d(${fly.deltaX}px, ${fly.deltaY}px, 0) scale(0.42)`
                : "translate3d(0, 0, 0) scale(1)",
              opacity: fly.active ? 0.22 : 0.98,
              transition: "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease",
              background: fly.imageUrl ? "#ffffff" : catalogPrimaryColor,
            }}
          >
            {fly.imageUrl ? (
              <img src={fly.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center" style={{ color: catalogPrimaryText }}>
                <Plus size={12} weight="bold" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

