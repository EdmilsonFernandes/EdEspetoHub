// @ts-nocheck
import { Package } from "@phosphor-icons/react";
import { resolveAssetUrl } from "../../../utils/resolveAssetUrl";

export const ProductThumb = ({ product, className = "h-9 w-9" }: any) => {
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
