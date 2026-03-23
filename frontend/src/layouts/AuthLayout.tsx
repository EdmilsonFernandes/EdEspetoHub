// @ts-nocheck
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.10),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_54%),linear-gradient(160deg,#f8fafc,#eef2f7)] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
