// @ts-nocheck
import React from 'react';
import { ImageSquare, Palette } from '@phosphor-icons/react';

export function StoreIdentityCard({ branding, socialLinks = [], whatsappNumber }) {
  const storeLogo = branding?.logoUrl;
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const normalizedWhatsapp = whatsappNumber?.toString().replace(/\D/g, '') || '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-2">Identidade da loja</h3>
      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Palette size={14} weight="duotone" className="text-slate-400" />
            Cor primária
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="w-4 h-4 rounded-full border border-white/70 shadow"
              style={{ backgroundColor: branding?.primaryColor || '#b91c1c' }}
            />
            Ativa
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Palette size={14} weight="duotone" className="text-slate-400" />
            Cor secundária
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="w-4 h-4 rounded-full border border-white/70 shadow"
              style={{ backgroundColor: branding?.secondaryColor || '#111827' }}
            />
            Ativa
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ImageSquare size={14} weight="duotone" className="text-slate-400" />
            Logo
          </span>
          {storeLogo ? (
            <span className="flex items-center gap-2 text-xs text-slate-600">
              <img src={storeLogo} alt="Logo da loja" className="w-6 h-6 rounded-md object-cover border border-white/70 shadow" />
              Logo atual
            </span>
          ) : (
            <span className="font-semibold text-slate-500">Sem logo</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <img src="/insta.avif" alt="Instagram" className="h-4 w-4 rounded-full" />
            Instagram
          </span>
          {instagramHandle ? (
            <a
              href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-700 hover:text-slate-900"
            >
              {instagramHandle}
            </a>
          ) : (
            <span className="font-semibold text-slate-500">Não informado</span>
          )}
        </div>
        {normalizedWhatsapp && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <img src="/whatspp.jpg" alt="WhatsApp" className="h-4 w-4 rounded-full" />
              WhatsApp
            </span>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(normalizedWhatsapp);
                } catch (err) {
                  console.error('Falha ao copiar', err);
                }
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold border border-brand-primary text-brand-primary hover:bg-brand-primary-soft transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Copiar numero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
