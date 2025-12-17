import React from 'react';
import { AlertTriangle, Ban, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

export const PlatformStores = ({ stores, onSuspend, onReactivate }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500 font-bold">Chama no Espeto</p>
          <h3 className="text-lg font-black text-gray-900">Lojas cadastradas</h3>
          <p className="text-gray-500 text-sm">Acompanhe status e validade das assinaturas.</p>
        </div>
        <AlertTriangle className="text-amber-500" />
      </div>

      <div className="divide-y">
        {stores.map((store) => (
          <div key={store.id} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-black text-gray-900">{store.name}</p>
              <p className="text-sm text-gray-500">{store.owner?.email}</p>
              <p className="text-sm text-gray-500">Plano: {store.subscription?.plan?.name || 'sem plano'}</p>
            </div>
            <div className="text-sm text-gray-600">
              <p>Status: <strong>{store.subscription?.status || 'sem assinatura'}</strong></p>
              <p>Vence em: {formatDate(store.subscription?.endDate)}</p>
              <p>Valor: {formatCurrency(store.subscription?.plan?.price || 0)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onSuspend(store.subscription?.id)}
                className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2"
              >
                <Ban size={14} /> Suspender
              </button>
              <button
                onClick={() => onReactivate(store.subscription?.id)}
                className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm flex items-center gap-2"
              >
                <ShieldCheck size={14} /> Reativar
              </button>
            </div>
          </div>
        ))}
        {stores.length === 0 && (
          <div className="p-6 text-center text-gray-500">Nenhuma loja cadastrada ainda.</div>
        )}
      </div>
    </div>
  );
};
