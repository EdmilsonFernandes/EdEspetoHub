// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { CheckCircle, ClipboardText, Clock, HouseLine, NavigationArrow, Storefront, WarningCircle } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { RouteMapView } from '../components/RouteMapView';
import { destinationService } from '../services/destinationService';
import { buildDestinationAddressLine } from '../utils/destinationWhatsApp';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

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

const buildGoogleNativeUrl = (origin: any, destination: any, fallbackUrl: string) => {
  if (!fallbackUrl || Capacitor.getPlatform() !== 'android') return '';
  const originQuery = mapPointQuery(origin);
  const destinationQuery = mapPointQuery(destination);
  if (!destinationQuery) return '';

  const params = new URLSearchParams({
    api: '1',
    destination: destinationQuery,
    travelmode: 'driving',
  });
  if (originQuery) params.set('origin', originQuery);

  return `intent://maps.google.com/maps?${params.toString()}#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
};

const buildWazeUrl = (destination: any) => {
  if (hasCoords(destination)) {
    const coords = toCoords(destination);
    return `https://waze.com/ul?ll=${coords.lat.toFixed(6)}%2C${coords.lng.toFixed(6)}&navigate=yes`;
  }
  const address = String(destination?.address || '').trim();
  return address ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes` : '';
};

const buildWazeNativeUrl = (destination: any, fallbackUrl: string) => {
  if (!fallbackUrl || Capacitor.getPlatform() !== 'android') return '';
  let params = '';
  if (hasCoords(destination)) {
    const coords = toCoords(destination);
    params = `ll=${coords.lat.toFixed(6)}%2C${coords.lng.toFixed(6)}&navigate=yes`;
  } else {
    const address = String(destination?.address || '').trim();
    if (address) params = `q=${encodeURIComponent(address)}&navigate=yes`;
  }
  return params ? `intent://?${params}#Intent;scheme=waze;package=com.waze;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end` : '';
};

const formatDistance = (value?: number | null) => {
  if (!Number.isFinite(Number(value))) return 'Distância indisponível';
  const km = Number(value);
  return km < 1 ? `${Math.max(80, Math.round(km * 1000))} m em linha reta` : `${km.toFixed(1).replace('.', ',')} km em linha reta`;
};

