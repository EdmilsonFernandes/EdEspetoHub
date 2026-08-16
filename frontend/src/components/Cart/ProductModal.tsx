// @ts-nocheck

import { ForkKnife, Minus, Plus, Sparkle, X } from "@phosphor-icons/react";
import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/format";
import {
  getModifiersTotal,
  getModifiersSignature,
  normalizeProductModifiers,
  normalizeSelectedModifiers,
} from "../../utils/productModifiers";

export interface ProductModalProps {
  product: any | null;
  cart?: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: any, quantity: number, options?: Record<string, any>) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
}

export const ProductModal = ({
  product,
  cart = {},
  isOpen,
  onClose,
  onAddToCart,
  readOnly = false,
  readOnlyMessage = 'Pedidos apenas no balcão.',
}: ProductModalProps) => {
  const isNativePlatform = Capacitor.isNativePlatform();
  const [cookingPoint, setCookingPoint] = useState("ao ponto");
  const [passSkewer, setPassSkewer] = useState(false);
  const [modifierCounts, setModifierCounts] = useState<Record<string, number>>({});
  const [itemQty, setItemQty] = useState(1);

  const promoPrice =
    product?.promoActive && product?.promoPrice && Number(product?.promoPrice) > 0
      ? Number(product.promoPrice)
      : null;
  const basePrice = promoPrice || Number(product?.price) || 0;
  const availableModifiers = normalizeProductModifiers(product?.modifiers || []).filter(
    (item) => item.active !== false
  );
  const selectedModifiers = normalizeSelectedModifiers(
    availableModifiers
      .filter((item) => Number(modifierCounts[item.id] || 0) > 0)
      .map((item) => ({ ...item, quantity: Number(modifierCounts[item.id] || 1) })),
    availableModifiers
  );
  const selectedModifiersCount = selectedModifiers.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0
  );
  const modifiersTotal = getModifiersTotal(selectedModifiers);
  const unitFinalPrice = basePrice + modifiersTotal;
  const totalFinalPrice = unitFinalPrice * itemQty;
  const subtotalAmount = itemQty > 0 ? unitFinalPrice * itemQty : 0;

  const isEspetoCategory = (category: any) =>
    (category || "").toString().trim().toLowerCase().includes("espeto");
  const showEspetoOptions = product ? isEspetoCategory(product.category) : false;
  const hasSelectableOptions =
    showEspetoOptions ||
    (Array.isArray(product?.modifiers) && product.modifiers.some((modifier: any) => modifier?.active !== false));
  const selectedOptions =
    selectedModifiers.length > 0
      ? { ...(showEspetoOptions ? { cookingPoint, passSkewer } : {}), selectedModifiers }
      : showEspetoOptions
      ? { cookingPoint, passSkewer }
      : undefined;
  const selectedSignature = getModifiersSignature(selectedModifiers);
  const currentSelectionQty = Object.values(cart || {}).reduce((acc: number, entry: any) => {
    if (!entry || String(entry?.id) !== String(product?.id)) return acc;
    const samePoint = (entry?.cookingPoint || "") === (showEspetoOptions ? cookingPoint : "");
    const sameSkewer = Boolean(entry?.passSkewer) === (showEspetoOptions ? Boolean(passSkewer) : false);
    const entrySignature = getModifiersSignature(entry?.selectedModifiers || []);
    if (samePoint && sameSkewer && entrySignature === selectedSignature) {
      return acc + Number(entry?.qty || 0);
    }
    return acc;
  }, 0);

  useEffect(() => {
    setCookingPoint("ao ponto");
    setPassSkewer(false);
    setModifierCounts({});
  }, [product?.id]);

  useEffect(() => {
    if (!isOpen) return;
    setItemQty(currentSelectionQty > 0 ? currentSelectionQty : 1);
  }, [isOpen, product?.id, currentSelectionQty]);

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) setIsAnimating(true);
  }, [isOpen]);

  const handleClose = () => {
    setItemQty(1);
    setModifierCounts({});
    setCookingPoint("ao ponto");
    setPassSkewer(false);
    setIsAnimating(false);
    setTimeout(() => onClose(), 200);
  };

  const handleCloseImmediate = () => {
    setItemQty(1);
    setModifierCounts({});
    setCookingPoint("ao ponto");
    setPassSkewer(false);
    setIsAnimating(false);
    onClose();
  };

  const incrementModifier = (modifierId: string) => {
    setModifierCounts((prev) => {
      const current = Number(prev[modifierId] || 0);
      return { ...prev, [modifierId]: Math.min(20, current + 1) };
    });
  };

  const decrementModifier = (modifierId: string) => {
    setModifierCounts((prev) => {
      const current = Number(prev[modifierId] || 0);
      const next = Math.max(0, current - 1);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[modifierId];
        return copy;
      }
      return { ...prev, [modifierId]: next };
    });
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 z-[260] flex items-end sm:items-center justify-center transition-opacity duration-200 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}
      onClick={handleClose}
    >
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white sm:max-w-md sm:rounded-[1.75rem] transition-all duration-200 ${
          isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ maxHeight: '92dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image + close button — altura adaptiva */}
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.7)] sm:hidden"
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar detalhes do item"
            className="absolute right-3 top-3 z-10 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/35 bg-black/42 px-3.5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 active:scale-95"
          >
            <X size={18} weight="bold" />
            <span>Fechar</span>
          </button>

          {product?.imageUrl ? (
            <img
              draggable={false}
              src={product.imageUrl}
              alt={product.name}
              className="h-40 w-full object-cover sm:h-52"
            />
          ) : (
            <div className="flex h-36 w-full items-center justify-center bg-slate-100 sm:h-48 text-slate-300">
              <ForkKnife size={28} weight="duotone" />
            </div>
          )}
        </div>

        {/* Conteúdo scrollável */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={`space-y-3 px-4 pt-4 sm:px-5 sm:pt-5 ${readOnly ? 'pb-6' : isNativePlatform ? 'pb-28' : 'pb-24'}`}>

            {/* Nome + preço */}
            <div>
              <h3 className="text-[1.05rem] font-bold leading-snug text-gray-900 sm:text-xl">
                {product?.name}
              </h3>
              {promoPrice ? (
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-400 line-through">
                    {formatCurrency(product?.price)}
                  </span>
                  <span className="text-[1.3rem] font-bold text-brand-primary sm:text-2xl">
                    {formatCurrency(promoPrice)}
                  </span>
                </div>
              ) : (
                <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                  {!readOnly && hasSelectableOptions && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      A partir de
                    </span>
                  )}
                  <span className="text-[1.3rem] font-bold text-brand-primary sm:text-2xl">
                    {formatCurrency(product?.price)}
                  </span>
                </p>
              )}
            </div>

            {/* Descrição */}
            {product?.desc && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-gray-700">Descrição</h4>
                <p className="text-sm leading-relaxed text-slate-500">{product.desc}</p>
              </div>
            )}

            {/* Opções de espeto */}
            {!readOnly && showEspetoOptions && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Ponto da carne</label>
                  <select
                    value={cookingPoint}
                    onChange={(event) => setCookingPoint(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary"
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
                  Passar farinha
                </label>
              </div>
            )}

            {/* Adicionais */}
            {!readOnly && availableModifiers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-slate-500">
                    <Sparkle size={13} weight="duotone" />
                    Adicionais
                  </h4>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {selectedModifiersCount} selecionado{selectedModifiersCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Cada adicional selecionado soma no valor final.</p>
                <div className="space-y-2">
                  {availableModifiers.map((modifier) => {
                    const qty = Number(modifierCounts[modifier.id] || 0);
                    const checked = qty > 0;
                    return (
                      <div
                        key={modifier.id}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          checked
                            ? "border-brand-primary bg-brand-primary-soft/40 shadow-[inset_0_0_0_1px_rgba(234,88,12,0.25)]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {/* Layout: nome à esquerda, preço + controles empilhados à direita */}
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`truncate font-semibold leading-tight ${checked ? "text-brand-primary" : "text-slate-800"}`}>
                              {modifier.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">Adicionar ao item</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className="text-sm font-bold text-slate-700">
                              + {formatCurrency(modifier.price)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => decrementModifier(modifier.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 transition active:scale-90"
                                aria-label={`Remover ${modifier.name}`}
                              >
                                <Minus size={11} weight="bold" />
                              </button>
                              <span className="min-w-[22px] text-center text-sm font-extrabold text-slate-800">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementModifier(modifier.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-primary bg-brand-primary text-sm font-bold text-white transition active:scale-90"
                                aria-label={`Adicionar ${modifier.name}`}
                              >
                                <Plus size={11} weight="bold" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subtotal */}
            {!readOnly && (availableModifiers.length > 0 || showEspetoOptions) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700">Subtotal do item</span>
                  <span className="shrink-0 text-base font-bold text-slate-900">
                    {formatCurrency(subtotalAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Read-only */}
            {readOnly && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {readOnlyMessage}
              </div>
            )}
          </div>
        </div>

        {/* Barra de ação — sticky no fundo */}
        {!readOnly && (
          <div className={`shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] ${isNativePlatform ? "ds-safe-bottom-lg" : ""}`}>
            <div className="flex items-center gap-3">
              {/* Controle de quantidade */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-slate-100 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setItemQty((prev) => Math.max(0, prev - 1))}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700 transition hover:bg-slate-50 active:scale-90"
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={14} weight="bold" />
                </button>
                <span className="min-w-[22px] text-center text-sm font-extrabold text-slate-900">
                  {itemQty}
                </span>
                <button
                  type="button"
                  onClick={() => setItemQty((prev) => Math.min(20, prev + 1))}
                  className="grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-white transition hover:brightness-95 active:scale-90"
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>

              {/* Botão adicionar */}
              <button
                onClick={() => {
                  if (itemQty === 0) {
                    if (currentSelectionQty > 0) {
                      onAddToCart?.(product, -currentSelectionQty, selectedOptions);
                    }
                    handleCloseImmediate();
                    return;
                  }
                  const deltaQty = currentSelectionQty > 0 ? itemQty - currentSelectionQty : itemQty;
                  if (deltaQty !== 0) {
                    onAddToCart?.(product, deltaQty, selectedOptions);
                  }
                  setItemQty(1);
                  handleClose();
                }}
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl px-4 py-3 font-semibold transition ${
                  itemQty > 0
                    ? "bg-orange-500 text-white shadow-md hover:bg-orange-600 active:scale-[0.98]"
                    : "border border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-300"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {itemQty > 0 ? (
                    <Plus size={15} weight="bold" className="shrink-0" />
                  ) : (
                    <Minus size={15} weight="bold" className="shrink-0" />
                  )}
                  <span className="truncate text-sm font-bold">
                    {itemQty > 0
                      ? currentSelectionQty > 0
                        ? "Atualizar"
                        : "Adicionar"
                      : "Remover do pedido"}
                  </span>
                </span>
                {itemQty > 0 && (
                  <span className="shrink-0 text-sm font-bold">
                    {formatCurrency(totalFinalPrice)}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
