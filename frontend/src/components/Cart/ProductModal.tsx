// @ts-nocheck

import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/format";

export interface ProductModalProps {

    product: any | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: any, quantity: number, options?: Record<string, any>) => void;

 }

export const ProductModal = ({ product, isOpen, onClose, onAddToCart }: ProductModalProps) => {
  const [cookingPoint, setCookingPoint] = useState("ao ponto");
  const [passSkewer, setPassSkewer] = useState(false);

  const isEspetoCategory = (category: any) => {
  const normalized = (category || "").toString().trim().toLowerCase();
  return normalized.includes("espeto");
};
  const showEspetoOptions = product ? isEspetoCategory(product.category) : false;

  useEffect(() => {
    setCookingPoint("ao ponto");
    setPassSkewer(false);
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
            <Plus size={18} weight="bold" />
            Adicionar ao pedido
          </button>
        </div>
      </div>
    </div>
  );
};
