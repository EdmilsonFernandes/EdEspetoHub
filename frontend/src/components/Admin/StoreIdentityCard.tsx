// @ts-nocheck
import React from 'react';
import { Image, Instagram, Palette } from 'lucide-react';

export function StoreIdentityCard({ branding, socialLinks = [], manualOpen, onToggleOpen, whatsappNumber }) {
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
            <Palette size={14} className="text-slate-400" />
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
            <Palette size={14} className="text-slate-400" />
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
            <Image size={14} className="text-slate-400" />
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
            <Instagram size={14} className="text-slate-400" />
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
        {typeof manualOpen === 'boolean' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${manualOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              Status manual
            </span>
            {onToggleOpen ? (
              <button
                onClick={onToggleOpen}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  manualOpen
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
              >
                {manualOpen ? 'Fechar agora' : 'Abrir agora'}
              </button>
            ) : (
              <span className="font-semibold text-slate-700">{manualOpen ? 'Aberta' : 'Fechada'}</span>
            )}
          </div>
        )}
        {normalizedWhatsapp && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
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
              className="px-3 py-1 rounded-full text-xs font-semibold border border-brand-primary text-brand-primary hover:bg-brand-primary-soft"
            >
              Copiar numero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
