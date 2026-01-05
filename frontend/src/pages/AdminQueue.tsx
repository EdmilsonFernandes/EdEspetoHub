// @ts-nocheck
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export function AdminQueue() {
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const navigate = useNavigate();
  const socialLinks = auth?.store?.settings?.socialLinks || [];
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';

  if (!auth?.store) {
    return <div style={{ padding: 24 }}>Carregando fila da loja...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <header
          className="p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${branding?.primaryColor || '#b91c1c'} 0%, ${branding?.secondaryColor || '#111827'} 100%)`,
            color: '#fff',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding?.brandName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black">{branding?.brandName?.slice(0, 2)?.toUpperCase() || 'ED'}</span>
              )}
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold opacity-90 flex items-center gap-2">
                <ChefHat size={14} /> Fila do Churrasqueiro
              </p>
              <h1 className="text-xl font-black leading-tight">{branding?.brandName || auth?.store?.name}</h1>
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs opacity-80 hover:opacity-100"
                >
                  {instagramHandle}
                </a>
              )}
            </div>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2 justify-center sm:justify-end">
            <button
              onClick={() => navigate(auth?.store?.slug ? `/${auth.store.slug}` : '/')}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 hover:bg-white/30 transition"
            >
              Voltar
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/admin');
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <GrillQueue />
        </div>
      </div>
    </div>
  );
}
