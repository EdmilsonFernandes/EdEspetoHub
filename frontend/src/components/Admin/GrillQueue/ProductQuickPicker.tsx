// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown } from "@phosphor-icons/react";
import { formatCurrency } from "../../../utils/format";
import { filterAdminQueueProducts } from "../../../utils/adminQueueUx";
import { ProductThumb } from "./ProductThumb";

export const ProductQuickPicker = ({
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
