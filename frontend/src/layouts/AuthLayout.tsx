// @ts-nocheck
import React from 'react';
import { Capacitor } from '@capacitor/core';
import { AppVersionBadge } from '../components/common/AppVersionBadge';
import { ChartLineUp, DeviceMobile, ShieldCheckered } from '@phosphor-icons/react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const isNativePlatform = Capacitor.isNativePlatform();

  return (
    <div className={`min-h-screen overflow-x-clip bg-[#f8fafc] px-4 py-6 sm:py-10 relative ${isNativePlatform ? 'ds-native-nav-content' : ''}`}>
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-sky-400/10 blur-[120px] animate-[orbFloat_18s_infinite_linear]" />
        <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-indigo-400/10 blur-[100px] animate-[orbFloat_22s_infinite_linear_reverse]" />
        <div className="absolute -bottom-[5%] left-[20%] w-[30%] h-[30%] rounded-full bg-emerald-400/5 blur-[80px] animate-[orbFloat_25s_infinite_linear]" />
      </div>

      <div className="mx-auto w-full max-w-7xl min-h-[calc(100vh-3rem)] grid lg:grid-cols-[1.06fr_minmax(520px,1fr)] gap-7 items-stretch relative z-10">
        <aside className="hidden lg:flex flex-col justify-between rounded-[24px] border border-sky-800/30 bg-[linear-gradient(160deg,#0d4f66,#0b3f52)] text-white px-10 py-12 shadow-[0_32px_64px_-24px_rgba(13,79,102,0.45)] relative overflow-hidden group">
          {/* Aside Glow Effect */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-sky-400/10 rounded-full blur-[60px] group-hover:bg-sky-400/15 transition-colors duration-700" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-block p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
              <img src="/janocaminho-logo.png" alt="Já no Caminho" className="h-14 w-auto rounded-xl" />
            </div>
            
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200/90 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-sky-400/50" />
                Plataforma unificada
              </p>
              <h1 className="text-4xl xl:text-5xl font-black leading-[1.15] tracking-[-0.03em] bg-gradient-to-br from-white via-white to-sky-200 bg-clip-text text-transparent">
                Sua Gestão de Elite <br /> Começa Aqui.
              </h1>
              <p className="text-lg text-sky-50/80 max-w-md font-medium leading-relaxed">
                Fluxo profissional, visual consistente e operação pronta para escalar seu negócio.
              </p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            {[
              { text: "Painel administrativo de alta performance", icon: ChartLineUp },
              { text: "Operação mobile sem ruído visual", icon: DeviceMobile },
              { text: "Segurança com acesso segmentado", icon: ShieldCheckered }
            ].map((item, i) => (
              <p key={i} className="flex items-center gap-3 text-sm font-semibold text-sky-100/90 group/item animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
                <span className="flex-shrink-0 h-8 w-8 rounded-xl bg-sky-400/20 border border-sky-400/30 flex items-center justify-center group-hover/item:bg-sky-400/30 transition-all group-hover/item:scale-110">
                  <item.icon size={18} weight="duotone" className="text-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
                </span>
                {item.text}
              </p>
            ))}
          </div>
        </aside>

        <section className="mx-auto flex w-full max-w-[560px] items-center justify-center lg:max-w-none relative">
          {children}
        </section>
      </div>

      <div className="mx-auto mt-6 text-center text-[12px] font-medium text-slate-400 relative z-10">
        Desenvolvido com excelência por <span className="text-slate-500 font-bold">Já no Caminho</span> <AppVersionBadge prefix=" | " />
      </div>
    </div>
  );
}

