// @ts-nocheck
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_50%,#ecfeff_100%)]">
      <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/70 p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2f9df7,#18b3f9,#5fd35a)]" />
          <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-sky-100/70 blur-2xl" />
          {children}
        </div>
      </div>
    </div>
  );
}
