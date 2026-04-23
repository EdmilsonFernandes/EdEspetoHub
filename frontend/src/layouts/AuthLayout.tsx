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
    <div className={`min-h-screen overflow-x-clip bg-[#EEF2F7] px-4 py-6 sm:py-10 relative ${isNativePlatform ? 'ds-native-nav-content' : ''}`}>
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-sky-400/10 blur-[120px] animate-[orbFloat_18s_infinite_linear]" />
        <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-indigo-400/10 blur-[100px] animate-[orbFloat_22s_infinite_linear_reverse]" />
        <div className="absolute -bottom-[5%] left-[20%] w-[30%] h-[30%] rounded-full bg-emerald-400/5 blur-[80px] animate-[orbFloat_25s_infinite_linear]" />
      </div>

      <div className="mx-auto w-full max-w-7xl min-h-[calc(100vh-3rem)] grid lg:grid-cols-[1.06fr_minmax(520px,1fr)] gap-7 items-stretch relative z-10">
        <aside className="hidden lg:flex flex-col justify-between rounded-[24px] border border-sky-800/25 bg-[linear-gradient(145deg,#0a3d52_0%,#0d4f66_45%,#0a3a4d_100%)] text-white px-10 py-12 shadow-[0_32px_64px_-24px_rgba(13,79,102,0.55)] relative overflow-hidden">
          {/* Background mesh */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          {/* Orbs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-sky-400/12 blur-[80px]" />
          <div className="pointer-events-none absolute bottom-0 -left-16 h-56 w-56 rounded-full bg-cyan-300/8 blur-[60px]" />

          <div className="space-y-7 relative z-10">
            {/* Brand lockup */}
            <div className="flex items-center gap-3.5">
              <div className="h-[3.4rem] w-[3.4rem] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white p-0.5 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.5)]">
                <img src="/janocaminho.png" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
              </div>
              <div className="leading-tight">
                <p className="text-lg font-black tracking-tight text-white">Já no Caminho</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300/80">Plataforma SaaS</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-300/80 flex items-center gap-2">
                <span className="w-5 h-px bg-sky-400/50" />
                Plataforma unificada
              </p>
              <h1 className="text-4xl xl:text-[2.75rem] font-black leading-[1.12] tracking-[-0.03em] bg-gradient-to-br from-white via-sky-50 to-sky-300 bg-clip-text text-transparent">
                Sua gestão<br />de elite<br />começa aqui.
              </h1>
              <p className="text-[0.95rem] text-sky-100/70 max-w-xs font-medium leading-relaxed">
                Fluxo profissional, visual consistente e operação pronta para escalar.
              </p>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            {[
              { text: "Painel de alta performance", icon: ChartLineUp },
              { text: "Operação mobile sem ruído visual", icon: DeviceMobile },
              { text: "Acesso segmentado por perfil", icon: ShieldCheckered },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both" style={{ animationDelay: `${(i + 1) * 120}ms` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/15">
                  <item.icon size={17} weight="duotone" className="text-cyan-300" />
                </span>
                <p className="text-sm font-semibold text-sky-100/85">{item.text}</p>
              </div>
            ))}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Ambiente seguro e criptografado</p>
            </div>
          </div>
        </aside>

        <section className="mx-auto flex w-full max-w-[560px] items-center justify-center lg:max-w-none relative">
          {children}
        </section>
      </div>

      <div className="mx-auto mt-6 flex items-center justify-center gap-2 text-center text-[12px] font-medium text-slate-400 relative z-10">
        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white bg-white p-0.5 shadow-sm">
          <img src="/janocaminho.png" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
        </span>
        <span>
          Desenvolvido com excelência por <span className="text-slate-500 font-bold">Já no Caminho</span> <AppVersionBadge prefix=" | " />
        </span>
      </div>
    </div>
  );
}

