// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { resolveAssetUrl } from "../../utils/resolveAssetUrl";
import { formatPhoneInput } from "../../utils/format";
import { addressLookupService } from "../../services/addressLookupService";
import { normalizeOrderNotificationDurationSeconds } from "../../utils/orderNotificationSound";

const primaryPalette = [ '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0ea5e9', '#2563eb', '#7c3aed' ];
const secondaryPalette = [ '#111827', '#1f2937', '#334155', '#0f172a', '#0f766e', '#065f46', '#4b5563' ];

export const BrandingSettings = ({
  branding,
  onChange,
  storeSlug,
  onSave,
  saving,
  title = "Identidade visual",
  subtitle = "Defina a presença digital da sua marca com elegância.",
  visibleSections,
  hideSectionTabs = false,
  expandVisibleSections = false,
}) => {
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [storeCepLoading, setStoreCepLoading] = useState(false);
  const [storeCepError, setStoreCepError] = useState("");
  const sectionTabs = [
    { key: "identity", label: "Identidade" },
    { key: "promo", label: "Promo" },
    { key: "contact", label: "Contato" },
    { key: "delivery", label: "Entrega" },
    { key: "colors", label: "Cores" },
    { key: "access", label: "Acesso" },
  ];
  const resolvedSections = (Array.isArray(visibleSections) && visibleSections.length > 0
    ? sectionTabs.filter((tab) => visibleSections.includes(tab.key))
    : sectionTabs);
  const visibleSectionsKey = resolvedSections.map((tab) => tab.key).join("|");
  const createSectionsOpen = () => {
    const visibleKeys = resolvedSections.map((tab) => tab.key);
    const firstVisibleKey = visibleKeys[0] || "identity";
    return {
      identity: expandVisibleSections ? visibleKeys.includes("identity") : firstVisibleKey === "identity",
      promo: expandVisibleSections ? visibleKeys.includes("promo") : firstVisibleKey === "promo",
      contact: expandVisibleSections ? visibleKeys.includes("contact") : firstVisibleKey === "contact",
      delivery: expandVisibleSections ? visibleKeys.includes("delivery") : firstVisibleKey === "delivery",
      colors: expandVisibleSections ? visibleKeys.includes("colors") : firstVisibleKey === "colors",
      access: expandVisibleSections ? visibleKeys.includes("access") : firstVisibleKey === "access",
    };
  };
  const [sectionsOpen, setSectionsOpen] = useState(createSectionsOpen);
  const isSectionVisible = (target) => resolvedSections.some((tab) => tab.key === target);
  const openSection = (target) => {
    setSectionsOpen({
      identity: target === "identity",
      promo: target === "promo",
      contact: target === "contact",
      delivery: target === "delivery",
      colors: target === "colors",
      access: target === "access",
    });
  };
  useEffect(() => {
    setSectionsOpen(createSectionsOpen());
  }, [visibleSectionsKey, expandVisibleSections]);
  const normalizeCep = (input = "") => {
    const digits = input.toString().replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };
  const parseAddress = (value = "") => {
    const raw = value.toString();
    const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
    const cepPart = parts.find((part) => /cep/i.test(part));
    const cepRaw = cepPart ? cepPart.replace(/cep/i, "").replace(/[:\-]/g, "").trim() : "";
    const cep = cepRaw ? normalizeCep(cepRaw) : "";
    // Keep CEP out of the "street" slot. If CEP is the only filled part, don't leak it into street/number.
    const nonCepParts = parts.filter((part) => !/cep/i.test(part));
    const streetPart = nonCepParts[0] || "";
    const streetMatch = streetPart.match(/^(.*?)(?:,\s*([^,]+))?$/);
    const street = (streetMatch?.[1] || "").trim();
    const number = (streetMatch?.[2] || "").trim();
    const neighborhood = nonCepParts[1] || "";
    const cityState = nonCepParts[2] || "";
    const cityStateMatch = cityState.match(/^(.*?)(?:\s*-\s*([A-Za-z]{2}))?$/);
    const city = (cityStateMatch?.[1] || "").trim();
    const state = (cityStateMatch?.[2] || "").trim();
    return {
      cep,
      street,
      number,
      neighborhood,
      complement: nonCepParts[3] || "",
      city,
      state,
    };
  };
  const buildAddressForm = (nextBranding) => {
    const parsed = parseAddress(nextBranding.address || "");
    return {
      ...parsed,
      city: String(nextBranding.city || parsed.city || "").trim(),
      state: String(nextBranding.state || parsed.state || "").trim().toUpperCase().slice(0, 2),
    };
  };
  const [addressForm, setAddressForm] = useState(() => buildAddressForm(branding));

  useEffect(() => {
    setAddressForm(buildAddressForm(branding));
  }, [branding.address, branding.city, branding.state]);
  const handleChange = (field, value) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };
  const handleAddressChange = (field, value) => {
    setAddressForm((prev) => {
      const next = {
        ...prev,
        [field]:
          field === "cep"
            ? normalizeCep(value)
            : field === "state"
            ? value.toString().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)
            : value,
      };
      const parts = [
        next.street && `${next.street}${next.number ? `, ${next.number}` : ""}`,
        next.neighborhood,
        next.city && next.state ? `${next.city} - ${next.state}` : next.city,
        next.complement,
        next.cep && `CEP ${next.cep}`,
      ].filter(Boolean);
      handleChange("address", parts.join(" | "));
      handleChange("city", next.city);
      handleChange("state", next.state);
      handleChange("lat", null);
      handleChange("lng", null);
      return next;
    });
  };

  const handleStoreCepLookup = async (cepValue?: string, forceOverwrite = false) => {
    const rawCep = (cepValue ?? addressForm.cep ?? "").toString().replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setStoreCepLoading(true);
    setStoreCepError("");
    try {
      const data = await addressLookupService.lookupZipCode(rawCep);
      setAddressForm((prev) => {
        const next = {
          ...prev,
          cep: normalizeCep(rawCep),
          street: forceOverwrite ? (data.street || "") : (prev.street || data.street || ""),
          neighborhood: forceOverwrite ? (data.district || "") : (prev.neighborhood || data.district || ""),
          city: forceOverwrite ? (data.city || "") : (prev.city || data.city || ""),
          state: forceOverwrite ? (data.state || "") : (prev.state || data.state || ""),
          complement: prev.complement || "",
        };
        const parts = [
          next.street && `${next.street}${next.number ? `, ${next.number}` : ""}`,
          next.neighborhood,
          next.city && next.state ? `${next.city} - ${next.state}` : next.city,
          next.complement,
          next.cep && `CEP ${next.cep}`,
        ].filter(Boolean);
        handleChange("address", parts.join(" | "));
        handleChange("city", next.city);
        handleChange("state", String(next.state || "").toUpperCase().slice(0, 2));
        handleChange("lat", data?.latitude ?? null);
        handleChange("lng", data?.longitude ?? null);
        return next;
      });
    } catch (error: any) {
      setStoreCepError(error?.message || "Não foi possível consultar o CEP agora.");
    } finally {
      setStoreCepLoading(false);
    }
  };

  const previewInitials = branding.brandName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logoPreview = resolveAssetUrl(branding.logoUrl) || branding.logoFile || "";
  const bannerPreview = resolveAssetUrl(branding.bannerUrl) || branding.bannerFile || "";
  const orderSoundValue = String(branding.orderNotificationSound || '').trim();
  const orderSoundIsCustom = /^(https?:\/\/|\/|data:|custom:)/i.test(orderSoundValue);
  return (

    <div className="bg-white/95 rounded-2xl shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)] border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {!hideSectionTabs && resolvedSections.length > 1 && (
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-full gap-2">
            {resolvedSections.map((tab) => {
              const active = sectionsOpen[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => openSection(tab.key)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                    active
                      ? "border-brand-primary/40 bg-brand-primary-soft text-brand-primary"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {isSectionVisible("identity") && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => openSection("identity")}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Identidade da marca</p>
                <p className="text-xs text-gray-500">Nome, Instagram, descrição, logo e banner.</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{sectionsOpen.identity ? 'Ativa' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.identity ? 'block' : 'hidden'} px-4 pb-4 sm:px-5 sm:pb-5 space-y-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nome da marca</label>
          <input
            type="text"
            value={branding.brandName}
            onChange={(e) => handleChange("brandName", e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Nome da loja"
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
                placeholder="janocaminho"
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
            placeholder="Descreva brevemente sua loja e seus diferenciais."
              maxLength={220}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Mostra no portfólio da plataforma.</span>
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
                <p className="text-sm text-gray-600 mb-1">Envie o logo da marca</p>
                <p className="text-xs text-gray-500">PNG ou JPG até 5MB</p>
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
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Banner da loja</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Posição do banner no painel</label>
              <select
                value={branding.bannerPosition || "center"}
                onChange={(e) => handleChange("bannerPosition", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
              >
                <option value="center">Centro (recomendado)</option>
                <option value="top">Topo</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 hover:border-brand-primary transition-colors text-center bg-white/70">
                <p className="text-sm text-gray-600 mb-1">Envie o banner da loja</p>
                <p className="text-xs text-gray-500">PNG ou JPG até 5MB</p>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    handleChange("bannerFile", reader.result);
                    handleChange("bannerUrl", reader.result);
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
            <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 min-h-[140px] relative group">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner da loja" className="w-full h-[180px] object-cover" />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-xs text-gray-500">
                  Sem banner configurado
                </div>
              )}
              {bannerPreview ? (
                <button
                  type="button"
                  onClick={() => {
                    handleChange("bannerFile", "");
                    handleChange("bannerUrl", "");
                    if (bannerInputRef.current) bannerInputRef.current.value = "";
                  }}
                  className="absolute inset-0 bg-black/45 text-white text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:-translate-y-0.5 active:scale-95"
                >
                  Remover banner
                </button>
              ) : null}
            </div>
          </div>
        </div>
          </div>
        </div>
        )}

        {isSectionVisible("promo") && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => openSection("promo")}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Destaque do dia</p>
                <p className="text-xs text-gray-500">Mensagem curta no topo da vitrine.</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{sectionsOpen.promo ? 'Ativa' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.promo ? 'block' : 'hidden'} px-4 pb-4 sm:px-5 sm:pb-5 space-y-4`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Mensagem promocional</label>
              <textarea
                value={branding.promoMessage || ""}
                onChange={(e) => handleChange("promoMessage", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors min-h-[90px]"
                placeholder="Oferta do dia: item + bebida por R$ 29,90"
                maxLength={120}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Aparece no topo da vitrine.</span>
                <span>{(branding.promoMessage || "").length}/120</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {isSectionVisible("contact") && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => openSection("contact")}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Canais e Pix</p>
                <p className="text-xs text-gray-500">Contato oficial, Instagram e recebimento manual.</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{sectionsOpen.contact ? 'Ativa' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.contact ? 'block' : 'hidden'} px-4 pb-4 sm:px-5 sm:pb-5 space-y-6`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email de contato</label>
              <input
                type="email"
                value={branding.contactEmail || ""}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="contato@janocaminho.com.br"
              />
              <p className="text-xs text-gray-500">Opcional, aparece na vitrine para contato.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Telefone da loja</label>
              <input
                type="text"
                value={branding.storePhone || ""}
                onChange={(e) => handleChange("storePhone", formatPhoneInput(e.target.value))}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-gray-500">Usado no contato oficial e WhatsApp da loja.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Chave Pix da loja</label>
              <input
                type="text"
                value={branding.pixKey || ''}
                onChange={(e) => handleChange("pixKey", e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="+5511999999999 ou contato@pix.com"
              />
              <p className="text-xs text-gray-500">Usada para gerar o QR Code na confirmação de pagamento. Telefone com DDD pode começar com 0 que ajustamos para +55.</p>
            </div>
          </div>
        </div>
        )}

        {isSectionVisible("delivery") && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => openSection("delivery")}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Endereço e logística</p>
                <p className="text-xs text-gray-500">Localização da loja, alcance local e envio postal.</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{sectionsOpen.delivery ? 'Ativa' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.delivery ? 'block' : 'hidden'} px-4 pb-4 sm:px-5 sm:pb-5 space-y-5`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Endereço da loja</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-gray-500">CEP</label>
                  <input
                    type="text"
                    value={addressForm.cep || ""}
                    onChange={(e) => handleAddressChange("cep", e.target.value)}
                    onBlur={(e) => handleStoreCepLookup(e.target.value, false)}
                    disabled={storeCepLoading}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="00000-000"
                  />
                  <button
                    type="button"
                    onClick={() => handleStoreCepLookup(addressForm.cep, true)}
                    disabled={storeCepLoading}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {storeCepLoading ? "Buscando..." : "Buscar CEP"}
                  </button>
                  {storeCepError && (
                    <p className="mt-1 text-xs text-rose-600">{storeCepError}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500">Rua / Avenida</label>
                  <input
                    type="text"
                    value={addressForm.street || ""}
                    onChange={(e) => handleAddressChange("street", e.target.value)}
                    disabled={storeCepLoading}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="Rua, avenida"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Número</label>
                  <input
                    type="text"
                    value={addressForm.number || ""}
                    onChange={(e) => handleAddressChange("number", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="Número"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Bairro</label>
                  <input
                    type="text"
                    value={addressForm.neighborhood || ""}
                    onChange={(e) => handleAddressChange("neighborhood", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="Bairro"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Complemento</label>
                  <input
                    type="text"
                    value={addressForm.complement || ""}
                    onChange={(e) => handleAddressChange("complement", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="Apto, bloco, referência"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Cidade</label>
                    <input
                      type="text"
                      value={addressForm.city || ""}
                      onChange={(e) => handleAddressChange("city", e.target.value)}
                      className={`w-full rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors ${
                        addressForm.city ? 'border border-gray-200' : 'border border-amber-300'
                      }`}
                      placeholder="Cidade"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">UF</label>
                    <input
                      type="text"
                      value={addressForm.state || ""}
                      onChange={(e) => handleAddressChange("state", e.target.value)}
                      className={`w-full rounded-xl p-3 bg-white/80 uppercase focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors ${
                        addressForm.state ? 'border border-gray-200' : 'border border-amber-300'
                      }`}
                      placeholder="UF"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">Usado para mostrar localização e validação de entrega. Cidade e UF são obrigatórias.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Envio postal (PAC/SEDEX)</p>
                  <p className="text-xs text-slate-500">Não altera retirada, mesa e entrega local.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={branding.postalEnabled === true}
                  onClick={() => handleChange("postalEnabled", !(branding.postalEnabled === true))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    branding.postalEnabled === true ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      branding.postalEnabled === true ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">CEP de origem do envio</label>
                  <input
                    type="text"
                    value={branding.postalOriginZip || ''}
                    onChange={(e) => handleChange("postalOriginZip", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <p className="text-[11px] text-slate-500">Obrigatório para cotar frete postal.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Raio de entrega (km)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="30"
                  value={branding.deliveryRadiusKm ?? ''}
                  onChange={(e) => handleChange("deliveryRadiusKm", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Ex: 5"
                />
                <p className="text-xs text-gray-500">Usaremos essa distância para mostrar sua loja para clientes próximos.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Frete fixo (R$)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={branding.deliveryFee ?? ''}
                  onChange={(e) => handleChange("deliveryFee", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="5,00"
                />
                <p className="text-xs text-gray-500">Mostrado no checkout quando o cliente escolhe entrega.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">SLA de preparo (min)</label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  value={branding.prepBaseMinutes ?? ''}
                  onChange={(e) => handleChange("prepBaseMinutes", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="20"
                />
                <p className="text-xs text-gray-500">Usado na fila para indicar atraso e atenção dos pedidos.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">SLA atenção (min)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={branding.prepAttentionMinutes ?? ''}
                  onChange={(e) => handleChange("prepAttentionMinutes", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="15"
                />
                <p className="text-xs text-gray-500">Quando passar desse tempo, o pedido fica em atenção.</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {isSectionVisible("colors") && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => openSection("colors")}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Cores da identidade</p>
                <p className="text-xs text-gray-500">Define o visual da sua vitrine.</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{sectionsOpen.colors ? 'Ativa' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.colors ? 'block' : 'hidden'} px-4 pb-4 sm:px-5 sm:pb-5 space-y-6`}>
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
            <p className="text-xs text-gray-500">A cor principal define os destaques da vitrine.</p>
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
        )}

        {isSectionVisible("access") && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => openSection("access")}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">URL da loja</p>
                <p className="text-xs text-gray-500">Link público definitivo da vitrine.</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{sectionsOpen.access ? 'Ativa' : 'Abrir'}</span>
          </button>
          <div className={`${sectionsOpen.access ? 'block' : 'hidden'} px-4 pb-4 sm:px-5 sm:pb-5 space-y-2`}>
            <label className="text-sm font-semibold text-gray-700">Slug da loja (fixo)</label>
            <input
              type="text"
              value={storeSlug || ""}
              readOnly
              className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/80 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">Use esse slug para acessar o painel e a vitrine.</p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Aceitar pedidos online</p>
                  <p className="text-xs text-slate-500">Desative para usar a vitrine apenas como cardápio.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={branding.isOrderingEnabled !== false}
                  onClick={() => handleChange("isOrderingEnabled", !(branding.isOrderingEnabled !== false))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    branding.isOrderingEnabled !== false ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      branding.isOrderingEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-800">Vinheta de novo pedido</p>
                <p className="text-xs text-slate-500">Define o som tocado quando um pedido novo entra na fila.</p>
              </div>
              <select
                value={orderSoundIsCustom ? 'custom' : (orderSoundValue || 'default')}
                onChange={(event) => {
                  const next = String(event.target.value || 'default');
                  if (next === 'default') {
                    handleChange('orderNotificationSound', '');
                    return;
                  }
                  if (next === 'custom') {
                    handleChange('orderNotificationSound', 'custom:');
                    return;
                  }
                  handleChange('orderNotificationSound', next);
                }}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white/90 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-colors text-sm"
              >
                <option value="default">Padrão (apito clássico)</option>
                <option value="preset:chime">Vinheta suave</option>
                <option value="preset:triple">Vinheta destaque</option>
                <option value="preset:alert">Vinheta urgente</option>
                <option value="custom">URL personalizada (MP3/OGG/WAV)</option>
              </select>
              {orderSoundIsCustom && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-colors">
                    <span className="text-xs font-semibold text-slate-600">Enviar arquivo de áudio (MP3, WAV, OGG — máx 1MB)</span>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3,.mp3,.wav,.ogg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1024 * 1024) { alert("Arquivo muito grande. Máximo 1MB."); return; }
                        const reader = new FileReader();
                        reader.onload = () => { handleChange("orderNotificationSound", String(reader.result || "")); };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                  {orderSoundValue.startsWith("data:") && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-600 truncate flex-1">✓ Áudio carregado</span>
                      <button
                        type="button"
                        onClick={() => {
                          const a = new Audio(orderSoundValue);
                          const durationMs = normalizeOrderNotificationDurationSeconds(branding.orderNotificationSoundDuration) * 1000;
                          a.play().then(() => {
                            window.setTimeout(() => {
                              a.pause();
                              a.currentTime = 0;
                            }, durationMs);
                          }).catch(() => {});
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 active:scale-95"
                      >
                        Testar
                      </button>
                      <button type="button" onClick={() => handleChange("orderNotificationSound", "")} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 active:scale-95">Remover</button>
                    </div>
                  )}
                </div>
              )}
            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600">Duração da vinheta (segundos)</label>
              <input
                type="number"
                min="1"
                max="15"
                step="1"
                value={branding.orderNotificationSoundDuration || 4}
                onChange={(e) => handleChange("orderNotificationSoundDuration", Number(e.target.value) || 4)}
                className="mt-1 w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white/90 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
              />
            </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
