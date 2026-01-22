// @ts-nocheck
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { storeService } from '../../services/storeService';
import { normalizeOpeningHours } from '../../utils/storeHours';

export function OpeningHoursCard() {
  const { auth, setAuth } = useAuth();
  const { showToast } = useToast();
  const storeId = auth?.store?.id;
  const [openingHours, setOpeningHours] = useState(() =>
    normalizeOpeningHours(auth?.store?.settings?.openingHours || [])
  );
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setOpeningHours(normalizeOpeningHours(auth?.store?.settings?.openingHours || []));
  }, [auth?.store?.id]);

  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const updateDay = (day, field, value) => {
    setOpeningHours((prev) =>
      prev.map((entry) =>
        entry.day === day ? { ...entry, [field]: value } : entry
      )
    );
  };

  const updateInterval = (day, index, field, value) => {
    setOpeningHours((prev) =>
      prev.map((entry) => {
        if (entry.day !== day) return entry;
        const intervals = (entry.intervals || []).map((interval, idx) =>
          idx === index ? { ...interval, [field]: value } : interval
        );
        return { ...entry, intervals };
      })
    );
  };

  const addInterval = (day) => {
    setOpeningHours((prev) =>
      prev.map((entry) => {
        if (entry.day !== day) return entry;
        const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
        return {
          ...entry,
          intervals: [ ...intervals, { start: '18:00', end: '22:00' } ],
        };
      })
    );
  };

  const removeInterval = (day, index) => {
    setOpeningHours((prev) =>
      prev.map((entry) => {
        if (entry.day !== day) return entry;
        const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
        const nextIntervals = intervals.filter((_, idx) => idx !== index);
        return {
          ...entry,
          intervals: nextIntervals.length > 0 ? nextIntervals : [ { start: '10:00', end: '22:00' } ],
        };
      })
    );
  };

  const saveOpeningHours = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const updated = await storeService.update(storeId, { openingHours });
      if (updated?.settings?.openingHours) {
        setAuth({
          ...auth,
          store: {
            ...auth.store,
            settings: {
              ...auth.store.settings,
              openingHours: updated.settings.openingHours,
            },
          },
        });
      }
      showToast('Horário salvo com sucesso.', 'success');
      setLastSavedAt(Date.now());
    } catch (err) {
      console.error('Erro ao salvar horario', err);
      showToast('Não foi possível salvar o horário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Horario de funcionamento</h3>
          <p className="text-xs text-slate-500">Atualize os horarios visiveis na vitrine.</p>
        </div>
        {lastSavedAt && (
          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
            Salvo agora
          </span>
        )}
      </div>
      <div className="space-y-3">
        {openingHours.map((entry) => (
          <div
            key={entry.day}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="text-sm font-semibold text-slate-700">{dayLabels[entry.day]}</div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => updateDay(entry.day, 'enabled', e.target.checked)}
                />
                Aberto
              </label>
              <button
                type="button"
                onClick={() => addInterval(entry.day)}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all hover:-translate-y-0.5 active:scale-95"
                disabled={!entry.enabled}
              >
                + faixa
              </button>
            </div>

            {entry.enabled ? (
              <div className="mt-3 space-y-2">
                {(entry.intervals || []).map((interval, index) => (
                  <div
                    key={`${entry.day}-${index}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="time"
                      value={interval.start || '10:00'}
                      onChange={(e) => updateInterval(entry.day, index, 'start', e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-full sm:w-auto"
                      disabled={!entry.enabled}
                    />
                    <span className="text-xs text-slate-400">às</span>
                    <input
                      type="time"
                      value={interval.end || '22:00'}
                      onChange={(e) => updateInterval(entry.day, index, 'end', e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-full sm:w-auto"
                      disabled={!entry.enabled}
                    />
                    <button
                      type="button"
                      onClick={() => removeInterval(entry.day, index)}
                      className="px-2.5 py-1 rounded-lg text-xs border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all hover:-translate-y-0.5 active:scale-95"
                      disabled={!entry.enabled}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Fechado</p>
            )}
          </div>
        ))}
      </div>
        <button
          onClick={saveOpeningHours}
          className="mt-4 w-full text-white py-2 rounded-lg text-sm font-semibold bg-brand-gradient hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar horario'}
        </button>
    </div>
  );
}
