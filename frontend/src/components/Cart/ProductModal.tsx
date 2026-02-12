// @ts-nocheck

import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/format";
import {
  getModifiersTotal,
  normalizeProductModifiers,
  normalizeSelectedModifiers,
} from "../../utils/productModifiers";

export interface ProductModalProps {

    product: any | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: any, quantity: number, options?: Record<string, any>) => void;

 }

export const ProductModal = ({ product, isOpen, onClose, onAddToCart }: ProductModalProps) => {
  const [cookingPoint, setCookingPoint] = useState("ao ponto");
  const [passSkewer, setPassSkewer] = useState(false);
  const [modifierCounts, setModifierCounts] = useState<Record<string, number>>({});
  const [itemQty, setItemQty] = useState(1);
  const promoPrice =
    product?.promoActive && product?.promoPrice && Number(product?.promoPrice) > 0
      ? Number(product.promoPrice)
      : null;
  const basePrice = promoPrice || Number(product?.price) || 0;
  const availableModifiers = normalizeProductModifiers(product?.modifiers || []).filter((item) => item.active !== false);
  const selectedModifiers = normalizeSelectedModifiers(
    availableModifiers
      .filter((item) => Number(modifierCounts[item.id] || 0) > 0)
      .map((item) => ({
        ...item,
        quantity: Number(modifierCounts[item.id] || 1),
      })),
    availableModifiers
  );
  const selectedModifiersCount = selectedModifiers.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0
  );
  const modifiersTotal = getModifiersTotal(selectedModifiers);
  const unitFinalPrice = basePrice + modifiersTotal;
  const totalFinalPrice = unitFinalPrice * itemQty;

  const isEspetoCategory = (category: any) => {
  const normalized = (category || "").toString().trim().toLowerCase();
  return normalized.includes("espeto");
};
  const showEspetoOptions = product ? isEspetoCategory(product.category) : false;

  useEffect(() => {
    setCookingPoint("ao ponto");
    setPassSkewer(false);
    setModifierCounts({});
    setItemQty(1);
  }, [product?.id]);

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
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
            <X size={16} weight="bold" />
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
            {promoPrice ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-slate-400 line-through">
                  {formatCurrency(product?.price)}
                </span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(promoPrice)}</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-brand-primary mt-1">{formatCurrency(product?.price)}</p>
            )}
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
          {availableModifiers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">Adicionais</h4>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {selectedModifiersCount} selecionado{selectedModifiersCount === 1 ? "" : "s"}
                </span>
              </div>
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
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-semibold ${checked ? "text-brand-primary" : "text-slate-800"}`}>
                            {modifier.name}
                          </p>
                          <p className="text-xs text-slate-500">Adicionar ao item</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">+ {formatCurrency(modifier.price)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => decrementModifier(modifier.id)}
                              className="h-7 w-7 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700"
                              aria-label={`Remover ${modifier.name}`}
                            >
                              -
                            </button>
                            <span className="min-w-[26px] text-center text-sm font-extrabold text-slate-800">{qty}</span>
                            <button
                              type="button"
                              onClick={() => incrementModifier(modifier.id)}
                              className="h-7 w-7 rounded-full border border-brand-primary bg-brand-primary text-sm font-bold text-white"
                              aria-label={`Adicionar ${modifier.name}`}
                            >
                              +
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
          {(availableModifiers.length > 0 || showEspetoOptions) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Subtotal do item</span>
                <span className="text-base font-bold text-slate-900">{formatCurrency(unitFinalPrice)}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const baseOptions = showEspetoOptions ? { cookingPoint, passSkewer } : {};
              const options =
                selectedModifiers.length > 0
                  ? { ...baseOptions, selectedModifiers }
                  : Object.keys(baseOptions).length
                  ? baseOptions
                  : undefined;
              onAddToCart(product, itemQty, options);
              handleClose();
            }}
            className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition"
          >
            <Plus size={18} weight="bold" />
            Adicionar • {formatCurrency(totalFinalPrice)}
          </button>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Quantidade</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setItemQty((prev) => Math.max(1, prev - 1))}
                className="h-8 w-8 rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700"
              >
                -
              </button>
              <span className="min-w-[24px] text-center text-sm font-extrabold text-slate-900">{itemQty}</span>
              <button
                type="button"
                onClick={() => setItemQty((prev) => Math.min(20, prev + 1))}
                className="h-8 w-8 rounded-full border border-brand-primary bg-brand-primary text-base font-bold text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
