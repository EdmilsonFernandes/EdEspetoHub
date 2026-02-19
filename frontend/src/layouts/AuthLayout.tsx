// @ts-nocheck
import React from 'react';
import { CheckCircle, Lightning, ShieldCheck } from '@phosphor-icons/react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip p-4 sm:p-6 bg-[linear-gradient(135deg,#050b16_0%,#0f172a_45%,#111827_100%)]">
      <div className="mx-auto max-w-6xl min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] grid lg:grid-cols-2 rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_90px_-45px_rgba(0,0,0,0.75)]">
        <div className="relative flex p-6 sm:p-8 lg:p-10 text-white bg-slate-900 min-h-[240px] lg:min-h-0">
          <div className="absolute inset-0">
            <img src="/janocaminho.jpg" alt="Jano Caminho" className="h-full w-full object-cover object-center blur-[2px] scale-[1.06]" />
          </div>
          <div className="absolute inset-0 opacity-85">
            <img src="/janocaminho.jpg" alt="" aria-hidden className="h-full w-full object-contain object-center p-5 sm:p-8" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(2,6,23,0.88),rgba(2,6,23,0.78))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.32),_transparent_58%),radial-gradient(circle_at_bottom,_rgba(95,211,90,0.2),_transparent_62%)]" />

          <div className="relative z-10 flex flex-col justify-between h-full w-full">
            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200 font-semibold">Plataforma SaaS</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">Gestão de pedidos e entregas para operações reais</h1>
              <p className="text-xs sm:text-sm text-slate-200/95 max-w-md">
                Estruture cardápio, pedidos, produção e atendimento em uma experiência moderna, rápida e escalável.
              </p>
            </div>
            <div className="hidden sm:block space-y-2.5 text-xs text-slate-100/95">
              <p className="inline-flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-full bg-white/12 border border-white/20 inline-flex items-center justify-center">
                  <Lightning size={12} weight="duotone" />
                </span>
                Operação em tempo real com fluxo inteligente
              </p>
              <p className="inline-flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-full bg-white/12 border border-white/20 inline-flex items-center justify-center">
                  <ShieldCheck size={12} weight="duotone" />
                </span>
                Painel administrativo seguro e unificado
              </p>
              <p className="inline-flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-full bg-white/12 border border-white/20 inline-flex items-center justify-center">
                  <CheckCircle size={12} weight="duotone" />
                </span>
                Experiência mobile premium pronta para escalar
              </p>
            </div>
          </div>
        </div>

        <div className="relative bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_50%,#ecfeff_100%)] flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-[18px] shadow-[0_28px_56px_-34px_rgba(15,23,42,0.55)] border border-white/70 p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2f9df7,#18b3f9,#5fd35a)]" />
            <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-sky-100/70 blur-2xl" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
