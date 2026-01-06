// @ts-nocheck
import React from 'react';

export function Hero() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[36px] border border-white/60 bg-gradient-to-br from-white via-orange-50/50 to-rose-50/70 shadow-[0_30px_80px_-40px_rgba(185,28,28,0.6)]">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-red-400/30 to-orange-300/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-gradient-to-br from-amber-400/20 to-red-500/10 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-3 sm:p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)] backdrop-blur">
              <div className="relative overflow-hidden rounded-[22px] border border-white/80 bg-gradient-to-br from-slate-900/5 to-slate-900/0">
                <img
                  src="/chama-no-espeto.jpeg"
                  alt="Chama no Espeto"
                  className="w-full h-[260px] sm:h-[400px] lg:h-[480px] object-contain"
                />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.6)]">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Mercado vivo
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">Pedidos fluindo em tempo real</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.6)]">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Operação
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">Fila do churrasqueiro conectada</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.6)]">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
                    Branding
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">Identidade premium em minutos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
