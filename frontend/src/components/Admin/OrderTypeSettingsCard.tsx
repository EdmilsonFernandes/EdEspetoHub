// @ts-nocheck
import { useEffect, useState } from 'react';
import { Bicycle, CalendarBlank, ForkKnife, House, Percent, Receipt, UsersThree } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { storeService } from '../../services/storeService';
import { normalizeTableServiceSettings } from '../../utils/tableServiceSettings';

const DEFAULT_TYPES = [ 'delivery', 'pickup', 'table' ];
// Opções oferecidas no admin (o padrão selecionado continua DEFAULT_TYPES).
const AVAILABLE_TYPES = [ 'delivery', 'pickup', 'table', 'reservation' ];

const labels = {
  delivery: 'Entrega',
  pickup: 'Retirada',
  table: 'Mesa',
  reservation: 'Reserva',
};
const icons = {
  delivery: Bicycle,
  pickup: House,
  table: ForkKnife,
  reservation: CalendarBlank,
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
  const [tableServiceSettings, setTableServiceSettings] = useState(() =>
    normalizeTableServiceSettings(auth?.store?.settings?.tableServiceSettings)
  );
  const [saving, setSaving] = useState(false);
  const isVip = Boolean(auth?.store?.settings?.planExempt || auth?.subscription?.planExempt);
  const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
  const canUseDelivery = Boolean(
    isVip ||
      auth?.features?.deliveryMode ||
      String(auth?.subscription?.status || '').toUpperCase() === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );

  useEffect(() => {
    const next = Array.isArray(auth?.store?.settings?.orderTypes) && auth.store.settings.orderTypes.length > 0
      ? auth.store.settings.orderTypes
      : DEFAULT_TYPES;
    setSelected(canUseDelivery ? next : next.filter((type) => type !== 'delivery'));
    setTableServiceSettings(normalizeTableServiceSettings(auth?.store?.settings?.tableServiceSettings));
  }, [
    auth?.store?.id,
    auth?.store?.settings?.orderTypes,
    auth?.store?.settings?.tableServiceSettings,
    canUseDelivery,
  ]);

  const updateTableService = (patch) => {
    setTableServiceSettings((prev) => ({ ...prev, ...patch }));
  };

  const toggleType = (type) => {
    if (type === 'delivery' && !canUseDelivery) {
      showToast('Entrega disponível no plano Pro.', 'info');
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
    const nextSelected = canUseDelivery ? selected : selected.filter((type) => type !== 'delivery');
    setSaving(true);
    try {
      const normalizedTableService = normalizeTableServiceSettings(tableServiceSettings);
      const updated = await storeService.update(storeId, {
        orderTypes: nextSelected,
        tableServiceSettings: normalizedTableService,
      });
      if (updated?.settings?.orderTypes) {
        setAuth({
          ...auth,
          store: {
            ...auth.store,
            settings: {
              ...auth.store.settings,
              orderTypes: updated.settings.orderTypes,
              tableServiceSettings: updated.settings.tableServiceSettings || normalizedTableService,
            },
          },
        });
      } else {
        setSelected(nextSelected);
        setTableServiceSettings(normalizedTableService);
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
        {AVAILABLE_TYPES.map((type) => {
          const active = selected.includes(type);
          const Icon = icons[type];
          const disabled = type === 'delivery' && !canUseDelivery;
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
      {!canUseDelivery ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800 flex items-center justify-between gap-2">
          <span>Entrega está disponível no plano Pro.</span>
          <button
            type="button"
            onClick={() => navigate('/admin/renewal')}
            className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 font-bold text-violet-700 hover:bg-violet-100"
          >
            Trocar assinatura
          </button>
        </div>
      ) : null}
      {selected.includes('table') ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-slate-50 p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
              <Receipt size={18} weight="duotone" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900">Atendimento na mesa</p>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                Extras aparecem na fila como botões rápidos e só entram no cupom/RawBT quando aplicados no pedido.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={tableServiceSettings.couvertEnabled}
                  onChange={(event) => updateTableService({ couvertEnabled: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-300"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <UsersThree size={16} weight="duotone" /> Couvert artístico
                  </span>
                  <span className="block text-[11px] font-semibold leading-4 text-slate-500">
                    Cobrança por pessoa em mesa, aplicada manualmente pelo operador.
                  </span>
                </span>
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
                <input
                  value={tableServiceSettings.couvertLabel}
                  onChange={(event) => updateTableService({ couvertLabel: event.target.value })}
                  placeholder="Couvert artístico"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                <input
                  value={String(tableServiceSettings.couvertPrice || '')}
                  onChange={(event) => updateTableService({ couvertPrice: event.target.value })}
                  placeholder="R$ por pessoa"
                  inputMode="decimal"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={tableServiceSettings.serviceChargeEnabled}
                  onChange={(event) => updateTableService({ serviceChargeEnabled: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Percent size={16} weight="duotone" /> Taxa de serviço
                  </span>
                  <span className="block text-[11px] font-semibold leading-4 text-slate-500">
                    Opcional por lei: ative apenas se a loja informa essa cobrança ao cliente.
                  </span>
                </span>
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
                <input
                  value={tableServiceSettings.serviceChargeLabel}
                  onChange={(event) => updateTableService({ serviceChargeLabel: event.target.value })}
                  placeholder="Taxa de serviço"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <input
                  value={String(tableServiceSettings.serviceChargePercent || '')}
                  onChange={(event) => updateTableService({ serviceChargePercent: event.target.value })}
                  placeholder="10%"
                  inputMode="decimal"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>
          </div>
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
