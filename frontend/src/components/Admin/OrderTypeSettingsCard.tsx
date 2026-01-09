// @ts-nocheck
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { storeService } from '../../services/storeService';

const DEFAULT_TYPES = [ 'delivery', 'pickup', 'table' ];

const labels = {
  delivery: 'Entrega',
  pickup: 'Retirada',
  table: 'Mesa',
};

export function OrderTypeSettingsCard() {
  const { auth, setAuth } = useAuth();
  const { showToast } = useToast();
  const storeId = auth?.store?.id;
  const initial = Array.isArray(auth?.store?.settings?.orderTypes) && auth.store.settings.orderTypes.length > 0
    ? auth.store.settings.orderTypes
    : DEFAULT_TYPES;
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = Array.isArray(auth?.store?.settings?.orderTypes) && auth.store.settings.orderTypes.length > 0
      ? auth.store.settings.orderTypes
      : DEFAULT_TYPES;
    setSelected(next);
  }, [auth?.store?.id, auth?.store?.settings?.orderTypes]);

  const toggleType = (type) => {
    setSelected((prev) => {
      if (prev.includes(type)) {
        return prev.filter((entry) => entry !== type);
      }
      return [ ...prev, type ];
    });
  };

  const saveOrderTypes = async () => {
    if (!storeId) return;
    if (!selected.length) {
      showToast('Selecione pelo menos um tipo de pedido', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await storeService.update(storeId, { orderTypes: selected });
      if (updated?.settings?.orderTypes) {
        setAuth({
          ...auth,
          store: {
            ...auth.store,
            settings: {
              ...auth.store.settings,
              orderTypes: updated.settings.orderTypes,
            },
          },
        });
      }
      showToast('Tipos de pedido salvos', 'success');
    } catch (err) {
      console.error('Erro ao salvar tipos de pedido', err);
      showToast('Nao foi possivel salvar os tipos de pedido', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Tipos de pedido</h3>
          <p className="text-xs text-slate-500">Escolha como o cliente pode comprar na vitrine.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TYPES.map((type) => {
          const active = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                active
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {labels[type]}
            </button>
          );
        })}
      </div>
      <button
        onClick={saveOrderTypes}
        className="mt-4 w-full text-white py-2 rounded-lg text-sm font-semibold bg-brand-gradient hover:opacity-90 transition"
        disabled={saving}
      >
        {saving ? 'Salvando...' : 'Salvar tipos de pedido'}
      </button>
    </div>
  );
}
