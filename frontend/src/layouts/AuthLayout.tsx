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
        <div className="relative flex p-6 sm:p-8 lg:p-10 text-white bg-[linear-gradient(180deg,#020617_0%,#0b1220_60%,#0f172a_100%)] min-h-[240px] lg:min-h-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.14),_transparent_50%)]" />
          <div className="relative z-10 flex flex-col justify-between h-full w-full">
            <div className="space-y-5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">Jano Caminho</p>
              <p className="pointer-events-none select-none text-[68px] sm:text-[92px] lg:text-[110px] font-black leading-none tracking-tight text-white/[0.08] -mb-2">
                JANO
              </p>
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
          <div className="w-full max-w-md bg-white/85 backdrop-blur-[12px] rounded-[22px] shadow-[0_34px_72px_-34px_rgba(15,23,42,0.5)] border border-white/80 p-6 sm:p-8 space-y-6 relative overflow-hidden ds-login-card-enter">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2f9df7,#18b3f9,#5fd35a)]" />
            <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-sky-100/70 blur-2xl" />
            <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]">
              <img src="/janocaminho.jpg" alt="Jano Caminho" className="h-20 w-full rounded-xl object-contain bg-[#050b16]" />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
