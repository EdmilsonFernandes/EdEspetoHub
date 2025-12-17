import React from "react";

export const BrandingSettings = ({ branding, onChange }) => {
  const handleChange = (field, value) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const previewInitials = branding.brandName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (

    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Identidade visual</h3>
          <p className="text-sm text-gray-500">Deixe a loja com a cara do seu churrasco.</p>
        </div>
        <div className="text-xs text-gray-500 text-right">
          ID do espeto
          <div className="font-bold text-gray-800">{branding.espetoId || "não informado"}</div>
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
          <label className="text-sm font-semibold text-gray-700">ID do espeto (único para você)</label>
          <input
            type="text"
            value={branding.espetoId}
            onChange={(e) => handleChange("espetoId", e.target.value.replace(/\s+/g, "").toLowerCase())}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="meu-espeto"
          />
          <p className="text-xs text-gray-500">Use letras, números e traços. Ajuda a identificar sua conta em marketplaces.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Logo (URL)</label>
          <input
            type="url"
            value={branding.logoUrl}
            onChange={(e) => handleChange("logoUrl", e.target.value)}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="https://.../meu-logo.png"
          />
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
          <label className="text-sm font-semibold text-gray-700">Cor de apoio</label>
          <input
            type="color"
            value={branding.accentColor}
            onChange={(e) => handleChange("accentColor", e.target.value)}
            className="w-full border rounded-lg h-12 cursor-pointer"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mensagem do topo</label>
          <input
            type="text"
            value={branding.tagline}
            onChange={(e) => handleChange("tagline", e.target.value)}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="O melhor churrasco da região"
          />
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <h4 className="font-semibold text-gray-700 mb-3">Pré-visualização rápida</h4>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.brandName} className="w-full h-full object-cover rounded-xl" />
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
