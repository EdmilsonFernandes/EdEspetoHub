// @ts-nocheck
import React from 'react';
import { AppVersionBadge } from '../components/common/AppVersionBadge';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.10),_transparent_45%),linear-gradient(165deg,#f8f9fa,#eef4fa)] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl min-h-[calc(100vh-3rem)] grid lg:grid-cols-[1fr_420px] gap-6 items-center">
        <aside className="hidden lg:flex flex-col justify-center rounded-2xl border border-sky-800/40 bg-[linear-gradient(160deg,#0d4f66,#0b3f52)] text-white p-8 shadow-[0_26px_54px_-38px_rgba(15,23,42,0.5)]">
          <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-14 w-auto rounded-lg mb-4" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100/80">Plataforma unificada</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">
            Sua Gestão de Elite Começa Aqui.
          </h1>
          <p className="mt-3 text-sm text-sky-50/90">
            Fluxo profissional, visual consistente e operação pronta para escalar.
          </p>
        </aside>
        <section className="mx-auto w-full max-w-md lg:max-w-none">
          {children}
        </section>
      </div>
      <div className="mx-auto mt-4 text-center text-[11px] text-slate-500">
        Desenvolvido por Já no Caminho <AppVersionBadge prefix=" | " />
      </div>
    </div>
  );
}
