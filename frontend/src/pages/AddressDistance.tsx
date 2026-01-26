// @ts-nocheck
import { useMemo, useState } from 'react';
import { GoogleMapView } from '../components/GoogleMapView';
import { mapsService } from '../services/mapsService';

const DEFAULT_ORIGIN = {
  lat: Number(import.meta.env.VITE_STORE_ORIGIN_LAT || -23.55052),
  lng: Number(import.meta.env.VITE_STORE_ORIGIN_LNG || -46.633308),
  label: import.meta.env.VITE_STORE_ORIGIN_LABEL || 'Loja',
};

export function AddressDistance() {
  const [address, setAddress] = useState('');
  const [originMode, setOriginMode] = useState<'default' | 'custom'>('default');
  const [customOrigin, setCustomOrigin] = useState({ lat: '', lng: '' });
  const [result, setResult] = useState<{ distanceKm?: number; durationMin?: number | null } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; formatted?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const origin = useMemo(() => {
    if (originMode === 'custom') {
      const lat = Number(customOrigin.lat);
      const lng = Number(customOrigin.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, label: 'Origem' };
    }
    return DEFAULT_ORIGIN;
  }, [originMode, customOrigin]);

  const markers = useMemo(() => {
    const list = [];
    if (origin) list.push({ lat: origin.lat, lng: origin.lng, label: 'O' });
    if (destination) list.push({ lat: destination.lat, lng: destination.lng, label: 'D' });
    return list;
  }, [origin, destination]);

  const handleCalculate = async () => {
    setError('');
    setResult(null);
    setDestination(null);
    if (!address || address.trim().length < 5) {
      setError('Informe um endereço completo para calcular.');
      return;
    }
    if (!origin) {
      setError('Defina uma origem válida.');
      return;
    }

    setLoading(true);
    try {
      const geo = await mapsService.geocode(address);
      setDestination({ lat: geo.lat, lng: geo.lng, formatted: geo.formattedAddress });
      const route = await mapsService.route(
        { lat: origin.lat, lng: origin.lng },
        { lat: geo.lat, lng: geo.lng }
      );
      setResult(route);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível calcular a rota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Distância por endereço</h1>
          <p className="text-sm text-slate-600">
            Informe o endereço do cliente e calcule distância + tempo estimado.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Endereço do cliente</label>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Origem</p>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOriginMode('default')}
                  className={`px-3 py-1.5 rounded-full border ${
                    originMode === 'default'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Usar loja
                </button>
                <button
                  type="button"
                  onClick={() => setOriginMode('custom')}
                  className={`px-3 py-1.5 rounded-full border ${
                    originMode === 'custom'
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Origem manual
                </button>
              </div>
              {originMode === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={customOrigin.lat}
                    onChange={(event) => setCustomOrigin((prev) => ({ ...prev, lat: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Latitude"
                  />
                  <input
                    value={customOrigin.lng}
                    onChange={(event) => setCustomOrigin((prev) => ({ ...prev, lng: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Longitude"
                  />
                </div>
              )}
              {originMode === 'default' && (
                <p className="text-xs text-slate-500">
                  Origem fixa: {DEFAULT_ORIGIN.lat}, {DEFAULT_ORIGIN.lng}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="w-full rounded-xl bg-brand-primary text-white py-2.5 font-semibold hover:brightness-95 disabled:opacity-60"
            >
              {loading ? 'Calculando...' : 'Calcular'}
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 space-y-1">
                <p>Distância: <strong>{result.distanceKm} km</strong></p>
                <p>
                  Duração: <strong>{result.durationMin ?? '-'} min</strong>
                </p>
                {destination?.formatted && (
                  <p className="text-xs text-emerald-700/80">Destino: {destination.formatted}</p>
                )}
              </div>
            )}
          </div>

          <GoogleMapView markers={markers} />
        </div>
      </div>
    </div>
  );
}
