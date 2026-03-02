// @ts-nocheck
import React from 'react';
import { CheckCircle, Lightning, ShieldCheck } from '@phosphor-icons/react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.12),_transparent_52%),linear-gradient(150deg,#020617,#0b1220_45%,#0f172a)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] grid lg:grid-cols-2 rounded-[30px] overflow-hidden border border-sky-200/15 shadow-[0_36px_100px_-56px_rgba(2,132,199,0.55)] bg-slate-950/35 backdrop-blur-sm">
        <aside className="hidden lg:flex relative p-8 lg:p-10 text-white bg-[linear-gradient(165deg,rgba(2,6,23,0.88),rgba(15,23,42,0.74))] border-r border-white/10">
          <div className="absolute inset-0 opacity-[0.2]">
            <img src="/logo.svg" alt="" aria-hidden className="h-full w-full object-cover object-center" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(45,212,191,0.15),_transparent_58%)]" />
          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <div className="space-y-5">
              <img src="/logo.svg" alt="Já no Caminho" className="h-20 w-auto object-contain drop-shadow-[0_10px_30px_rgba(56,189,248,0.35)]" />
              <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200 font-semibold">Plataforma SaaS</p>
              <h1 className="text-3xl lg:text-[2.5rem] font-black leading-[1.08]">
                Gestão de pedidos e entregas para operações reais
              </h1>
              <p className="text-sm text-slate-200/90 max-w-md">
                Estruture vitrine, pedidos, operação e atendimento em uma experiência moderna, rápida e escalável.
              </p>
            </div>
            <div className="space-y-3 text-sm text-slate-100/95">
              <p className="inline-flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                  <Lightning size={14} weight="duotone" />
                </span>
                Operação em tempo real com fluxo inteligente
              </p>
              <p className="inline-flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                  <ShieldCheck size={14} weight="duotone" />
                </span>
                Painel administrativo seguro e unificado
              </p>
              <p className="inline-flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                  <CheckCircle size={14} weight="duotone" />
                </span>
                Experiência mobile premium pronta para escalar
              </p>
            </div>
          </div>
        </aside>

        <section className="relative flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-3xl border border-sky-100/15 bg-[linear-gradient(165deg,rgba(15,23,42,0.86),rgba(15,23,42,0.64))] p-6 sm:p-8 shadow-[0_30px_80px_-40px_rgba(14,116,144,0.55)] backdrop-blur-xl space-y-6 ds-login-card-enter">
            <div className="flex items-center justify-between gap-3 sm:hidden">
              <img src="/logo.svg" alt="Já no Caminho" className="h-11 w-auto object-contain drop-shadow-[0_8px_24px_rgba(56,189,248,0.4)]" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-sky-200">Acesso seguro</span>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
