// @ts-nocheck
import React from 'react';
import { CheckCircle, Lightning, ShieldCheck } from '@phosphor-icons/react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] grid lg:grid-cols-2 rounded-[28px] overflow-hidden border border-slate-200 shadow-[0_32px_70px_-42px_rgba(15,23,42,0.45)] bg-white">
        <aside className="hidden lg:flex relative p-8 lg:p-10 text-white bg-[linear-gradient(160deg,#0b1220,#0f172a_45%,#111827)]">
          <div className="absolute inset-0 opacity-[0.08]">
            <img src="/janocaminho.jpg" alt="" aria-hidden className="h-full w-full object-cover object-center" />
          </div>
          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <div className="space-y-5">
              <p className="text-2xl font-black tracking-tight">Já no Caminho</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200 font-semibold">Plataforma SaaS</p>
              <h1 className="text-3xl lg:text-[2.5rem] font-black leading-[1.08]">
                Gestão de pedidos e entregas para operações reais
              </h1>
              <p className="text-sm text-slate-200/95 max-w-md">
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

        <section className="relative bg-white flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_24px_56px_-36px_rgba(15,23,42,0.42)] space-y-6 ds-login-card-enter">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-contain" />
              </div>
              <p className="text-[11px] font-bold tracking-[0.24em] uppercase text-slate-500">Já no Caminho</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
