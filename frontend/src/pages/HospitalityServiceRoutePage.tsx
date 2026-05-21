// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPinLine, NavigationArrow, Storefront } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { RouteMapView } from '../components/RouteMapView';
import { destinationService } from '../services/destinationService';

const normalizeCoordinate = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const hasCoords = (point: any) => normalizeCoordinate(point?.lat) !== null && normalizeCoordinate(point?.lng) !== null;

const toCoords = (point: any) => ({
  lat: Number(normalizeCoordinate(point?.lat)),
  lng: Number(normalizeCoordinate(point?.lng)),
});

const haversineKm = (origin: any, destination: any) => {
  if (!hasCoords(origin) || !hasCoords(destination)) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const a = toCoords(origin);
  const b = toCoords(destination);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};

const mapPointQuery = (point: any) => {
  if (hasCoords(point)) {
    const coords = toCoords(point);
    return `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
  }
  return String(point?.address || '').trim();
};

const buildGoogleDirectionsUrl = (origin: any, destination: any) => {
  const originQuery = mapPointQuery(origin);
  const destinationQuery = mapPointQuery(destination);
  if (!destinationQuery) return '';

  const params = new URLSearchParams({
    api: '1',
    destination: destinationQuery,
    travelmode: 'driving',
  });
  if (originQuery) params.set('origin', originQuery);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const buildWazeUrl = (destination: any) => {
  if (hasCoords(destination)) {
    const coords = toCoords(destination);
    return `https://waze.com/ul?ll=${coords.lat.toFixed(6)}%2C${coords.lng.toFixed(6)}&navigate=yes`;
  }
  const address = String(destination?.address || '').trim();
  return address ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes` : '';
};

const formatDistance = (value?: number | null) => {
  if (!Number.isFinite(Number(value))) return 'Distância indisponível';
  const km = Number(value);
  return km < 1 ? `${Math.max(80, Math.round(km * 1000))} m em linha reta` : `${km.toFixed(1).replace('.', ',')} km em linha reta`;
};

const estimateMinutes = (distanceKm?: number | null) => {
  if (!Number.isFinite(Number(distanceKm))) return '';
  return `${Math.max(4, Math.round(Number(distanceKm) * 3.2))} min aprox.`;
};

export function HospitalityServiceRoutePage() {
  const { destinationSlug = '', placeSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    destinationService
      .getHospitalityPlace(destinationSlug, placeSlug)
      .then((data) => {
        if (active) setPayload(data || null);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar os dados da hospedagem.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destinationSlug, placeSlug]);

  const destination = payload?.destination || {};
  const place = payload?.hospitalityPlace || {};
  const servicePoint = useMemo(() => ({
    name: searchParams.get('serviceName') || 'Restaurante ou serviço',
    address: searchParams.get('serviceAddress') || '',
    lat: searchParams.get('serviceLat') || '',
    lng: searchParams.get('serviceLng') || '',
  }), [searchParams]);
  const placePoint = useMemo(() => ({
    name: searchParams.get('placeName') || place.name || 'Hospedagem',
    address: searchParams.get('placeAddress') || place.address || '',
    lat: searchParams.get('placeLat') || place.lat || '',
    lng: searchParams.get('placeLng') || place.lng || '',
  }), [place.address, place.lat, place.lng, place.name, searchParams]);
  const distanceKm = useMemo(() => haversineKm(servicePoint, placePoint), [servicePoint, placePoint]);
  const googleDirectionsUrl = useMemo(() => buildGoogleDirectionsUrl(servicePoint, placePoint), [servicePoint, placePoint]);
  const wazeUrl = useMemo(() => buildWazeUrl(placePoint), [placePoint]);
  const canShowMap = hasCoords(servicePoint) && hasCoords(placePoint);
  const placePublicPath = `/destinos/${encodeURIComponent(destinationSlug)}/chales/${encodeURIComponent(placeSlug)}`;

  return (
    <PublicDestinationShell active="place" backTo={placePublicPath} backLabel="Voltar" contextLabel="Rota da hospedagem">
      <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(51,104,134,0.16),transparent_34%),linear-gradient(135deg,#f6f2e9,#eef5f1_58%,#eadfc8)] px-4 pb-10 pt-5">
        <section className="mx-auto max-w-4xl">
          <Link to={placePublicPath} className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#153A4C] shadow-sm ring-1 ring-white/80 backdrop-blur">
            <ArrowLeft size={14} weight="bold" />
            Voltar ao chalé
          </Link>

          <div className="mt-4 overflow-hidden rounded-[1.85rem] border border-white/85 bg-white/92 p-4 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.5)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Rota para atendimento</p>
                <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  {servicePoint.name} até {placePoint.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                  Use este link para o restaurante, serviço ou motoboy localizar a hospedagem e abrir a rota sem depender apenas do nome do chalé.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[15rem]">
                <div className="rounded-[1.15rem] bg-[#153A4C] p-3 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/62">Distância</p>
                  <p className="mt-1 text-sm font-black">{formatDistance(distanceKm)}</p>
                </div>
                <div className="rounded-[1.15rem] bg-[#5FD35A]/14 p-3 text-[#153A4C] ring-1 ring-[#5FD35A]/18">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#153A4C]/62">Tempo</p>
                  <p className="mt-1 text-sm font-black">{estimateMinutes(distanceKm) || 'Abrir mapa'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <Storefront size={14} weight="duotone" className="text-[#336886]" />
                  Origem
                </p>
                <p className="mt-2 text-base font-black text-slate-950">{servicePoint.name}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{servicePoint.address || 'Endereço do serviço não informado.'}</p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <MapPinLine size={14} weight="duotone" className="text-[#5FD35A]" />
                  Destino
                </p>
                <p className="mt-2 text-base font-black text-slate-950">{placePoint.name}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{placePoint.address || 'Endereço da hospedagem não informado.'}</p>
              </div>
            </div>

            <div className="mt-5">
              {canShowMap ? (
                <RouteMapView
                  origin={toCoords(servicePoint)}
                  destination={toCoords(placePoint)}
                  compact
                  originLabel="Serviço"
                  destinationLabel="Chalé"
                  mapActionLabel="Abrir rota"
                />
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm font-semibold leading-relaxed text-slate-600">
                  O mapa visual precisa de coordenadas dos dois pontos. Mesmo assim, os botões abaixo abrem a rota usando o endereço informado.
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {googleDirectionsUrl ? (
                <a href={googleDirectionsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] bg-[#153A4C] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.75)] transition hover:-translate-y-0.5 active:scale-[0.98]">
                  <NavigationArrow size={17} weight="fill" />
                  Abrir no Google Maps
                </a>
              ) : null}
              {wazeUrl ? (
                <a href={wazeUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] border border-[#153A4C]/14 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]">
                  <Clock size={17} weight="duotone" />
                  Abrir no Waze
                </a>
              ) : null}
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {error} O link continua funcionando com as informações enviadas pelo WhatsApp.
              </p>
            ) : loading ? (
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Conferindo dados da hospedagem...</p>
            ) : null}
          </div>
        </section>
      </main>
    </PublicDestinationShell>
  );
}
