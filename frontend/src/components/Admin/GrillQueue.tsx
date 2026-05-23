// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import {
  CheckSquare,
  Clock,
  Monitor,
  ArrowsClockwise,
  Plus,
  Minus,
  Hash,
  Truck,
  Storefront,
  Printer,
  X,
  CurrencyDollar,
  Play,
  CaretDown,
  Check,
  Package,
  Buildings,
  Phone,
  NotePencil,
} from "@phosphor-icons/react";
import { orderService } from "../../services/orderService";
import { storeService } from "../../services/storeService";
import { productService } from "../../services/productService";
import { motoboyAdminService } from "../../services/motoboyAdminService";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatOrderDisplayId,
  formatOrderStatus,
  formatOrderType,
} from "../../utils/format";
import { formatSelectedModifiers, getModifiersSignature } from "../../utils/productModifiers";
import { getPaymentMethodMeta } from "../../utils/paymentAssets";
import { useAuth } from "../../contexts/AuthContext";
import { buildPixPayload } from "../../utils/pixPayload";
import { printReceiptAsImage } from "../../utils/printReceiptImage";
import { exportToCsv } from "../../utils/export";
import { normalizeOrderNotificationDurationSeconds, parseOrderNotificationSoundSetting, playOrderNotificationPreset } from "../../utils/orderNotificationSound";
import {
  buildAdminTableGroups,
  filterAdminQueueProducts,
  getAdminQueueLoadingState,
  resolveAdminSalesHistoryWindow,
} from "../../utils/adminQueueUx";
import {
  calculateTableServiceCharge,
  isTableServiceCategory,
  normalizeTableServiceSettings,
  normalizeTableText,
  TABLE_SERVICE_CATEGORY,
} from "../../utils/tableServiceSettings";

const normalizeSearchText = (value: any) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const resolveCustomerOrderNote = (order: any) =>
  String(order?.customerNote || order?.customer_note || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

const fuzzyIncludes = (text: string, query: string) => {
  const source = normalizeSearchText(text);
  const target = normalizeSearchText(query);
  if (!target) return true;
  return source.includes(target);
};

const formatTableIdentifier = (value: any) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return /^\d+$/.test(normalized) ? normalized.padStart(2, "0") : normalized.toUpperCase();
};

const SYSTEM_LOGO_SRC = "/janocaminho.jpg";

