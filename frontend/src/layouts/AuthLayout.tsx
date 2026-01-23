// @ts-nocheck
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const platformLogo = '/logo.svg';

  return (
    <div
      className="min-h-screen bg-brand-secondary-soft flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${platformLogo})`,
        backgroundSize: '200px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
        opacity: 0.95,
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-white/90 to-gray-50/90"
        style={{ backdropFilter: 'blur(2px)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0 h-48 bg-gradient-to-t from-red-100/70 via-orange-100/40 to-transparent" />
      <div className="max-w-md w-full relative z-10">
        <div className="absolute -top-24 -right-20 w-56 h-56 bg-brand-primary-soft rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-56 h-56 bg-brand-secondary-soft rounded-full blur-3xl" />
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/70 p-6 sm:p-8 space-y-6 relative">
          {children}
        </div>
      </div>
    </div>
  );
}