const openExternalRoute = (url: string, nativeUrl?: string) => (event: any) => {
  event.preventDefault();
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    window.location.href = nativeUrl || url;
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

const estimateMinutes = (distanceKm?: number | null) => {
  if (!Number.isFinite(Number(distanceKm))) return '';
  return `${Math.max(4, Math.round(Number(distanceKm) * 4.4 + 2))} min aprox.`;
};

const pointFallbackImage = (point: any, kind: 'service' | 'place') =>
  getStoreAvatarUrl(point?.slug || point?.id || point?.name, point?.name || (kind === 'service' ? 'Serviço' : 'Hospedagem'));

const PointCard = ({ point, label, kind, icon: Icon, imageUrl, accent = '#336886' }: any) => (
  <div className="rounded-[1.45rem] border border-white/80 bg-white/88 p-3 shadow-[0_18px_46px_-40px_rgba(15,23,42,0.52)] ring-1 ring-slate-900/[0.03] backdrop-blur">
    <div className="flex gap-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.15rem] bg-slate-100 ring-1 ring-white">
        <img
          src={imageUrl || pointFallbackImage(point, kind)}
          alt={point?.name || label}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(event) => {
            (event.target as HTMLImageElement).src = pointFallbackImage(point, kind);
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <Icon size={14} weight="duotone" style={{ color: accent }} />
          {label}
        </p>
        <p className="mt-1 truncate text-base font-black tracking-[-0.03em] text-slate-950">{point.name}</p>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600">
          {point.address || (kind === 'service' ? 'Endereço do serviço não informado.' : 'Endereço da hospedagem não informado.')}
        </p>
      </div>
    </div>
  </div>
);

export function HospitalityServiceRoutePage() {
  const { destinationSlug = '', placeSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

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
  const serviceId = searchParams.get('servico') || searchParams.get('serviceId') || '';
  const serviceFromPayload = useMemo(() => {
    const listings = Array.isArray(payload?.listings) ? payload.listings : [];
    return listings.find((item: any) => String(item?.id || '') === String(serviceId || '')) || null;
  }, [payload?.listings, serviceId]);
  const servicePoint = useMemo(() => ({
    name: searchParams.get('serviceName') || serviceFromPayload?.title || 'Restaurante ou serviço',
    address: buildDestinationAddressLine({
      address: searchParams.get('serviceAddress') || serviceFromPayload?.address || '',
      addressNumber: searchParams.get('serviceAddressNumber') || serviceFromPayload?.addressNumber || '',
      district: searchParams.get('serviceDistrict') || serviceFromPayload?.district || '',
      city: searchParams.get('serviceCity') || serviceFromPayload?.city || destination.city || '',
      state: searchParams.get('serviceState') || serviceFromPayload?.state || destination.state || '',
      zipCode: searchParams.get('serviceZipCode') || serviceFromPayload?.zipCode || '',
    }),
    lat: serviceFromPayload?.lat || searchParams.get('serviceLat') || '',
    lng: serviceFromPayload?.lng || searchParams.get('serviceLng') || '',
  }), [destination.city, destination.state, searchParams, serviceFromPayload]);
  const placePoint = useMemo(() => ({
    name: searchParams.get('placeName') || place.name || 'Hospedagem',
    address: buildDestinationAddressLine({
      address: searchParams.get('placeAddress') || place.address || '',
      addressNumber: searchParams.get('placeAddressNumber') || place.addressNumber || '',
      district: searchParams.get('placeDistrict') || place.district || '',
      city: searchParams.get('placeCity') || place.city || destination.city || '',
      state: searchParams.get('placeState') || place.state || destination.state || '',
      zipCode: searchParams.get('placeZipCode') || place.zipCode || '',
    }),
    lat: place.lat || searchParams.get('placeLat') || '',
    lng: place.lng || searchParams.get('placeLng') || '',
  }), [destination.city, destination.state, place.address, place.addressNumber, place.city, place.district, place.lat, place.lng, place.name, place.state, place.zipCode, searchParams]);
  const serviceImageUrl = useMemo(() => (
    resolveAssetUrl(
      serviceFromPayload?.logoUrl ||
      serviceFromPayload?.store?.settings?.logoUrl ||
      serviceFromPayload?.imageUrl ||
      serviceFromPayload?.bannerUrl ||
      serviceFromPayload?.store?.settings?.bannerUrl ||
      ''
    ) || getStoreAvatarUrl(serviceFromPayload?.slug || serviceFromPayload?.store?.slug || serviceId, servicePoint.name)
  ), [serviceFromPayload, serviceId, servicePoint.name]);
  const placeImageUrl = useMemo(() => (
    resolveAssetUrl(
      place.logoUrl ||
      place.bannerUrl ||
      (Array.isArray(place.bannerUrls) ? place.bannerUrls[0] : '') ||
      ''
    ) || getStoreAvatarUrl(place.slug || placeSlug, placePoint.name)
  ), [place.bannerUrl, place.bannerUrls, place.logoUrl, place.slug, placePoint.name, placeSlug]);
  const distanceKm = useMemo(() => haversineKm(servicePoint, placePoint), [servicePoint, placePoint]);
  const googleDirectionsUrl = useMemo(() => buildGoogleDirectionsUrl(servicePoint, placePoint), [servicePoint, placePoint]);
  const googleNativeUrl = useMemo(() => buildGoogleNativeUrl(servicePoint, placePoint, googleDirectionsUrl), [googleDirectionsUrl, servicePoint, placePoint]);
  const wazeUrl = useMemo(() => buildWazeUrl(placePoint), [placePoint]);
  const wazeNativeUrl = useMemo(() => buildWazeNativeUrl(placePoint, wazeUrl), [placePoint, wazeUrl]);
  const canShowMap = hasCoords(servicePoint) && hasCoords(placePoint);
  const missingCoordinates = [
    !hasCoords(servicePoint) ? 'serviço' : null,
    !hasCoords(placePoint) ? 'hospedagem' : null,
  ].filter(Boolean);
  const placePublicPath = `/destinos/${encodeURIComponent(destinationSlug)}/chales/${encodeURIComponent(placeSlug)}`;
  const currentRouteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);
  const copyText = async (value: string, feedback: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(feedback);
      window.setTimeout(() => setCopied(''), 2200);
    } catch {
      setCopied('Toque e segure para copiar.');
      window.setTimeout(() => setCopied(''), 2200);
    }
  };

  return (
    <PublicDestinationShell active="place" backTo={placePublicPath} backLabel="Voltar" contextLabel="Rota da hospedagem">
      <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(51,104,134,0.16),transparent_34%),linear-gradient(135deg,#f6f2e9,#eef5f1_58%,#eadfc8)] px-4 pb-10 pt-3 sm:pt-5">
        <section className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-[1.85rem] border border-white/85 bg-white/92 p-4 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.5)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Rota para atendimento</p>
                <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  {servicePoint.name} até {placePoint.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                  Compartilhe esta referência para o restaurante, serviço ou motoboy localizar a hospedagem com menos dúvida na entrega.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[15rem]">
                <div className="rounded-[1.15rem] border border-[#336886]/12 bg-white/82 p-3 text-[#153A4C] shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]/72">Distância</p>
                  <p className="mt-1 text-sm font-black">{formatDistance(distanceKm)}</p>
                </div>
                <div className="rounded-[1.15rem] border border-[#5FD35A]/20 bg-[#5FD35A]/12 p-3 text-[#153A4C] ring-1 ring-white/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#336886]/72">Tempo</p>
                  <p className="mt-1 text-sm font-black">{estimateMinutes(distanceKm) || 'Abrir mapa'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PointCard point={servicePoint} label="Origem" kind="service" icon={Storefront} imageUrl={serviceImageUrl} accent="#336886" />
              <PointCard point={placePoint} label="Destino do hóspede" kind="place" icon={HouseLine} imageUrl={placeImageUrl} accent="#5FD35A" />
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
                <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 p-4 text-sm font-semibold leading-relaxed text-amber-900">
                  <p className="flex items-center gap-2 font-black">
                    <WarningCircle size={18} weight="duotone" />
                    Coordenada pendente em {missingCoordinates.join(' e ')}.
                  </p>
                  <p className="mt-1">
                    O desenho da rota aparece quando os dois pontos têm latitude e longitude. Os botões abaixo ainda abrem a rota pelo endereço cadastrado.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {googleDirectionsUrl ? (
                <a href={googleDirectionsUrl} onClick={openExternalRoute(googleDirectionsUrl, googleNativeUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] border border-[#336886]/16 bg-[#336886] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_-24px_rgba(51,104,134,0.62)] transition hover:-translate-y-0.5 active:scale-[0.98]">
                  <NavigationArrow size={17} weight="fill" />
                  Abrir no Google Maps
                </a>
              ) : null}
              {wazeUrl ? (
                <a href={wazeUrl} onClick={openExternalRoute(wazeUrl, wazeNativeUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] border border-[#336886]/14 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#336886] shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]">
                  <Clock size={17} weight="duotone" />
                  Abrir no Waze
                </a>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => copyText(currentRouteUrl, 'Link da rota copiado.')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <ClipboardText size={16} weight="duotone" />
                Copiar link
              </button>
              <button
                type="button"
                onClick={() => copyText(placePoint.address, 'Endereço do chalé copiado.')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <HouseLine size={16} weight="duotone" />
                Copiar endereço
              </button>
            </div>
            {copied ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#5FD35A]/14 px-3 py-2 text-xs font-black text-[#2d5f7b]">
                <CheckCircle size={15} weight="fill" />
                {copied}
              </p>
            ) : null}

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
