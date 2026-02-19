// @ts-nocheck
import React from 'react';
import { CheckCircle, Lightning, ShieldCheck } from '@phosphor-icons/react';
import Lottie from 'lottie-react';
import fireAnimation from '../assets/fire.json';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const particles = [
    { x: '8%', y: '18%', size: '10px', dur: '8s', delay: '0s', dx: '12px' },
    { x: '16%', y: '38%', size: '8px', dur: '7.4s', delay: '0.6s', dx: '8px' },
    { x: '28%', y: '72%', size: '12px', dur: '8.8s', delay: '1.1s', dx: '14px' },
    { x: '52%', y: '24%', size: '9px', dur: '7.2s', delay: '0.3s', dx: '10px' },
    { x: '64%', y: '56%', size: '11px', dur: '8.1s', delay: '0.9s', dx: '9px' },
    { x: '82%', y: '32%', size: '10px', dur: '8.4s', delay: '0.5s', dx: '11px' },
    { x: '74%', y: '80%', size: '9px', dur: '7.7s', delay: '1.3s', dx: '7px' },
  ];

  return (
    <div className="min-h-screen overflow-x-clip p-4 sm:p-6 bg-[linear-gradient(135deg,#050b16_0%,#0f172a_45%,#111827_100%)]">
      <div className="mx-auto max-w-6xl min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] grid lg:grid-cols-2 rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_90px_-45px_rgba(0,0,0,0.75)]">
        <div className="relative flex p-6 sm:p-8 lg:p-10 text-white bg-slate-900 min-h-[240px] lg:min-h-0">
          <div className="absolute inset-0">
            <img src="/janocaminho.jpg" alt="Jano Caminho" className="h-full w-full object-cover object-center scale-[1.04]" />
          </div>
          <div className="absolute inset-0 opacity-68">
            <img src="/janocaminho.jpg" alt="" aria-hidden className="h-full w-full object-contain object-center p-5 sm:p-8" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(2,6,23,0.82),rgba(2,6,23,0.7))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(2,6,23,0.38),_transparent_50%),radial-gradient(circle_at_top,_rgba(47,157,247,0.3),_transparent_58%),radial-gradient(circle_at_bottom,_rgba(95,211,90,0.2),_transparent_64%)]" />
          <div className="absolute inset-0 opacity-95" aria-hidden>
            {particles.map((particle, index) => (
              <span
                key={`hero-particle-${index}`}
                className="ds-hero-particle"
                style={
                  {
                    '--x': particle.x,
                    '--y': particle.y,
                    '--size': particle.size,
                    '--dur': particle.dur,
                    '--delay': particle.delay,
                    '--dx': particle.dx,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="absolute right-4 top-3 hidden lg:block w-24 opacity-35 pointer-events-none">
            <Lottie animationData={fireAnimation} loop autoplay />
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full w-full">
            <div className="space-y-5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-white/95">Jano Caminho</p>
              <p className="pointer-events-none select-none text-[68px] sm:text-[92px] lg:text-[110px] font-black leading-none tracking-tight text-white/[0.07] -mb-2">
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
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
