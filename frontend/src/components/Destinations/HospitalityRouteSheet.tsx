// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { Capacitor } from '@capacitor/core';
import {
  ArrowRight,
  CheckCircle,
  ClipboardText,
  HouseLine,
  MapPinLine,
  NavigationArrow,
  ShareNetwork,
  Storefront,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { RouteMapView } from '../RouteMapView';
import { buildWhatsAppUrl } from '../../utils/destinationWhatsApp';

type RoutePoint = {
  name: string;
  address: string;
  routeAddress: string;
  lat?: string | number | null;
  lng?: string | number | null;
  geoApproximate?: any;
  geoPrecision?: any;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicePoint: RoutePoint;
  placePoint: RoutePoint;
  serviceImageUrl?: string;
  placeImageUrl?: string;
  serviceWhatsapp?: string;
  routeUrl: string;
};

const normalizeCoordinate = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const hasCoords = (point: any) =>
  normalizeCoordinate(point?.lat) !== null && normalizeCoordinate(point?.lng) !== null;

const toCoords = (point: any) => ({
  lat: Number(normalizeCoordinate(point?.lat)),
  lng: Number(normalizeCoordinate(point?.lng)),
});

const isApproximatePoint = (point: any) =>
  Boolean(point?.geoApproximate || ['zip', 'city', 'unknown'].includes(String(point?.geoPrecision || '').toLowerCase()));

const mapPointQuery = (point: any) => {
  const address = String(point?.routeAddress || point?.address || '').trim();
  const name = String(point?.name || '').trim();
  if (isApproximatePoint(point) && address) {
    return [name, address].filter(Boolean).join(', ');
  }
  if (hasCoords(point)) {
    const coords = toCoords(point);
    return `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
  }
  return [name, address].filter(Boolean).join(', ');
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

const openExternal = async (url: string) => {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      // Fallback below.
    }
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
};

const PointAvatar = ({ imageUrl, name, accent, Icon }: any) => (
  <div
    className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full ring-1"
    style={{ backgroundColor: accent === 'service' ? '#edf5fa' : '#ecfbf0', color: accent === 'service' ? '#336886' : '#2f9c48', borderColor: accent === 'service' ? '#cfe0ea' : '#bfe9c4' }}
    title={name}
  >
    {imageUrl ? (
      <img src={imageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
    ) : (
      <Icon size={17} weight="duotone" />
    )}
  </div>
);

export function HospitalityRouteSheet({
  open,
  onOpenChange,
  servicePoint,
  placePoint,
  serviceImageUrl,
  placeImageUrl,
  serviceWhatsapp,
  routeUrl,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const canShowMap = useMemo(
    () => hasCoords(servicePoint) && hasCoords(placePoint) && !isApproximatePoint(servicePoint) && !isApproximatePoint(placePoint),
    [servicePoint, placePoint]
  );

  const googleDirectionsUrl = useMemo(
    () => buildGoogleDirectionsUrl(servicePoint, placePoint),
    [servicePoint, placePoint]
  );

  const shareMessage = useMemo(
    () =>
      [
        `Olá! Estou hospedado em ${placePoint?.name || 'minha hospedagem'}.`,
        placePoint?.address ? `Endereço para entrega: ${placePoint.address}` : '',
        routeUrl ? `Como chegar até meu chalé: ${routeUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    [placePoint?.address, placePoint?.name, routeUrl]
  );

  const shareWhatsappUrl = serviceWhatsapp ? buildWhatsAppUrl(serviceWhatsapp, shareMessage) : '';

  const handlePrimary = async () => {
    if (shareWhatsappUrl) {
      await openExternal(shareWhatsappUrl);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Localização de ${placePoint?.name || 'chalé'}`, text: shareMessage, url: routeUrl });
        return;
      } catch {
        // Fallback to copy below.
      }
    }
    await copyRouteUrl();
  };

  const copyRouteUrl = async () => {
    if (!routeUrl) return;
    try {
      await navigator.clipboard.writeText(routeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[300] bg-slate-950/50 backdrop-blur-[3px]" />
        <Drawer.Content className="jnc-hub-surface fixed inset-x-0 bottom-0 z-[310] mx-auto h-fit max-h-[92vh] max-w-2xl overflow-hidden rounded-t-[2rem] text-slate-950 shadow-[0_-28px_76px_-42px_rgba(15,23,42,0.7)] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300/80" />
          <div className="max-h-[calc(92vh-0.75rem)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3">
            <Drawer.Title className="sr-only">Como chegar até meu chalé</Drawer.Title>
            <Drawer.Description className="sr-only">
              Envie a localização da hospedagem ou abra a rota até o chalé.
            </Drawer.Description>

            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Como chegar até meu chalé</p>
                <h2 className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[17px] font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[19px]">
                  <span className="truncate">{servicePoint?.name || 'Serviço'}</span>
                  <ArrowRight size={15} weight="bold" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{placePoint?.name || 'Chalé'}</span>
                </h2>
              </div>
            </header>

            <div className="mt-3 flex items-center gap-2 rounded-[1.25rem] border border-white/70 bg-white/86 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur">
              <PointAvatar imageUrl={serviceImageUrl} name={servicePoint?.name} accent="service" Icon={Storefront} />
              <span className="h-0.5 flex-1 rounded-full bg-[linear-gradient(90deg,#336886_0%,rgba(95,211,90,0.5)_100%)]" />
              <PointAvatar imageUrl={placeImageUrl} name={placePoint?.name} accent="place" Icon={HouseLine} />
            </div>

            <div className="mt-3">
              {canShowMap ? (
                <RouteMapView
                  origin={toCoords(servicePoint)}
                  destination={toCoords(placePoint)}
                  compact
                  hideAction
                  premiumMotion
                  originLabel={servicePoint?.name || 'Serviço'}
                  destinationLabel={placePoint?.name || 'Chalé'}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-[1.25rem] border border-dashed border-[#336886]/22 bg-[#edf5fa]/70 px-4 py-3 text-[12px] font-semibold leading-relaxed text-[#153A4C]">
                  <MapPinLine size={16} weight="duotone" className="shrink-0 text-[#336886]" />
                  Endereço como referência — o endereço do chalé será enviado para o entregador.
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => void handlePrimary()}
                className="jnc-hub-touch inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-[#25D366] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_-24px_rgba(37,211,102,0.72)] transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {shareWhatsappUrl ? <WhatsappLogo size={18} weight="fill" /> : <ShareNetwork size={18} weight="fill" />}
                Enviar localização do chalé
              </button>

              {googleDirectionsUrl ? (
                <button
                  type="button"
                  onClick={() => void openExternal(googleDirectionsUrl)}
                  className="jnc-hub-touch inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.15rem] border border-[#336886]/14 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#336886] shadow-sm transition hover:-translate-y-0.5 hover:border-[#336886]/22 active:scale-[0.98]"
                >
                  <NavigationArrow size={18} weight="duotone" />
                  Abrir no mapa
                </button>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void copyRouteUrl()}
                className={`jnc-hub-touch inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition active:scale-95 ${
                  copied
                    ? 'border-emerald-200 bg-[#5FD35A]/16 text-[#2d5f7b]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#336886]/22 hover:text-[#336886]'
                }`}
                aria-live="polite"
              >
                {copied ? <CheckCircle size={14} weight="fill" /> : <ClipboardText size={14} weight="duotone" />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>

            {placePoint?.address ? (
              <p className="mt-3 rounded-[1rem] bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-slate-500">
                <span className="font-black text-slate-600">Endereço de entrega: </span>
                {placePoint.address}
              </p>
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
