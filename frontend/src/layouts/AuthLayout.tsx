// @ts-nocheck
import React from 'react';
import { AppVersionBadge } from '../components/common/AppVersionBadge';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.10),_transparent_45%),linear-gradient(165deg,#f8f9fa,#eef4fa)] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl min-h-[calc(100vh-3rem)] grid lg:grid-cols-[1.06fr_minmax(520px,1fr)] gap-7 items-stretch">
        <aside className="hidden lg:flex flex-col justify-between rounded-[20px] border border-sky-800/40 bg-[linear-gradient(160deg,#0d4f66,#0b3f52)] text-white px-9 py-10 shadow-[0_26px_54px_-38px_rgba(15,23,42,0.5)]">
          <div className="space-y-5">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-16 w-auto rounded-xl" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-100/80">Plataforma unificada</p>
            <h1 className="text-4xl font-black leading-tight tracking-[-0.02em]">
            Sua Gestão de Elite Começa Aqui.
            </h1>
            <p className="text-base text-sky-50/90 max-w-md">
              Fluxo profissional, visual consistente e operação pronta para escalar.
            </p>
          </div>
          <div className="space-y-2.5 text-sm text-sky-50/90">
            <p className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-200" />
              Painel administrativo de alta performance
            </p>
            <p className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-200" />
              Operação mobile sem ruído visual
            </p>
            <p className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-200" />
              Segurança com acesso segmentado
            </p>
          </div>
        </aside>
        <section className="mx-auto flex w-full max-w-[560px] items-center justify-center lg:max-w-none">
          {children}
        </section>
      </div>
      <div className="mx-auto mt-4 text-center text-[11px] text-slate-500">
        Desenvolvido por Já no Caminho <AppVersionBadge prefix=" | " />
      </div>
    </div>
  );
}
