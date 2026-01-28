// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChefHat } from '@phosphor-icons/react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { getPersistedBranding, defaultBranding } from '../constants';
import { applyBrandTheme } from '../utils/brandTheme';
import { AdminHeader } from '../components/Admin/AdminHeader';

export function OrdersQueue() {
  const { storeSlug } = useParams();
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(() => getPersistedBranding(storeSlug || defaultBranding.espetoId));

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
    }
    applyBrandTheme(branding);
  }, [storeSlug, branding]);

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 12%, white) 0%, #f8fafc 55%)',
        }}
      >
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <ChefHat size={24} weight="duotone" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Acesso restrito</h3>
            <p className="text-gray-600">Faça login para acessar a visão da produção.</p>
            <button
              onClick={() => navigate('/admin')}
              className="w-full py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              🔑 Entrar agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 12%, white) 0%, #f8fafc 55%)',
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        <AdminHeader contextLabel="Fila de Produção" />
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 text-gray-700 font-semibold mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <ChefHat size={20} weight="duotone" />
            </div>
            <h3 className="text-xl font-bold">Visão da Produção</h3>
          </div>
          <GrillQueue />
        </div>
      </div>
    </div>
  );
}
