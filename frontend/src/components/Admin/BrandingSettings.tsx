// @ts-nocheck
import React, { useRef, useState } from "react";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";

const primaryPalette = [ '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0ea5e9', '#2563eb', '#7c3aed' ];
const secondaryPalette = [ '#111827', '#1f2937', '#334155', '#0f172a', '#0f766e', '#065f46', '#4b5563' ];

export const BrandingSettings = ({ branding, onChange, storeSlug, onSave, saving }) => {
  const fileInputRef = useRef(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    identity: true,
    promo: true,
    contact: true,
    colors: true,
    access: true,
  });
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
      <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-white via-white to-red-50/60">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Identidade visual</h3>
        <p className="text-sm text-gray-500">Deixe a loja com a cara do seu churrasco.</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80">
          <button
            type="button"
            onClick={() => setSectionsOpen((prev) => ({ ...prev, identity: !prev.identity }))}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">Identidade da Marca</p>
              <p className="text-xs text-gray-500">Nome, Instagram, descrição e logo da sua marca.</p>
            </div>
            <span className="text-xs text-gray-500 sm:hidden">{sectionsOpen.identity ? 'Fechar' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.identity ? 'block' : 'hidden'} sm:block px-4 pb-4 sm:px-5 sm:pb-5 space-y-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Nome da marca</label>
            <input
              type="text"
              value={branding.brandName}
              onChange={(e) => handleChange("brandName", e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Ex: Chama do Sertao"
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
                placeholder="chamanoespeto"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Descrição da marca</label>
          <textarea
            value={branding.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors min-h-[110px]"
            placeholder="Ex: Espetos artesanais, cerveja trincando e atendimento rapido."
            maxLength={220}
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Mostra no portfolio da plataforma.</span>
            <span>{(branding.description || "").length}/220</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Logo da marca</label>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <label className="flex-1 w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 hover:border-brand-primary transition-colors text-center bg-white/70">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 mb-1">Clique para enviar o logo</p>
                <p className="text-xs text-gray-500">PNG ou JPG ate 5MB</p>
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
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-gray-200 flex-shrink-0 relative group shadow-sm">
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
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80">
          <button
            type="button"
            onClick={() => setSectionsOpen((prev) => ({ ...prev, promo: !prev.promo }))}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">Destaque do Dia</p>
              <p className="text-xs text-gray-500">Uma frase que vende no topo do cardápio.</p>
            </div>
            <span className="text-xs text-gray-500 sm:hidden">{sectionsOpen.promo ? 'Fechar' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.promo ? 'block' : 'hidden'} sm:block px-4 pb-4 sm:px-5 sm:pb-5 space-y-4`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Mensagem promocional</label>
              <textarea
                value={branding.promoMessage || ""}
                onChange={(e) => handleChange("promoMessage", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors min-h-[90px]"
                placeholder="Ex: Combo do dia: 2 espetos + refri por R$ 29,90"
                maxLength={120}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Aparece no topo do cardapio.</span>
                <span>{(branding.promoMessage || "").length}/120</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80">
          <button
            type="button"
            onClick={() => setSectionsOpen((prev) => ({ ...prev, contact: !prev.contact }))}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">Canais e Pagamento</p>
              <p className="text-xs text-gray-500">Contato oficial e recebimento via Pix.</p>
            </div>
            <span className="text-xs text-gray-500 sm:hidden">{sectionsOpen.contact ? 'Fechar' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.contact ? 'block' : 'hidden'} sm:block px-4 pb-4 sm:px-5 sm:pb-5 space-y-6`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email de contato</label>
              <input
                type="email"
                value={branding.contactEmail || ""}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="contato@chamanoespeto.com.br"
              />
              <p className="text-xs text-gray-500">Opcional, aparece para contato no cardápio.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Chave Pix da loja</label>
              <input
                type="text"
                value={branding.pixKey || ''}
                onChange={(e) => handleChange("pixKey", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Ex: +5511999999999 ou contato@pix.com"
              />
              <p className="text-xs text-gray-500">Usada para gerar o QR Code na confirmacao de pagamento. Telefone com DDD pode comecar com 0 que ajustamos para +55.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80">
          <button
            type="button"
            onClick={() => setSectionsOpen((prev) => ({ ...prev, colors: !prev.colors }))}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">Cores da Identidade</p>
              <p className="text-xs text-gray-500">Cria o clima visual da sua marca.</p>
            </div>
            <span className="text-xs text-gray-500 sm:hidden">{sectionsOpen.colors ? 'Fechar' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.colors ? 'block' : 'hidden'} sm:block px-4 pb-4 sm:px-5 sm:pb-5 space-y-6`}>
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
            <p className="text-xs text-gray-500">A cor principal define o destaque do cardapio.</p>
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
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80">
          <button
            type="button"
            onClick={() => setSectionsOpen((prev) => ({ ...prev, access: !prev.access }))}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">URL da Loja</p>
              <p className="text-xs text-gray-500">Link público e definitivo do cardápio.</p>
            </div>
            <span className="text-xs text-gray-500 sm:hidden">{sectionsOpen.access ? 'Fechar' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.access ? 'block' : 'hidden'} sm:block px-4 pb-4 sm:px-5 sm:pb-5 space-y-2`}>
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
        {onSave && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">
              Salve para aplicar todas as mudanças da identidade.
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
