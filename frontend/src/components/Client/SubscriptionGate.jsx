import React from 'react';
import { AlertOctagon } from 'lucide-react';

export const SubscriptionGate = ({ status, onSelectPlans }) => {
  const isSuspended = status === 'SUSPENDED';
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertOctagon size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Loja temporariamente indisponível</h2>
        <p className="text-gray-600">
          {isSuspended
            ? 'Sua loja foi suspensa. Entre em contato com o suporte para reativar.'
            : 'A assinatura expirou. Renove para voltar a receber pedidos.'}
        </p>
        <button
          onClick={onSelectPlans}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
        >
          Ver planos disponíveis
        </button>
      </div>
    </div>
  );
};
