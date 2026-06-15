// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Drawer } from "vaul";
import {
  SquaresFour,
  Plus,
  Minus,
  SignOut,
  MagnifyingGlass,
  MapPin,
  Phone,
  Star,
  Clock,
  ArrowLeft,
  ChefHat,
  BeerBottle,
  BowlFood,
  Coffee,
  Cookie,
  Sparkle,
  ShoppingCart,
  ForkKnife,
  SlidersHorizontal,
  ShareNetwork,
  HeartStraight,
  List,
  UserCircle,
  Trash,
  CalendarBlank,
  Storefront,
  Info,
  Package,
  CaretRight,
} from "@phosphor-icons/react";
import { formatCurrency } from "../../utils/format";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { getStoreAvatarUrl } from "../../utils/storeAvatar";
import { inputAssistProps } from "../../utils/inputAssist";
import { ProductModal } from "../Cart/ProductModal";
import { StoreMapView } from "../StoreMapView";
import { PlatformTrustFooter } from "../common/PlatformTrustFooter";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { PremiumTabs } from "../common/PremiumTabs";
import { StoreReviewsTab } from "./StoreReviewsTab";
import { StoreInfoTab } from "./StoreInfoTab";

// =======================================
// HEADER PREMIUM COM LOGO OFICIAL
// =======================================
const normalizeWhatsApp = (value) => {
  if (!value) return "";
  const digits = value.toString().replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const openWhatsAppContact = (value, event, message = "") => {
  const phone = normalizeWhatsApp(value);
  if (!phone) return;
  const encodedMessage = message ? encodeURIComponent(message) : "";

  const webUrl = encodedMessage ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}` : `https://api.whatsapp.com/send?phone=${phone}`;

  if (event) {
    event.preventDefault();
  }

  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/browser")
      .then(({ Browser }) => Browser.open({ url: webUrl }))
      .catch(() => window.open(webUrl, "_blank", "noopener,noreferrer"));
    return;
  }

  window.open(webUrl, "_blank", "noopener,noreferrer");
};

const isEspetoCategory = (category) => {
  const normalized = (category || "").toString().trim().toLowerCase();
  return normalized.includes("espeto");
};

const categoryVisualMeta = (key = "") => {
  const normalized = String(key || "").toLowerCase();
  if (normalized.includes("espeto") || normalized.includes("carne") || normalized.includes("churrasco")) {
    return { icon: ChefHat, tone: "text-rose-600 bg-rose-50 border-rose-100" };
  }
  if (normalized.includes("cerveja") || normalized.includes("drink")) {
    return { icon: BeerBottle, tone: "text-amber-600 bg-amber-50 border-amber-100" };
  }
  if (normalized.includes("bebida") || normalized.includes("suco") || normalized.includes("refrigerante")) {
    return { icon: Coffee, tone: "text-sky-600 bg-sky-50 border-sky-100" };
  }
  if (normalized.includes("por") || normalized.includes("entrada") || normalized.includes("petisco")) {
    return { icon: ForkKnife, tone: "text-orange-600 bg-orange-50 border-orange-100" };
  }
  if (normalized.includes("lanche") || normalized.includes("hamb") || normalized.includes("burger")) {
    return { icon: BowlFood, tone: "text-amber-600 bg-amber-50 border-amber-100" };
  }
  if (normalized.includes("sobremesa") || normalized.includes("doce") || normalized.includes("bolo")) {
    return { icon: Cookie, tone: "text-pink-600 bg-pink-50 border-pink-100" };
  }
  if (normalized.includes("refeic") || normalized.includes("prato") || normalized.includes("almoco") || normalized.includes("jantar")) {
    return { icon: ForkKnife, tone: "text-emerald-600 bg-emerald-50 border-emerald-100" };
  }
  return { icon: SquaresFour, tone: "text-violet-600 bg-violet-50 border-violet-100" };
};

