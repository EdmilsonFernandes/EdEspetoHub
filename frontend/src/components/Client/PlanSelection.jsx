import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export const PlanSelection = ({ plans, onSelect, loading }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <p className="text-red-600 font-bold uppercase text-xs">Chama no Espeto</p>
        <h2 className="text-3xl font-black text-gray-900">Escolha o seu plano</h2>
        <p className="text-gray-500">Ative ou renove sua assinatura para continuar vendendo.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            disabled={loading}
            className="bg-white border rounded-2xl p-5 text-left hover:border-red-400 hover:shadow transition disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-gray-400">{plan.name}</p>
                <h3 className="text-2xl font-black text-gray-900">{formatCurrency(plan.price || 0)}</h3>
                <p className="text-sm text-gray-600">Duração: {plan.durationDays} dias</p>
              </div>
              {plan.name === 'yearly' ? <Crown className="text-amber-500" /> : <Sparkles className="text-red-500" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
