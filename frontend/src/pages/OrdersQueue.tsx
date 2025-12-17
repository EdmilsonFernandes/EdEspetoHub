// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, ChefHat } from 'lucide-react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { apiClient } from '../config/apiClient';
import { getPersistedBranding, defaultBranding } from '../constants';

export function OrdersQueue() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(() => getPersistedBranding(storeSlug || defaultBranding.espetoId));

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
    }

    if (storeSlug) {
      apiClient.setOwnerId(storeSlug);
    }
  }, [storeSlug]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <ChefHat size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Acesso restrito</h3>
            <p className="text-gray-600">Faça login para acessar a visão do churrasqueiro.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 text-gray-700 font-semibold mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <ChefHat size={20} />
            </div>
            <h2 className="text-xl font-bold">Visão do Churrasqueiro</h2>
          </div>
          <GrillQueue />
        </div>
        <button
          onClick={() => navigate(storeSlug ? `/chamanoespeto/${storeSlug}` : '/')}
          className="flex items-center gap-2 px-4 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <ShoppingCart size={18} /> Voltar para pedidos
        </button>
      </div>
    </div>
  );
}