const QueueLoadingSkeleton = ({ variant = "queue" }: { variant?: "queue" | "sales" | "route" }) => {
  const isSales = variant === "sales";
  const rows = isSales ? 6 : 4;
  const title =
    variant === "sales"
      ? "Carregando vendas"
      : variant === "route"
        ? "Carregando entregas"
        : "Carregando pedidos";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F28C28]/15 via-white to-[#336886]/10 ring-1 ring-slate-100">
          <span className="absolute inset-0 rounded-2xl bg-[#F28C28]/10 animate-ping" />
          <img
            src={SYSTEM_LOGO_SRC}
            alt="Já no Caminho"
            className="relative h-8 w-8 rounded-xl object-cover"
            loading="eager"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="text-xs font-semibold text-slate-500">
            O Já no Caminho está buscando os dados atualizados da loja.
          </p>
        </div>
      </div>
      {isSales ? (
        <div className="grid gap-2.5 grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={`sales-metric-${item}`} className="animate-pulse rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <div className="h-3 w-20 rounded-full bg-slate-100" />
              <div className="mt-3 h-5 w-24 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : null}
      <div className={`grid gap-3 ${isSales ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`queue-loading-${variant}-${index}`} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded-full bg-slate-100" />
                <div className="h-3 w-32 rounded-full bg-slate-100" />
              </div>
              <div className="h-8 w-14 rounded-full bg-slate-100" />
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3 w-full rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 rounded-full bg-slate-100" />
              <div className="h-3 w-2/3 rounded-full bg-slate-100" />
            </div>
            <div className="mt-5 h-10 w-full rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
};

const resolveLocationIdentifier = (order: any) => {
  const explicitIdentifier = String(
    order?.location_identifier ??
      order?.locationIdentifier ??
      order?.location?.identifier ??
      order?.location?.label ??
      order?.sector ??
      order?.setor ??
      ""
  ).trim();
  if (explicitIdentifier) {
    return explicitIdentifier.toUpperCase();
  }
  const type = String(order?.type || "").toLowerCase();
  const fulfillmentMode = String(order?.fulfillmentMode || "").toLowerCase();

  // Lógica para condomínios
  if (order?.condominiumId) {
    let condoDetails = `COND. ${order.condominiumName || ''}`;
    if ((fulfillmentMode === 'condominium_apartment' || fulfillmentMode === 'apartment_delivery') && order.condominiumUnit) {
      const { block, tower, apartment, reference } = order.condominiumUnit;
      let unitDetails = [];
      if (block) unitDetails.push(`Bl. ${block}`);
      if (tower) unitDetails.push(`Tr. ${tower}`);
      if (apartment) unitDetails.push(`Apto ${apartment}`);
      if (reference) unitDetails.push(`Ref. ${reference}`);
      if (unitDetails.length) {
        condoDetails += ` (${unitDetails.join(', ')})`;
      }
    }
    return condoDetails.toUpperCase();
  }

  if (type === "pickup") return "RETIRADA";
  if (type === "table") {
    const formattedTable = formatTableIdentifier(order?.table);
    return formattedTable ? `MESA ${formattedTable}` : "MESA";
  }
  return "";
};

const parseMesaIdentifier = (value: any) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^MESA\s+(.+)$/i);
  if (!match) return { isMesa: false, number: "", raw };
  return { isMesa: true, number: String(match[1] || "").trim(), raw };
};

const isPostalOrder = (order: any) =>
  String(order?.type || "").toLowerCase() === "delivery" &&
  String(order?.fulfillmentMode || "").toLowerCase() === "postal";

const isCondominiumOrder = (order: any) => Boolean(order?.condominiumId || order?.condominiumName);

const MANUAL_ITEM_CATEGORY = "Avulsos";

const isTableOrder = (order: any) => String(order?.type || "").toLowerCase() === "table";

const getOrderItemCategory = (item: any, productsById?: Map<any, any>) => {
  const product = item?.product || productsById?.get?.(item?.productId || item?.id);
  return String(product?.category || item?.category || "");
};

const isTableServiceOrderItem = (item: any, productsById?: Map<any, any>) =>
  isTableServiceCategory(getOrderItemCategory(item, productsById));

const resolveCondominiumCardIdentifier = (order: any) => {
  if (!isCondominiumOrder(order)) return "";
  const fulfillmentMode = String(order?.fulfillmentMode || "").toLowerCase();
  const unit = order?.condominiumUnit || {};
  const isApartment = fulfillmentMode === "condominium_apartment" || fulfillmentMode === "apartment_delivery";
  if (!isApartment) return "COND.";

  const apartment = String(unit?.apartment || "").trim();
  const blockOrTower = String(unit?.block || unit?.tower || "").trim();
  if (apartment) return `APTO ${apartment}`.toUpperCase();
  if (blockOrTower) return `BL. ${blockOrTower}`.toUpperCase();
  return "APTO";
};

const PremiumCheckToggle = ({
  selected = false,
  onToggle,
  disabled = false,
  ariaLabel,
  title,
}: {
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      if (disabled) return;
      onToggle?.();
    }}
    className={`relative z-20 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[10px] border-2 shadow-sm transition-all ${
      selected
        ? "border-emerald-500 bg-emerald-500 text-white animate-[satinPop_180ms_ease-out]"
        : disabled
          ? "border-slate-200 bg-slate-100 text-transparent opacity-60 cursor-not-allowed"
          : "border-slate-300 bg-white text-transparent hover:border-slate-400 hover:bg-slate-50"
    }`}
    aria-label={ariaLabel}
    title={title}
  >
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </button>
);

const PremiumDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Selecione...",
  className = "",
  menuClassName = "",
  disabled = false,
}: any) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: any) => {
      if (!rootRef.current?.contains?.(event?.target)) setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const selectedOption = options.find((opt: any) => String(opt.value) === String(value));
  const selectedLabel = selectedOption?.label || placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <CaretDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[120] max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl ${menuClassName}`}>
          {options.map((opt: any) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={`w-full inline-flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  isSelected
                    ? "bg-amber-50 text-amber-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected ? <Check size={14} className="text-amber-600" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ProductThumb = ({ product, className = "h-9 w-9" }: any) => {
  const imageSrc = resolveAssetUrl(product?.imageUrl || product?.image_url || "");
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-400 ${className}`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={product?.name || "Produto"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <Package size={16} weight="duotone" />
      )}
    </span>
  );
};

const ProductQuickPicker = ({
  products = [],
  value,
  onChange,
  onOpenCatalog,
  onOpenManual,
  placeholder = "Adicionar item...",
  className = "",
}: any) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuBox, setMenuBox] = useState<any | null>(null);
  const rootRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const menuRef = useRef<any>(null);

  const selectedOption = useMemo(
    () => (products || []).find((p: any) => String(p.id) === String(value)),
    [products, value]
  );

  const filteredOptions = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return filterAdminQueueProducts(list, query, 40);
  }, [products, query]);

  const positionMenu = useCallback(() => {
    if (typeof window === "undefined" || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const margin = 12;
    const gap = 6;
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - margin - gap);
    const spaceAbove = Math.max(0, rect.top - margin - gap);
    const openAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
    const availableSpace = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(220, Math.min(360, availableSpace || viewportHeight - margin * 2));
    const width = Math.min(Math.max(rect.width, 260), Math.max(260, viewportWidth - margin * 2));
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - width - margin));
    const top = openAbove
      ? Math.max(margin, rect.top - gap - maxHeight)
      : Math.min(rect.bottom + gap, Math.max(margin, viewportHeight - margin - maxHeight));

    setMenuBox({ top, left, width, maxHeight, openAbove });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: any) => {
      const target = event?.target;
      if (rootRef.current?.contains?.(target) || menuRef.current?.contains?.(target)) return;
      setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuBox(null);
      return;
    }
    positionMenu();
    const raf = window.requestAnimationFrame(() => {
      positionMenu();
      inputRef.current?.focus?.();
    });
    const handleReposition = () => positionMenu();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, positionMenu]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="admin-product-picker-button"
        className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption ? <ProductThumb product={selectedOption} className="h-8 w-8 rounded-lg" /> : null}
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {selectedOption ? selectedOption.name : placeholder}
            </span>
            {selectedOption ? (
              <span className="block truncate text-[11px] font-bold text-amber-700">
                {formatCurrency(selectedOption.price)}
              </span>
            ) : null}
          </span>
        </span>
        <CaretDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && menuBox && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          data-testid="admin-product-picker-menu"
          style={{
            top: menuBox.top,
            left: menuBox.left,
            width: menuBox.width,
            maxHeight: menuBox.maxHeight,
          }}
          className="fixed z-[10045] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.55)]"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar item..."
            data-testid="admin-product-picker-search"
            className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />

          <div
            style={{ maxHeight: Math.max(120, Number(menuBox.maxHeight || 320) - 118) }}
            className="overflow-auto rounded-lg border border-slate-100"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((product: any) => {
                const isSelected = String(product.id) === String(value);
                return (
                  <button
                    key={String(product.id)}
                    type="button"
                    data-testid="admin-product-option"
                    onClick={() => {
                      onChange?.(product.id);
                      setOpen(false);
                    }}
                    className={`w-full inline-flex items-center justify-between gap-2 px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-amber-50 text-amber-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ProductThumb product={product} className="h-10 w-10 rounded-lg" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{product.name}</span>
                        {product.category ? (
                          <span className="block truncate text-[10px] font-medium text-slate-400">{product.category}</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">{formatCurrency(product.price)}</span>
                  </button>
                );
              })
            ) : (
              <div className="p-3 space-y-2">
                <p className="text-[11px] text-slate-500">Nenhum item encontrado.</p>
                <p className="text-[10px] font-semibold text-slate-400">
                  Abra o catálogo completo ou cadastre um item avulso para este pedido.
                </p>
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenCatalog?.(query);
              }}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Catálogo com fotos
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenManual?.(query);
              }}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
            >
              Item avulso
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const OrderSummaryCard = ({
  order,
  queueRank,
  orderDisplayId,
  isLate,
  elapsedLabel,
  statusMeta,
  typeMeta,
  paymentLabel,
  totalLabel,
  itemsCount,
  onClick,
  onPrint,
  canPrint,
  printBusy,
  archived = false,
  onReopen,
  showSelector = false,
  selected = false,
  onToggleSelect,
  showQuickStart = false,
  onQuickStart,
  showQuickFinalize = false,
  onQuickFinalize,
  isTimerWarning = false,
}: any) => (
  (() => {
    const orderType = String(order?.type || '').toLowerCase();
    const orderStatus = String(order?.status || '').toLowerCase();
    const locationIdentifier = resolveLocationIdentifier(order);
    const isCondo = isCondominiumOrder(order);
    const cardLocationIdentifier = isCondo ? resolveCondominiumCardIdentifier(order) : locationIdentifier;
    const condominiumLine = isCondo ? String(locationIdentifier || '').trim() : '';
    const hasLocationIdentifier = Boolean(cardLocationIdentifier);
    const mesaMeta = parseMesaIdentifier(cardLocationIdentifier);
    const isMesaLocation = mesaMeta.isMesa;
    const locationLine = isCondo ? condominiumLine : cardLocationIdentifier;
    const locationBadgeTone = isMesaLocation
      ? 'bg-[#FFF3E0] text-[#E65100] border-[#E65100]'
      : isCondo
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-slate-100 text-slate-900 border-slate-200';
    const closedAtLabel = (() => {
      if (!archived) return '';
      const base = Number(order?.updatedAt || order?.createdAt || 0);
      if (!base) return '';
      return new Date(base).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    })();
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const itemNames = Array.from(
      new Set(orderItems.map((item: any) => String(item?.name || '').trim()).filter(Boolean))
    );
    const itemsSummary = itemNames.slice(0, 2).join(' • ');
    const customerNote = resolveCustomerOrderNote(order);
    const timerToneClass = isLate
      ? 'text-red-600'
      : isTimerWarning
        ? 'text-amber-600'
        : 'text-slate-500';
    const timerIconToneClass = isLate
      ? 'text-red-500'
      : isTimerWarning
        ? 'text-amber-500'
        : 'text-slate-400';
    const timerShellClass = isLate
      ? 'border-red-200 bg-red-50/80'
      : isTimerWarning
        ? 'border-amber-200 bg-amber-50/80'
        : 'border-slate-200 bg-white';
    const selectorToneClass = (() => {
      if (orderStatus === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
      if (orderStatus === 'preparing') return 'border-sky-200 bg-sky-50 text-sky-700';
      if (orderStatus === 'ready' || orderStatus === 'ready_for_delivery' || orderStatus === 'waiting_for_motoboy' || orderStatus === 'dispatched' || orderStatus === 'in_delivery') {
        return 'border-violet-200 bg-violet-50 text-violet-700';
      }
      if (orderStatus === 'done' || orderStatus === 'delivered' || orderStatus === 'finished') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      return 'border-slate-200 bg-slate-100 text-slate-600';
    })();
    const selectorMeta = (() => {
      const fulfillment = String(order?.fulfillmentMode || '').toLowerCase();
      if (orderType === 'delivery' && fulfillment === 'postal') return { icon: Package };
      if (orderType === 'delivery') return { icon: Truck };
      if (orderType === 'pickup') return { icon: Storefront };
      if (orderType === 'table') return { icon: Monitor };
      return { icon: Hash };
    })();
    const statusBadgeTone = (() => {
      if (orderStatus === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
      if (orderStatus === 'preparing') return 'border-sky-200 bg-sky-50 text-sky-700';
      if (orderStatus === 'ready' || orderStatus === 'ready_for_delivery' || orderStatus === 'waiting_for_motoboy' || orderStatus === 'dispatched' || orderStatus === 'in_delivery') return 'border-violet-200 bg-violet-50 text-violet-700';
      if (orderStatus === 'done' || orderStatus === 'delivered' || orderStatus === 'finished') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      return 'bg-slate-50 border-transparent text-slate-500';
    })();
    const orderDisplayLabel = String(orderDisplayId || '').trim() || String(order?.id || '').trim() || '-';
    const typeLabel = String(typeMeta?.label || '').trim();
    const showTypeInMeta = !hasLocationIdentifier && Boolean(typeLabel);
    const renderMetaDivider = () => <span className="text-slate-300">•</span>;
    return (
  <div
    role="button"
    tabIndex={0}
    data-testid="admin-order-card"
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    }}
    className={`relative w-full min-h-[140px] rounded-[1.7rem] border transition-all duration-300 cursor-pointer overflow-hidden ${
      archived
        ? 'border-slate-200/80 bg-slate-50/90 opacity-80'
        : `border-slate-200 bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.24)] hover:border-slate-300 hover:shadow-[0_20px_38px_-24px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 ${
            selected ? 'ring-2 ring-emerald-100' : ''
          }`
    }`}
  >
    <div className="flex items-stretch h-full">
      {showSelector && (
        <div className="shrink-0 flex w-14 flex-col items-center justify-center gap-3 border-r border-slate-100 bg-slate-50/80 px-2">
          <PremiumCheckToggle
            selected={selected}
            disabled={!showQuickFinalize}
            onToggle={onToggleSelect}
            ariaLabel={selected ? "Desmarcar pedido" : "Selecionar pedido"}
          />
          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 ${selectorToneClass} ${selected ? 'scale-105 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]' : ''}`}>
            <selectorMeta.icon size={18} weight="duotone" />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div className="space-y-3.5">
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex flex-1 items-start gap-3">
              <div className={`inline-flex h-9 shrink-0 items-center justify-center rounded-2xl px-3 text-sm font-black tracking-tight shadow-sm ${
                archived
                  ? 'border border-slate-200 bg-white text-slate-400'
                  : 'border border-slate-900/5 bg-slate-900 text-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)]'
              }`}>
                #{String(queueRank).padStart(2, '0')}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors whitespace-nowrap ${timerShellClass} ${timerToneClass}`}>
                <Clock size={14} weight="fill" className={`shrink-0 ${timerIconToneClass}`} />
                <span className="inline-block min-w-[3.1rem] text-center text-[11px] font-extrabold tabular-nums tracking-tight whitespace-nowrap">
                  {archived ? (closedAtLabel || '--:--') : elapsedLabel}
                </span>
              </div>

              {canPrint && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPrint();
                  }}
                  disabled={printBusy}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-90 disabled:opacity-50 shrink-0"
                  title="Imprimir"
                >
                  <Printer size={18} weight="duotone" />
                </button>
              )}
            </div>
          </div>

          {/* Nome do Cliente */}
          <div className="min-w-0">
            {hasLocationIdentifier && (
              <div
                className={`mb-2.5 inline-flex max-w-full items-start gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm ${locationBadgeTone}`}
                title={locationIdentifier || cardLocationIdentifier}
              >
                {isMesaLocation ? (
                  <>
                    <Monitor size={14} weight="duotone" className="mt-0.5 shrink-0" />
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]">Mesa</span>
                    <span className="text-sm font-black leading-none">{mesaMeta.number}</span>
                  </>
                ) : (
                  <>
                    {isCondo ? <Buildings size={14} weight="duotone" className="mt-0.5 shrink-0" /> : orderType === 'delivery' ? <Truck size={14} weight="duotone" className="mt-0.5 shrink-0" /> : <Storefront size={14} weight="duotone" className="mt-0.5 shrink-0" />}
                    <span className="min-w-0 leading-snug [overflow-wrap:anywhere]">
                      {locationLine}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-slate-600 shadow-sm">
                <Hash size={11} weight="duotone" className="shrink-0 text-slate-400" />
                <span className="truncate">{orderDisplayLabel}</span>
              </span>
            </div>
            <h3 className="mt-2 text-[1.05rem] font-black leading-tight text-slate-900 truncate">
              {order.customerName || order.name || 'Cliente'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
              {showTypeInMeta ? (
                <>
                  <span className="font-semibold text-slate-700">{typeLabel}</span>
                  {renderMetaDivider()}
                </>
              ) : null}
              <span className="font-semibold text-slate-700">{itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
              {renderMetaDivider()}
              <span className="truncate">{paymentLabel}</span>
              {itemsSummary && (
                <>
                  {renderMetaDivider()}
                  <span className="truncate">{itemsSummary}</span>
                </>
              )}
            </div>
            {customerNote ? (
              <div className="mt-2 inline-flex max-w-full items-start gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm">
                <NotePencil size={13} weight="duotone" className="mt-0.5 shrink-0" />
                <span className="line-clamp-2 [overflow-wrap:anywhere]">{customerNote}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer do Card */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-col shrink-0">
              <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 leading-none">Total</span>
              <span className="text-[1.05rem] font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">
                {totalLabel}
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${statusBadgeTone}`}>
                {archived ? 'Finalizado' : statusMeta.label}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 justify-end">
            {!archived && showQuickStart && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickStart();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#153A4C] text-white shadow-[0_18px_32px_-24px_rgba(21,58,76,0.55)] transition-all hover:bg-[#102b38] active:scale-95"
                title="Atender"
                aria-label="Atender pedido"
              >
                <Play size={16} weight="fill" />
              </button>
            )}

            {!archived && showQuickFinalize && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickFinalize();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_18px_32px_-24px_rgba(5,150,105,0.55)] transition-all hover:bg-emerald-700 active:scale-95"
                title="Pronto"
                aria-label="Marcar pedido como pronto"
              >
                <Check size={16} weight="bold" />
              </button>
            )}

            {archived && typeof onReopen === 'function' && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onReopen();
                }}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 transition-all hover:bg-amber-100 active:scale-95 whitespace-nowrap"
              >
                Reabrir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
    );
  })()
);

const getTableStageMeta = (stage: string) => {
  if (stage === "pending") {
    return {
      label: "Aguardando",
      icon: Clock,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (stage === "preparing") {
    return {
      label: "Em preparo",
      icon: Play,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (stage === "ready") {
    return {
      label: "Pronta",
      icon: Check,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return {
    label: "Em andamento",
    icon: CheckSquare,
    className: "border-orange-200 bg-orange-50 text-orange-700",
  };
};

const TableSummaryCard = ({ group, elapsedLabel, onClick }: any) => {
  const stageMeta = getTableStageMeta(group?.stage);
  const StageIcon = stageMeta.icon;
  const previewItems = Array.isArray(group?.previewItems) ? group.previewItems : [];

  return (
    <button
      type="button"
      data-testid="admin-table-card"
      onClick={onClick}
      className="group relative min-h-[178px] w-full overflow-hidden rounded-[1.75rem] border border-orange-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#e8f6f3_100%)] p-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.38)] transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_24px_54px_-34px_rgba(230,81,0,0.35)] active:scale-[0.99]"
    >
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#F28C28]/12 blur-2xl transition-transform group-hover:scale-125" />
      <span className="pointer-events-none absolute -bottom-10 left-4 h-28 w-28 rounded-full bg-[#153A4C]/10 blur-2xl" />

      <div className="relative flex h-full min-h-0 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E65100]">Mesa</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#153A4C] px-3 text-xl font-black leading-none text-white shadow-[0_18px_32px_-24px_rgba(21,58,76,0.75)]">
                {group?.displayNumber || "--"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  {group?.ordersCount || 0} pedido{Number(group?.ordersCount || 0) === 1 ? "" : "s"} aberto{Number(group?.ordersCount || 0) === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {group?.itemsCount || 0} {Number(group?.itemsCount || 0) === 1 ? "item" : "itens"} na mesa
                </p>
              </div>
            </div>
          </div>

          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${stageMeta.className}`}>
            <StageIcon size={12} weight="duotone" />
            {stageMeta.label}
          </span>
        </div>

        <div className="relative rounded-2xl border border-white/70 bg-white/76 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Resumo</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                {previewItems.length
                  ? previewItems.map((item: any) => `${item.qty}x ${item.name}`).join(" • ")
                  : "Sem itens informados"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total</p>
              <p className="mt-1 whitespace-nowrap text-base font-black text-slate-900">{formatCurrency(Number(group?.total || 0))}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-orange-100/80 pt-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
            <Clock size={13} weight="duotone" className="shrink-0 text-[#E65100]" />
            <span className="truncate">{elapsedLabel || "Agora"}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#E65100] px-3 py-2 text-xs font-black text-white shadow-[0_18px_30px_-24px_rgba(230,81,0,0.8)]">
            Abrir mesa
            <Monitor size={14} weight="duotone" />
          </span>
        </div>
      </div>
    </button>
  );
};

export const GrillQueue = ({ forcedTab = 'queue' }: { forcedTab?: 'queue' | 'inroute' | 'completed' }) => {
  const SAO_PAULO_TZ = 'America/Sao_Paulo';
  const QUEUE_POLL_VISIBLE_MS = 1500;
  const QUEUE_POLL_HIDDEN_MS = 10000;
  const HISTORY_POLL_VISIBLE_MS = 30000;
  const HISTORY_POLL_HIDDEN_MS = 120000;
  const getDayKeyInSaoPaulo = (value?: number | string | Date | null) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: SAO_PAULO_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return '';
    }
  };
  const getNowKeyInSaoPaulo = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SAO_PAULO_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const getMinutesInSaoPaulo = (value?: number | string | Date | null) => {
    if (!value) return 0;
    try {
      const date = new Date(value);
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: SAO_PAULO_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(date);
      const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
      const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
      return hour * 60 + minute;
    } catch {
      return 0;
    }
  };
  const resolvePaymentBucket = (payment: unknown): 'pix' | 'cash' | 'card' => {
    const normalized = String(payment || '').toLowerCase();
    if (normalized.includes('pix')) return 'pix';
    if (
      normalized.includes('dinheiro') ||
      normalized.includes('cash') ||
      normalized.includes('espécie') ||
      normalized.includes('especie')
    ) {
      return 'cash';
    }
    return 'card';
  };
  // Tap feedback animation
  const pulseCta = (key: string) => {
    setCtaPulseId(key);
    window.setTimeout(() => setCtaPulseId(null), 220);
  };
  const { auth } = useAuth();
  const userRole = String(auth?.user?.role || '').toLowerCase();
  const hasPrintAccess = userRole === 'admin' || userRole === 'lojista' || userRole === 'operator';
  const isAdminUser = [ 'ADMIN', 'LOJISTA' ].includes(String(auth?.user?.role || '').toUpperCase());
  const isOperatorUser = String(auth?.user?.role || '').toUpperCase() === 'OPERATOR';
  const canLoadMotoboyManagement = Boolean(
    isAdminUser &&
      (
        auth?.store?.settings?.planExempt ||
        auth?.subscription?.planExempt ||
        auth?.features?.motoboyManagement ||
        String(auth?.subscription?.status || '').toUpperCase() === 'TRIAL' ||
        String(auth?.subscription?.plan?.name || '').toLowerCase().includes('pro') ||
        String(auth?.subscription?.plan?.name || '').toLowerCase().includes('vip')
      )
  );
  const storeNameForPrint = String(auth?.store?.name || auth?.store?.settings?.name || 'Minha Loja').trim();
  const tableServiceSettings = useMemo(
    () => normalizeTableServiceSettings(auth?.store?.settings?.tableServiceSettings),
    [auth?.store?.settings?.tableServiceSettings]
  );
  const storeIdentifier = useMemo(
    () => String(auth?.store?.id || auth?.store?.slug || '').trim(),
    [auth?.store?.id, auth?.store?.slug]
  );
  const prepSlaMinutes = useMemo(() => {
    const raw = Number(auth?.store?.settings?.prepBaseMinutes ?? 20);
    if (!Number.isFinite(raw)) return 20;
    return Math.max(5, Math.round(raw));
  }, [auth?.store?.settings?.prepBaseMinutes]);
  const prepAttentionMinutes = useMemo(() => {
    const fallback = Math.max(1, prepSlaMinutes - 5);
    const raw = Number(auth?.store?.settings?.prepAttentionMinutes ?? fallback);
    if (!Number.isFinite(raw)) return fallback;
    return Math.min(prepSlaMinutes, Math.max(1, Math.round(raw)));
  }, [auth?.store?.settings?.prepAttentionMinutes, prepSlaMinutes]);
  const [liveSoundSetting, setLiveSoundSetting] = useState(String(auth?.store?.settings?.orderNotificationSound || "").trim());
  const [liveSoundDuration, setLiveSoundDuration] = useState(
    normalizeOrderNotificationDurationSeconds(auth?.store?.settings?.orderNotificationSoundDuration)
  );
  const configuredOrderNotificationSound = liveSoundSetting;
  const soundDurationMs = normalizeOrderNotificationDurationSeconds(liveSoundDuration) * 1000;
  const PREP_SLA_MS = prepSlaMinutes * 60 * 1000;
  const PREP_ATTENTION_MS = prepAttentionMinutes * 60 * 1000;
  const [queue, setQueue] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [storePixKey, setStorePixKey] = useState('');
  const [cashConfirmValue, setCashConfirmValue] = useState('');
  const storeSlug = useMemo(() => {
    const authSlug = String(auth?.store?.slug || '').trim();
    if (authSlug) return authSlug;
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('adminSession');
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return parsed?.store?.slug || '';
    } catch {
      return '';
    }
  }, [auth?.store?.slug]);
  useEffect(() => {
    setLiveSoundSetting(String(auth?.store?.settings?.orderNotificationSound || "").trim());
    setLiveSoundDuration(
      normalizeOrderNotificationDurationSeconds(auth?.store?.settings?.orderNotificationSoundDuration)
    );
  }, [
    auth?.store?.settings?.orderNotificationSound,
    auth?.store?.settings?.orderNotificationSoundDuration,
  ]);
  useEffect(() => {
    if (!storeSlug) return;
    const fetchSound = () => {
      fetch("/api/stores/slug/" + storeSlug).then(function(r) { return r.ok ? r.json() : null; }).then(function(d) {
        if (d && d.settings && d.settings.orderNotificationSound !== undefined) setLiveSoundSetting(String(d.settings.orderNotificationSound || "").trim());
        if (d && d.settings && d.settings.orderNotificationSoundDuration !== undefined) {
          setLiveSoundDuration(normalizeOrderNotificationDurationSeconds(d.settings.orderNotificationSoundDuration));
        }
      }).catch(function() {});
    };
    fetchSound();
    var iv = setInterval(fetchSound, 60000);
    return function() { clearInterval(iv); };
  }, [storeSlug]);
  const [activeTab, setActiveTab] = useState<'queue' | 'inroute' | 'completed'>(
    forcedTab === 'inroute' || forcedTab === 'completed' ? forcedTab : 'queue'
  );
  const [completedPage, setCompletedPage] = useState(1);
  const [completedPageSize, setCompletedPageSize] = useState(9);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [confirmModal, setConfirmModal] = useState(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [ctaPulseId, setCtaPulseId] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("queueSoundEnabled");
    return saved ? saved === "true" : true;
  });
  const [activeMotoboysCount, setActiveMotoboysCount] = useState(0);
  const [closeDayModalOpen, setCloseDayModalOpen] = useState(false);
  const [isPrintingDaySummary, setIsPrintingDaySummary] = useState(false);
  const [tvMode, setTvMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("queueTvMode") === "true";
  });
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'condominium' | 'pending' | 'preparing' | 'ready' | 'late' | 'cancelled' | 'finalized'>('all');
  const [queueViewMode, setQueueViewMode] = useState<'orders' | 'tables'>('orders');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string | null>(null);
  const [reportRange, setReportRange] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today');
  const [reportFrom, setReportFrom] = useState(() => getNowKeyInSaoPaulo());
  const [reportTo, setReportTo] = useState(() => getNowKeyInSaoPaulo());
  const salesHistoryWindow = useMemo(
    () => resolveAdminSalesHistoryWindow({ reportRange, reportFrom, reportTo }),
    [reportFrom, reportRange, reportTo]
  );
  const [soldItemsModalOpen, setSoldItemsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [editingFinalizedOrder, setEditingFinalizedOrder] = useState(false);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [bulkFinishing, setBulkFinishing] = useState(false);
  const [bulkFinalizeModalOpen, setBulkFinalizeModalOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [quickFinalizeModal, setQuickFinalizeModal] = useState<{
    open: boolean;
    order: any | null;
    loading: boolean;
  }>({
    open: false,
    order: null,
    loading: false,
  });
  const [reopenModal, setReopenModal] = useState<{
    open: boolean;
    order: any | null;
    reason: string;
    adminIdentifier: string;
    adminPassword: string;
    loading: boolean;
    error: string;
  }>({
    open: false,
    order: null,
    reason: '',
    adminIdentifier: '',
    adminPassword: '',
    loading: false,
    error: '',
  });
  const [cancelOrderModal, setCancelOrderModal] = useState<{
    open: boolean;
    order: any | null;
    reason: string;
    loading: boolean;
    error: string;
  }>({
    open: false,
    order: null,
    reason: '',
    loading: false,
    error: '',
  });
  const [printSelectionModal, setPrintSelectionModal] = useState<{
    open: boolean;
    order: any | null;
    queueRank: number;
    hasPrintedItems: boolean;
    hasNewItems: boolean;
  }>({
    open: false,
    order: null,
    queueRank: 1,
    hasPrintedItems: false,
    hasNewItems: false,
  });
  const [catalogPickerModal, setCatalogPickerModal] = useState<{
    open: boolean;
    orderId: string | null;
    query: string;
  }>({
    open: false,
    orderId: null,
    query: "",
  });
  const [manualItemModal, setManualItemModal] = useState<{
    open: boolean;
    orderId: string | null;
    name: string;
    price: string;
    quantity: string;
    category: string;
    title: string;
    helper: string;
    quantityLabel: string;
    ctaLabel: string;
    loading: boolean;
    error: string;
  }>({
    open: false,
    orderId: null,
    name: "",
    price: "",
    quantity: "1",
    category: MANUAL_ITEM_CATEGORY,
    title: "Adicionar item avulso",
    helper: "Use para bala, cobrança extra ou algo fora do cardápio.",
    quantityLabel: "Quantidade",
    ctaLabel: "Salvar e incluir",
    loading: false,
    error: "",
  });
  const previousIdsRef = useRef<string[]>([]);
  const queueRef = useRef<any[]>([]);
  const historyOrdersRef = useRef<any[]>([]);
  const queuePollTimerRef = useRef<number | null>(null);
  const historyPollTimerRef = useRef<number | null>(null);
  const queueRequestInFlightRef = useRef(false);
  const historyRequestInFlightRef = useRef(false);
  const queueRequestSeqRef = useRef(0);
  const queueAppliedSeqRef = useRef(0);
  const queueRetryDelayRef = useRef(3000);
  const pullStartYRef = useRef<number | null>(null);
  const pullActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationAudioSrcRef = useRef<string>('');
  const isDrawerOpen = selectedOrder !== null;
  const isPaymentModalOpen = confirmModal !== null;

  const closeOrderOverlays = () => {
    setConfirmModal(null);
    setSelectedOrder(null);
    setSelectedTableNumber(null);
    setEditingFinalizedOrder(false);
  };

  const executePrintOrder = async (order: any, queueRank = 1, mode: 'all' | 'new' = 'all') => {
    if (!hasPrintAccess || !order?.id) return;
    if (isGeneratingPrint) return;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    if (!orderItems.length) {
      setError('Pedido sem itens para impressão.');
      return;
    }
    const newItems = orderItems.filter((item: any) => !Boolean(item?.isPrinted));
    const itemsToPrint = mode === 'new' ? newItems : orderItems;
    if (!itemsToPrint.length) {
      setError('Nenhum item novo para imprimir.');
      return;
    }
    const printedIds = itemsToPrint
      .map((item: any) => String(item?.id || '').trim())
      .filter(Boolean);
    if (!printedIds.length) {
      setError('Itens sem ID para atualização de impressão.');
      return;
    }

    const payload = {
      order,
      queueRank,
      orderDisplayId: formatOrderDisplayId(order.id, storeSlug),
      createdAt: order?.createdAt
        ? new Date(order.createdAt).toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ })
        : new Date().toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ }),
      items: itemsToPrint,
      total:
        mode === 'new'
          ? itemsToPrint.reduce((acc: number, item: any) => {
              const qty = Number(item?.qty ?? item?.quantity ?? 0);
              const unit = Number(item?.unitPrice ?? item?.price ?? 0);
              return acc + qty * unit;
            }, 0)
          : Number(order?.total || 0),
      storeName: String(order?.storeName || auth?.store?.name || 'Sertanejo no Espeto'),
      table: order?.table || '',
      locationIdentifier: resolveLocationIdentifier(order),
    };
    setIsGeneratingPrint(true);
    setError('Gerando cupom...');
    const applyPrintedState = () => {
      const printedSet = new Set(printedIds);
      const nextItems = orderItems.map((item: any) =>
        printedSet.has(String(item?.id || '').trim()) ? { ...item, isPrinted: true } : item
      );
      setQueue((prev) =>
        prev.map((entry) =>
          entry.id === order.id ? { ...entry, items: nextItems } : entry
        )
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev: any) => (prev ? { ...prev, items: nextItems } : prev));
      }
    };
    let printMode: 'rawbt' | 'browser' | '' = '';
    try {
      const result = await printReceiptAsImage({
        storeName: (payload.storeName || storeNameForPrint || 'Minha Loja').toUpperCase(),
        platformName: 'Já no Caminho',
        queueLabel: `#${String(payload.queueRank || 1).padStart(2, '0')}`,
        orderLabel: `#${payload.orderDisplayId}`,
        customerLabel: payload.order?.customerName || payload.order?.name || 'Cliente',
        customerNote: resolveCustomerOrderNote(payload.order),
        locationLabel: payload.locationIdentifier || '',
        tableLabel: payload.table ? String(payload.table) : '',
        dateLabel: payload.createdAt,
        items: payload.items.map((item: any) => {
          const qty = Number(item?.qty ?? item?.quantity ?? 0);
          const unit = Number(item?.unitPrice ?? item?.price ?? 0);
          const couvertDetail =
            isTableServiceOrderItem(item, productsById) && isCouvertServiceItem(item)
              ? formatCouvertBreakdown({ qty, unitPrice: unit })
              : "";
          const itemNotes = [item?.cookingPoint || item?.options ? String(item?.cookingPoint || item?.options || '') : '', couvertDetail]
            .map((note) => String(note || '').trim())
            .filter(Boolean)
            .join(' | ');
          return {
            quantity: qty,
            name: String(item?.name || 'Item'),
            lineTotal: formatCurrency(qty * unit),
            notes: itemNotes,
          };
        }),
        totalLabel: formatCurrency(payload.total),
      });
      printMode = result?.mode || '';
    } catch (printError) {
      console.error('[print] erro ao imprimir', printError);
      setError('Falha ao disparar impressão. Marcando itens como impressos no sistema.');
    } finally {
      if (printMode === 'rawbt') {
        applyPrintedState();
        setError('');
        setIsGeneratingPrint(false);
        void orderService.markItemsPrinted(order.id, printedIds).catch((syncError) => {
          console.error('[print] erro ao sincronizar isPrinted', syncError);
        });
        return;
      }
      try {
        await orderService.markItemsPrinted(order.id, printedIds);
      } catch (syncError) {
        console.error('[print] erro ao sincronizar isPrinted', syncError);
      }
      applyPrintedState();
      setError('');
      setIsGeneratingPrint(false);
    }
  };

  const openPrintSelectionModal = (order: any, queueRank = 1) => {
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const hasPrintedItems = orderItems.some((item: any) => Boolean(item?.isPrinted));
    const hasNewItems = orderItems.some((item: any) => !Boolean(item?.isPrinted));
    setPrintSelectionModal({
      open: true,
      order,
      queueRank,
      hasPrintedItems,
      hasNewItems,
    });
  };

  const handlePrintOrder = async (order: any, queueRank = 1) => {
    if (!hasPrintAccess || !order?.id) return;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    if (!orderItems.length) {
      setError('Pedido sem itens para impressão.');
      return;
    }
    openPrintSelectionModal(order, queueRank);
  };

  const closePrintSelectionModal = () => {
    if (isGeneratingPrint) return;
    setPrintSelectionModal({
      open: false,
      order: null,
      queueRank: 1,
      hasPrintedItems: false,
      hasNewItems: false,
    });
  };

  const handleSelectPrintMode = async (mode: 'all' | 'new') => {
    const order = printSelectionModal.order;
    const queueRank = printSelectionModal.queueRank || 1;
    closePrintSelectionModal();
    await executePrintOrder(order, queueRank, mode);
  };

  const handleMarkAllPrinted = async (order: any) => {
    if (!order?.id) return;
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const pendingIds = orderItems
      .filter((item: any) => !Boolean(item?.isPrinted))
      .map((item: any) => String(item?.id || '').trim())
      .filter(Boolean);
    if (!pendingIds.length) {
      setError('Todos os itens já estão marcados como impressos.');
      return;
    }
    try {
      setIsGeneratingPrint(true);
      await orderService.markItemsPrinted(order.id, pendingIds);
      const pendingSet = new Set(pendingIds);
      const nextItems = orderItems.map((item: any) =>
        pendingSet.has(String(item?.id || '').trim()) ? { ...item, isPrinted: true } : item
      );
      setQueue((prev) => prev.map((entry) => (entry.id === order.id ? { ...entry, items: nextItems } : entry)));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev: any) => (prev ? { ...prev, items: nextItems } : prev));
      }
      setError('');
    } catch (syncError) {
      console.error('[print] erro ao marcar todos como impressos', syncError);
      setError('Não foi possível marcar itens como impressos.');
    } finally {
      setIsGeneratingPrint(false);
    }
  };

  const orderTypeMeta = (order: any) => {
    const type = String(order?.type || '').toLowerCase();
    const fulfillmentMode = String(order?.fulfillmentMode || '').toLowerCase();

    if (type === 'delivery') {
      if (fulfillmentMode === 'apartment_delivery') {
        return {
          label: 'Entrega Condomínio',
          pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <House size={14} weight="duotone" />,
        };
      }
      if (fulfillmentMode === 'pickup_at_stall') {
        return {
          label: 'Retirada Condomínio',
          pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Storefront size={14} weight="duotone" />,
        };
      }
      return {
        label: 'Entrega',
        pill: 'bg-sky-100 text-sky-800 border-sky-200',
        icon: <Truck size={14} weight="duotone" />,
      };
    }
    if (type === 'pickup') {
      return {
        label: 'Retirada',
        pill: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Storefront size={14} weight="duotone" />,
      };
    }
    if (type === 'table') {
      const table = order?.table ? `Mesa ${order.table}` : 'Mesa';
      return {
        label: table,
        pill: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Hash size={14} weight="duotone" />,
      };
    }
    return {
      label: formatOrderType(order?.type),
      pill: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <Hash size={14} weight="duotone" />,
    };
  };

  const calcMoney = (order: any) => {
    const fee =
      String(order?.type || '').toLowerCase() === 'delivery' && order?.deliveryFee !== null && order?.deliveryFee !== undefined
        ? Number(order.deliveryFee)
        : 0;
    const total = Number(order?.total || 0);
    const safeFee = Number.isFinite(fee) ? fee : 0;
    const itemsTotal = Math.max(0, total - safeFee);
    const itemsVolume = (order?.items || []).reduce((sum: number, item: any) => sum + Number(item?.qty || 0), 0);
    return { fee: safeFee, total, itemsTotal, itemsVolume };
  };

  const renderTimeline = (status: string, type: string, order?: any) => {
    const steps = [
      { id: 'pending', label: 'Pendente', icon: <Clock size={16} weight="fill" />, color: 'bg-amber-500' },
      { id: 'preparing', label: 'Preparando', icon: <Play size={16} weight="fill" />, color: 'bg-orange-500' },
      { id: 'ready', label: 'Pronto', icon: <Check size={16} weight="bold" />, color: 'bg-emerald-500' },
      { id: 'delivered', label: 'Entregue', icon: <CheckCircle size={16} weight="fill" />, color: 'bg-[#336886]' },
    ];

    const currentIdx = steps.findIndex(s => s.id === status.toLowerCase());

    return (
      <div className="relative flex items-center justify-between px-2 py-6">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-100" />
        {steps.map((step, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`flex h-9 w-9 items-center justify-center rounded-full border-4 border-white shadow-sm transition-all duration-500 ${
                  isCurrent ? `${step.color} text-white scale-110 shadow-lg ring-4 ring-slate-50` : isPast ? 'bg-slate-900 text-white' : 'bg-white text-slate-300 border-slate-50'
                }`}
              >
                {step.icon}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMoneyBreakdown = (order: any, alignRight = false) => {
    const { fee, total, itemsVolume } = calcMoney(order);
    return (
      <div
        className={[
          'grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3',
          alignRight ? 'sm:ml-auto' : '',
        ].join(' ')}
      >
        <div className="flex min-w-0 items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2 shadow-sm">
          <span className="text-slate-400 font-black text-[9px] uppercase tracking-wider">Volume</span>
          <span className="text-xs font-black text-slate-700">{itemsVolume} {itemsVolume === 1 ? 'item' : 'itens'}</span>
        </div>
        {fee > 0 && (
          <div className="flex min-w-0 items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2 shadow-sm">
            <span className="text-slate-400 font-black text-[9px] uppercase tracking-wider">Frete</span>
            <span className="text-xs font-black text-slate-700">{formatCurrency(fee)}</span>
          </div>
        )}
        <div className="flex min-w-0 items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(5,150,105,0.7)]">
          <span className="text-emerald-700 font-black text-[10px] uppercase tracking-wider">Total</span>
          <span className="text-base font-black tracking-tight text-emerald-800">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };
  const itemOrderRef = useRef<Map<string, Map<string, number>>>(new Map());
  useEffect(() => {
    const sessionPixKey = auth?.store?.settings?.pixKey || '';
    if (sessionPixKey) {
      setStorePixKey(sessionPixKey);
      return;
    }
    if (!storeSlug) return;
    const loadPixKey = async () => {
      try {
        const store = await storeService.fetchBySlug(storeSlug);
        const fetchedKey = store?.settings?.pixKey || '';
        if (fetchedKey) {
          setStorePixKey(fetchedKey);
        }
      } catch (error) {
        console.error('Falha ao carregar chave Pix', error);
      }
    };
    loadPixKey();
  }, [auth?.store?.settings?.pixKey, storeSlug]);

  useEffect(() => {
    const loadMotoboys = async () => {
      const storeId = auth?.store?.id;
      if (!storeId || !canLoadMotoboyManagement) {
        setActiveMotoboysCount(0);
        return;
      }
      try {
        const data = await motoboyAdminService.list(storeId);
        const links = Array.isArray(data) ? data : [];
        setActiveMotoboysCount(links.filter((link) => link.active).length);
      } catch {
        setActiveMotoboysCount(0);
      }
    };
    loadMotoboys();
  }, [auth?.store?.id, canLoadMotoboyManagement]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("queueTvMode", String(tvMode));
    if (tvMode) {
      setActiveTab("queue");
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [tvMode]);
  const toggleTvMode = () => {
    setTvMode((prev) => !prev);
  };
  const formatItemOptions = (item) => {
    const labels = [];
    if (item?.cookingPoint) labels.push(item.cookingPoint);
    if (item?.passSkewer) labels.push('passar farinha');
    const selected = formatSelectedModifiers(item?.selectedModifiers || []);
    if (selected.length) labels.push(`+ ${selected.join(', ')}`);
    return labels.length ? labels.join(' • ') : '';
  };
  const getPriorityTone = (position) => {
    if (position === 1) return "bg-red-600 text-white";
    if (position === 2) return "bg-amber-500 text-white";
    if (position === 3) return "bg-yellow-400 text-slate-900";
    return "bg-slate-100 text-slate-700";
  };
  const getItemBaseKey = (item) =>
    `${item?.productId || item?.name || ''}-${item?.cookingPoint || ''}-${item?.passSkewer ? '1' : '0'}-${getModifiersSignature(item?.selectedModifiers || [])}`;

  const resolvePromoMeta = (item: any) => {
    const product = productsById.get(item.productId || item.id);
    const promoActive = Boolean(item.promoActive ?? product?.promoActive);
    const promoPrice =
      item.promoPrice != null
        ? Number(item.promoPrice)
        : product?.promoPrice != null
        ? Number(product.promoPrice)
        : null;
    const originalPrice =
      item.originalPrice != null
        ? Number(item.originalPrice)
        : product?.price != null
        ? Number(product.price)
        : null;
    const unitPrice = item.unitPrice ?? (item.price && item.qty ? item.price / item.qty : item.price);
    return {
      promoActive: promoActive && !!promoPrice,
      promoPrice,
      originalPrice,
      unitPrice: Number(unitPrice ?? 0),
    };
  };
  const assignItemKeys = (orderId, items = []) => {
    if (!orderId) return items.map((item) => ({ item, key: getItemBaseKey(item) }));
    const map = itemOrderRef.current.get(orderId) || new Map<string, number>();
    const existingByBase = new Map<string, string[]>();
    for (const key of map.keys()) {
      const base = key.split('::')[0];
      const list = existingByBase.get(base) || [];
      list.push(key);
      existingByBase.set(base, list);
    }
    const usedCount = new Map<string, number>();
    return items.map((item) => {
      const base = getItemBaseKey(item);
      const existingList = existingByBase.get(base) || [];
      const used = usedCount.get(base) || 0;
      let key = existingList[used];
      if (!key) {
        const occurrence = existingList.length + used + 1;
        key = `${base}::${occurrence}`;
      }
      usedCount.set(base, used + 1);
      return { item, key };
    });
  };
  const ensureOrderIndex = (orderId, items = []) => {
    if (!orderId) return;
    const map = itemOrderRef.current.get(orderId) || new Map<string, number>();
    let nextIndex = map.size;
    const assignedItems = assignItemKeys(orderId, items);
    assignedItems.forEach(({ key }) => {
      if (!map.has(key)) {
        map.set(key, nextIndex++);
      }
    });
    itemOrderRef.current.set(orderId, map);
  };
  const getOrderedItems = (orderId, items = []) => {
    const assignedItems = assignItemKeys(orderId, items);
    ensureOrderIndex(orderId, items);
    const map = itemOrderRef.current.get(orderId) || new Map<string, number>();
    return [...assignedItems].sort((a, b) => {
      const indexA = map.get(a.key) ?? 0;
      const indexB = map.get(b.key) ?? 0;
      return indexA - indexB;
    }).map(({ item }) => item);
  };

  const productsById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);
  const visibleQueueProducts = useMemo(
    () => (products || []).filter((product: any) => !isTableServiceCategory(product?.category)),
    [products]
  );

  const resolveOrderItemProduct = (item: any) => item?.product || productsById.get(item?.productId || item?.id);

  const resolveOrderItemImageUrl = (item: any) => {
    const product = resolveOrderItemProduct(item);
    return item?.imageUrl || item?.image_url || product?.imageUrl || product?.image_url || "";
  };

  const getVisualOrderItemGroupKey = (item: any) => {
    const product = resolveOrderItemProduct(item);
    const promoMeta = resolvePromoMeta(item);
    const identity = String(item?.productId || product?.id || normalizeTableText(item?.name || product?.name) || item?.id || "").trim();
    const unitPrice = Number(promoMeta.unitPrice || item?.unitPriceOverride || item?.unitPrice || item?.price || product?.price || 0).toFixed(2);
    return [
      identity,
      normalizeTableText(item?.name || product?.name),
      normalizeTableText(getOrderItemCategory(item, productsById)),
      unitPrice,
      normalizeTableText(item?.cookingPoint),
      item?.passSkewer ? "1" : "0",
      getModifiersSignature(item?.selectedModifiers || []),
    ].join("|");
  };

  const buildVisualOrderItemGroups = (orderId: any, items: any[] = []) => {
    const grouped = new Map<string, any>();
    getOrderedItems(orderId, items).forEach((item: any) => {
      const groupKey = getVisualOrderItemGroupKey(item);
      const product = resolveOrderItemProduct(item);
      const promoMeta = resolvePromoMeta(item);
      const qty = Math.max(0, Number(item?.qty || 0));
      const unitPrice = Number(promoMeta.unitPrice || 0);
      const originalUnitPrice = promoMeta.promoActive && promoMeta.originalPrice ? Number(promoMeta.originalPrice) : 0;
      const current = grouped.get(groupKey) || {
        groupKey,
        primary: item,
        itemIds: new Set<string>(),
        name: String(item?.name || product?.name || "Item").trim(),
        imageUrl: resolveOrderItemImageUrl(item),
        qty: 0,
        unitPrice,
        total: 0,
        originalTotal: 0,
        promoActive: false,
        isNew: false,
      };

      const itemId = String(item?.id || "").trim();
      if (itemId) current.itemIds.add(itemId);
      current.qty += qty;
      current.total += unitPrice * qty;
      current.originalTotal += originalUnitPrice * qty;
      current.promoActive = current.promoActive || Boolean(promoMeta.promoActive);
      current.isNew = current.isNew || !Boolean(item?.isPrinted);
      grouped.set(groupKey, current);
    });
    return Array.from(grouped.values());
  };

  const getOrderActiveTableServiceGroups = (order: any, groups?: any[]) => {
    const visualGroups = groups || buildVisualOrderItemGroups(order?.id, order?.items || []);
    const normalizedCouvertLabel = normalizeTableText(tableServiceSettings.couvertLabel || "Couvert artistico");
    const normalizedServiceLabel = normalizeTableText(tableServiceSettings.serviceChargeLabel || "Taxa de servico");
    const tableServiceGroups = visualGroups.filter((group: any) => isTableServiceOrderItem(group.primary, productsById));
    return {
      tableServiceGroups,
      activeCouvertGroup: tableServiceGroups.find(
        (group: any) => normalizeTableText(group.name || group.primary?.name || group.primary?.product?.name) === normalizedCouvertLabel
      ),
      activeServiceChargeGroup: tableServiceGroups.find(
        (group: any) => normalizeTableText(group.name || group.primary?.name || group.primary?.product?.name) === normalizedServiceLabel
      ),
    };
  };

  const ensureAudioContext = async () => {
    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") {
      await context.resume();
    }
    return context;
  };

  const playNewOrderSound = async () => {
    if (!soundEnabled) return;
    const { customUrl, preset } = parseOrderNotificationSoundSetting(configuredOrderNotificationSound);

    if (customUrl) {
      try {
        if (!notificationAudioRef.current || lastNotificationAudioSrcRef.current !== customUrl) {
          notificationAudioRef.current = new Audio(customUrl);
          notificationAudioRef.current.preload = 'auto';
          lastNotificationAudioSrcRef.current = customUrl;
        }
        const audio = notificationAudioRef.current;
        audio.currentTime = 0;
        audio.play().then(() => {
          setTimeout(() => { audio.pause(); audio.currentTime = 0; }, soundDurationMs);
        }).catch(async () => {
          const context = await ensureAudioContext();
          playOrderNotificationPreset(context, preset, soundDurationMs);
        });
        return;
      } catch {
        // Fallback to preset tone below.
      }
    }

    try {
      const context = await ensureAudioContext();
      playOrderNotificationPreset(context, preset, soundDurationMs);
    } catch (err) {
      console.error("Não foi possível tocar o som", err);
    }
  };

  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      await ensureAudioContext().catch(() => {});
    }
  };

  useEffect(() => {
    queueRef.current = Array.isArray(queue) ? queue : [];
  }, [queue]);

  useEffect(() => {
    historyOrdersRef.current = Array.isArray(historyOrders) ? historyOrders : [];
  }, [historyOrders]);

  const clearQueuePollTimer = useCallback(() => {
    if (queuePollTimerRef.current != null) {
      window.clearTimeout(queuePollTimerRef.current);
      queuePollTimerRef.current = null;
    }
  }, []);

  const clearHistoryPollTimer = useCallback(() => {
    if (historyPollTimerRef.current != null) {
      window.clearTimeout(historyPollTimerRef.current);
      historyPollTimerRef.current = null;
    }
  }, []);

  const loadQueue = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!storeIdentifier) {
      setLoading(false);
      return;
    }
    if (queueRequestInFlightRef.current) {
      return;
    }

    const shouldShowLoading = !silent && queueRef.current.length === 0;
    if (shouldShowLoading) {
      setLoading(true);
    }
    if (!silent) {
      setError('');
    }

    queueRequestInFlightRef.current = true;
    const requestSeq = ++queueRequestSeqRef.current;

    try {
      const data = await orderService.fetchQueue(storeIdentifier);
      if (requestSeq < queueAppliedSeqRef.current) {
        return;
      }
      queueAppliedSeqRef.current = requestSeq;
      queueRetryDelayRef.current = QUEUE_POLL_VISIBLE_MS;
      const nextIds = (data || []).map((order) => order.id);
      const previousIds = previousIdsRef.current;
      const incoming = nextIds.filter((id) => !previousIds.includes(id));
      const hasNew = incoming.length > 0;
      if (hasNew) {
        void playNewOrderSound();
        setNewOrderIds(incoming);
        window.setTimeout(() => setNewOrderIds([]), 4000);
      }
      previousIdsRef.current = nextIds;
      setQueue(data);
    } catch (err) {
      console.error('Erro ao buscar fila', err);
      const errorCode = String((err as any)?.code || '').toUpperCase();
      const isConnectivityError = errorCode === 'NETWORK_ERROR' || errorCode === 'REQUEST_TIMEOUT' || Number((err as any)?.status || 0) === 0;
      queueRetryDelayRef.current = isConnectivityError
        ? Math.min(Math.max(QUEUE_POLL_VISIBLE_MS, queueRetryDelayRef.current) * 1.35, 6000)
        : Math.min(queueRetryDelayRef.current * 2, 15000);
      if (!silent || queueRef.current.length === 0) {
        setError('Não foi possível carregar os pedidos agora. Tentando reconectar...');
      }
    } finally {
      queueRequestInFlightRef.current = false;
      if (shouldShowLoading) {
        setLoading(false);
      }
    }
  }, [QUEUE_POLL_VISIBLE_MS, storeIdentifier]);

  const loadHistory = useCallback(async ({ silent = true }: { silent?: boolean } = {}) => {
    if (!storeIdentifier) return;
    if (historyRequestInFlightRef.current) return;

    const shouldShowHistoryLoading = !silent || historyOrdersRef.current.length === 0;
    if (shouldShowHistoryLoading) {
      setHistoryLoading(true);
    }
    historyRequestInFlightRef.current = true;
    try {
      const data = await orderService.fetchAll(storeIdentifier, {
        ...salesHistoryWindow,
        statuses: [ 'done', 'delivered', 'finished', 'cancelled' ],
      });
      setHistoryOrders(Array.isArray(data) ? data : []);
      if (!silent) {
        setError('');
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de pedidos', err);
      if (!silent) {
        setError('Não foi possível carregar o histórico de vendas agora.');
      }
    } finally {
      historyRequestInFlightRef.current = false;
      if (shouldShowHistoryLoading) {
        setHistoryLoading(false);
      }
    }
  }, [salesHistoryWindow, storeIdentifier]);

  const scheduleQueuePoll = useCallback((immediate = false, elapsedMs = 0) => {
    clearQueuePollTimer();
    const baseDelay =
      typeof document !== 'undefined' && document.visibilityState === 'visible'
        ? queueRetryDelayRef.current
        : Math.max(queueRetryDelayRef.current, QUEUE_POLL_HIDDEN_MS);
    const delay = immediate ? 0 : Math.max(250, baseDelay - elapsedMs);

    queuePollTimerRef.current = window.setTimeout(async () => {
      const startedAt = Date.now();
      await loadQueue({ silent: true });
      scheduleQueuePoll(false, Date.now() - startedAt);
    }, delay);
  }, [QUEUE_POLL_HIDDEN_MS, clearQueuePollTimer, loadQueue]);

  const scheduleHistoryPoll = useCallback((immediate = false) => {
    clearHistoryPollTimer();
    const delay = immediate
      ? 0
      : (
          typeof document !== 'undefined' && document.visibilityState === 'visible'
            ? HISTORY_POLL_VISIBLE_MS
            : HISTORY_POLL_HIDDEN_MS
        );

    historyPollTimerRef.current = window.setTimeout(async () => {
      await loadHistory({ silent: true });
      scheduleHistoryPoll(false);
    }, delay);
  }, [HISTORY_POLL_HIDDEN_MS, HISTORY_POLL_VISIBLE_MS, clearHistoryPollTimer, loadHistory]);

  const handleManualRefresh = useCallback(async () => {
    if (queueRequestInFlightRef.current) return;
    setIsPullRefreshing(true);
    try {
      const refreshTasks = [loadQueue({ silent: true })];
      if (activeTab === 'completed') {
        refreshTasks.push(loadHistory({ silent: true }));
      }
      await Promise.all(refreshTasks);
      scheduleQueuePoll(false);
      if (activeTab === 'completed') {
        scheduleHistoryPoll(false);
      } else {
        clearHistoryPollTimer();
      }
    } finally {
      setIsPullRefreshing(false);
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [activeTab, clearHistoryPollTimer, loadHistory, loadQueue, scheduleHistoryPoll, scheduleQueuePoll]);

  useEffect(() => {
    if (!storeIdentifier) return;
    void loadQueue();
    scheduleQueuePoll(false);
    const handleFocusRefresh = () => {
      void loadQueue({ silent: true });
      scheduleQueuePoll(false);
    };
    const handleVisibilityRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadQueue({ silent: true });
        scheduleQueuePoll(false);
      }
    };
    window.addEventListener('focus', handleFocusRefresh);
    window.addEventListener('pageshow', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    const unsubProducts = productService.subscribe(setProducts);

    return () => {
      clearQueuePollTimer();
      window.removeEventListener('focus', handleFocusRefresh);
      window.removeEventListener('pageshow', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      unsubProducts();
    };
  }, [
    clearQueuePollTimer,
    loadQueue,
    scheduleQueuePoll,
    storeIdentifier,
  ]);

  useEffect(() => {
    if (!storeIdentifier || activeTab !== 'completed') {
      clearHistoryPollTimer();
      return;
    }
    void loadHistory({ silent: true });
    scheduleHistoryPoll(false);
    const handleFocusRefresh = () => {
      void loadHistory({ silent: true });
      scheduleHistoryPoll(false);
    };
    const handleVisibilityRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadHistory({ silent: true });
        scheduleHistoryPoll(false);
      }
    };
    window.addEventListener('focus', handleFocusRefresh);
    window.addEventListener('pageshow', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    return () => {
      clearHistoryPollTimer();
      window.removeEventListener('focus', handleFocusRefresh);
      window.removeEventListener('pageshow', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [
    activeTab,
    clearHistoryPollTimer,
    loadHistory,
    scheduleHistoryPoll,
    storeIdentifier,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const openStatuses = new Set([
      'pending',
      'preparing',
      'ready',
      'ready_for_delivery',
      'waiting_for_motoboy',
      'in_delivery',
      'dispatched',
    ]);
    const openCount = (Array.isArray(queue) ? queue : []).filter((order: any) => {
      const st = String(order?.status || '').toLowerCase();
      return openStatuses.has(st);
    }).length;
    window.dispatchEvent(
      new CustomEvent('admin:queue-count', {
        detail: { openCount },
      })
    );
  }, [queue]);

  useEffect(() => {
    localStorage.setItem("queueSoundEnabled", String(soundEnabled));
    if (!soundEnabled) return;

    const unlock = () => {
      ensureAudioContext().catch(() => {});
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [soundEnabled]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (tvMode || isPullRefreshing) return;
    if ((window.innerWidth || 0) >= 1024) return;
    if ((window.scrollY || 0) > 4) return;
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullActiveRef.current = pullStartYRef.current != null;
    pullDistanceRef.current = 0;
  }, [isPullRefreshing, tvMode]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!pullActiveRef.current || pullStartYRef.current == null) return;
    if ((window.scrollY || 0) > 4) {
      pullActiveRef.current = false;
      pullStartYRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
    const delta = Math.max(0, currentY - pullStartYRef.current);
    if (delta <= 0) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    const resisted = Math.min(96, Math.round(Math.pow(delta, 0.9)));
    pullDistanceRef.current = resisted;
    setPullDistance(resisted);
    event.preventDefault();
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!pullActiveRef.current) return;
    const shouldRefresh = pullDistanceRef.current >= 68;
    pullActiveRef.current = false;
    pullStartYRef.current = null;
    if (shouldRefresh) {
      void handleManualRefresh();
      return;
    }
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, [handleManualRefresh]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvance = async (orderId, status, payload?: { reason?: string }) => {
    const previousQueue = queue;
    try {
      setUpdating(orderId);
      // Mantém visão panorâmica após qualquer ação.
      setQueueFilter('all');
      // Atualização otimista para o pedido sumir/andar imediatamente na UI.
      setQueue((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order
        )
      );
      setSelectedOrder((prev: any) =>
        prev?.id === orderId
          ? {
              ...prev,
              status,
            }
          : prev
      );
      await orderService.updateStatus(orderId, status, payload);
      setError('');
      // Não bloqueia a UI aguardando a recarga total da fila.
      void loadQueue();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar status', err);
      setQueue(previousQueue);
      setError('Não foi possível atualizar o status agora. Tente novamente.');
      return false;
    } finally {
      setUpdating(null);
    }
  };

  const openCancelOrderModal = (order: any) => {
    setCancelOrderModal({
      open: true,
      order,
      reason: '',
      loading: false,
      error: '',
    });
  };

  const closeCancelOrderModal = () => {
    if (cancelOrderModal.loading) return;
    setCancelOrderModal({
      open: false,
      order: null,
      reason: '',
      loading: false,
      error: '',
    });
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderModal.order?.id) return;
    const reason = String(cancelOrderModal.reason || '').trim();
    if (!reason) {
      setCancelOrderModal((prev) => ({ ...prev, error: 'Informe o motivo do cancelamento.' }));
      return;
    }
    setCancelOrderModal((prev) => ({ ...prev, loading: true, error: '' }));
    const success = await handleAdvance(cancelOrderModal.order.id, 'cancelled', { reason });
    if (success) {
      setSelectedOrder((prev: any) => (prev?.id === cancelOrderModal.order?.id ? null : prev));
      setCancelOrderModal({
        open: false,
        order: null,
        reason: '',
        loading: false,
        error: '',
      });
    } else {
      setCancelOrderModal((prev) => ({ ...prev, loading: false, error: 'Não foi possível cancelar o pedido agora.' }));
    }
  };

  const openPaymentConfirm = (order, opts?: { alreadyPaid?: boolean }) => {
    setCashConfirmValue('');
    setConfirmModal({
      id: order.id,
      customerName: order.customerName || order.name || 'Cliente',
      total: order.total || 0,
      table: order.table || null,
      payment: order.payment,
      phone: order.phone || '',
      pixKey: storePixKey,
      isPostal: isPostalOrder(order),
      alreadyPaid: opts?.alreadyPaid === true,
    });
  };

  useEffect(() => {
    if (!confirmModal) return;
    setPixCopied(false);
  }, [confirmModal]);

  const handleConfirmPaid = async () => {
    if (!confirmModal?.id) return;
    const success = await handleAdvance(confirmModal.id, confirmModal?.isPostal ? 'finished' : 'done');
    if (success) {
      setConfirmModal(null);
      setSelectedOrder(null);
    }
  };

  const handlePostalMarkPosted = async (order: any) => {
    if (!order?.id) return false;
    const currentCode = String(order?.shipment?.trackingCode || '').trim();
    const trackingCode = String(window.prompt('Código de rastreio:', currentCode) || '').trim();
    if (!trackingCode) return false;

    const previousQueue = queue;
    try {
      setUpdating(order.id);
      setQueueFilter('all');
      setQueue((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: 'dispatched',
                shipment: {
                  ...(item.shipment || {}),
                  trackingCode,
                  shipmentStatus: 'posted',
                },
              }
            : item
        )
      );
      setSelectedOrder((prev: any) =>
        prev?.id === order.id
          ? {
              ...prev,
              status: 'dispatched',
              shipment: {
                ...(prev.shipment || {}),
                trackingCode,
                shipmentStatus: 'posted',
              },
            }
          : prev
      );
      await orderService.updatePostalShipment(order.id, { trackingCode, markPosted: true });
      setError('');
      void loadQueue();
      return true;
    } catch (err) {
      console.error('Erro ao registrar postagem', err);
      setQueue(previousQueue);
      setError('Não foi possível registrar rastreio agora. Tente novamente.');
      return false;
    } finally {
      setUpdating(null);
    }
  };

  const openReopenModal = (order: any) => {
    setReopenModal({
      open: true,
      order,
      reason: '',
      adminIdentifier: '',
      adminPassword: '',
      loading: false,
      error: '',
    });
  };

  const closeReopenModal = () => {
    if (reopenModal.loading) return;
    setReopenModal((prev) => ({
      ...prev,
      open: false,
      order: null,
      reason: '',
      adminIdentifier: '',
      adminPassword: '',
      error: '',
    }));
  };

  const handleConfirmReopen = async () => {
    const targetOrder = reopenModal.order;
    if (!targetOrder?.id || reopenModal.loading) return;

    if (!isAdminUser) {
      const idf = String(reopenModal.adminIdentifier || '').trim();
      const pwd = String(reopenModal.adminPassword || '').trim();
      if (!idf || !pwd) {
        setReopenModal((prev) => ({ ...prev, error: 'Informe usuário/e-mail e senha do admin.' }));
        return;
      }
    }

    setReopenModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const reopened = await orderService.reopenOrder(targetOrder.id, {
        reason: reopenModal.reason,
        adminIdentifier: isAdminUser ? undefined : reopenModal.adminIdentifier,
        adminPassword: isAdminUser ? undefined : reopenModal.adminPassword,
      });
      const normalized = reopened ? ({ ...reopened, createdAt: reopened.createdAt ? new Date(reopened.createdAt).getTime() : Date.now() }) : null;
      if (normalized?.id) {
        setQueue((prev) => [ normalized, ...prev.filter((order) => String(order.id) !== String(normalized.id)) ]);
      }
      setEditingFinalizedOrder(true);
      if (normalized?.id) {
        setSelectedOrder(normalized);
      }
      closeReopenModal();
      setError('');
      void loadQueue();
    } catch (err: any) {
      const backendMessage = String(err?.details?.message || err?.message || '').trim();
      setReopenModal((prev) => ({
        ...prev,
        error: backendMessage || 'Não foi possível reabrir este pedido agora.',
      }));
    } finally {
      setReopenModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const openFinalizeAllReadyModal = () => {
    if (bulkFinishing || !selectedBulkOrders.length) return;
    setBulkFinalizeModalOpen(true);
  };

  const handleFinalizeAllReady = async () => {
    if (bulkFinishing) return;
    const targetOrders = selectedBulkOrders;
    if (!targetOrders.length) return;

    setBulkFinishing(true);
    setBulkFinalizeModalOpen(false);
    setError('');
    const targetIds = new Set(targetOrders.map((order) => String(order.id)));
    const previousQueue = queue;

    setQueue((prev) =>
      prev.map((order) =>
        targetIds.has(String(order.id))
          ? {
              ...order,
              status: 'done',
            }
          : order
      )
    );
    setConfirmModal((prev) => (prev && targetIds.has(String(prev.id)) ? null : prev));
    setSelectedOrder((prev: any) => (prev && targetIds.has(String(prev.id)) ? null : prev));

    try {
      const results = await Promise.allSettled(
        targetOrders.map((order) => orderService.updateStatus(order.id, isPostalOrder(order) ? 'finished' : 'done'))
      );
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        setQueue(previousQueue);
        setError(
          failedCount === targetOrders.length
            ? 'Não foi possível finalizar os pedidos agora. Tente novamente.'
            : `${failedCount} pedido(s) falharam ao finalizar. Atualize a fila.`
        );
      } else {
        setError('');
        setSelectedOrderIds([]);
      }
    } catch (error) {
      setQueue(previousQueue);
      setError('Falha ao finalizar pedidos em lote. Tente novamente.');
    } finally {
      setBulkFinishing(false);
      void loadQueue();
    }
  };

  const canQuickFinalizeOrder = (order: any) => {
    const normalized = String(order?.status || '').toLowerCase();
    if (!normalized) return false;
    if ([ 'done', 'delivered', 'finished', 'cancelled', 'in_delivery' ].includes(normalized)) return false;
    if (isPostalOrder(order) && [ 'pending', 'preparing', 'ready' ].includes(normalized)) return false;
    return true;
  };

  const openQuickFinalizeModal = (order: any) => {
    if (!canQuickFinalizeOrder(order) || quickFinalizeModal.loading) return;
    setQuickFinalizeModal({
      open: true,
      order,
      loading: false,
    });
  };

  const closeQuickFinalizeModal = () => {
    if (quickFinalizeModal.loading) return;
    setQuickFinalizeModal({
      open: false,
      order: null,
      loading: false,
    });
  };

  const handleQuickFinalize = async () => {
    const order = quickFinalizeModal.order;
    if (!order?.id || quickFinalizeModal.loading) return;
    setQuickFinalizeModal((prev) => ({ ...prev, loading: true }));
    try {
      const targetStatus = isPostalOrder(order) ? 'finished' : 'done';
      const success = await handleAdvance(order.id, targetStatus);
      if (success) {
        setQuickFinalizeModal({ open: false, order: null, loading: false });
        setSelectedOrder((prev: any) => (prev?.id === order.id ? null : prev));
      } else {
        setQuickFinalizeModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      setQuickFinalizeModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const applyItemsChange = async (orderId, updater) => {
    const targetOrder = queue.find((entry) => entry.id === orderId);
    const baseItems = getOrderedItems(orderId, targetOrder?.items || []);
    const updatedItems = updater(baseItems);

    const sanitizedItems = updatedItems.filter((item) => item.qty > 0);
    ensureOrderIndex(orderId, sanitizedItems);

    const nextTotal = sanitizedItems.reduce(
      (sum, item) => sum + (item.unitPrice ?? item.price ?? 0) * item.qty,
      0
    );

    if (sanitizedItems.length === 0) {
      setQueue((prev) => prev.filter((order) => order.id !== orderId));
      setSelectedOrder((prev: any) => (prev?.id === orderId ? null : prev));
    } else {
      setQueue((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, items: sanitizedItems, total: nextTotal } : order
        )
      );
      setSelectedOrder((prev: any) =>
        prev?.id === orderId
          ? {
              ...prev,
              items: sanitizedItems,
              total: nextTotal,
            }
          : prev
      );
    }

    try {
      await orderService.updateItems(orderId, sanitizedItems, nextTotal);
      if (sanitizedItems.length === 0) {
        await orderService.updateStatus(orderId, 'cancelled');
      }
      setError('');
      // Sincroniza em background sem atrasar feedback local.
      void loadQueue();
    } catch (err) {
      console.error('Erro ao atualizar itens', err);
      setError('Não foi possível atualizar os itens agora. Atualize a fila.');
    }
  };

  const handleQuantityChange = (orderId, itemId, delta) => {
    applyItemsChange(orderId, (items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              qty: Math.max(0, item.qty + delta),
              isPrinted: delta > 0 ? false : Boolean(item.isPrinted),
            }
          : item
      )
    );
  };

  const removeVisualOrderItemGroup = (orderId: any, group: any) => {
    const itemIds = group?.itemIds || new Set<string>();
    const groupKey = group?.groupKey;
    applyItemsChange(orderId, (items: any[]) =>
      items.filter((item: any) => {
        const itemId = String(item?.id || "").trim();
        if (itemId && itemIds.has(itemId)) return false;
        return groupKey ? getVisualOrderItemGroupKey(item) !== groupKey : true;
      })
    );
  };

  const buildOrderItemFromProduct = (product: any, options: any = {}) => {
    const quantity = Math.max(1, Math.floor(Number(options.quantity || 1)));
    const unitPrice = Number(options.unitPriceOverride ?? product?.price ?? 0);
    return {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      product,
      name: product.name,
      category: product.category,
      price: unitPrice,
      unitPrice,
      unitPriceOverride: unitPrice,
      qty: quantity,
      isPrinted: false,
    };
  };

  const findOperationalProduct = (name: string, price: number, category: string, anyPrice = false) => {
    const normalizedName = normalizeTableText(name);
    const normalizedCategory = normalizeTableText(category);
    const targetPrice = Number(price || 0).toFixed(2);
    return (products || []).find((product: any) => {
      const sameName = normalizeTableText(product?.name) === normalizedName;
      const sameCategory = normalizeTableText(product?.category) === normalizedCategory;
      const samePrice = Number(product?.price || 0).toFixed(2) === targetPrice;
      return sameName && sameCategory && (anyPrice || samePrice);
    });
  };

  const ensureOperationalProduct = async ({
    name,
    price,
    category = MANUAL_ITEM_CATEGORY,
    description = "Item operacional criado no atendimento",
    anyPrice = false,
  }: {
    name: string;
    price: number;
    category?: string;
    description?: string;
    anyPrice?: boolean;
  }) => {
    const existing = findOperationalProduct(name, price, category, anyPrice);
    if (existing?.id) return existing;

    const createdProduct = await productService.save({
      name,
      price,
      category,
      description,
      active: false,
    });

    if (!createdProduct?.id) {
      throw new Error("Não foi possível criar o item operacional.");
    }

    setProducts((prev: any[]) => [createdProduct, ...prev.filter((p: any) => String(p.id) !== String(createdProduct.id))]);
    return createdProduct;
  };

  const handleAddItem = (orderId, forcedProductId?: string, options: any = {}) => {
    const productId = forcedProductId || selectedProducts[orderId];
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return;

    applyItemsChange(orderId, (items) => {
      return [
        ...items,
        buildOrderItemFromProduct(product, options),
      ];
    });
  };

  const openCatalogPicker = (orderId: string, initialQuery = "") => {
    setCatalogPickerModal({
      open: true,
      orderId,
      query: String(initialQuery || "").trim(),
    });
  };

  const closeManualItemModal = () => {
    setManualItemModal({
      open: false,
      orderId: null,
      name: "",
      price: "",
      quantity: "1",
      category: MANUAL_ITEM_CATEGORY,
      title: "Adicionar item avulso",
      helper: "Use para bala, cobrança extra ou algo fora do cardápio.",
      quantityLabel: "Quantidade",
      ctaLabel: "Salvar e incluir",
      loading: false,
      error: "",
    });
  };

  const openManualItemModal = (orderId: string, initialName = "", options: any = {}) => {
    setManualItemModal({
      open: true,
      orderId,
      name: String(options.name ?? initialName ?? "").trim(),
      price: options.price !== undefined ? String(options.price) : "",
      quantity: options.quantity !== undefined ? String(options.quantity) : "1",
      category: options.category || MANUAL_ITEM_CATEGORY,
      title: options.title || "Adicionar item avulso",
      helper: options.helper || "Use para bala, cobrança extra ou algo fora do cardápio.",
      quantityLabel: options.quantityLabel || "Quantidade",
      ctaLabel: options.ctaLabel || "Salvar e incluir",
      loading: false,
      error: "",
    });
  };

  const handleCreateManualItem = async () => {
    if (!manualItemModal.orderId || manualItemModal.loading) return;
    const name = String(manualItemModal.name || "").trim();
    const price = Number(String(manualItemModal.price || "").replace(",", "."));
    const quantity = Math.max(1, Math.floor(Number(String(manualItemModal.quantity || "1").replace(",", "."))));
    const category = String(manualItemModal.category || MANUAL_ITEM_CATEGORY).trim() || MANUAL_ITEM_CATEGORY;

    if (!name) {
      setManualItemModal((prev) => ({ ...prev, error: "Informe o nome do item." }));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setManualItemModal((prev) => ({ ...prev, error: "Informe um valor válido." }));
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setManualItemModal((prev) => ({ ...prev, error: "Informe uma quantidade válida." }));
      return;
    }

    setManualItemModal((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const nextProduct = await ensureOperationalProduct({
        name,
        price,
        category,
        description:
          category === TABLE_SERVICE_CATEGORY
            ? "Item operacional de atendimento na mesa"
            : "Item avulso criado no atendimento",
      });

      if (!nextProduct?.id || String(nextProduct.id).startsWith("manual-")) {
        setManualItemModal((prev) => ({
          ...prev,
          loading: false,
          error: "Não foi possível criar o item no catálogo. Tente novamente.",
        }));
        return;
      }

      setSelectedProducts((prev: any) => ({ ...prev, [manualItemModal.orderId as string]: nextProduct.id }));
      const updatePromise = applyItemsChange(manualItemModal.orderId, (items) => [
        ...items,
        buildOrderItemFromProduct(nextProduct, { quantity, unitPriceOverride: price }),
      ]);
      closeManualItemModal();
      await updatePromise;
    } catch (err: any) {
      setManualItemModal((prev) => ({
        ...prev,
        loading: false,
        error: String(err?.message || "Falha ao criar item avulso."),
      }));
    }
  };

  const openCouvertModal = (order: any) => {
    if (!isTableOrder(order)) return;
    const price = Number(tableServiceSettings.couvertPrice || 0);
    if (!tableServiceSettings.couvertEnabled || price <= 0) {
      setError("Configure o valor do couvert em Tipos de pedido.");
      return;
    }
    openManualItemModal(String(order.id), tableServiceSettings.couvertLabel, {
      name: tableServiceSettings.couvertLabel,
      price,
      quantity: 1,
      category: TABLE_SERVICE_CATEGORY,
      title: "Adicionar couvert",
      helper: "Informe quantas pessoas estão na mesa. O valor entra como item do pedido e sai na impressão.",
      quantityLabel: "Pessoas na mesa",
      ctaLabel: "Adicionar couvert",
    });
  };

  const handleApplyServiceCharge = async (order: any) => {
    if (!isTableOrder(order) || !tableServiceSettings.serviceChargeEnabled) return;
    if (!order?.id) return;
    const label = tableServiceSettings.serviceChargeLabel || "Taxa de serviço";
    const { subtotal, amount } = calculateTableServiceCharge(
      order?.items || [],
      tableServiceSettings.serviceChargePercent,
      (item) => isTableServiceOrderItem(item, productsById)
    );
    if (subtotal <= 0 || amount <= 0) {
      setError("Inclua itens na mesa antes de aplicar a taxa de serviço.");
      return;
    }

    setUpdating(order.id);
    try {
      const product = await ensureOperationalProduct({
        name: label,
        price: amount,
        category: TABLE_SERVICE_CATEGORY,
        description: "Item operacional de taxa de serviço",
        anyPrice: true,
      });
      const normalizedLabel = normalizeTableText(label);
      const nextItem = buildOrderItemFromProduct(product, { quantity: 1, unitPriceOverride: amount });

      await applyItemsChange(order.id, (items) => [
        ...items.filter((item: any) => {
          const sameServiceItem =
            isTableServiceOrderItem(item, productsById) &&
            normalizeTableText(item?.name || item?.product?.name) === normalizedLabel;
          return !sameServiceItem;
        }),
        nextItem,
      ]);
      setError(`Taxa de serviço aplicada sobre ${formatCurrency(subtotal)}.`);
    } catch (err: any) {
      setError(String(err?.message || "Não foi possível aplicar a taxa de serviço."));
    } finally {
      setUpdating(null);
    }
  };

  const elapsedTime = useMemo(
    () =>
      queue.reduce(
        (acc, order) => ({
          ...acc,
          [order.id]: (() => {
            const status = String(order?.status || '').toLowerCase();
            const isFinal = status === 'done' || status === 'delivered' || status === 'finished';
            const createdAt = Number(order?.createdAt || 0);
            if (!createdAt) return '0s';
            if (isFinal) {
              const updatedAt = Number(order?.updatedAt || createdAt);
              const totalMs = Math.max(0, updatedAt - createdAt);
              return formatDuration(totalMs);
            }
            return formatDuration(Math.max(0, currentTime - createdAt));
          })(),
        }),
        {}
      ),
    [currentTime, queue]
  );

  const productionQueue = useMemo(() => {
    const statuses = new Set([ 'pending', 'preparing', 'ready' ]);
    return [...queue]
      .filter((order) => statuses.has(order.status))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queue]);

  const inRouteQueue = useMemo(() => {
    const routeStatuses = new Set([ 'in_delivery', 'dispatched' ]);
    return [...queue]
      .filter((order) => routeStatuses.has(String(order?.status || '').toLowerCase()))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queue]);

  const completedOrders = useMemo(() => {
    const completedStatuses = new Set([ 'done', 'delivered', 'finished', 'cancelled' ]);
    return [...historyOrders]
      .filter((order) => completedStatuses.has(String(order?.status || '').toLowerCase()))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [historyOrders]);
  const completedToday = useMemo(() => {
    const todayKey = getNowKeyInSaoPaulo();
    return completedOrders.filter((order) => getDayKeyInSaoPaulo(order.createdAt) === todayKey);
  }, [completedOrders]);
  const reportCompleted = useMemo(() => {
    const todayKey = getNowKeyInSaoPaulo();
    const yesterdayKey = getDayKeyInSaoPaulo(Date.now() - 24 * 60 * 60 * 1000);
    if (reportRange === 'today') {
      return completedOrders.filter((order) => getDayKeyInSaoPaulo(order.createdAt) === todayKey);
    }
    if (reportRange === 'yesterday') {
      return completedOrders.filter((order) => getDayKeyInSaoPaulo(order.createdAt) === yesterdayKey);
    }
    if (reportRange === 'last7') {
      const startMs = Date.now() - 6 * 24 * 60 * 60 * 1000;
      return completedOrders.filter((order) => Number(order.createdAt || 0) >= startMs);
    }
    const from = reportFrom || todayKey;
    const to = reportTo || from;
    return completedOrders.filter((order) => {
      const key = getDayKeyInSaoPaulo(order.createdAt);
      return key >= from && key <= to;
    });
  }, [completedOrders, reportRange, reportFrom, reportTo]);
  const reportSummary = useMemo(() => {
    const totals = reportCompleted.reduce(
      (acc, order) => {
        const status = String(order?.status || '').toLowerCase();
        const isRevenueStatus = status === 'done' || status === 'delivered' || status === 'finished';
        const { total, fee } = calcMoney(order);
        if (isRevenueStatus) {
          acc.sales += Number.isFinite(total) ? total : 0;
          acc.deliveryFees += Number.isFinite(fee) ? fee : 0;
          acc.items += (order?.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);
        }
        const bucket = resolvePaymentBucket(order?.payment);
        if (isRevenueStatus) {
          acc[bucket] += Number.isFinite(total) ? total : 0;
        }
        return acc;
      },
      { sales: 0, deliveryFees: 0, items: 0, pix: 0, cash: 0, card: 0 }
    );
    const ordersCount = reportCompleted.length;
    const averageTicket = ordersCount > 0 ? totals.sales / ordersCount : 0;
    return {
      ordersCount,
      sales: totals.sales,
      deliveryFees: totals.deliveryFees,
      averageTicket,
      itemsCount: totals.items,
      pix: totals.pix,
      cash: totals.cash,
      card: totals.card,
    };
  }, [reportCompleted]);
  const soldItemsBreakdown = useMemo(() => {
    const byName = new Map<string, { name: string; qty: number }>();
    for (const order of reportCompleted) {
      const status = String(order?.status || '').toLowerCase();
      const isRevenueStatus = status === 'done' || status === 'delivered' || status === 'finished';
      if (!isRevenueStatus) continue;

      const items = Array.isArray(order?.items) ? order.items : [];
      for (const item of items) {
        const name = String(item?.name || item?.product?.name || '').trim() || 'Item';
        const qty = Number(item?.qty ?? item?.quantity ?? 0);
        if (!(qty > 0)) continue;
        const current = byName.get(name) || { name, qty: 0 };
        current.qty += qty;
        byName.set(name, current);
      }
    }

    return Array.from(byName.values()).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'pt-BR'));
  }, [reportCompleted]);
  const dailySalesSummary = useMemo(() => {
    const totals = completedToday.reduce(
      (acc, order) => {
        const status = String(order?.status || '').toLowerCase();
        const isRevenueStatus = status === 'done' || status === 'delivered' || status === 'finished';
        const { total } = calcMoney(order);
        const amount = Number.isFinite(total) ? total : 0;
        const bucket = resolvePaymentBucket(order?.payment);
        if (isRevenueStatus) {
          acc.total += amount;
        }
        acc.orders += 1;
        if (isRevenueStatus) {
          acc[bucket] += amount;
        }
        return acc;
      },
      { total: 0, orders: 0, pix: 0, cash: 0, card: 0 }
    );
    return totals;
  }, [completedToday]);
  const salesVsYesterday = useMemo(() => {
    const completedStatuses = new Set([ 'done', 'delivered', 'finished' ]);
    const now = Date.now();
    const yesterdayKey = getDayKeyInSaoPaulo(now - 24 * 60 * 60 * 1000);
    const currentMinutes = getMinutesInSaoPaulo(now);
    const yesterdayUntilNow = historyOrders
      .filter((order) => {
        if (!completedStatuses.has(order.status)) return false;
        if (getDayKeyInSaoPaulo(order.createdAt) !== yesterdayKey) return false;
        return getMinutesInSaoPaulo(order.createdAt) <= currentMinutes;
      })
      .reduce((sum, order) => {
        const { total } = calcMoney(order);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0);
    const today = Number(dailySalesSummary.total || 0);
    const delta = today - yesterdayUntilNow;
    const deltaPct = yesterdayUntilNow > 0 ? (delta / yesterdayUntilNow) * 100 : 0;
    return {
      yesterdayUntilNow,
      delta,
      deltaPct,
      positive: delta >= 0,
      hasBase: yesterdayUntilNow > 0,
    };
  }, [historyOrders, dailySalesSummary.total]);
  const reportComparison = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const toDateMs = (dateKey: string, endOfDay = false) => {
      const [year, month, day] = String(dateKey || '').split('-').map(Number);
      if (!year || !month || !day) return Date.now();
      const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
      return date.getTime();
    };
    let currentStart = 0;
    let currentEnd = Date.now();
    if (reportRange === 'today') {
      currentStart = toDateMs(getNowKeyInSaoPaulo());
    } else if (reportRange === 'yesterday') {
      const key = getDayKeyInSaoPaulo(Date.now() - oneDay);
      currentStart = toDateMs(key);
      currentEnd = toDateMs(key, true);
    } else if (reportRange === 'last7') {
      currentStart = Date.now() - 6 * oneDay;
    } else {
      currentStart = toDateMs(reportFrom || getNowKeyInSaoPaulo());
      currentEnd = toDateMs(reportTo || reportFrom || getNowKeyInSaoPaulo(), true);
    }
    const span = Math.max(oneDay, currentEnd - currentStart + 1);
    const prevEnd = currentStart - 1;
    const prevStart = prevEnd - span + 1;
    const previousSales = completedOrders
      .filter((order) => {
        const createdAt = Number(order?.createdAt || 0);
        return createdAt >= prevStart && createdAt <= prevEnd;
      })
      .reduce((sum, order) => {
        const { total } = calcMoney(order);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0);
    const currentSales = Number(reportSummary.sales || 0);
    const delta = currentSales - previousSales;
    const deltaPct = previousSales > 0 ? (delta / previousSales) * 100 : 0;
    return {
      previousSales,
      currentSales,
      delta,
      deltaPct,
      positive: delta >= 0,
      hasBase: previousSales > 0,
    };
  }, [reportRange, reportFrom, reportTo, completedOrders, reportSummary.sales]);
  const handleExportSalesCsv = () => {
    const headers = [ 'Data', 'Pedido', 'Cliente', 'Tipo', 'Pagamento', 'Itens', 'Total' ];
    const rows = reportCompleted.map((order: any) => {
      const created = Number(order?.createdAt || 0);
      const dateLabel = created
        ? new Date(created).toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ })
        : '';
      const itemsLabel = Array.isArray(order?.items)
        ? order.items
            .map((item: any) => {
              const qty = Number(item?.qty ?? item?.quantity ?? 0);
              const name = String(item?.name || item?.product?.name || 'Item');
              return `${qty}x ${name}`;
            })
            .join(' | ')
        : '';
      return [
        dateLabel,
        formatOrderDisplayId(order?.id, storeSlug),
        order?.customerName || order?.name || '',
        formatOrderType(order?.type),
        getPaymentMethodMeta(order?.payment)?.label || formatOrderType(order?.payment),
        itemsLabel,
        Number(order?.total || 0),
      ];
    });
    exportToCsv(`vendas-${storeSlug || 'loja'}-${getNowKeyInSaoPaulo()}.csv`, headers, rows);
  };
  const handlePrintDailySummary = async () => {
    if (isPrintingDaySummary) return;
    const nowLabel = new Date().toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ });
    const dayLabel = new Date().toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ });
    const totalOrders = Number(dailySalesSummary.orders || 0);
    setIsPrintingDaySummary(true);
    try {
      await printReceiptAsImage({
        storeName: (storeNameForPrint || 'Minha Loja').toUpperCase(),
        platformName: 'Já no Caminho',
        queueLabel: 'FECHAMENTO DO DIA',
        orderLabel: dayLabel,
        customerLabel: 'Resumo operacional',
        tableLabel: '',
        dateLabel: nowLabel,
        items: [
          { quantity: 1, name: `Total de pedidos: ${totalOrders}`, lineTotal: '' },
          { quantity: 1, name: 'Pix', lineTotal: formatCurrency(dailySalesSummary.pix) },
          { quantity: 1, name: 'Dinheiro', lineTotal: formatCurrency(dailySalesSummary.cash) },
          { quantity: 1, name: 'Cartão', lineTotal: formatCurrency(dailySalesSummary.card) },
        ],
        totalLabel: formatCurrency(dailySalesSummary.total),
      });
      setError('Fechamento enviado para impressão.');
    } catch (printError) {
      console.error('[print] erro ao imprimir fechamento', printError);
      setError('Falha ao imprimir fechamento do dia.');
    } finally {
      setIsPrintingDaySummary(false);
    }
  };
  const completedTotalPages = Math.max(1, Math.ceil(reportCompleted.length / completedPageSize));
  const pagedCompleted = useMemo(() => {
    const start = (completedPage - 1) * completedPageSize;
    return reportCompleted.slice(start, start + completedPageSize);
  }, [reportCompleted, completedPage]);

  const normalizeQueueStage = (order: any) => {
    const status = String(order?.status || '').toLowerCase();
    const type = String(order?.type || '').toLowerCase();
    if (status === 'pending') return 'pending';
    if (status === 'preparing') return 'preparing';
    if (status === 'ready') return 'ready';
    if (type === 'delivery' && !isPostalOrder(order) && (status === 'ready_for_delivery' || status === 'waiting_for_motoboy')) return 'ready';
    return status;
  };

  const queueMetrics = useMemo(() => {
    const now = Date.now();
    const withAges = productionQueue.map((order) => {
      const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : now;
      const ageMs = Math.max(0, now - createdAt);
      return { ...order, ageMs };
    });
    const pending = withAges.filter((o) => normalizeQueueStage(o) === 'pending').length;
    const preparing = withAges.filter((o) => normalizeQueueStage(o) === 'preparing').length;
    const ready = withAges.filter((o) => normalizeQueueStage(o) === 'ready').length;
    const activeStatuses = new Set([ 'pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ]);
    const condominium = queue.filter((o) => activeStatuses.has(String(o?.status || '').toLowerCase()) && isCondominiumOrder(o)).length;
    const late = withAges.filter((o) => o.ageMs > PREP_SLA_MS).length;
    const todayKey = getNowKeyInSaoPaulo();
    const cancelled = queue.filter((order) => {
      const status = String(order?.status || '').toLowerCase();
      return status === 'cancelled' && getDayKeyInSaoPaulo(order.createdAt) === todayKey;
    }).length;
    const avgMs =
      withAges.length > 0
        ? withAges.reduce((acc, cur) => acc + cur.ageMs, 0) / withAges.length
        : 0;
    const oldest = withAges.reduce((acc, cur) => (cur.ageMs > acc ? cur.ageMs : acc), 0);
    return { pending, preparing, ready, condominium, late, cancelled, avgMs, oldest };
  }, [productionQueue, queue, currentTime, PREP_SLA_MS]);

  const allActiveQueue = useMemo(() => {
    const activeStatuses = new Set([ 'pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ]);
    return [...queue]
      .filter((order) => activeStatuses.has(String(order?.status || '').toLowerCase()))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [queue]);
  const allTableGroups = useMemo(() => buildAdminTableGroups(allActiveQueue, ''), [allActiveQueue]);
  const visibleTableGroups = useMemo(() => buildAdminTableGroups(allActiveQueue, tableSearch), [allActiveQueue, tableSearch]);
  const selectedTableGroup = useMemo(
    () => allTableGroups.find((group) => group.tableKey === selectedTableNumber) || null,
    [allTableGroups, selectedTableNumber]
  );
  const filteredProductionQueue = useMemo(() => {
    if (queueFilter === 'all') return allActiveQueue;
    if (queueFilter === 'pending') return allActiveQueue.filter((order) => normalizeQueueStage(order) === 'pending');
    if (queueFilter === 'preparing') return allActiveQueue.filter((order) => normalizeQueueStage(order) === 'preparing');
    if (queueFilter === 'ready') {
      return allActiveQueue.filter((order) => normalizeQueueStage(order) === 'ready');
    }
    if (queueFilter === 'condominium') {
      return allActiveQueue.filter((order) => isCondominiumOrder(order));
    }
    if (queueFilter === 'late') {
      const now = Date.now();
      return allActiveQueue.filter((order) => {
        const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : now;
        const ageMs = Math.max(0, now - createdAt);
        return ageMs > PREP_SLA_MS;
      });
    }
    if (queueFilter === 'cancelled') {
      const todayKey = getNowKeyInSaoPaulo();
      return completedOrders.filter((order) => {
        const status = String(order?.status || '').toLowerCase();
        return status === 'cancelled' && getDayKeyInSaoPaulo(order.createdAt) === todayKey;
      });
    }
    return allActiveQueue;
  }, [allActiveQueue, completedOrders, queueFilter, currentTime, PREP_SLA_MS]);

  const bulkFinalizeCandidates = useMemo(() => {
    const merged = [ ...productionQueue ];
    const seen = new Set<string>();
    return merged.filter((order) => {
      const id = String(order?.id || '');
      if (!id || seen.has(id)) return false;
      if (!canQuickFinalizeOrder(order)) return false;
      seen.add(id);
      return true;
    });
  }, [productionQueue]);
  const selectedBulkOrders = useMemo(() => {
    if (!selectedOrderIds.length) return [];
    const selectedSet = new Set(selectedOrderIds.map((id) => String(id)));
    return bulkFinalizeCandidates.filter((order) => selectedSet.has(String(order?.id || '')));
  }, [bulkFinalizeCandidates, selectedOrderIds]);
  const selectedOrderRank = useMemo(() => {
    if (!selectedOrder?.id) return 1;
    const idx = filteredProductionQueue.findIndex((order) => order.id === selectedOrder.id);
    if (idx >= 0) return idx + 1;
    const activeIdx = allActiveQueue.findIndex((order) => order.id === selectedOrder.id);
    return activeIdx >= 0 ? activeIdx + 1 : 1;
  }, [allActiveQueue, filteredProductionQueue, selectedOrder?.id]);
  const drawerOrder = useMemo(() => {
    if (!selectedOrder?.id) return null;
    return queue.find((order) => order.id === selectedOrder.id) || selectedOrder;
  }, [queue, selectedOrder]);

  useEffect(() => {
    if (activeTab === 'completed') {
      setCompletedPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (forcedTab === 'queue' || forcedTab === 'inroute' || forcedTab === 'completed') {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  useEffect(() => {
    if (activeTab !== 'queue') {
      closeOrderOverlays();
      setSelectedOrderIds([]);
    }
  }, [activeTab]);

  useEffect(() => {
    if (queueViewMode === 'tables') {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedTableNumber(null);
  }, [queueViewMode]);

  useEffect(() => {
    if (!selectedOrderIds.length) return;
    const validIds = new Set(bulkFinalizeCandidates.map((order) => String(order?.id || '')));
    setSelectedOrderIds((prev) => prev.filter((id) => validIds.has(String(id))));
  }, [bulkFinalizeCandidates, selectedOrderIds.length]);

  useEffect(() => {
    if (!selectedOrder) return;
    const latest = queue.find((order) => order.id === selectedOrder.id);
    if (!latest) {
      closeOrderOverlays();
      return;
    }
    const latestStatus = String(latest.status || '').toLowerCase();
    const queueVisibleStatuses = new Set([ 'pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ]);

    if (activeTab === 'queue' && !queueVisibleStatuses.has(latestStatus)) {
      closeOrderOverlays();
      return;
    }

    const isFinal = latestStatus === 'done' || latestStatus === 'delivered' || latestStatus === 'finished';
    if ((isFinal && !editingFinalizedOrder) || latestStatus === 'cancelled') {
      closeOrderOverlays();
      return;
    }
    if (latest !== selectedOrder) {
      setSelectedOrder(latest);
    }
  }, [queue, selectedOrder, editingFinalizedOrder, activeTab]);
  useEffect(() => {
    setCompletedPage(1);
  }, [completedPageSize]);

  useEffect(() => {
    if (completedPage > completedTotalPages) {
      setCompletedPage(completedTotalPages);
    }
  }, [completedPage, completedTotalPages]);

  const getStatusStyles = (status, orderType, order?: any) => {
    const normalizedStatus = String(status || '').toLowerCase();
    const postal = isPostalOrder(order);
    if (normalizedStatus === "cancelled" || normalizedStatus === "rejected") {
      return { label: "Cancelado", className: "bg-rose-50 text-rose-700 border-rose-100" };
    }
    if (normalizedStatus === "done" || normalizedStatus === "delivered" || normalizedStatus === "finished") {
      const label = orderType === "delivery" ? "Finalizado" : "Finalizado";
      return { label, className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    if (normalizedStatus === "in_delivery") {
      return { label: "Em rota", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (orderType === "delivery" && normalizedStatus === "waiting_for_motoboy") {
      if (postal) {
        return { label: "Despachado", className: "bg-indigo-50 text-indigo-700 border-indigo-100" };
      }
      const deliveryStatus = String(order?.delivery?.status || '').toUpperCase();
      const hasAssignedMotoboy = Boolean(
        order?.delivery?.motoboy?.id ||
        order?.delivery?.motoboyId ||
        order?.delivery?.motoboy_id ||
        deliveryStatus === 'ACCEPTED'
      );
      if (hasAssignedMotoboy) {
        return { label: "Entregador a caminho", className: "bg-indigo-50 text-indigo-700 border-indigo-100" };
      }
      return { label: "Buscando entregador", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (orderType === "delivery" && normalizedStatus === "ready_for_delivery") {
      if (postal) {
        return { label: "Pronto para postagem", className: "bg-violet-50 text-violet-700 border-violet-100" };
      }
      return { label: "Pronto para entrega", className: "bg-violet-50 text-violet-700 border-violet-100" };
    }
    if (normalizedStatus === "preparing") {
      return { label: "Em Preparação", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (normalizedStatus === "ready") {
      const label =
        orderType === "delivery"
          ? (postal ? "Pronto para postagem" : "Pronto")
        : orderType === "pickup"
          ? "Pronto para retirada"
          : "Pronto";
      return { label, className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    return { label: "Aguardando", className: "bg-amber-50 text-amber-700 border-amber-100" };
  };
  const timelineStyles = {
    pending: { dot: "bg-amber-500", text: "text-amber-700" },
    preparing: { dot: "bg-sky-500", text: "text-sky-700" },
    ready: { dot: "bg-violet-500", text: "text-violet-700" },
    done: { dot: "bg-emerald-500", text: "text-emerald-700" },
    cancelled: { dot: "bg-rose-500", text: "text-rose-700" },
  };

  const renderFontAwesomeIcon = (iconClass: string) => (
    <i className={`fa-solid ${iconClass} text-[0.9em] leading-none`} aria-hidden="true" />
  );

  const getCouvertBreakdown = (source: any) => {
    const quantity = Math.max(0, Number(source?.qty ?? source?.quantity ?? 0));
    const unitPrice = Number(source?.unitPrice ?? source?.unitPriceOverride ?? source?.price ?? 0);
    const total = Number(source?.total ?? quantity * unitPrice);

    return {
      quantity,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      total: Number.isFinite(total) ? total : 0,
    };
  };

  const formatCouvertBreakdown = (source: any) => {
    const { quantity, unitPrice } = getCouvertBreakdown(source);
    if (quantity <= 0 || unitPrice <= 0) return "";
    const peopleLabel = quantity === 1 ? "pessoa" : "pessoas";
    return `${quantity} ${peopleLabel} x ${formatCurrency(unitPrice)} cada`;
  };

  const isCouvertServiceItem = (source: any) => {
    const label = String(source?.name || source?.product?.name || source?.primary?.name || source?.primary?.product?.name || "");
    return normalizeTableText(label) === normalizeTableText(tableServiceSettings.couvertLabel || "Couvert artístico");
  };

  const getManualCouvertPreview = () => {
    const isCouvertModal = isTableServiceCategory(manualItemModal.category) && isCouvertServiceItem(manualItemModal);
    if (!isCouvertModal) return null;

    const quantity = Math.max(
      1,
      Math.floor(Number(String(manualItemModal.quantity || "1").replace(",", ".")) || 1)
    );
    const unitPrice = Number(String(manualItemModal.price || "0").replace(",", "."));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;

    return {
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      peopleLabel: quantity === 1 ? "pessoa" : "pessoas",
    };
  };

  const renderDrawerFinancialSummary = (order: any) => {
    const { fee, total, itemsVolume } = calcMoney(order);
    const { activeCouvertGroup, activeServiceChargeGroup } = getOrderActiveTableServiceGroups(order);
    const activeAddons = [
      activeCouvertGroup
        ? {
            id: "couvert",
            label: activeCouvertGroup.name || "Couvert",
            detail: formatCouvertBreakdown(activeCouvertGroup),
            icon: "fa-music",
            group: activeCouvertGroup,
          }
        : null,
      activeServiceChargeGroup
        ? {
            id: "service",
            label: activeServiceChargeGroup.name || "Taxa de serviço",
            detail: tableServiceSettings.serviceChargePercent
              ? `${tableServiceSettings.serviceChargePercent}% sobre os itens da mesa`
              : "",
            icon: "fa-bell-concierge",
            group: activeServiceChargeGroup,
          }
        : null,
    ].filter(Boolean);

    return (
      <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/85 p-2.5 shadow-[0_12px_34px_-28px_rgba(15,23,42,0.45)]">
        {activeAddons.length ? (
          <div className="mb-2 space-y-1.5">
            {activeAddons.map((addon: any) => (
              <div
                key={addon.id}
                className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/80 bg-white px-3 py-2 text-xs shadow-sm"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FFF3E0] text-[#E65100]">
                  {renderFontAwesomeIcon(addon.icon)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black text-slate-700">{addon.label}</span>
                  {addon.detail ? (
                    <span className="mt-0.5 block text-[10px] font-bold leading-tight text-slate-500">
                      {addon.detail}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-black text-slate-900">
                  {formatCurrency(Number(addon.group?.total || 0))}
                </span>
                <button
                  type="button"
                  onClick={() => removeVisualOrderItemGroup(order.id, addon.group)}
                  disabled={updating === order.id}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                  aria-label={`Remover ${addon.label}`}
                  title={`Remover ${addon.label}`}
                >
                  <X size={13} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Total do pedido
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
              {itemsVolume} {itemsVolume === 1 ? "item" : "itens"}{fee > 0 ? ` + frete ${formatCurrency(fee)}` : ""}
            </p>
          </div>
          <strong className="shrink-0 text-lg font-black tracking-[-0.04em] text-emerald-700">
            {formatCurrency(total)}
          </strong>
        </div>
      </div>
    );
  };

  const renderOrderFooterActions = (order: any) => {
    const canCancelOrder = [ 'pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ].includes(
      String(order?.status || '').toLowerCase()
    );

    return (
    <div className="w-full space-y-3">
      {updating === order.id && (
        <div className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 inline-flex items-center gap-2">
          <ArrowsClockwise size={14} weight="duotone" className="animate-spin" />
          Atualizando pedido...
        </div>
      )}
      {order.status === "pending" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
            Clique em iniciar atendimento para começar.
          </div>
          <button
            onClick={() => { pulseCta(order.id + '-prep'); handleAdvance(order.id, "preparing"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-prep' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Clock size={16} weight="duotone" /> Iniciar atendimento
          </button>
        </div>
      )}

      {order.status === "preparing" && order.type === "delivery" && !isPostalOrder(order) && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1">
            Pedido pronto? Marque como pronto para chamar o entregador.
          </div>
          {activeMotoboysCount === 0 && (
            <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
              Nenhum entregador ativo. Ative um vínculo em “Entregadores”.
            </div>
          )}
          <button
            onClick={() => { pulseCta(order.id + '-ready'); handleAdvance(order.id, "ready_for_delivery"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-sky-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Marcar pronto
          </button>
        </div>
      )}


      {order.status === "preparing" && order.type === "delivery" && isPostalOrder(order) && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1">
            Pedido pronto para postagem.
          </div>
          <button
            onClick={() => { pulseCta(order.id + '-ready-postal'); handleAdvance(order.id, "ready"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready-postal' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-violet-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Pronto para postagem
          </button>
        </div>
      )}
      {order.status === "ready_for_delivery" && order.type === "delivery" && !isPostalOrder(order) && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            Pedido pronto. Chame o entregador para retirada.
          </div>
          {activeMotoboysCount === 0 && (
            <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
              Nenhum entregador ativo. Ative um vínculo em “Entregadores”.
            </div>
          )}
          <button
            onClick={() => { pulseCta(order.id + '-wait'); handleAdvance(order.id, "waiting_for_motoboy"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-wait' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Aguardar entregador
          </button>
        </div>
      )}

      {order.status === "preparing" && order.type !== "pickup" && order.type !== "delivery" && (
        <div className="w-full">
          <button
            onClick={() => { pulseCta(order.id + '-ready'); handleAdvance(order.id, "ready"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Marcar pronto
          </button>
        </div>
      )}

      {order.status === "preparing" && order.type === "pickup" && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1">
            Pedido pronto para retirada.
          </div>
          <button
            onClick={async () => {
              pulseCta(order.id + '-ready');
              await handleAdvance(order.id, "ready");
            }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-ready' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-sky-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Pronto p/ retirada
          </button>
        </div>
      )}

      {order.status === "ready" && !isPostalOrder(order) && (() => {
        const alreadyPaid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
        return (
          <div className="w-full">
            <div className="mb-2 text-[11px] font-semibold border rounded-lg px-2.5 py-1 text-emerald-700 bg-emerald-50 border-emerald-100">
              {alreadyPaid
                ? "Pagamento confirmado. Confirme quando o cliente retirar."
                : order.type === "delivery"
                ? "Motoboy saiu? Confirme o pagamento."
                : "Cliente chegou? Confirme o pagamento."}
            </div>
            <button
              onClick={() => {
                pulseCta(order.id + '-pay');
                openPaymentConfirm(order, alreadyPaid ? { alreadyPaid: true } : undefined);
              }}
              disabled={updating === order.id}
              style={ctaPulseId === order.id + '-pay' ? { animation: 'btnPop 220ms ease' } : undefined}
              className="w-full px-3 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <CheckSquare size={16} weight="duotone" />
              {alreadyPaid ? "Confirmar retirada" : order.type === "delivery" ? "Saiu para entrega" : "Confirmar pagamento"}
            </button>
          </div>
        );
      })()}


      {order.status === "ready" && isPostalOrder(order) && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            Pedido postal pronto para postagem. Informe o rastreio ao postar.
          </div>
          <button
            onClick={async () => {
              pulseCta(order.id + '-dispatch-postal');
              const ok = await handlePostalMarkPosted(order);
              if (ok) {
                closeOrderOverlays();
                setActiveTab('queue');
              }
            }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-dispatch-postal' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Informar rastreio e postar
          </button>
        </div>
      )}
      {order.status === "waiting_for_motoboy" && order.type === "delivery" && !isPostalOrder(order) && (
        <div className="w-full">
          {(order?.delivery?.motoboy?.name || order?.delivery?.motoboyId || order?.delivery?.motoboy_id || String(order?.delivery?.status || '').toUpperCase() === 'ACCEPTED') ? (
            <div className="mb-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
              {order?.delivery?.motoboy?.name
                ? `Entregador ${String(order.delivery.motoboy.name).split(' ')[0]} está vindo buscar.`
                : 'Entregador vinculado está vindo buscar.'}
            </div>
          ) : (
            <div className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
              Buscando entregador para retirada.
            </div>
          )}
        </div>
      )}

      {order.status === "dispatched" && isPostalOrder(order) && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            Pedido postal postado. Finalize quando a entrega for concluída.
          </div>
          {order?.shipment?.trackingCode ? (
            <div className="mb-2 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              Código: <span className="font-semibold">{order.shipment.trackingCode}</span>
            </div>
          ) : null}
          <button
            onClick={() => { void handlePostalMarkPosted(order); }}
            disabled={updating === order.id}
            className="w-full mb-2 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:bg-slate-50"
          >
            Editar rastreio
          </button>
          <button
            onClick={() => { pulseCta(order.id + '-finish-postal-dispatched'); handleAdvance(order.id, "finished"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-finish-postal-dispatched' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Finalizar pedido
          </button>
        </div>
      )}

      {order.status === "waiting_for_motoboy" && order.type === "delivery" && isPostalOrder(order) && (
        <div className="w-full">
          <div className="mb-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            Pedido postal despachado.
          </div>
          <button
            onClick={() => { pulseCta(order.id + '-finish-postal-wait'); handleAdvance(order.id, "finished"); }}
            disabled={updating === order.id}
            style={ctaPulseId === order.id + '-finish-postal-wait' ? { animation: 'btnPop 220ms ease' } : undefined}
            className="w-full px-3 py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CheckSquare size={16} weight="duotone" /> Finalizar pedido
          </button>
        </div>
      )}
      {canCancelOrder && (
        <div className="w-full border-t border-slate-100 pt-3">
          <div className="mb-2 rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">
              Ação sensível
            </p>
            <p className="mt-1 text-[11px] font-semibold text-rose-600/90">
              Use apenas se o pedido realmente não puder mais seguir no fluxo normal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCancelOrderModal(order)}
            disabled={updating === order.id}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 shadow-[0_12px_24px_-18px_rgba(225,29,72,0.28)] transition-all hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] disabled:opacity-50"
          >
            <X size={15} weight="bold" />
            Cancelar pedido
          </button>
        </div>
      )}
    </div>
  );
  };

  const queueLoadingState = getAdminQueueLoadingState({
    activeTab,
    loading,
    historyLoading,
    queueCount: filteredProductionQueue.length,
    inRouteCount: inRouteQueue.length,
    historyCount: historyOrders.length,
  });

  return (
    <>
    <div
      className={`no-print ${tvMode ? "space-y-6 rounded-3xl bg-slate-900/95 p-4 sm:p-6 text-white" : "space-y-1"}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <style>{`
        @keyframes btnPop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}
        @keyframes satinPop{0%{transform:scale(0.92);filter:saturate(0.9)}60%{transform:scale(1.06);filter:saturate(1.08)}100%{transform:scale(1);filter:saturate(1)}}
        @keyframes drawerIn{0%{transform:translateX(100%)}100%{transform:translateX(0)}}
      `}</style>
      {!tvMode ? (
        <div
          className={`pointer-events-none sticky z-40 flex justify-center transition-all duration-200 lg:hidden ${
            pullDistance > 0 || isPullRefreshing ? 'top-2 opacity-100' : 'top-0 opacity-0'
          }`}
          style={{ transform: `translateY(${Math.min(18, pullDistance * 0.22)}px)` }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/96 px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.22)] backdrop-blur-md">
            <ArrowsClockwise size={13} weight="duotone" className={isPullRefreshing ? 'animate-spin text-[#336886]' : 'text-slate-500'} />
            {isPullRefreshing ? 'Atualizando fila...' : pullDistance >= 68 ? 'Solte para atualizar' : 'Puxe para atualizar'}
          </div>
        </div>
      ) : null}
      <div className={`${tvMode ? "" : "rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md px-2 sm:px-3 py-2 sticky top-0 z-30"}`}>
        <div className="flex flex-col gap-1 mb-0">
          {!tvMode ? (
            <>
              <div className="flex w-full items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <div className="relative inline-flex flex-1 min-w-0 items-center">
                  <div className="grid w-full min-w-0 grid-cols-3 items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {[
                    { id: 'queue', label: 'Pedidos', count: allActiveQueue.length },
                    { id: 'inroute', label: 'Em rota', count: inRouteQueue.length },
                    {
                      id: 'completed',
                      label: isAdminUser ? 'Vendas' : 'Finalizados',
                      count: reportCompleted.length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as 'queue' | 'inroute' | 'completed')}
                      className={`inline-flex w-full min-w-0 items-center justify-center gap-1 text-[11px] sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-white shadow-sm font-semibold text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        {tab.id === 'queue' && <CheckSquare size={13} weight="duotone" />}
                        {tab.id === 'completed' && <CurrencyDollar size={13} weight="duotone" />}
                        <span>{tab.label}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeTab === tab.id ? 'bg-slate-100 text-slate-700' : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              {activeTab === 'queue' && (
                <div className="mt-0.5 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-sm">
                      <button
                        type="button"
                        data-testid="admin-queue-mode-orders"
                        onClick={() => setQueueViewMode('orders')}
                        className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black transition-all sm:flex-none ${
                          queueViewMode === 'orders'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <CheckSquare size={14} weight="duotone" />
                        Pedidos
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{allActiveQueue.length}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="admin-queue-mode-tables"
                        onClick={() => setQueueViewMode('tables')}
                        className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black transition-all sm:flex-none ${
                          queueViewMode === 'tables'
                            ? 'bg-[#153A4C] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Monitor size={14} weight="duotone" />
                        Mesas
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${queueViewMode === 'tables' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {allTableGroups.length}
                        </span>
                      </button>
                    </div>

                    {queueViewMode === 'tables' ? (
                      <label className="relative flex min-h-11 w-full items-center rounded-2xl border border-orange-100 bg-white px-3 shadow-sm sm:max-w-xs">
                        <Hash size={15} weight="duotone" className="shrink-0 text-[#E65100]" />
                        <input
                          data-testid="admin-table-search"
                          type="search"
                          value={tableSearch}
                          onChange={(event) => setTableSearch(event.target.value)}
                          placeholder="Buscar mesa..."
                          className="min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                        />
                      </label>
                    ) : null}
                  </div>

                  {queueViewMode === 'orders' ? (
                    <div className="relative">
                      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto snap-x snap-mandatory pb-1.5 pr-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                      {[
                        { id: 'all', label: 'Todos', value: allActiveQueue.length, activeClass: 'bg-slate-800 text-white' },
                        { id: 'condominium', label: 'Condomínio', value: queueMetrics.condominium, activeClass: 'bg-emerald-500 text-white' },
                        { id: 'pending', label: 'Pendentes', value: queueMetrics.pending, activeClass: 'bg-amber-500 text-white' },
                        { id: 'preparing', label: 'Em Preparação', value: queueMetrics.preparing, activeClass: 'bg-sky-500 text-white' },
                        { id: 'ready', label: 'Prontos', value: queueMetrics.ready, activeClass: 'bg-violet-500 text-white' },
                        { id: 'late', label: 'Atrasados', value: queueMetrics.late, activeClass: 'bg-rose-500 text-white' },
                        { id: 'cancelled', label: 'Cancelados', value: queueMetrics.cancelled, activeClass: 'bg-slate-500 text-white' },
                      ].map((kpi) => (
                        <button
                          key={kpi.id}
                          type="button"
                          onClick={() => setQueueFilter(kpi.id as any)}
                        className={`flex snap-start shrink-0 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                            queueFilter === kpi.id
                              ? kpi.activeClass
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{kpi.label}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            queueFilter === kpi.id
                              ? 'bg-white/20 text-white'
                              : Number(kpi.value) === 0
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {kpi.value}
                          </span>
                        </button>
                      ))}
                      </div>
                      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white via-white/80 to-transparent" />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-[11px] font-semibold text-orange-800">
                      {visibleTableGroups.length} mesa{visibleTableGroups.length === 1 ? '' : 's'} aberta{visibleTableGroups.length === 1 ? '' : 's'} com pedido ativo. Clique na mesa para ver os pedidos e editar itens sem mudar a lógica da fila.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/15 text-white">
                {productionQueue.length} em produção
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
                <Clock size={14} weight="duotone" />
                {new Date(currentTime).toLocaleTimeString("pt-BR", { timeZone: SAO_PAULO_TZ, hour: "2-digit", minute: "2-digit" })}
              </span>
              <button
                type="button"
                onClick={toggleTvMode}
                className="inline-flex items-center gap-2 text-xs font-medium bg-white/15 text-white border border-white/20 px-2.5 py-1.5 rounded-md"
              >
                <Monitor size={14} weight="duotone" />
                Sair do modo TV
              </button>
            </div>
          )}
        </div>
      </div>

      {!tvMode && queueLoadingState.showRefreshBanner && (
        <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50/90 px-3 py-2 text-xs font-bold text-sky-800 shadow-sm">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-sky-100">
              <img src={SYSTEM_LOGO_SRC} alt="Já no Caminho" className="h-4 w-4 object-contain" loading="eager" />
            </span>
            <ArrowsClockwise size={14} weight="duotone" className="animate-spin" />
            {queueLoadingState.label}
          </span>
          <p className="mt-0.5 text-[11px] font-semibold text-sky-700/80">
            Buscando informações atualizadas da loja. Você pode continuar navegando.
          </p>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-2 mt-2">
          {queueLoadingState.showQueueSkeleton ? (
            <QueueLoadingSkeleton variant="queue" />
          ) : (
            queueViewMode === 'tables' ? (
              <div className="grid grid-cols-1 gap-2 px-1 sm:grid-cols-2 sm:gap-3 sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
                {visibleTableGroups.map((group) => (
                  <TableSummaryCard
                    key={`table-${group.tableKey}`}
                    group={group}
                    elapsedLabel={group.oldestCreatedAt ? formatDuration(Math.max(0, currentTime - group.oldestCreatedAt)) : 'Agora'}
                    onClick={() => {
                      setConfirmModal(null);
                      setEditingFinalizedOrder(false);
                      setSelectedOrder(null);
                      setSelectedTableNumber(group.tableKey);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 px-1 sm:px-0">
                {filteredProductionQueue.map((order, index) => {
                  const orderAgeMs = order?.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
                  const isArchived = false;
                  const isLate = orderAgeMs > PREP_SLA_MS;
                  const statusMeta = getStatusStyles(order.status, order.type, order);
                  const typeMeta = orderTypeMeta(order);
                  const paymentLabel = getPaymentMethodMeta(order.payment).label;
                  const totalLabel = formatCurrency(Number(order.total || 0));
                  const itemsCount = (order.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);
                  const orderId = String(order.id);
                  const isSelected = selectedOrderIds.includes(orderId);
                  const canQuickStart = String(order?.status || '').toLowerCase() === 'pending';
                  const canQuickFinalize = canQuickFinalizeOrder(order);
                  const isTimerWarning = !isLate && orderAgeMs > PREP_SLA_MS * 0.6;

                  return (
                    <OrderSummaryCard
                      key={`summary-${order.id}`}
                      order={order}
                      queueRank={index + 1}
                      orderDisplayId={formatOrderDisplayId(order.id, storeSlug)}
                      isLate={isLate}
                      elapsedLabel={elapsedTime[order.id] || "0s"}
                      statusMeta={statusMeta}
                      typeMeta={typeMeta}
                      paymentLabel={paymentLabel}
                      totalLabel={totalLabel}
                      itemsCount={itemsCount}
                      printBusy={isGeneratingPrint}
                      canPrint={hasPrintAccess}
                      onPrint={() => handlePrintOrder(order, index + 1)}
                      archived={isArchived}
                      showSelector={activeTab === 'queue'}
                      selected={isSelected}
                      onToggleSelect={() =>
                        setSelectedOrderIds((prev) =>
                          prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [ ...prev, orderId ]
                        )
                      }
                      showQuickStart={canQuickStart}
                      onQuickStart={() => {
                        pulseCta(order.id + '-quick-start');
                        void handleAdvance(order.id, 'preparing');
                      }}
                      showQuickFinalize={canQuickFinalize}
                      isTimerWarning={isTimerWarning}
                      onQuickFinalize={() => {
                        pulseCta(order.id + '-quick-finalize');
                        openQuickFinalizeModal(order);
                      }}
                      onClick={() => {
                        setConfirmModal(null);
                        setEditingFinalizedOrder(false);
                        setSelectedOrder(order);
                      }}
                    />
                  );
                })}
              </div>
            )
          )}
          {activeTab === 'queue' && queueViewMode === 'orders' && selectedBulkOrders.length > 0 && (
            <div className="fixed inset-x-0 bottom-[76px] sm:bottom-4 z-[120] flex justify-center px-3">
              <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white/95 backdrop-blur shadow-lg px-3 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  {selectedBulkOrders.length} selecionado{selectedBulkOrders.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={openFinalizeAllReadyModal}
                  disabled={bulkFinishing || selectedBulkOrders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckSquare size={14} weight="duotone" />
                  {bulkFinishing ? 'Finalizando...' : `Finalizar ${selectedBulkOrders.length} selecionados`}
                </button>
              </div>
            </div>
          )}
          {((queueViewMode === 'tables' ? visibleTableGroups.length : filteredProductionQueue.length) === 0) && !loading && (
            <div className="col-span-full text-center text-gray-500 py-5 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <div className="mx-auto max-w-sm space-y-1">
                <div className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                  {queueViewMode === 'tables' ? <Monitor size={15} weight="duotone" /> : <CheckSquare size={15} weight="duotone" />}
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {queueViewMode === 'tables' ? 'Nenhuma mesa aberta.' : 'Nenhum pedido aguardando.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {queueViewMode === 'tables'
                    ? 'Quando chegar pedido de mesa, ele aparece agrupado pelo número.'
                    : 'Assim que chegar um pedido, ele aparece aqui com prioridade.'}
                </p>
              </div>
            </div>
          )}
          {selectedTableGroup && createPortal(
            <div className="fixed inset-0 z-[9998] overflow-hidden md:flex md:items-center md:justify-center md:px-6 md:py-6">
              <div
                className="fixed inset-0 z-[9998] bg-slate-950/45 backdrop-blur-sm"
                onClick={() => setSelectedTableNumber(null)}
              />
              <div
                data-testid="admin-table-detail"
                className="fixed inset-0 z-[9999] flex flex-col bg-white shadow-2xl md:relative md:inset-auto md:h-[min(88vh,760px)] md:w-full md:max-w-[720px] md:overflow-hidden md:rounded-[2rem] md:border md:border-white/80 md:shadow-[0_34px_90px_-44px_rgba(15,23,42,0.9)]"
              >
                <div className="shrink-0 border-b border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#e8f6f3_100%)] px-4 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E65100]">Atendimento de mesa</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#153A4C] px-3 text-xl font-black text-white shadow-[0_18px_32px_-24px_rgba(21,58,76,0.75)]">
                          {selectedTableGroup.displayNumber}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-black leading-tight text-slate-950">
                            Mesa {selectedTableGroup.displayNumber}
                          </h2>
                          <p className="mt-0.5 text-xs font-semibold text-slate-600">
                            {selectedTableGroup.ordersCount} pedido{selectedTableGroup.ordersCount === 1 ? '' : 's'} aberto{selectedTableGroup.ordersCount === 1 ? '' : 's'} para editar sem sair da fila.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTableNumber(null)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:text-slate-800 active:scale-95"
                      aria-label="Fechar mesa"
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Pedidos</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{selectedTableGroup.ordersCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Itens</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{selectedTableGroup.itemsCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Total</p>
                      <p className="mt-1 truncate text-lg font-black text-slate-900">{formatCurrency(selectedTableGroup.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                  {selectedTableGroup.orders.map((order: any) => {
                    const statusMeta = getStatusStyles(order.status, order.type, order);
                    const orderItems = Array.isArray(order?.items) ? order.items : [];
                    const itemsCount = orderItems.reduce((sum: number, item: any) => sum + Number(item?.qty || item?.quantity || 0), 0);
                    const itemsPreview = orderItems
                      .slice(0, 3)
                      .map((item: any) => `${Number(item?.qty || item?.quantity || 0) || 1}x ${String(item?.name || 'Item')}`)
                      .join(' • ');
                    const orderAgeMs = order?.createdAt ? Math.max(0, currentTime - new Date(order.createdAt).getTime()) : 0;

                    return (
                      <button
                        key={`table-order-${order.id}`}
                        type="button"
                        data-testid="admin-table-order-row"
                        onClick={() => {
                          setSelectedTableNumber(null);
                          setConfirmModal(null);
                          setEditingFinalizedOrder(false);
                          setSelectedOrder(order);
                        }}
                        className="w-full rounded-3xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">
                                <Hash size={11} weight="duotone" />
                                {formatOrderDisplayId(order.id, storeSlug)}
                              </span>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusMeta.className}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-sm font-black text-slate-900">
                              {order.customerName || order.name || `Mesa ${selectedTableGroup.displayNumber}`}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                              {itemsPreview || `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-base font-black text-slate-900">{formatCurrency(Number(order.total || 0))}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-400">
                              {orderAgeMs ? formatDuration(orderAgeMs) : 'Agora'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="text-[11px] font-bold text-slate-500">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} neste pedido
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#153A4C] px-3 py-2 text-xs font-black text-white">
                            Abrir pedido
                            <Plus size={13} weight="bold" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}
          {isDrawerOpen && createPortal(
            <div className="fixed inset-0 z-[9999] overflow-hidden md:flex md:items-center md:justify-center md:px-6 md:py-6">
              <div
                className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={closeOrderOverlays}
              />
              <div
                data-testid="admin-order-detail"
                className="fixed inset-0 z-[10000] bg-white shadow-2xl flex flex-col animate-[drawerIn_220ms_ease-out] md:relative md:inset-auto md:h-[min(94vh,940px)] md:w-full md:max-w-[1120px] md:overflow-hidden md:rounded-[2.15rem] md:border md:border-white/80 md:shadow-[0_34px_90px_-44px_rgba(15,23,42,0.9)] md:animate-[satinPop_180ms_ease-out]"
              >
                <div className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_46%,#eef6fb_100%)] px-4 pt-[max(env(safe-area-inset-top),1.05rem)] pb-4 shadow-sm">
                  <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-[#336886]/10 blur-3xl" />
                  <div className="pointer-events-none absolute -right-12 top-2 h-32 w-32 rounded-full bg-amber-200/24 blur-3xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[1rem] border border-white/80 bg-white p-1 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.52)]">
                        <img src="/janocaminho.jpg" alt="" className="h-full w-full rounded-[0.78rem] object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#336886]">
                          Detalhe do pedido
                        </p>
                        <h2 className="mt-1 min-w-0 text-[1.05rem] font-black leading-tight tracking-[-0.035em] text-slate-950 [overflow-wrap:anywhere]" title={resolveLocationIdentifier(selectedOrder || {}) || 'Detalhes do pedido'}>
                          {(() => {
                            const drawerLocation = resolveLocationIdentifier(selectedOrder || {});
                            const drawerMesa = parseMesaIdentifier(drawerLocation);
                            if (!drawerLocation) return 'Detalhes do pedido';
                            if (!drawerMesa.isMesa) return `Pedido ${drawerLocation}`;
                            return (
                              <span className="inline-flex items-center gap-1.5">
                                <span>Pedido</span>
                                <span className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-[#E65100]">MESA</span>
                                <span className="text-lg font-black text-[#E65100] leading-none">{drawerMesa.number}</span>
                              </span>
                            );
                          })()}
                        </h2>
                        {selectedOrder ? (
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            #{formatOrderDisplayId(selectedOrder.id, storeSlug)} · {formatOrderType(selectedOrder.type)} · {formatCurrency(Number(selectedOrder.total || 0))}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {selectedOrder && hasPrintAccess && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePrintOrder(selectedOrder, selectedOrderRank)}
                          disabled={isGeneratingPrint}
                          className="inline-flex h-10 px-3 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-900 transition-all no-print disabled:opacity-60"
                          aria-label="Imprimir pedido"
                          title="Imprimir pedido"
                        >
                          <Printer size={18} weight="duotone" />
                          <span className="text-xs font-black uppercase tracking-wider">{isGeneratingPrint ? 'Gerando...' : 'Imprimir'}</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={closeOrderOverlays}
                      className="flex items-center justify-center w-[40px] h-[40px] bg-red-50 text-red-600 rounded-full hover:bg-red-100 hover:scale-105 active:scale-95 transition-all shadow-sm focus:outline-none no-print"
                      aria-label="Fechar"
                    >
                      <X size={20} weight="bold" />
                    </button>
                  </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  <div
                    className={`grid gap-3 xl:gap-4 ${
                      tvMode
                        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                        : "grid-cols-1"
                    }`}
                  >
                  {(drawerOrder ? [drawerOrder] : [])
                    .map((order, index) => {
            const orderAgeMs = order?.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
            const isLate = orderAgeMs > PREP_SLA_MS;
            const isNew = newOrderIds.includes(order.id);
            const toneKey =
              order.status === "ready_for_delivery" || order.status === "waiting_for_motoboy"
                ? "ready"
                : order.status;
            const drawerLocationIdentifier = resolveLocationIdentifier(order);
            const drawerIsCondo = isCondominiumOrder(order);
            const drawerTypeMeta = orderTypeMeta(order);
            const drawerStatusMeta = getStatusStyles(order.status, order.type, order);
            const drawerDisplayLabel = formatOrderDisplayId(order.id, storeSlug);
            const drawerPaymentMeta = getPaymentMethodMeta(order.payment);
            const drawerItemsCount = (Array.isArray(order?.items) ? order.items : []).reduce(
              (sum: number, item: any) => sum + Number(item?.qty || 0),
              0
            );
            const drawerCardLocationIdentifier = drawerIsCondo ? resolveCondominiumCardIdentifier(order) : drawerLocationIdentifier;
            const drawerHasLocationIdentifier = Boolean(drawerCardLocationIdentifier);
            const drawerMesaMeta = parseMesaIdentifier(drawerCardLocationIdentifier);
            const drawerIsMesaLocation = drawerMesaMeta.isMesa;
            const drawerLocationLine = drawerIsCondo ? String(drawerLocationIdentifier || '').trim() : drawerCardLocationIdentifier;
            const drawerLocationBadgeTone = drawerIsMesaLocation
              ? 'bg-[#FFF3E0] text-[#E65100] border-[#E65100]'
              : drawerIsCondo
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-900 border-slate-200';
            const drawerShowTypeInMeta = !drawerHasLocationIdentifier && Boolean(drawerTypeMeta?.label);
            const drawerPaymentStatus = String(order.paymentStatus || '').toUpperCase();
            const drawerItemGroups = buildVisualOrderItemGroups(order.id, order.items || []);
            const drawerProductItemGroups = drawerItemGroups.filter((group: any) => !isTableServiceOrderItem(group.primary, productsById));
            const { activeCouvertGroup, activeServiceChargeGroup } = getOrderActiveTableServiceGroups(order, drawerItemGroups);
            const serviceChargeUpdating = updating === order.id && !activeServiceChargeGroup;
            return (
            <div
              key={order.id}
              className={`relative w-full max-w-full overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_38px_-24px_rgba(15,23,42,0.28)] ${
                isNew ? 'ring-2 ring-emerald-300/80' : ''
              } ${isLate ? 'border-rose-200 bg-rose-50/60' : ''}`}
            >
              <div className={`h-1 w-full ${
                toneKey === 'pending'
                  ? 'bg-amber-400'
                  : toneKey === 'preparing'
                    ? 'bg-sky-400'
                    : toneKey === 'ready'
                      ? 'bg-violet-400'
                      : toneKey === 'done'
                        ? 'bg-emerald-400'
                        : 'bg-slate-300'
              }`} />
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex flex-1 items-start gap-3">
                      <div className={`inline-flex h-9 shrink-0 items-center justify-center rounded-2xl px-3 text-sm font-black tracking-tight shadow-sm ${getPriorityTone(selectedOrderRank)}`}>
                        #{String(selectedOrderRank).padStart(2, "0")}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-500 shadow-sm whitespace-nowrap">
                        <Clock size={14} weight="fill" className="shrink-0 text-slate-400" />
                        <span className="inline-block min-w-[3.1rem] text-center text-[11px] font-extrabold tabular-nums tracking-tight whitespace-nowrap">
                          {elapsedTime[order.id] || "0s"}
                        </span>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${drawerStatusMeta.className}`}>
                        {drawerStatusMeta.label}
                      </span>
                      {isLate && (
                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700 animate-pulse whitespace-nowrap">
                          Prazo estourado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    {drawerHasLocationIdentifier && (
                      <div
                        className={`mb-2.5 inline-flex max-w-full items-start gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm ${drawerLocationBadgeTone}`}
                        title={drawerLocationIdentifier || drawerCardLocationIdentifier}
                      >
                        {drawerIsMesaLocation ? (
                          <>
                            <Monitor size={14} weight="duotone" className="mt-0.5 shrink-0" />
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]">Mesa</span>
                            <span className="text-sm font-black leading-none">{drawerMesaMeta.number}</span>
                          </>
                        ) : (
                          <>
                            {drawerIsCondo ? <Buildings size={14} weight="duotone" className="mt-0.5 shrink-0" /> : order.type === 'delivery' ? <Truck size={14} weight="duotone" className="mt-0.5 shrink-0" /> : <Storefront size={14} weight="duotone" className="mt-0.5 shrink-0" />}
                            <span className="min-w-0 leading-snug [overflow-wrap:anywhere]">
                              {drawerLocationLine}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-slate-600 shadow-sm">
                        <Hash size={11} weight="duotone" className="shrink-0 text-slate-400" />
                        <span className="truncate">{drawerDisplayLabel}</span>
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-2 text-[1.08rem] font-black leading-tight text-slate-900 truncate">
                      {order.customerName || order.name || "Cliente"}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
                      {drawerShowTypeInMeta ? (
                        <>
                          <span className="font-semibold text-slate-700">{drawerTypeMeta.label}</span>
                          <span className="text-slate-300">•</span>
                        </>
                      ) : null}
                      <span className="font-semibold text-slate-700">{drawerItemsCount} {drawerItemsCount === 1 ? 'item' : 'itens'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1.5">
                        {drawerPaymentMeta.icon && (
                          <img
                            src={drawerPaymentMeta.icon}
                            alt={drawerPaymentMeta.label}
                            className="h-4 w-4 object-contain"
                          />
                        )}
                        <span className="truncate">{drawerPaymentMeta.label}</span>
                      </span>
                      {drawerPaymentStatus === 'PAID' ? (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Pago
                          </span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {order.phone && (
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                          <Phone size={12} weight="duotone" className="shrink-0 text-[#336886]" />
                          <span className="min-w-0 truncate whitespace-nowrap">{order.phone}</span>
                        </span>
                      )}
                      {isPostalOrder(order) ? (
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                          <Package size={12} weight="duotone" className="shrink-0 text-slate-500" />
                          <span className="min-w-0 truncate">
                            Rastreio: {String(order?.shipment?.trackingCode || '').trim() || 'não informado'}
                          </span>
                        </span>
                      ) : null}
                    </div>

                    {order.payment?.toString().toLowerCase() === 'dinheiro' && order.cashTendered ? (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[11px] shadow-sm">
                        <p className="font-semibold text-emerald-700">
                          Cliente paga com: {formatCurrency(Number(order.cashTendered))}
                        </p>
                        {Number(order.cashTendered) > Number(order.total || 0) ? (
                          <p className="mt-0.5 font-semibold text-amber-700">
                            Troco: {formatCurrency(Number(order.cashTendered) - Number(order.total || 0))}
                          </p>
                        ) : (
                          <p className="mt-0.5 font-semibold text-slate-500">Sem troco</p>
                        )}
                      </div>
                    ) : null}
                    {resolveCustomerOrderNote(order) ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[12px] shadow-sm">
                        <div className="flex items-start gap-2">
                          <NotePencil size={15} weight="duotone" className="mt-0.5 shrink-0 text-amber-700" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                              Observação do cliente
                            </p>
                            <p className="mt-1 whitespace-pre-wrap font-semibold leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
                              {resolveCustomerOrderNote(order)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

              {/* LISTA DE ITENS */}
              <div className="mt-3 space-y-2">
                {drawerProductItemGroups.map((group: any) => {
                  const item = group.primary;
                  const itemImageUrl = group.imageUrl;
                  return (
                  <div
                    key={group.groupKey}
                    className={`flex min-w-0 items-start gap-3 rounded-[1.2rem] border px-2.5 py-2 text-xs text-slate-700 ${
                      group.isNew
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      {itemImageUrl ? (
                            <img
                          src={resolveAssetUrl(itemImageUrl)}
                          alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                        <div className="flex h-full w-full items-center justify-center text-[15px] text-slate-400">
                              🍖
                            </div>
                          )}
                        </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="min-w-0">
                          <span className="block truncate text-[12px] font-black text-slate-800" title={group.name}>
                            {group.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                            {formatCurrency(group.unitPrice)} un.
                          </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {group.isNew && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                            Novo
                          </span>
                        )}
                        {item?.cookingPoint && (
                          <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                            {item.cookingPoint}
                          </span>
                        )}
                        {item?.passSkewer && (
                          <span className="rounded-full border border-fuchsia-200 bg-fuchsia-100 px-2 py-0.5 text-[9px] font-semibold text-fuchsia-700">
                            passar farinha
                          </span>
                        )}
                        {formatSelectedModifiers(item?.selectedModifiers || []).map((modifierName) => (
                          <span
                            key={`${group.groupKey}-${modifierName}`}
                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-600"
                          >
                            + {modifierName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-right text-[12px] font-black text-slate-900">
                        {group.promoActive && group.originalTotal > 0 ? (
                          <span className="block text-[10px] font-bold text-slate-400 line-through">
                            {formatCurrency(group.originalTotal)}
                          </span>
                        ) : null}
                        <span className={group.promoActive ? "text-emerald-600" : "text-slate-900"}>
                          {formatCurrency(group.total)}
                        </span>
                      </span>
                      <div className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(order.id, item.id, -1)}
                          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95"
                          aria-label={`Diminuir ${group.name}`}
                        >
                          <Minus size={14} weight="bold" />
                        </button>
                        <span className="min-w-7 px-1 text-center text-[12px] font-black tabular-nums text-slate-800">
                          {group.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(order.id, item.id, 1)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 active:scale-95"
                          aria-label={`Aumentar ${group.name}`}
                        >
                          <Plus size={14} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* ADICIONAR ITEM */}
              <div className="mt-3 space-y-2">
                <div className="flex w-full min-w-0 flex-row items-stretch gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-1.5">
                  <ProductQuickPicker
                    value={selectedProducts[order.id] || ""}
                    onChange={(nextValue: string) =>
                      setSelectedProducts((prev) => ({
                        ...prev,
                        [order.id]: nextValue,
                      }))
                    }
                    products={visibleQueueProducts}
                    onOpenCatalog={(query: string) => openCatalogPicker(String(order.id), query)}
                    onOpenManual={(query: string) => openManualItemModal(String(order.id), query)}
                    className="min-w-0 flex-1 [&>button]:h-11"
                  />

                  <button
                    type="button"
                    onClick={() => handleAddItem(order.id)}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center gap-1 rounded-xl bg-brand-primary text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90 active:scale-95 sm:w-auto sm:px-3"
                  >
                    <Plus size={14} weight="duotone" />
                    <span className="hidden sm:inline">Incluir</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openManualItemModal(String(order.id))}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                  >
                    {renderFontAwesomeIcon("fa-asterisk")}
                    Item avulso
                  </button>

                  {isTableOrder(order) && tableServiceSettings.couvertEnabled && Number(tableServiceSettings.couvertPrice || 0) > 0 && !activeCouvertGroup ? (
                    <button
                      type="button"
                      onClick={() => openCouvertModal(order)}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-amber-800 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-100 active:scale-95"
                    >
                      {renderFontAwesomeIcon("fa-music")}
                      + Couvert
                    </button>
                  ) : null}

                  {isTableOrder(order) && tableServiceSettings.serviceChargeEnabled && Number(tableServiceSettings.serviceChargePercent || 0) > 0 && !activeServiceChargeGroup ? (
                    <button
                      type="button"
                      onClick={() => handleApplyServiceCharge(order)}
                      disabled={updating === order.id}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-sky-800 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-100 active:scale-95 disabled:opacity-60"
                    >
                      {serviceChargeUpdating ? (
                        <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                      ) : (
                        renderFontAwesomeIcon("fa-bell-concierge")
                      )}
                      {serviceChargeUpdating ? "Aplicando taxa..." : `+ Taxa ${tableServiceSettings.serviceChargePercent || 10}%`}
                    </button>
                  ) : null}
                </div>
              </div>

              {tvMode ? renderTimeline(order.status, order.type, order) : null}
                </div>
            </div>
                  );
                  })}

                  </div>
                </div>
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:px-4 md:pb-4">
                  {selectedOrder ? (
                    <>
                      {renderDrawerFinancialSummary(selectedOrder)}
                      <div className="mt-3">
                        {renderOrderFooterActions(selectedOrder)}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {isPaymentModalOpen && createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            {(() => {
              const normalizedPayment = (confirmModal.payment || '').toString().trim().toLowerCase();
              const isPixPayment = normalizedPayment === 'pix';
              const isCashPayment = normalizedPayment === 'dinheiro';
              const pixKey = (confirmModal.pixKey || '').toString().trim();
              const pixPayload = pixKey
                ? buildPixPayload({
                    key: pixKey,
                    name: auth?.store?.name || 'Já no Caminho',
                    amount: Number(confirmModal.total || 0),
                    txid: confirmModal.id ? `PEDIDO${confirmModal.id.slice(0, 8)}` : 'PEDIDO',
                  })
                : '';
              const pixQrUrl = pixPayload
                ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixPayload)}`
                : '';
	              const totalValue = Number(confirmModal.total || 0);
	              const deliveryFeeValue =
	                confirmModal.type === 'delivery' && confirmModal.deliveryFee !== null && confirmModal.deliveryFee !== undefined
	                  ? Number(confirmModal.deliveryFee)
	                  : 0;
              const itemsSubtotal = Math.max(0, totalValue - (Number.isFinite(deliveryFeeValue) ? deliveryFeeValue : 0));
              const itemsVolume = (confirmModal.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);
              const modalLocationIdentifier = resolveLocationIdentifier(confirmModal);
              const cashValue = Number((cashConfirmValue || '').toString().replace(',', '.'));
              const cashValid = !isCashPayment || (cashConfirmValue && !Number.isNaN(cashValue) && cashValue >= totalValue);
              const changeValue = isCashPayment && cashValid ? cashValue - totalValue : 0;
              const cashShortcuts = [20, 50, 100, 200];
              return (
                <>
            {(() => {
              const modalMesa = parseMesaIdentifier(modalLocationIdentifier);
              const titleContent = !modalLocationIdentifier
                ? 'Pedido pronto para cobrar'
                : !modalMesa.isMesa
                ? `Pedido ${modalLocationIdentifier}`
                : '';
              return (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{confirmModal.alreadyPaid ? 'Confirmar retirada' : 'Confirmar pagamento'}</p>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  {!modalMesa.isMesa ? (
                    titleContent
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span>Pedido</span>
                      <span className="text-xs font-semibold tracking-[0.08em] text-[#E65100]">MESA</span>
                      <span className="text-xl font-black text-[#E65100] leading-none">{modalMesa.number}</span>
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeOrderOverlays}
                className="text-slate-400 hover:text-slate-600 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <X size={18} weight="duotone" />
              </button>
            </div>
              );
            })()}
            {confirmModal.alreadyPaid && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Pagamento via {getPaymentMethodMeta(confirmModal.payment).label} já confirmado. Clique em "Pedido retirado" quando o cliente buscar.
              </div>
            )}
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Cliente</span>
                <span className="font-semibold text-slate-800">{confirmModal.customerName}</span>
              </div>
              {confirmModal.phone && (
                <div className="flex items-center justify-between">
                  <span>Telefone</span>
                  <span className="font-semibold text-slate-800">{confirmModal.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Pagamento</span>
                <span className="font-semibold text-slate-800">
                  {getPaymentMethodMeta(confirmModal.payment).label}
                </span>
              </div>
	              <div className="flex items-center justify-between">
	                <span>Volume</span>
	                <span className="px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold">
	                  {itemsVolume} {itemsVolume === 1 ? 'item' : 'itens'}
	                </span>
	              </div>
                {itemsSubtotal !== totalValue && (
	                <div className="flex items-center justify-between">
	                  <span>Subtotal</span>
	                  <span className="px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 text-sm font-bold">
	                    {formatCurrency(itemsSubtotal)}
	                  </span>
	                </div>
                )}
	              {confirmModal.type === 'delivery' && deliveryFeeValue > 0 && (
	                <div className="flex items-center justify-between">
	                  <span>Frete</span>
	                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-sm font-bold">
	                    {formatCurrency(deliveryFeeValue)}
	                  </span>
	                </div>
	              )}
	              <div className="flex items-center justify-between">
	                <span>Total a pagar</span>
	                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold">
	                  {formatCurrency(totalValue)}
	                </span>
	              </div>
              {Array.isArray(confirmModal.items) && confirmModal.items.some((item) => resolvePromoMeta(item).promoActive) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Promoção aplicada no pedido.
                </div>
              )}
            </div>
            {isPixPayment && !confirmModal.alreadyPaid && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Pix do lojista</span>
                  <span className="text-xs text-slate-400">Confirmação rápida</span>
                </div>
                {pixKey ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-center">
                      <img
                        src={pixQrUrl}
                        alt="QR Code Pix"
                        className="w-40 h-40 rounded-xl bg-white border border-slate-200 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pixPayload || pixKey);
                          setPixCopied(true);
                          window.setTimeout(() => setPixCopied(false), 2000);
                        } catch (err) {
                          console.error('Falha ao copiar Pix', err);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      {pixCopied ? 'Copiado!' : 'Copiar código Pix'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                    Cadastre a chave Pix em Configurações para gerar o QR Code.
                  </div>
                )}
              </div>
            )}
            {isCashPayment && !confirmModal.alreadyPaid && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Pagamento em dinheiro</span>
                  <span className="text-xs text-amber-600">Informe para calcular o troco</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cashShortcuts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCashConfirmValue(String(value))}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      R$ {value}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="text-xs font-semibold text-amber-700">
                    Valor recebido
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashConfirmValue}
                      onChange={(event) => setCashConfirmValue(event.target.value)}
                      placeholder="0,00"
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    />
                  </label>
                  <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700">
                    {cashValid
                      ? `Troco: ${formatCurrency(changeValue)}`
                      : 'Informe um valor válido'}
                  </div>
                </div>
                {!cashValid && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    O valor recebido precisa ser maior ou igual ao total.
                  </p>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={closeOrderOverlays}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={!cashValid || updating === confirmModal?.id}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updating === confirmModal?.id ? (
                  <span className="inline-flex items-center gap-2">
                    <ArrowsClockwise size={14} weight="duotone" className="animate-spin" />
                    Confirmando...
                  </span>
                ) : (
                  confirmModal.alreadyPaid ? 'Pedido retirado' : 'Pagamento recebido'
                )}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {activeTab === 'inroute' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Pedidos em deslocamento e postagens despachadas.
          </div>
          {queueLoadingState.showInRouteSkeleton ? (
            <QueueLoadingSkeleton variant="route" />
          ) : inRouteQueue.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Nenhum pedido em rota agora.
            </div>
          ) : (
            <div
              className={`grid gap-3 xl:gap-4 ${
                tvMode
                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
              }`}
            >
              {inRouteQueue.map((order) => {
                const isDispatched = String(order?.status || '').toLowerCase() === 'dispatched';
                return (
                <div
                  key={order.id}
                  className={`relative w-full max-w-full p-3 rounded-2xl border border-l-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] ${
                    isDispatched
                      ? 'border-l-indigo-400 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30'
                      : 'border-l-blue-400 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {order.customerName || 'Cliente'}
                      </p>
                      {order.phone ? <p className="text-[11px] text-slate-500">{order.phone}</p> : null}
                      <p className="text-[11px] text-slate-400">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isDispatched
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isDispatched ? <Package size={11} weight="duotone" /> : <Truck size={11} weight="duotone" />}
                      {isDispatched ? 'Despachado' : 'Em rota'}
                    </span>
                  </div>
                  {isDispatched ? (
                    <div className="mt-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                      Envio postal postado. Aguardando entrega da transportadora.
                    </div>
                  ) : null}
                  {isDispatched && order?.shipment?.trackingCode ? (
                    <div className="mt-2 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                      Código de rastreio: <span className="font-semibold">{order.shipment.trackingCode}</span>
                    </div>
                  ) : null}

                  {formatAddress(order.address || order.deliveryAddress) ? (
                    <div className="mt-3 text-xs text-slate-600">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Entrega</p>
                      <p className="font-semibold text-slate-700">{formatAddress(order.address || order.deliveryAddress)}</p>
                    </div>
                  ) : null}

	                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
	                    <div className="flex-1 min-w-0">
	                      {renderMoneyBreakdown(order)}
	                    </div>
                      <div className="flex items-center gap-2">
                        {isDispatched ? (
                          <button
                            type="button"
                            onClick={() => { void handlePostalMarkPosted(order); }}
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                          >
                            Editar rastreio
                          </button>
                        ) : null}
                        <a
                          href={`/pedido/${order.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                        >
                          Acompanhar
                        </a>
                      </div>
	                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-5">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: 'last7', label: 'Últimos 7 dias' },
                { id: 'custom', label: 'Calendário' },
              ].map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => setReportRange(period.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    reportRange === period.id
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {period.label}
                </button>
              ))}
              </div>
              {isAdminUser && (
                <button
                  type="button"
                  onClick={handleExportSalesCsv}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <CurrencyDollar size={13} weight="duotone" />
                  Exportar Excel (.csv)
                </button>
              )}
            </div>
            {reportRange === 'custom' && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(event) => setReportFrom(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                />
                <input
                  type="date"
                  value={reportTo}
                  onChange={(event) => setReportTo(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                />
              </div>
            )}
          </div>

          {queueLoadingState.showSalesSkeleton ? (
            <QueueLoadingSkeleton variant="sales" />
          ) : (
            <>
              {isAdminUser && (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
                  <p className="text-xs uppercase tracking-[0.18em] font-bold text-slate-500">Faturamento</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                    {formatCurrency(reportSummary.sales)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Total vendido no período</p>
                  <span className={`absolute right-4 top-4 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                    reportComparison.positive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {reportComparison.positive ? '▲' : '▼'} {reportComparison.hasBase ? `${Math.abs(reportComparison.deltaPct).toFixed(1)}%` : 'sem base'}
                  </span>
                </div>
              )}

              <div className={`mb-4 grid gap-2.5 ${isAdminUser ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {isAdminUser ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                        <Clock size={12} weight="duotone" /> Média por venda
                      </p>
                      <p className="text-base font-black text-slate-900 mt-1">
                        {formatCurrency(reportSummary.averageTicket)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                        <Hash size={12} weight="duotone" /> Qtd pedidos
                      </p>
                      <p className="text-base font-black text-slate-900 mt-1">{reportSummary.ordersCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                        <CheckSquare size={12} weight="duotone" /> Itens vendidos
                      </p>
                      <p className="text-base font-black text-slate-900 mt-1">{reportSummary.itemsCount}</p>
                      <button
                        type="button"
                        onClick={() => setSoldItemsModalOpen(true)}
                        className="mt-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                      >
                        Ver detalhamento
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                        <Truck size={12} weight="duotone" /> Total frete
                      </p>
                      <p className="text-base font-black text-slate-900 mt-1">
                        {formatCurrency(reportSummary.deliveryFees)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                        <CheckSquare size={12} weight="duotone" /> Itens vendidos
                      </p>
                      <p className="text-base font-black text-slate-900 mt-1">{reportSummary.itemsCount}</p>
                      <button
                        type="button"
                        onClick={() => setSoldItemsModalOpen(true)}
                        className="mt-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                      >
                        Ver detalhamento
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {pagedCompleted.map((order) => (
                  <div
                key={order.id}
                className="relative w-full max-w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-4 shadow-sm overflow-visible"
              >
                <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-emerald-400/10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-20 h-20 rounded-full bg-brand-primary/10 blur-2xl" />
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Pedido #{formatOrderDisplayId(order.id, storeSlug)}
                  </p>
                    <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                  </div>
                  {(() => {
                    const statusMeta = getStatusStyles(order.status, order.type, order);
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    {order.customerName || order.name || 'Cliente'}
                  </p>
	                  {(() => {
	                    const meta = orderTypeMeta(order);
	                    return (
	                      <span
	                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${meta.pill}`}
	                      >
	                        {meta.icon}
	                        <span>{meta.label}</span>
	                      </span>
	                    );
	                  })()}
                  {order.phone && <p>{order.phone}</p>}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const paymentMeta = getPaymentMethodMeta(order.payment);
                      return (
                        <>
                          {paymentMeta.icon && (
                            <img src={paymentMeta.icon} alt={paymentMeta.label} className="h-4 w-4 object-contain" />
                          )}
                          <span>{paymentMeta.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {(order.items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                      <span className="truncate">
                        {item.qty}x {item.name}
                        {formatItemOptions(item) ? ` (${formatItemOptions(item)})` : ''}
                      </span>
                      <span className="font-semibold text-slate-700">
                      {(() => {
                        const promoMeta = resolvePromoMeta(item);
                        const total = promoMeta.unitPrice * item.qty;
                        return (
                          <span className="flex flex-col items-end text-[11px] font-semibold">
                            {promoMeta.promoActive && promoMeta.originalPrice ? (
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatCurrency(promoMeta.originalPrice * item.qty)}
                              </span>
                            ) : null}
                            <span className={promoMeta.promoActive ? 'text-emerald-600' : 'text-slate-700'}>
                              {formatCurrency(total)}
                            </span>
                          </span>
                        );
                      })()}
                      </span>
                    </div>
                  ))}
                  {(order.items || []).length > 3 && (
                    <p className="text-[11px] text-slate-400">
                      + {(order.items || []).length - 3} itens
                    </p>
                  )}
                </div>

	                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
	                  <div className="w-full">
	                    {renderMoneyBreakdown(order)}
	                  </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/pedido/${order.id}`}
                        className="text-xs font-semibold text-brand-primary hover:underline"
                      >
                        Ver pedido
                      </a>
                      <button
                        type="button"
                        onClick={() => openReopenModal(order)}
                        className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-all"
                      >
                        Reabrir
                      </button>
                    </div>
	                </div>
                  </div>
                ))}

                {reportCompleted.length === 0 && (
                  <div className="col-span-full text-center text-slate-500 py-8 border border-dashed rounded-xl bg-slate-50">
                    <div className="mx-auto max-w-sm space-y-2">
                      <div className="text-4xl">✅</div>
                      <p className="text-sm font-semibold text-slate-700">Nenhum pedido finalizado hoje.</p>
                      <p className="text-xs text-slate-500">
                        Os pedidos prontos vão aparecer aqui quando forem concluídos.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {reportCompleted.length > completedPageSize && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Pagina {completedPage} de {completedTotalPages}</span>
                    <label className="flex items-center gap-2">
                      <span>Por pagina</span>
                      <PremiumDropdown
                        value={String(completedPageSize)}
                        onChange={(nextValue: string) => setCompletedPageSize(Number(nextValue))}
                        options={[5, 9, 12, 15].map((size) => ({
                          value: String(size),
                          label: String(size),
                        }))}
                        className="w-[110px]"
                        menuClassName="max-h-40"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompletedPage((prev) => Math.max(1, prev - 1))}
                      disabled={completedPage <= 1}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedPage((prev) => Math.min(completedTotalPages, prev + 1))}
                      disabled={completedPage >= completedTotalPages}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Proxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}
      {soldItemsModalOpen && createPortal(
        <div className="fixed inset-0 z-[10010] bg-slate-900/45 backdrop-blur-sm p-3 sm:p-6">
          <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden pb-16 sm:pb-0">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-black text-slate-900">Itens vendidos</p>
                <p className="text-xs text-slate-500">
                  Total no período: <span className="font-bold text-slate-700">{reportSummary.itemsCount}</span> {reportSummary.itemsCount === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSoldItemsModalOpen(false)}
                className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Fechar relatório de itens vendidos"
                title="Fechar"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 minimal-scrollbar space-y-2">
              {soldItemsBreakdown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Sem itens vendidos no período selecionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {soldItemsBreakdown.map((entry, index) => {
                    const rank = index + 1;
                    const topQty = Number(soldItemsBreakdown?.[0]?.qty || 0);
                    const entryQty = Number(entry?.qty || 0);
                    const progressPct = topQty > 0 ? Math.max(4, Math.round((entryQty / topQty) * 100)) : 0;
                    const rankToneClass =
                      rank <= 4
                        ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                        : rank <= 8
                          ? 'bg-white text-[#E65100] border-[#E65100]'
                          : 'bg-slate-100 text-slate-500 border-slate-200';
                    return (
                    <div
                      key={entry.name}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${rankToneClass}`}>
                        {rank}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-sm font-bold text-slate-900">{entry.name}</p>
                        <div className="h-1 w-full overflow-hidden rounded-[4px] bg-[#EEEEEE]">
                          <div
                            className="h-full rounded-[4px] bg-[#2F9DF7] transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="shrink-0 text-[1.1rem] font-black text-slate-900">{entry.qty}</span>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sm:hidden fixed inset-x-3 bottom-3 z-[10011]">
              <button
                type="button"
                onClick={() => setSoldItemsModalOpen(false)}
                className="h-12 w-full rounded-xl bg-[#ea580c] text-white text-sm font-black uppercase tracking-[0.04em] shadow-[0_20px_32px_-22px_rgba(234,88,12,0.95)]"
              >
                Fechar relatório
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {catalogPickerModal.open && createPortal(
        <div className="fixed inset-0 z-[10030] bg-slate-900/45 backdrop-blur-sm p-3 sm:p-6">
          <div className="mx-auto h-full w-full max-w-3xl rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">Catálogo completo</p>
                <p className="text-xs font-semibold text-slate-500">Selecione um item para incluir no pedido</p>
              </div>
              <button
                type="button"
                onClick={() => setCatalogPickerModal({ open: false, orderId: null, query: "" })}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm hover:bg-slate-50"
                aria-label="Fechar catálogo"
              >
                <X size={16} weight="bold" />
                <span className="hidden min-[360px]:inline">Fechar</span>
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <input
                value={catalogPickerModal.query}
                onChange={(event) => setCatalogPickerModal((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Buscar no catálogo..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.entries(
                (visibleQueueProducts || [])
                  .filter((product: any) => fuzzyIncludes(product?.name || "", catalogPickerModal.query))
                  .reduce((acc: Record<string, any[]>, product: any) => {
                    const category = String(product?.category || "Sem categoria");
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(product);
                    return acc;
                  }, {})
              ).map(([category, list]: any) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs uppercase tracking-[0.16em] font-bold text-slate-500">{category}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((product: any) => (
                      <button
                        key={String(product.id)}
                        type="button"
                        data-testid="admin-catalog-product"
                        onClick={() => {
                          if (!catalogPickerModal.orderId) return;
                          setSelectedProducts((prev: any) => ({ ...prev, [catalogPickerModal.orderId as string]: product.id }));
                          handleAddItem(catalogPickerModal.orderId, product.id);
                          setCatalogPickerModal({ open: false, orderId: null, query: "" });
                        }}
                        className="inline-flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        <ProductThumb product={product} className="h-14 w-14 rounded-xl" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{product.name}</span>
                          {product.category ? (
                            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">{product.category}</span>
                          ) : null}
                          <span className="mt-1 block text-xs font-bold text-amber-700">{formatCurrency(product.price)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {visibleQueueProducts.filter((product: any) => fuzzyIncludes(product?.name || "", catalogPickerModal.query)).length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Nenhum item encontrado.</p>
                  <button
                    type="button"
                    onClick={() => openManualItemModal(String(catalogPickerModal.orderId || ""), catalogPickerModal.query)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.1em] text-amber-700 hover:bg-amber-100"
                  >
                    Criar item avulso
                  </button>
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white/95 p-3 sm:hidden">
              <button
                type="button"
                onClick={() => setCatalogPickerModal({ open: false, orderId: null, query: "" })}
                className="h-11 w-full rounded-xl bg-slate-900 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_30px_-22px_rgba(15,23,42,0.55)]"
              >
                Fechar catálogo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {manualItemModal.open && createPortal(
        <div className="fixed inset-0 z-[10040] flex items-end bg-slate-900/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <div className="mx-auto flex max-h-[calc(100svh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-t-[1.6rem] border border-slate-200 bg-white shadow-2xl sm:rounded-[1.6rem]">
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">{manualItemModal.title || "Adicionar item avulso"}</p>
                {manualItemModal.helper ? (
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{manualItemModal.helper}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={manualItemModal.loading}
                onClick={closeManualItemModal}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Fechar item avulso"
              >
                <X size={16} weight="bold" />
                <span className="hidden min-[360px]:inline">Fechar</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do item</label>
                <input
                  value={manualItemModal.name}
                  onChange={(event) => setManualItemModal((prev) => ({ ...prev, name: event.target.value, error: "" }))}
                  placeholder="Ex: Sobremesa da casa"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor unitário (R$)</label>
                  <input
                    value={manualItemModal.price}
                    onChange={(event) => setManualItemModal((prev) => ({ ...prev, price: event.target.value, error: "" }))}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {manualItemModal.quantityLabel || "Quantidade"}
                  </label>
                  <input
                    value={manualItemModal.quantity}
                    onChange={(event) => setManualItemModal((prev) => ({ ...prev, quantity: event.target.value, error: "" }))}
                    placeholder="1"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>
              {(() => {
                const preview = getManualCouvertPreview();
                if (!preview) return null;
                return (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-amber-800">
                        {renderFontAwesomeIcon("fa-music")}
                        Cobrança do couvert
                      </span>
                      <strong className="shrink-0 text-sm font-black text-slate-950">
                        {formatCurrency(preview.total)}
                      </strong>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-amber-900/80">
                      {preview.quantity} {preview.peopleLabel} x {formatCurrency(preview.unitPrice)} por pessoa.
                    </p>
                  </div>
                );
              })()}
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                O item fica interno da operação e não aparece no cardápio público.
              </div>
              {manualItemModal.error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {manualItemModal.error}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-2 pt-1 sm:flex sm:items-center sm:justify-end">
                <button
                  type="button"
                  disabled={manualItemModal.loading}
                  onClick={closeManualItemModal}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:h-10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateManualItem}
                  disabled={manualItemModal.loading}
                  className="h-11 rounded-xl border border-amber-300 bg-amber-500 px-3 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60 sm:h-10"
                >
                  {manualItemModal.loading ? "Salvando..." : (manualItemModal.ctaLabel || "Salvar e incluir")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {isAdminUser && closeDayModalOpen && createPortal(
        <div className="fixed inset-0 z-[10020]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => setCloseDayModalOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Fechamento do dia</p>
                  <p className="text-xs text-slate-500">
                    {new Date().toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCloseDayModalOpen(false)}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Fechar fechamento do dia"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Total de pedidos</span>
                  <span className="text-base font-black text-slate-900">{dailySalesSummary.orders}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Pix</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(dailySalesSummary.pix)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Dinheiro</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(dailySalesSummary.cash)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">Cartão</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(dailySalesSummary.card)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-700">Faturamento total</span>
                  <span className="text-xl font-black text-emerald-800">{formatCurrency(dailySalesSummary.total)}</span>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCloseDayModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handlePrintDailySummary}
                  disabled={isPrintingDaySummary}
                  className="h-10 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isPrintingDaySummary ? 'Imprimindo...' : 'Imprimir Fechamento'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {bulkFinalizeModalOpen && createPortal(
        <div className="fixed inset-0 z-[10025]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => !bulkFinishing && setBulkFinalizeModalOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Finalização rápida</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirme para encerrar todos os pedidos ativos de uma vez.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkFinalizeModalOpen(false)}
                  disabled={bulkFinishing}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Fechar finalização rápida"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">Pedidos selecionados para finalizar</span>
                  <span className="text-lg font-black text-emerald-800">{selectedBulkOrders.length}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Esta ação registra como pago e finalizado. Use quando a cobrança já foi concluída e você quer encerrar rápido sem passar por cada etapa.
                </p>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkFinalizeModalOpen(false)}
                  disabled={bulkFinishing}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeAllReady}
                  disabled={bulkFinishing || selectedBulkOrders.length === 0}
                  className="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {bulkFinishing ? 'Encerrando...' : `Finalizar ${selectedBulkOrders.length} selecionados`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {quickFinalizeModal.open && createPortal(
        <div className="fixed inset-0 z-[10026]">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={closeQuickFinalizeModal} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Finalizar pedido agora</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pedido #{formatOrderDisplayId(quickFinalizeModal.order?.id, storeSlug)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeQuickFinalizeModal}
                  disabled={quickFinalizeModal.loading}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Fechar finalização rápida do pedido"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-slate-700">
                  Isso vai marcar este pedido como <span className="font-bold">pago e finalizado</span> agora, sem passar pelas etapas intermediárias.
                </p>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeQuickFinalizeModal}
                  disabled={quickFinalizeModal.loading}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleQuickFinalize}
                  disabled={quickFinalizeModal.loading}
                  className="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {quickFinalizeModal.loading ? 'Finalizando...' : 'Finalizar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {reopenModal.open && createPortal(
        <div className="fixed inset-0 z-[10028]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={closeReopenModal}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Reabrir pedido</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pedido #{formatOrderDisplayId(reopenModal.order?.id, storeSlug)} voltará para produção.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeReopenModal}
                  disabled={reopenModal.loading}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Fechar reabertura"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {isAdminUser
                    ? 'Você está como Admin. A reabertura será autorizada direto.'
                    : 'Para operador, informe as credenciais de um Admin da mesma loja.'}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Motivo (opcional)</label>
                  <input
                    value={reopenModal.reason}
                    onChange={(event) => setReopenModal((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="Ex.: faltou item no pedido"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                {!isAdminUser && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Admin (e-mail ou usuário)</label>
                      <input
                        value={reopenModal.adminIdentifier}
                        onChange={(event) => setReopenModal((prev) => ({ ...prev, adminIdentifier: event.target.value, error: '' }))}
                        placeholder="admin@loja.com"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Senha do Admin</label>
                      <input
                        type="password"
                        value={reopenModal.adminPassword}
                        onChange={(event) => setReopenModal((prev) => ({ ...prev, adminPassword: event.target.value, error: '' }))}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                  </div>
                )}
                {reopenModal.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {reopenModal.error}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReopenModal}
                  disabled={reopenModal.loading}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReopen}
                  disabled={reopenModal.loading}
                  className="h-10 rounded-xl bg-amber-500 px-3 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {reopenModal.loading ? 'Reabrindo...' : 'Confirmar reabertura'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {cancelOrderModal.open && createPortal(
        <div className="fixed inset-0 z-[10029]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={closeCancelOrderModal}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Cancelar pedido</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pedido #{formatOrderDisplayId(cancelOrderModal.order?.id, storeSlug)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCancelOrderModal}
                  disabled={cancelOrderModal.loading}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Fechar cancelamento"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Motivo do cancelamento</label>
                  <textarea
                    value={cancelOrderModal.reason}
                    onChange={(event) => setCancelOrderModal((prev) => ({ ...prev, reason: event.target.value, error: '' }))}
                    placeholder="Ex.: cliente desistiu"
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                {cancelOrderModal.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {cancelOrderModal.error}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCancelOrderModal}
                  disabled={cancelOrderModal.loading}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelOrder}
                  disabled={cancelOrderModal.loading}
                  className="h-10 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {cancelOrderModal.loading ? 'Cancelando...' : 'Cancelar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {printSelectionModal.open && createPortal(
        <div className="fixed inset-0 z-[10030]">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={closePrintSelectionModal}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-4">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">O que deseja imprimir?</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escolha entre enviar apenas os novos itens para a cozinha ou imprimir o pedido completo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePrintSelectionModal}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Fechar seleção de impressão"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {printSelectionModal.hasPrintedItems && !printSelectionModal.hasNewItems && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                    Todos os itens ja foram impressos neste pedido.
                  </div>
                )}
                <button
                  type="button"
                  disabled={!printSelectionModal.hasNewItems || isGeneratingPrint}
                  onClick={() => handleSelectPrintMode('new')}
                  className="w-full h-11 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {printSelectionModal.hasNewItems ? 'Imprimir Apenas Novos' : 'Sem itens novos para imprimir'}
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPrint}
                  onClick={() => handleSelectPrintMode('all')}
                  className="w-full h-11 rounded-xl border border-amber-300 bg-white text-amber-700 text-sm font-semibold hover:bg-amber-50"
                >
                  Imprimir Tudo
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
    </>
  );
};
