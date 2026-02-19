// @ts-nocheck
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[linear-gradient(135deg,#050b16_0%,#0f172a_45%,#111827_100%)]">
      <div className="mx-auto max-w-6xl min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] grid lg:grid-cols-2 rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_90px_-45px_rgba(0,0,0,0.75)]">
        <div className="hidden lg:flex relative p-10 text-white bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.28),_transparent_58%),radial-gradient(circle_at_bottom,_rgba(95,211,90,0.25),_transparent_62%),linear-gradient(160deg,#0b1220,#111827)]">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="space-y-5">
              <div className="h-16 w-36 rounded-2xl bg-slate-900/70 border border-white/15 p-2">
                <img src="/janocaminho.jpg" alt="Jano Caminho" className="h-full w-full object-contain" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200 font-semibold">Plataforma SaaS</p>
              <h1 className="text-4xl font-black leading-tight">Gestão de pedidos e entregas para operações reais.</h1>
              <p className="text-sm text-slate-200/90 max-w-md">
                Estruture cardápio, pedidos, produção e atendimento em uma experiência moderna, rápida e escalável.
              </p>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <p className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operação em tempo real</p>
              <p className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-400" /> Painel administrativo unificado</p>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-sky-400/25 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        </div>

        <div className="relative bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_50%,#ecfeff_100%)] flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/70 p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2f9df7,#18b3f9,#5fd35a)]" />
            <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-sky-100/70 blur-2xl" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
