// @ts-nocheck
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.10),_transparent_45%),linear-gradient(165deg,#f8f9fa,#eef4fa)] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl min-h-[calc(100vh-3rem)] grid lg:grid-cols-[1fr_420px] gap-6 items-center">
        <aside className="hidden lg:flex flex-col justify-center rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur p-8 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.22)]">
          <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-14 w-auto rounded-lg mb-4" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Plataforma unificada</p>
          <h1 className="mt-2 text-3xl font-black text-slate-800 leading-tight">
            Gestão profissional com a mesma identidade do site até o login.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Interface limpa, rápida e consistente para admin, entregador e super admin.
          </p>
        </aside>
        <section className="mx-auto w-full max-w-md lg:max-w-none">
          {children}
        </section>
      </div>
    </div>
  );
}
