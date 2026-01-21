// @ts-nocheck
import React, { useRef } from "react";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";

const primaryPalette = [ '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0ea5e9', '#2563eb', '#7c3aed' ];
const secondaryPalette = [ '#111827', '#1f2937', '#334155', '#0f172a', '#0f766e', '#065f46', '#4b5563' ];

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

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-white via-white to-red-50/60">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Identidade visual</h3>
        <p className="text-sm text-gray-500">Deixe a loja com a cara do seu churrasco.</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Nome da marca</label>
            <input
              type="text"
              value={branding.brandName}
              onChange={(e) => handleChange("brandName", e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Ex: Churras do Lucas"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Instagram</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
              <input
                type="text"
                value={branding.instagram}
                onChange={(e) => handleChange("instagram", e.target.value.replace("@", ""))}
                className="w-full border border-gray-200 rounded-xl p-3 pl-8 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="meuchurras"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Chave Pix da loja</label>
          <input
            type="text"
            value={branding.pixKey || ''}
            onChange={(e) => handleChange("pixKey", e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
            placeholder="Ex: +5511999999999 ou email@pix.com"
          />
          <p className="text-xs text-gray-500">Usada para gerar o QR Code na confirmação de pagamento.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Descrição da loja</label>
          <textarea
            value={branding.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors min-h-[110px]"
            placeholder="Uma frase curta para o portfolio."
            maxLength={220}
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Mostra no portfolio da plataforma.</span>
            <span>{(branding.description || "").length}/220</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Logo da loja</label>
          <div className="flex items-start gap-4">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 hover:border-brand-primary transition-colors text-center bg-white/70">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 mb-1">Clique para enviar</p>
                <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
              </div>
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
                className="hidden"
              />
            </label>
            {logoPreview && (
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-gray-200 flex-shrink-0 relative group shadow-sm">
                <img
                  src={logoPreview}
                  alt="Logo atual"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleChange("logoFile", "");
                    handleChange("logoUrl", "");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:-translate-y-0.5 active:scale-95"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Cor principal</label>
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="w-16 h-16 cursor-pointer block rounded-2xl border border-gray-200 shadow-sm"
            />
            <div className="flex flex-wrap gap-2">
              {primaryPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange("primaryColor", color)}
                  className={`w-9 h-9 rounded-full border-2 transition-all shadow-sm ${
                    branding.primaryColor === color ? 'border-gray-900 scale-110 ring-2 ring-gray-300' : 'border-gray-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">Escolha a cor principal da sua marca.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Cor secundária</label>
            <input
              type="color"
              value={branding.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="w-16 h-16 cursor-pointer block rounded-2xl border border-gray-200 shadow-sm"
            />
            <div className="flex flex-wrap gap-2">
              {secondaryPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange("secondaryColor", color)}
                  className={`w-9 h-9 rounded-full border-2 transition-all shadow-sm ${
                    branding.secondaryColor === color ? 'border-gray-900 scale-110 ring-2 ring-gray-300' : 'border-gray-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">Use um tom de apoio para fundos e detalhes.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Slug da loja (fixo)</label>
          <input
            type="text"
            value={storeSlug || ""}
            readOnly
            className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/80 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">Use esse slug para acessar o painel e a vitrine.</p>
        </div>
      </div>

      <div className="p-6 bg-gray-50/70 border-t">
        <h4 className="font-semibold text-gray-700 mb-3">Pré-visualização</h4>
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-md"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt={branding.brandName} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              previewInitials || "ES"
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900">{branding.brandName || "Sua Loja"}</div>
            <div className="text-xs text-gray-500">@{branding.instagram || "seuinsta"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
