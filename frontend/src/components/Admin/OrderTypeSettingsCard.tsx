// @ts-nocheck
import { useEffect, useState } from 'react';
import { Bicycle, ForkKnife, House } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { storeService } from '../../services/storeService';

const DEFAULT_TYPES = [ 'delivery', 'pickup', 'table' ];

const labels = {
  delivery: 'Entrega',
  pickup: 'Retirada',
  table: 'Mesa',
};
const icons = {
  delivery: Bicycle,
  pickup: House,
  table: ForkKnife,
};

export function OrderTypeSettingsCard() {
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();
  const { showToast } = useToast();
  const storeId = auth?.store?.id;
  const initial = Array.isArray(auth?.store?.settings?.orderTypes) && auth.store.settings.orderTypes.length > 0
    ? auth.store.settings.orderTypes
    : DEFAULT_TYPES;
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isVip = Boolean(auth?.store?.settings?.planExempt || auth?.subscription?.planExempt);
  const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
  const canUsePickup = Boolean(
    isVip ||
      auth?.features?.pickupMode ||
      String(auth?.subscription?.status || '').toUpperCase() === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );

  useEffect(() => {
    const next = Array.isArray(auth?.store?.settings?.orderTypes) && auth.store.settings.orderTypes.length > 0
      ? auth.store.settings.orderTypes
      : DEFAULT_TYPES;
    setSelected(canUsePickup ? next : next.filter((type) => type !== 'pickup'));
  }, [auth?.store?.id, auth?.store?.settings?.orderTypes, canUsePickup]);

  const toggleType = (type) => {
    if (type === 'pickup' && !canUsePickup) {
      showToast('Retirada disponível no plano Pro.', 'info');
      return;
    }
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
      showToast('Selecione ao menos um tipo de pedido.', 'error');
      return;
    }
    const nextSelected = canUsePickup ? selected : selected.filter((type) => type !== 'pickup');
    setSaving(true);
    try {
      const updated = await storeService.update(storeId, { orderTypes: nextSelected });
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
      } else {
        setSelected(nextSelected);
      }
      showToast('Tipos de pedido atualizados.', 'success');
    } catch (err) {
      console.error('Erro ao salvar tipos de pedido', err);
      showToast('Não foi possível salvar os tipos de pedido.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-indigo-500 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Tipos de pedido</h3>
            <p className="text-xs text-slate-500">Escolha como o cliente pode comprar na vitrine.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TYPES.map((type) => {
          const active = selected.includes(type);
          const Icon = icons[type];
          const disabled = type === 'pickup' && !canUsePickup;
          return (
            <button
              key={type}
              type="button"
              onClick={() => !disabled && toggleType(type)}
              disabled={disabled}
              title={disabled ? 'Disponível no plano Pro' : undefined}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all hover:-translate-y-0.5 active:scale-95 inline-flex items-center gap-2 ${
                active
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              } ${disabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0 hover:bg-white' : ''}`}
            >
              <span
                className={`h-7 w-7 rounded-full flex items-center justify-center ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon size={14} weight="duotone" />
              </span>
              {labels[type]}
              {disabled ? (
                <span className="rounded-full bg-violet-600 text-white text-[10px] px-1.5 py-0.5 font-bold">
                  Pro
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {!canUsePickup ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800 flex items-center justify-between gap-2">
          <span>Retirada está disponível no plano Pro.</span>
          <button
            type="button"
            onClick={() => navigate('/admin/renewal')}
            className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 font-bold text-violet-700 hover:bg-violet-100"
          >
            Trocar assinatura
          </button>
        </div>
      ) : null}
      <button
        onClick={saveOrderTypes}
        className="mt-4 w-full text-white py-2 rounded-lg text-sm font-semibold bg-brand-gradient hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
        disabled={saving}
      >
        {saving ? 'Salvando...' : 'Salvar tipos de pedido'}
      </button>
    </div>
  );
}
