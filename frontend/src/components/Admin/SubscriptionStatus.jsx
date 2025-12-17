import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

const statusStyles = {
  ACTIVE: 'text-green-700 bg-green-50 border-green-200',
  EXPIRING: 'text-amber-700 bg-amber-50 border-amber-200',
  EXPIRED: 'text-red-700 bg-red-50 border-red-200',
  SUSPENDED: 'text-gray-700 bg-gray-50 border-gray-200',
};

export const SubscriptionStatus = ({ subscription, onRenew, plans }) => {
  const status = subscription?.status || 'Sem assinatura';
  const style = statusStyles[subscription?.status] || 'text-gray-600 bg-gray-50 border-gray-200';

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-3 ${style}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-bold">Status da assinatura</p>
          <h3 className="text-xl font-black">{status}</h3>
          <p className="text-sm text-gray-600">Plano: {subscription?.plan?.name || 'Escolha um plano'}</p>
          <p className="text-sm text-gray-600">Válido até: {formatDate(subscription?.endDate)}</p>
        </div>
        {subscription?.status === 'ACTIVE' && <CheckCircle className="text-green-600" />}
        {subscription?.status === 'EXPIRING' && <AlertTriangle className="text-amber-500" />}
        {(subscription?.status === 'EXPIRED' || subscription?.status === 'SUSPENDED') && (
          <AlertTriangle className="text-red-500" />
        )}
      </div>

      {plans?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onRenew(plan.id)}
              className="px-3 py-2 bg-white border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-100"
            >
              <RefreshCcw size={16} /> Renovar {plan.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
