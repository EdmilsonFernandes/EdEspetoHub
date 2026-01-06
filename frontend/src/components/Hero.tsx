// @ts-nocheck
import React from 'react';

export function Hero() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-[0_28px_70px_-48px_rgba(15,23,42,0.7)]">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-red-200/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50/70">
              <img
                src="/chama-no-espeto.jpeg"
                alt="Chama no Espeto"
                className="w-full h-[280px] sm:h-[420px] lg:h-[500px] object-contain"
              />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.6)]">
                <p className="text-xs font-semibold text-slate-500">Site pronto em minutos</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Sua vitrine publicada e organizada</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.6)]">
                <p className="text-xs font-semibold text-slate-500">Fila do churrasqueiro</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Controle total do preparo</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.6)]">
                <p className="text-xs font-semibold text-slate-500">Pagamentos organizados</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Pix e checkout prontos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
