// @ts-nocheck
import React, { useRef } from "react";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";

export const BrandingSettings = ({ branding, onChange, storeSlug }) => {
  const fileInputRef = useRef(null);
  const handleChange = (field, value) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const previewInitials = branding.brandName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logoPreview = resolveAssetUrl(branding.logoUrl) || branding.logoFile || "";

  return (

    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Identidade visual</h3>
          <p className="text-sm text-gray-500">Deixe a loja com a cara do seu churrasco.</p>
        </div>
        <div className="text-xs text-gray-500 text-right">
          Slug da loja
          <div className="font-bold text-gray-800">{storeSlug || "não informado"}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 p-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nome da marca</label>
          <input
            type="text"
            value={branding.brandName}
            onChange={(e) => handleChange("brandName", e.target.value)}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Ex: Churras do Lucas"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Slug da loja (fixo)</label>
          <input
            type="text"
            value={storeSlug || ""}
            readOnly
            className="w-full border rounded-lg p-3 bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">Use esse slug para acessar o painel e a vitrine.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Logo da loja</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo atual" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-gray-400">{previewInitials || "ES"}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    handleChange("logoFile", reader.result);
                    handleChange("logoUrl", reader.result);
                  };
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-gray-600"
              />
              <button
                type="button"
                onClick={() => {
                  handleChange("logoFile", "");
                  handleChange("logoUrl", "");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs text-gray-500 underline"
              >
                Remover logo
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG ou SVG. Recomendado 400x400.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Instagram</label>
          <input
            type="text"
            value={branding.instagram}
            onChange={(e) => handleChange("instagram", e.target.value.replace("@", ""))}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="@meuchurras"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Cor primária</label>
          <input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => handleChange("primaryColor", e.target.value)}
            className="w-full border rounded-lg h-12 cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Cor secundária</label>
          <input
            type="color"
            value={branding.secondaryColor}
            onChange={(e) => handleChange("secondaryColor", e.target.value)}
            className="w-full border rounded-lg h-12 cursor-pointer"
          />
        </div>

        <div className="md:col-span-2 space-y-2" />
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <h4 className="font-semibold text-gray-700 mb-3">Pré-visualização rápida</h4>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt={branding.brandName} className="w-full h-full object-cover rounded-xl" />
            ) : (
              previewInitials || "ES"
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900">{branding.brandName}</div>
            <div className="text-xs text-gray-500">@{branding.instagram || "seuinsta"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