const categoryGlyph = (key = "") => {
  return categoryVisualMeta(key).icon;
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

const Header = ({
  branding,
  segment,
  instagramHandle,
  whatsappNumber,
  whatsappMessage,
  onOpenQueue,
  onOpenAdmin,
  onLogout,
  onOpenCustomerAccount,
  isCustomerAuthenticated,
  userRole,
  isAuthenticated,
  compact,
  isOpenNow,
  todayHoursLabel,
  todayClosingLabel,
  onOpenStoreDetails,
  onShowReviews,
  reviewSummary,
  deliveryFeeLabel,
  orderTypes
}) => {
  const normalizedRole = String(userRole || "").toLowerCase();
  const isAdminUser = normalizedRole === "admin" || normalizedRole === "lojista";
  const isOperatorUser = normalizedRole === "operator";
  const canAccessOperations = isAdminUser || isOperatorUser;
  const isLogged = Boolean(isAuthenticated || canAccessOperations);
  const hasOperationHeaderActions = Boolean(
    canAccessOperations && (onOpenAdmin || onOpenQueue || onLogout)
  );
  const [mobileCollapsedStable, setMobileCollapsedStable] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const collapseLockUntilRef = React.useRef(0);
  const collapsedRef = React.useRef(false);
  const lastYRef = React.useRef(0);
  const bannerRef = React.useRef<HTMLDivElement | null>(null);
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
  const avgRating = Number(reviewSummary?.avgStoreRating || 0);
  const totalReviews = Number(reviewSummary?.totalReviews || 0);
  const deliveryModes = Array.isArray(orderTypes)
    ? orderTypes
        .map((type) => String(type || "").toLowerCase())
        .filter(Boolean)
        .map((type) =>
          type === "delivery" ? "Entrega" : type === "pickup" ? "Retirada" : type === "table" ? "Mesa" : type
        )
    : [];
  const normalizedTodayHoursLabel = String(todayHoursLabel || "").trim();
  const hasAllDayService = todayClosingLabel === "24 horas" || normalizedTodayHoursLabel === "24 horas";
  const statusDetailLabel = isOpenNow
    ? (hasAllDayService
        ? "Atendimento 24 horas"
        : todayClosingLabel
          ? `Fecha às ${todayClosingLabel}`
          : normalizedTodayHoursLabel)
    : (normalizedTodayHoursLabel && !/^fechado/i.test(normalizedTodayHoursLabel)
        ? `Hoje: ${normalizedTodayHoursLabel}`
        : normalizedTodayHoursLabel);
  const handleShareStore = async () => {
    if (!storeUrl || typeof window === "undefined") return;
    try {
      if (navigator?.share) {
        await navigator.share({
          title: branding?.brandName || "Loja",
          text: `Olha essa loja no Já no Caminho: ${branding?.brandName || ""}`,
          url: storeUrl,
        });
        return;
      }
    } catch (_) {
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(storeUrl);
      }
    } catch (_) {
      // no-op
    }
  };

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
      if (bannerRef.current) {
        const scale = Math.max(1, 1 + y / 800);
        const blur = Math.min(10, y / 30);
        const opacity = Math.max(0.25, 1 - y / 420);
        bannerRef.current.style.transform = `scale(${scale})`;
        bannerRef.current.style.filter = `blur(${blur}px)`;
        bannerRef.current.style.opacity = `${opacity}`;
      }
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
    <div className={`w-full ${compact ? 'pb-1' : 'pb-3'} pt-2`}>
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
          >
            <div
              ref={bannerRef}
              className="absolute inset-0 origin-center overflow-hidden transition-all duration-100 ease-out"
              style={{ backgroundColor: headerPrimaryColor }}
            >
              {headerBanner ? (
                <>
                  <img
                    src={headerBanner}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-[-22px] h-[calc(100%+44px)] w-[calc(100%+44px)] scale-110 object-cover opacity-95 blur-md saturate-125"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                  <img
                    src={headerBanner}
                    alt={branding?.brandName ? `Banner de ${branding.brandName}` : "Banner da loja"}
                    className="absolute inset-0 h-full w-full object-contain p-2 drop-shadow-[0_20px_34px_rgba(15,23,42,0.28)] sm:p-3"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                </>
              ) : null}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-black/10" />
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
              {onOpenCustomerAccount && (
                <button
                  type="button"
                  onClick={onOpenCustomerAccount}
                  className="h-9 w-9 rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md inline-flex items-center justify-center active:scale-95 transition"
                  aria-label={isCustomerAuthenticated ? "Minha conta" : "Entrar na conta"}
                  title={isCustomerAuthenticated ? "Minha conta" : "Entrar"}
                >
                  <UserCircle size={16} weight={isCustomerAuthenticated ? "fill" : "regular"} />
                </button>
              )}
              <button
                type="button"
                onClick={handleShareStore}
                className="h-9 w-9 rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md inline-flex items-center justify-center active:scale-95 transition"
                aria-label="Compartilhar loja"
              >
                <ShareNetwork size={15} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => setIsFavorite((prev) => !prev)}
                className="h-9 w-9 rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md inline-flex items-center justify-center active:scale-95 transition"
                aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar loja"}
              >
                <HeartStraight size={15} weight={isFavorite ? "fill" : "regular"} />
              </button>
            </div>
            {compact && !mobileCollapsedStable && (
              <div className="sm:hidden absolute inset-x-0 bottom-0 px-4 pb-3">
                <div className="pr-14 text-left">
                  <h1 className="text-base font-black text-white truncate">{branding?.brandName || "Sua Loja"}</h1>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-white/95 font-semibold">
                    <span className={`h-2 w-2 rounded-full ${isOpenNow ? "bg-emerald-400 animate-pulse" : "bg-amber-300"}`} />
                    <span>
                      {isOpenNow ? "Aberto agora" : "Fechado agora"}
                      {statusDetailLabel ? ` · ${statusDetailLabel}` : ""}
                    </span>
                  </div>
                </div>
                <div className="absolute right-4 top-1 h-11 w-11 rounded-full overflow-hidden border-2 border-white bg-white shadow-lg flex items-center justify-center">
                  {branding?.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(branding?.espetoId, branding?.brandName); }} />
                  ) : (
                    <span className="font-black text-xs text-slate-700">{previewInitials || "JC"}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`relative -mt-7 sm:-mt-10 mx-3 sm:mx-4 rounded-3xl border border-slate-100 bg-white px-4 sm:px-6 pb-4 pt-11 sm:pt-4 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.5)] ${compact ? "hidden sm:block" : ""}`}>
            <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-4 border-white bg-white shadow-xl flex items-center justify-center">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(branding?.espetoId, branding?.brandName); }} />
              ) : (
                <span className="font-black text-xl text-slate-700">{previewInitials || "JC"}</span>
              )}
            </div>

            <div className="sm:pl-32 flex w-full flex-col items-center text-center sm:items-start sm:text-left">
              <div className="w-full text-center sm:text-left">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
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
                          {isOpenNow ? "Aberto agora" : "Fechado agora"}
                          {statusDetailLabel ? ` · ${statusDetailLabel}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {avgRating > 0 && (
                  <button
                    type="button"
                    onClick={onShowReviews}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 active:scale-95"
                  >
                    <Star size={13} weight="fill" className="text-amber-500" />
                    {avgRating.toFixed(1).replace('.', ',')}
                    {totalReviews > 0 && (
                      <span className="font-medium text-amber-600/80">
                        · {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
                      </span>
                    )}
                    <CaretRight size={12} weight="bold" className="text-amber-500" />
                  </button>
                )}
                {deliveryFeeLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <ShoppingCart size={11} weight="duotone" />
                    {deliveryFeeLabel}
                  </span>
                )}
                {deliveryModes.slice(0, 2).map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    {label}
                  </span>
                ))}
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
                      href={whatsappMessage ? `https://wa.me/${normalizeWhatsApp(whatsappNumber)}?text=${encodeURIComponent(whatsappMessage)}` : `https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => openWhatsAppContact(whatsappNumber, event, whatsappMessage)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100 transition"
                    >
                      <img src="/whatspp.jpg" alt="WhatsApp" className="h-3.5 w-3.5 rounded-full" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            {isLogged && hasOperationHeaderActions && (
              <div className="mt-3 sm:mt-0 sm:absolute sm:right-6 sm:bottom-4 flex flex-row items-center justify-center sm:justify-end gap-2">
              {canAccessOperations && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-2 rounded-full text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95"
                >
                  <SquaresFour size={14} weight="duotone" />
                  <span>Painel Admin</span>
                </button>
              )}
              {canAccessOperations && onOpenQueue && (
                <button
                  onClick={onOpenQueue}
                  className="px-3 py-2 rounded-full text-xs font-black border border-[#336886] bg-[#336886] text-white hover:bg-[#2a5670] transition flex items-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95"
                >
                  <List size={14} weight="bold" />
                  <span>Fila de Pedidos</span>
                </button>
              )}
              {canAccessOperations && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-2 rounded-full text-xs font-black border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                >
                  <SignOut size={14} weight="bold" />
                  Sair
                </button>
              )}
            </div>
            )}
          </div>
          {compact && !mobileCollapsedStable && isLogged && hasOperationHeaderActions && (
            <div className="sm:hidden relative px-3 pb-2">
              <div className="flex flex-row items-center justify-end gap-2">
                {canAccessOperations && onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 whitespace-nowrap"
                  >
                    <SquaresFour size={12} weight="duotone" />
                    Painel
                  </button>
                )}
                {canAccessOperations && onLogout && (
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
  onClearCart,
  branding,
  segment,
  instagramHandle,
  whatsappNumber,
  whatsappMessage = "",
  promoMessage,
  storeAddress,
  storeCoords,
  isOpenNow,
  todayHoursLabel,
  todayClosingLabel,
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
  onOpenCustomerAccount,
  isCustomerAuthenticated = false,
  storeDescription,
  reviewSummary,
  deliveryFeeLabel,
  orderTypes = [],
  preOrderBlocked = false,
  preOrderBlockedTitle = "Pedidos em breve",
  preOrderBlockedMessage = "",
  systemHeaderOffset = false,
}) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showStoreDetails, setShowStoreDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "reviews" | "info">("products");
  const [activeCategoryKey, setActiveCategoryKey] = useState("");
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showPreOrderBlockedModal, setShowPreOrderBlockedModal] = useState(false);
  const [qtyPulseId, setQtyPulseId] = useState<string | null>(null);
  const [activeQtyControlId, setActiveQtyControlId] = useState<string | null>(null);
  const [flyToCartItems, setFlyToCartItems] = useState<
    Array<{
      id: string;
      startX: number;
      startY: number;
      deltaX: number;
      deltaY: number;
      size: number;
      imageUrl?: string;
      active: boolean;
    }>
  >([]);
  const [cartPulse, setCartPulse] = useState(false);
  const [autoCompactHeader, setAutoCompactHeader] = useState(false);
  const qtyControlIdleTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const cartButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const categoryTabsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const stickySearchContainerRef = React.useRef<HTMLDivElement | null>(null);
  const categoryTabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const categorySyncLockRef = React.useRef(false);
  const categorySyncLockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousCartItemsCountRef = React.useRef(0);
  const cartPulseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const canOrder = isOrderingEnabled !== false && !preOrderBlocked;
  const effectiveCompactHeader = compactHeader || autoCompactHeader;
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
  const storeSegmentLabel =
    {
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
    }[String(segment || "").toLowerCase()] || "Comércio";
  const avgRating = Number(reviewSummary?.avgStoreRating || 0);
  const totalReviews = Number(reviewSummary?.totalReviews || 0);
  const deliveryModes = Array.isArray(orderTypes)
    ? orderTypes
        .map((type) => String(type || "").toLowerCase())
        .filter(Boolean)
        .map((type) =>
          type === "delivery" ? "Entrega" : type === "pickup" ? "Retirada" : type === "table" ? "Mesa" : type
        )
    : [];
  const mapQuery = storeAddress ? encodeURIComponent(storeAddress) : "";
  const googleMapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
    : "";
  const wazeUrl = mapQuery ? `https://waze.com/ul?q=${mapQuery}&navigate=yes` : "";
  const mapMarkers = storeCoords
    ? [{ lat: Number(storeCoords.lat), lng: Number(storeCoords.lng), label: "Loja" }]
    : [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("admin:mobile-menu", {
        detail: { open: Boolean(isCategorySheetOpen) },
      })
    );
    return () => {
      window.dispatchEvent(new CustomEvent("admin:mobile-menu", { detail: { open: false } }));
    };
  }, [isCategorySheetOpen]);

  const resolvePromoPrice = (item) => {
    const promoPrice = item?.promoPrice != null ? Number(item.promoPrice) : null;
    if (item?.promoActive && promoPrice && promoPrice > 0) {
      return promoPrice;
    }
    return null;
  };

  const getProductModalKey = (product) =>
    product ? String(product.id ?? product.productId ?? product.name ?? '') : '';

  const openProductModal = (product) => {
    if (
      isModalOpen &&
      getProductModalKey(selectedProduct) &&
      getProductModalKey(selectedProduct) === getProductModalKey(product)
    ) {
      closeProductModal();
      return;
    }
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

  useEffect(() => {
    if (previousCartItemsCountRef.current === cartItemsCount) return;
    previousCartItemsCountRef.current = cartItemsCount;
    if (cartItemsCount <= 0) return;
    if (cartPulseTimerRef.current) window.clearTimeout(cartPulseTimerRef.current);
    setCartPulse(true);
    cartPulseTimerRef.current = window.setTimeout(() => setCartPulse(false), 280);
  }, [cartItemsCount]);

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
  const useCompactCategoryCarousel = filteredGrouped.length > 3;

  const registerCategoryRef = (key) => (node) => {
    if (node) {
      categoryRefs.current[key] = node;
    }
  };

  const getCategoryScrollOffset = () => {
    const tabsHeight = categoryTabsContainerRef.current?.getBoundingClientRect?.().height || 0;
    const searchHeight = stickySearchContainerRef.current?.getBoundingClientRect?.().height || 0;
    return tabsHeight + searchHeight + 12;
  };

  const scrollToCategory = (key) => {
    const target = categoryRefs.current[key];
    if (target) {
      categorySyncLockRef.current = true;
      if (categorySyncLockTimerRef.current) {
        window.clearTimeout(categorySyncLockTimerRef.current);
      }
      const targetRect = target.getBoundingClientRect();
      const targetY = window.scrollY + targetRect.top - getCategoryScrollOffset();
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: staffView ? "auto" : "smooth",
      });
      categorySyncLockTimerRef.current = window.setTimeout(() => {
        categorySyncLockRef.current = false;
      }, 520);
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
      if (categorySyncLockTimerRef.current) {
        window.clearTimeout(categorySyncLockTimerRef.current);
      }
      if (cartPulseTimerRef.current) {
        window.clearTimeout(cartPulseTimerRef.current);
      }
    };
  }, []);

  const animateItemToCart = (originEl: HTMLElement | null, item: any) => {
    const cartEl = cartButtonRef.current;
    if (!originEl || !cartEl) return;
    const originRect = originEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();
    const size = 38;
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
        size,
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

  useEffect(() => {
    if (!filteredGrouped.length) return;
    let frame = 0;

    const syncActiveCategoryByScroll = () => {
      if (categorySyncLockRef.current) return;
      const offset = getCategoryScrollOffset();
      let nextActive = filteredGrouped[0].key;
      const lastCategoryKey = filteredGrouped[filteredGrouped.length - 1]?.key;
      const viewportBottom = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight || 0;
      const nearPageBottom = documentHeight > 0 && documentHeight - viewportBottom <= 80;

      for (const category of filteredGrouped) {
        const node = categoryRefs.current[category.key];
        if (!node) continue;
        const top = node.getBoundingClientRect().top - offset;
        if (top <= 28) {
          nextActive = category.key;
          continue;
        }
        break;
      }

      // Guarantees the last category becomes active when user reaches the page end.
      if (nearPageBottom && lastCategoryKey) {
        nextActive = lastCategoryKey;
      }

      setActiveCategoryKey((prev) => (prev === nextActive ? prev : nextActive));
    };

    const onScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveCategoryByScroll);
    };

    syncActiveCategoryByScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [filteredGrouped]);

  useEffect(() => {
    if (!activeCategoryKey) return;
    const tabButton = categoryTabRefs.current[activeCategoryKey];
    if (tabButton?.scrollIntoView) {
      tabButton.scrollIntoView({
        behavior: staffView ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeCategoryKey, staffView]);

  useEffect(() => {
    if (!showHeader) {
      setAutoCompactHeader(false);
      return;
    }
    let frame = 0;
    const onScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        setAutoCompactHeader(y > 16);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [showHeader]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isVisible = cartItemsCount > 0 && canOrder && !isModalOpen;
    window.dispatchEvent(
      new CustomEvent("jnk:cart-visibility", {
        detail: { visible: isVisible },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("jnk:cart-visibility", {
          detail: { visible: false },
        })
      );
    };
  }, [cartItemsCount, canOrder, isModalOpen]);

  return (
    <div className="bg-slate-50 overflow-x-clip">

      {showHeader && (
        <Header
          branding={branding}
          segment={segment}
          instagramHandle={instagramHandle}
          whatsappNumber={whatsappNumber}
          whatsappMessage={whatsappMessage}
          onOpenQueue={onOpenQueue}
          onOpenAdmin={onOpenAdmin}
          onLogout={onLogout}
          onOpenCustomerAccount={onOpenCustomerAccount}
          isCustomerAuthenticated={isCustomerAuthenticated}
          userRole={userRole}
          isAuthenticated={isAuthenticated}
          compact={effectiveCompactHeader}
          isOpenNow={isOpenNow}
          todayHoursLabel={todayHoursLabel}
          todayClosingLabel={todayClosingLabel}
          onOpenStoreDetails={() => setShowStoreDetails(true)}
          onShowReviews={() => setActiveTab("reviews")}
          reviewSummary={reviewSummary}
          deliveryFeeLabel={deliveryFeeLabel}
          orderTypes={orderTypes}
        />
      )}

      <div
        ref={stickySearchContainerRef}
        className={`sticky ${systemHeaderOffset ? 'top-[calc(env(safe-area-inset-top)+3.72rem)]' : 'top-0'} z-30 w-full border-b border-white/70 bg-white/92 shadow-[0_10px_32px_-26px_rgba(15,23,42,0.26)] backdrop-blur-2xl`}
      >
        <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-2">
          <div className="relative flex items-center gap-2.5 overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/88 px-3.5 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-100/80 transition-[border-color,box-shadow,transform] duration-300 focus-within:-translate-y-0.5 focus-within:border-[#336886]/20 focus-within:bg-white focus-within:shadow-[0_22px_48px_-34px_rgba(51,104,134,0.34)]">
            <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.65rem]"
              style={{ backgroundColor: `${catalogPrimaryColor}18`, color: catalogPrimaryColor }}
            >
              <MagnifyingGlass className="w-3.5 h-3.5" weight="bold" />
            </span>
            <input
              {...inputAssistProps.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-[42px] flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Buscar no cardápio..."
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 active:scale-95"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            ) : null}
          </div>
        </div>
        {filteredGrouped.length > 1 && (
          <div ref={categoryTabsContainerRef} className="mx-auto w-full max-w-6xl px-4 pb-3">
            <div className="flex w-full items-stretch gap-2 rounded-[1.65rem] border border-white/85 bg-white/70 p-1.5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.32),inset_0_1px_0_rgba(255,255,255,0.82)] ring-1 ring-slate-900/[0.025] backdrop-blur-xl">
              {useCompactCategoryCarousel && (
                <button
                  type="button"
                  aria-label="Abrir categorias"
                  onClick={() => setIsCategorySheetOpen(true)}
                  className="inline-flex w-[3.45rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[1.2rem] border border-white/90 bg-white text-slate-700 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.36)] ring-1 ring-slate-100 transition-all active:scale-95"
                >
                  <List size={17} weight="bold" style={{ color: catalogPrimaryColor }} />
                  <span className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">Menu</span>
                </button>
              )}
              <div className={`${
                useCompactCategoryCarousel
                  ? "min-w-0 flex-1 snap-x overflow-x-auto whitespace-nowrap no-scrollbar scrollbar-hide sm:overflow-visible sm:whitespace-normal [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  : `flex-1 grid gap-2 ${filteredGrouped.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`
              }`}>
                <div className={`${useCompactCategoryCarousel ? "inline-flex items-stretch gap-2.5 pr-10 sm:flex sm:flex-wrap sm:gap-2 sm:pr-0" : "contents"}`}>
                {filteredGrouped.map((category) => {
                  const isActive = activeCategoryKey === category.key;
                  const Icon = categoryGlyph(category.key);
                  const meta = categoryVisualMeta(category.key);
                  const categoryCountLabel = category.items.length === 1 ? '1 item' : `${category.items.length} itens`;
                  return (
                    <button
                      key={category.key}
                      ref={(node) => {
                        categoryTabRefs.current[category.key] = node;
                      }}
                      type="button"
                      onClick={() => {
                        setActiveCategoryKey(category.key);
                        scrollToCategory(category.key);
                      }}
                      className={`jnc-hub-touch group relative flex min-h-[3.3rem] flex-col items-center justify-center overflow-hidden rounded-[1.12rem] border px-2 py-1.5 text-center snap-start transition-all duration-200 ${
                        useCompactCategoryCarousel ? "w-[5.55rem] shrink-0 sm:min-w-0" : "w-full min-w-0"
                      } ${isActive ? 'shadow-[0_18px_34px_-22px_rgba(15,23,42,0.38)]' : 'shadow-[0_10px_24px_-22px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-24px_rgba(15,23,42,0.34)]'}`}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, ${catalogPrimaryColor} 0%, ${catalogPrimaryColor}e8 100%)`,
                              color: catalogPrimaryText,
                              borderColor: catalogPrimaryColor,
                            }
                          : { backgroundColor: "#ffffff", color: "#334155", borderColor: "#eef2f7" }
                      }
                      aria-label={`Ir para ${category.label}, ${categoryCountLabel}`}
                    >
                      {isActive ? <span className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full bg-white/16 blur-xl" /> : null}
                      <span
                        className={`relative inline-flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-105 ${isActive ? "border-white/24 bg-white/16 text-current" : `${meta.tone} bg-opacity-70`}`}
                      >
                        <Icon size={13} weight={isActive ? "fill" : "duotone"} />
                      </span>
                      <span className={`mt-0.5 block w-full truncate text-[10.5px] font-black leading-tight tracking-[-0.02em] sm:text-[11px] ${isActive ? "text-current" : "text-slate-800"}`}>
                        {category.label}
                      </span>
                      <span className={`mt-0.5 block text-[8.5px] font-black uppercase tracking-[0.1em] ${isActive ? "text-current/70" : "text-slate-400"}`}>
                        {categoryCountLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`space-y-6 sm:space-y-8 px-3 sm:px-4 py-3 sm:py-4 max-w-6xl mx-auto ${cartItemsCount > 0 ? 'pb-32 sm:pb-8' : ''}`}>
        {!showHeader && (
          <section className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Bem-vindo à sua vitrine</p>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">{branding?.brandName || "Seu Espeto"}</h2>
          </section>
        )}
        {showHeader && (
          <div className="space-y-6 sm:space-y-8">
            <PremiumTabs
              items={[
                { id: "products", label: "Produtos", icon: <Package size={18} weight="duotone" /> },
                { id: "reviews", label: "Avaliações", icon: <Star size={18} weight="duotone" /> },
                { id: "info", label: "Informações", icon: <Info size={18} weight="duotone" /> },
              ]}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as "products" | "reviews" | "info")}
            />
            {activeTab === "reviews" && <StoreReviewsTab storeSlug={branding?.espetoId} />}
            {activeTab === "info" && (
              <StoreInfoTab
                storeDescription={storeDescription}
                storeAddress={storeAddress}
                todayHoursLabel={todayHoursLabel}
                todayClosingLabel={todayClosingLabel}
                isOpenNow={isOpenNow}
                deliveryFeeLabel={deliveryFeeLabel}
                orderTypes={orderTypes}
                whatsappNumber={whatsappNumber}
                whatsappMessage={whatsappMessage}
                instagramHandle={instagramHandle}
                mapMarkers={mapMarkers}
                googleMapsUrl={googleMapsUrl}
                wazeUrl={wazeUrl}
              />
            )}
          </div>
        )}
        <div id="menu-list" className={`space-y-7 sm:space-y-8 ${activeTab === "products" ? "" : "hidden"}`}>
        {promoMessage && (
          <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-500 font-semibold">Mensagem do dia</p>
            <p className="text-sm font-semibold text-slate-900 mt-2">{promoMessage}</p>
          </div>
        )}
        {!staffView && topItems.length > 0 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <div className="mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-600">
                <Sparkle size={10} weight="fill" />
                Top {topItems.length} do dia
              </span>
              <h2 className="mt-1.5 text-[15px] font-black tracking-tight text-slate-900">Mais pedidos hoje</h2>
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
          <div
            className="rounded-3xl overflow-hidden border border-slate-100 p-4 sm:p-5 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${catalogPrimaryColor}14 0%, white 55%)` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.2rem] border border-white/80 bg-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.32)] ring-1 ring-slate-100 sm:h-[4.25rem] sm:w-[4.25rem]">
                  {featuredProduct.imageUrl ? (
                    <img
                      src={resolveAssetUrl(featuredProduct.imageUrl)}
                      alt={featuredProduct.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl">🍖</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]" style={{ backgroundColor: `${catalogPrimaryColor}18`, color: catalogPrimaryColor }}>
                  <Sparkle size={9} weight="fill" />
                  Promoção do dia
                </span>
                  <h3 className="text-[15px] font-black text-slate-900 mt-1.5 leading-tight">{featuredProduct.name}</h3>
                  {!staffView && featuredProduct.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{featuredProduct.description}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {resolvePromoPrice(featuredProduct) ? (
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-[10px] text-slate-400 line-through">{formatCurrency(featuredProduct.price || 0)}</span>
                    <span className="text-xl font-black text-emerald-600">{formatCurrency(resolvePromoPrice(featuredProduct))}</span>
                  </div>
                ) : (
                  <span className="text-xl font-black tracking-tight text-slate-900">{formatCurrency(featuredProduct.price || 0)}</span>
                )}
                <button
                  type="button"
                  onClick={() => openProductModal(featuredProduct)}
                  className="px-4 py-2 rounded-full text-xs font-black transition-all active:scale-95"
                  style={{ backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }}
                >
                  Pedir agora
                </button>
              </div>
            </div>
          </div>
        )}
        {preOrderBlocked ? (
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-[0_18px_34px_-28px_rgba(245,158,11,0.2)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <CalendarBlank size={18} weight="duotone" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900">{preOrderBlockedTitle}</span>
                <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">
                  {preOrderBlockedMessage || "Você pode ver o cardápio agora, mas os pedidos deste condomínio ainda não foram liberados."}
                </span>
              </span>
            </div>
          </div>
        ) : !canOrder ? (
          <div className="rounded-[1.75rem] border border-indigo-200 bg-indigo-50 px-4 py-4 shadow-[0_12px_24px_-18px_rgba(99,102,241,0.15)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Storefront size={18} weight="duotone" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-indigo-900">Apenas cardápio</span>
                <span className="mt-1 block text-xs font-medium leading-relaxed text-indigo-700/80">Esta loja não aceita pedidos online. Consulte os produtos e faça o pedido presencialmente.</span>
              </span>
            </div>
          </div>
        ) : null}
        {filteredGrouped.map((category, index) => {
          return (
          <div key={category.key} className={`scroll-mt-[9.5rem] space-y-2.5 sm:space-y-3 ${index > 0 ? 'pt-1 sm:pt-2' : ''}`} id={`cat-${category.key}`} ref={registerCategoryRef(category.key)}>

            {/* Título da categoria */}
            <div className="flex items-end justify-between gap-3 px-1.5">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-6 w-1 shrink-0 rounded-full shadow-[0_8px_18px_-10px_rgba(15,23,42,0.35)]"
                    style={{ backgroundColor: catalogPrimaryColor }}
                    aria-hidden="true"
                  />
                  <h2 className="truncate text-[1.18rem] font-black capitalize leading-tight tracking-[-0.035em] text-slate-950 sm:text-[1.28rem]">
                    {category.label}
                  </h2>
                </div>
                <div className="mt-1 h-px w-16 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
              </div>
              <span className="shrink-0 pb-0.5 text-[11px] font-bold text-slate-400 sm:text-xs">
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
                const isTopItem = topItems.some((top: any) => String(top?.id) === itemId);
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
                  const card = originButton.closest("[data-menu-card]") as HTMLElement | null;
                  const imageOrigin = card?.querySelector("[data-menu-item-media]") as HTMLElement | null;
                  event.stopPropagation();
                  if (preOrderBlocked) {
                    setShowPreOrderBlockedModal(true);
                    return;
                  }
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
                  animateItemToCart(imageOrigin || originButton, item);
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
                  data-menu-card
                  className={`jnc-hub-touch jnc-hub-lift group relative grid grid-cols-[minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-3xl border border-slate-100/70 bg-white/96 p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.34)] ring-1 ring-white/75 transition-all duration-300 hover:border-slate-200/60 hover:shadow-[0_26px_58px_-44px_rgba(15,23,42,0.42)] active:scale-[0.985] sm:gap-5 sm:p-5 ${!staffView ? "cursor-pointer" : "cursor-default"}`}
                  onClick={() => {
                    if (!staffView) openProductModal(item);
                  }}
                >
                  <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
                  <span className="jnc-glare-sweep opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!staffView || allowStaffModal) {
                            openProductModal(item);
                          }
                        }}
                        className={`text-left font-black text-slate-900 tracking-tight text-[15px] sm:text-[17px] leading-snug line-clamp-2 transition-colors ${(!staffView || allowStaffModal) ? 'cursor-pointer hover:text-slate-700' : 'cursor-default'}`}
                      >
                        {item.name}
                      </button>
                      {item.description && (
                        <p className="mt-2 text-[13px] sm:text-sm text-slate-500 leading-relaxed line-clamp-2 font-medium">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col items-start gap-2.5">
                      {(() => {
                        const priceNode = (
                          <div className="flex items-baseline gap-1.5 leading-none">
                            {resolvePromoPrice(item) ? (
                              <>
                                <span className="text-lg sm:text-xl font-black tracking-tight text-[#336886]">
                                  {formatCurrency(resolvePromoPrice(item))}
                                </span>
                                <span className="text-[11px] font-bold text-slate-300 line-through">
                                  {formatCurrency(item.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                                {formatCurrency(item.price)}
                              </span>
                            )}
                          </div>
                        );

                        return priceNode;
                      })()}

                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100/50">
                            <Sparkle size={10} weight="fill" />
                            Destaque
                          </span>
                        )}
                        {!item.isFeatured && isTopItem && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100/30 shadow-[0_4px_12px_rgba(249,115,22,0.08)]">
                            🔥 Mais pedido
                          </span>
                        )}
                        {hasConfigurableOptions && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider"
                            style={{
                              backgroundColor: `${catalogPrimaryColor}10`,
                              borderColor: `${catalogPrimaryColor}18`,
                              color: catalogPrimaryColor,
                            }}
                          >
                            Customizável
                          </span>
                        )}
                        {stockState.soldOut && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                            Esgotado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`flex flex-col items-end justify-center flex-shrink-0 ${staffView ? "min-w-[124px]" : "min-w-[112px]"}`}>
                    <div data-menu-item-media className="relative h-[112px] w-[112px] sm:h-[124px] sm:w-[124px]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!staffView || allowStaffModal) {
                            openProductModal(item);
                          }
                        }}
                        className={`h-full w-full rounded-2xl overflow-hidden bg-slate-50 border border-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.3)] ring-1 ring-slate-100/50 ${(!staffView || allowStaffModal) ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {item.imageUrl ? (
                          <img
                            src={resolveAssetUrl(item.imageUrl)}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.08]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200">
                            <ForkKnife size={24} weight="duotone" />
                          </div>
                        )}
                      </button>

                      {canOrder && !stockState.soldOut && (
                        <div className="absolute -bottom-1.5 -right-1.5 z-10">
                          {itemQty <= 0 ? (
                            <button
                              type="button"
                              onClick={handleIncrement}
                              className="h-11 w-11 rounded-[1.15rem] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.32)] border-[3px] border-white inline-flex items-center justify-center ring-1 ring-black/5 transition-transform duration-200 active:scale-90 hover:scale-110"
                              style={{ backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }}
                            >
                              <Plus size={18} weight="bold" />
                            </button>
                          ) : (
                            <div
                              className="inline-flex"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {isQtyControlExpanded ? (
                                <div
                                  className="h-10 rounded-2xl border-2 border-white bg-white shadow-[0_12px_28px_-6px_rgba(0,0,0,0.22)] inline-flex items-center gap-2 px-1.5 transition-all duration-300 w-auto"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={handleDecrement}
                                    className="h-7 w-7 rounded-xl border border-slate-100 flex items-center justify-center bg-slate-50 text-slate-600 active:bg-slate-100"
                                  >
                                    <Minus size={12} weight="bold" />
                                  </button>
                                  <span className="min-w-[20px] text-center text-sm font-black text-slate-900">{itemQty}</span>
                                  <button
                                    type="button"
                                    onClick={handleIncrement}
                                    className="h-7 w-7 rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-90"
                                    style={{ backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }}
                                  >
                                    <Plus size={12} weight="bold" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openQtyControl(itemId)}
                                  className="h-11 w-11 rounded-[1.15rem] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.32)] border-[3px] border-white inline-flex items-center justify-center ring-1 ring-black/5 transition-transform duration-200 active:scale-90 hover:scale-110"
                                  style={{ backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }}
                                >
                                  <span className="text-sm font-black">{itemQty}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
        <div className="pt-1 pb-2">
          <PlatformTrustFooter compact />
        </div>
        </div>
      </div>

      <Drawer.Root
        open={isCategorySheetOpen}
        onOpenChange={setIsCategorySheetOpen}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] mt-24 h-fit max-h-[88vh] rounded-t-[32px] bg-white outline-none shadow-[0_-24px_64px_-38px_rgba(15,23,42,0.55)]">
            <div className="mx-auto my-4 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300" />
            <div className="px-5 pb-3 pt-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navegue pelo cardápio</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">Categorias</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Toque em uma categoria para ir direto aos produtos.</p>
            </div>
            <div className="max-h-[72vh] space-y-2 overflow-y-auto px-4 pb-5">
              {grouped.map((category) => {
                const isActive = activeCategoryKey === category.key;
                const meta = categoryVisualMeta(category.key);
                const Icon = meta.icon;
                return (
                  <button
                    key={`sheet-${category.key}`}
                    type="button"
                    onClick={() => {
                      if (query) setQuery("");
                      setActiveCategoryKey(category.key);
                      setIsCategorySheetOpen(false);
                      window.setTimeout(() => {
                        scrollToCategory(category.key);
                      }, 80);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-3xl border px-3.5 py-3 text-left transition-all active:scale-[0.985] ${
                      isActive
                        ? "border-transparent bg-slate-950 text-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.65)]"
                        : "border-slate-100 bg-slate-50/80 text-slate-800 hover:bg-white"
                    }`}
                    style={isActive ? { backgroundColor: catalogPrimaryColor, color: catalogPrimaryText } : undefined}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border ${
                        isActive ? "border-white/24 bg-white/16 text-current" : meta.tone
                      }`}>
                        <Icon size={15} weight={isActive ? "fill" : "duotone"} />
                      </span>
                      <p className={`truncate text-base font-black ${isActive ? "text-current" : "text-zinc-900"}`}>
                        {category.label}
                        <span className={`ml-2 text-sm font-black ${isActive ? "text-current/70" : "text-zinc-400"}`}>{category.items.length}</span>
                      </p>
                    </div>
                    <span
                      className={`relative h-7 w-7 shrink-0 rounded-full border-2 ${
                        isActive ? "border-white/70" : "border-zinc-200 bg-white"
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-1 rounded-full bg-white"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div
        className={`fixed inset-0 z-[75] bg-slate-50 transition-transform duration-300 ease-out ${
          showStoreDetails ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-100 via-slate-50 to-transparent px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowStoreDetails(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
              aria-label="Voltar ao cardápio"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
              Loja
            </div>
          </div>
        </div>

        <div className="h-full overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+3.8rem)]">
          <div className="mx-auto max-w-3xl px-4 pb-8">
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.28)]">
                <div
                  className="relative h-44 overflow-hidden bg-slate-900"
                  style={
                    resolveAssetUrl(branding?.bannerUrl || "")
                      ? { backgroundColor: catalogPrimaryColor }
                      : { background: `linear-gradient(135deg, ${catalogPrimaryColor}, ${catalogSecondaryColor})` }
                  }
                >
                  {resolveAssetUrl(branding?.bannerUrl || "") ? (
                    <>
                      <img
                        src={resolveAssetUrl(branding?.bannerUrl || "")}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-[-22px] h-[calc(100%+44px)] w-[calc(100%+44px)] scale-110 object-cover opacity-95 blur-md saturate-125"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                      <img
                        src={resolveAssetUrl(branding?.bannerUrl || "")}
                        alt={branding?.brandName ? `Banner de ${branding.brandName}` : "Banner da loja"}
                        className="absolute inset-0 h-full w-full object-contain p-2 drop-shadow-[0_18px_30px_rgba(15,23,42,0.3)]"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                    </>
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </div>

                <div className="relative px-4 pb-5 pt-0">
                  <div className="flex items-start gap-4 pt-4">
                    <div className="-mt-10 shrink-0 h-20 w-20 overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-lg">
                    {branding?.logoUrl ? (
                      <img src={branding.logoUrl} alt={branding?.brandName} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getStoreAvatarUrl(branding?.espetoId, branding?.brandName); }} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-black text-slate-700">
                        {String(branding?.brandName || "JC").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    </div>

                    <div className="min-w-0 flex-1 pt-1 sm:pt-2">
                      <h3 className="break-words text-xl font-black leading-tight text-slate-900">{branding?.brandName || "Sua Loja"}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>{storeSegmentLabel}</span>
                        {avgRating > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <Star size={12} weight="fill" className="text-amber-400" />
                              {avgRating.toFixed(1)} {totalReviews > 0 ? `(${totalReviews})` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{isOpenNow ? "Aberto agora" : "Fechado agora"}</p>
                      {todayHoursLabel ? <p className="mt-1 text-xs text-slate-500">{todayHoursLabel}</p> : null}
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Atendimento</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {deliveryModes.length ? deliveryModes.join(" • ") : "Consulte a loja"}
                      </p>
                      {deliveryFeeLabel ? <p className="mt-1 text-xs text-emerald-600">{deliveryFeeLabel}</p> : null}
                    </div>
                  </div>

                  {storeDescription ? (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sobre a loja</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{storeDescription}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {normalizeWhatsApp(whatsappNumber) ? (
                      <a
                        href={whatsappMessage ? `https://wa.me/${normalizeWhatsApp(whatsappNumber)}?text=${encodeURIComponent(whatsappMessage)}` : `https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => openWhatsAppContact(whatsappNumber, event, whatsappMessage)}
                        className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Phone size={18} weight="duotone" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900">Falar com a loja</span>
                          <span className="mt-1 block text-xs text-slate-500">{whatsappNumber}</span>
                        </span>
                      </a>
                    ) : null}

                    {storeAddress ? (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                          <MapPin size={18} weight="duotone" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900">Endereço</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {formattedAddress.line1}
                            {formattedAddress.line2 ? `, ${formattedAddress.line2}` : ""}
                            {formattedAddress.cep ? ` • CEP ${formattedAddress.cep}` : ""}
                          </span>
                        </span>
                      </a>
                    ) : null}

                    {mapMarkers.length > 0 ? (
                      <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white p-2 shadow-sm">
                        <StoreMapView markers={mapMarkers} zoom={15} />
                      </div>
                    ) : null}

                    {(googleMapsUrl || wazeUrl) ? (
                      <div className="flex flex-wrap gap-2">
                        {googleMapsUrl ? (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                          >
                            Abrir no Google Maps
                          </a>
                        ) : null}
                        {wazeUrl ? (
                          <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                          >
                            Abrir no Waze
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {todayHoursLabel ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                          <Clock size={18} weight="duotone" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900">Horário de hoje</span>
                          <span className="mt-1 block text-xs text-slate-500">{todayHoursLabel}</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

            <div className="sticky bottom-0 mt-4">
              <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-3 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.38)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setShowStoreDetails(false)}
                  className="w-full rounded-full px-4 py-3 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.45)]"
                  style={{ backgroundColor: catalogPrimaryColor, color: catalogPrimaryText }}
                >
                  Ver cardápio
                </button>
              </div>
            </div>
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
        readOnlyMessage={
          preOrderBlocked
            ? (preOrderBlockedMessage || "Os pedidos deste condomínio ainda não foram liberados.")
            : !canOrder
            ? "Pedidos apenas no balcão/mesa."
            : "Produto esgotado no momento."
        }
      />

      {/* BOTÃO FLUTUANTE DA SACOLA E LIMPAR */}
      <div
        className={`jnc-spring-transition fixed left-1/2 z-[200] w-[94%] max-w-md -translate-x-1/2 ${Capacitor.isNativePlatform() ? "ds-native-nav-fab" : "bottom-8"} ${
          cartItemsCount > 0 && canOrder && !isModalOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-90 pointer-events-none"
        }`}
      >
        <div className="relative group">
          {/* Botão de Limpar (Lixeira Premium) */}
          {onClearCart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowClearCartModal(true);
              }}
              className="jnc-hub-touch absolute -top-12 right-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/30 text-rose-500 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl hover:bg-rose-50 hover:text-rose-600 active:scale-90"
              title="Limpar sacola"
            >
              <Trash size={18} weight="fill" />
            </button>
          )}

          {(canOrder || preOrderBlocked) && (
            <button
              ref={cartButtonRef}
              onClick={() => {
                if (preOrderBlocked) {
                  setShowPreOrderBlockedModal(true);
                  return;
                }
                onProceed?.();
              }}
              className={`jnc-hub-touch group relative isolate flex w-full items-center justify-between overflow-hidden rounded-[2.2rem] px-5 py-4 ${
                cartPulse ? "scale-[1.04] shadow-[0_24px_50px_-12px_rgba(15,23,42,0.45)]" : "shadow-[0_20px_48px_-14px_rgba(15,23,42,0.35)] active:scale-[0.985]"
              }`}
              style={{
                backgroundColor: catalogPrimaryColor,
                color: catalogPrimaryText,
              }}
            >
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              <span className="pointer-events-none absolute -left-16 top-0 h-full w-14 -skew-x-12 bg-white/18 opacity-0 transition-all duration-700 ease-out group-hover:left-[115%] group-hover:opacity-100" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <span
                    className={`h-8 w-8 rounded-xl text-[13px] font-black inline-flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${cartPulse ? "animate-pop" : ""}`}
                    style={{ color: catalogPrimaryColor, backgroundColor: "#ffffff" }}
                  >
                    {cartItemsCount}
                  </span>
                  {cartPulse && (
                    <span className="absolute inset-0 animate-ping rounded-xl bg-white/40" />
                  )}
                </div>
                <span className="font-black text-[15px] uppercase tracking-wider">Ver minha sacola</span>
              </div>
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] font-bold opacity-80 uppercase tracking-tight">Total</span>
                <span className="font-black text-lg sm:text-xl tracking-tighter">{formatCurrency(cartTotalValue)}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 z-[70]">
        {flyToCartItems.map((fly) => (
          <div
            key={fly.id}
            className="absolute rounded-full overflow-hidden border-2 border-white/90 shadow-lg"
            style={{
              left: `${fly.startX}px`,
              top: `${fly.startY}px`,
              width: `${fly.size}px`,
              height: `${fly.size}px`,
              transform: fly.active
                ? `translate3d(${fly.deltaX}px, ${fly.deltaY}px, 0) scale(0.52)`
                : "translate3d(0, 0, 0) scale(1)",
              opacity: fly.active ? 0.3 : 1,
              transition: "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease",
              background: fly.imageUrl ? "#ffffff" : catalogPrimaryColor,
              boxShadow: fly.imageUrl ? "0 8px 18px -8px rgba(15,23,42,0.45)" : undefined,
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

      <ConfirmationModal
        isOpen={showClearCartModal}
        onClose={() => setShowClearCartModal(false)}
        onConfirm={() => {
          onClearCart?.();
          setShowClearCartModal(false);
        }}
        title="Limpar sacola?"
        description="Todos os itens adicionados serão removidos da sua sacola. Deseja continuar?"
        confirmLabel="Sim, limpar sacola"
        cancelLabel="Não, manter itens"
        variant="danger"
        icon={<Trash size={32} weight="duotone" className="text-rose-500" />}
      />

      <ConfirmationModal
        isOpen={showPreOrderBlockedModal}
        onClose={() => setShowPreOrderBlockedModal(false)}
        onConfirm={() => setShowPreOrderBlockedModal(false)}
        title={preOrderBlockedTitle}
        description={preOrderBlockedMessage || "Você está vendo o cardápio antecipado. Os pedidos deste condomínio ainda não foram liberados."}
        confirmLabel="Entendi"
        cancelLabel="Fechar"
        variant="info"
        icon={<CalendarBlank size={32} weight="duotone" className="text-sky-600" />}
      />
    </div>
  );
};
