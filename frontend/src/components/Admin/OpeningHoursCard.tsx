// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { storeService } from '../../services/storeService';
import { normalizeOpeningHours } from '../../utils/storeHours';

export function OpeningHoursCard() {
  const { auth, setAuth } = useAuth();
  const storeId = auth?.store?.id;
  const [openingHours, setOpeningHours] = useState(() =>
    normalizeOpeningHours(auth?.store?.settings?.openingHours || [])
  );
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      console.error('Erro ao salvar horario', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-3">Horario de funcionamento</h3>
      <div className="space-y-3">
        {openingHours.map((entry) => (
          <div key={entry.day} className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 text-sm font-semibold text-slate-600">{dayLabels[entry.day]}</div>
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
                className="ml-auto px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={!entry.enabled}
              >
                + faixa
              </button>
            </div>

            {(entry.intervals || []).map((interval, index) => (
              <div key={`${entry.day}-${index}`} className="flex items-center gap-3 pl-12">
                <input
                  type="time"
                  value={interval.start || '10:00'}
                  onChange={(e) => updateInterval(entry.day, index, 'start', e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                  disabled={!entry.enabled}
                />
                <span className="text-xs text-slate-400">às</span>
                <input
                  type="time"
                  value={interval.end || '22:00'}
                  onChange={(e) => updateInterval(entry.day, index, 'end', e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                  disabled={!entry.enabled}
                />
                <button
                  type="button"
                  onClick={() => removeInterval(entry.day, index)}
                  className="px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-500 hover:bg-slate-50"
                  disabled={!entry.enabled}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={saveOpeningHours}
          className="w-full text-white py-2 rounded-lg text-sm font-semibold bg-brand-gradient hover:opacity-90 transition"
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar horario'}
        </button>
      </div>
    </div>
  );
}
