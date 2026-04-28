import { useMemo } from 'react';

type RouteCoords = {
  lat: number;
  lng: number;
};

type RouteMapViewProps = {
  origin: RouteCoords;
  destination: RouteCoords;
  zoom?: number;
  compact?: boolean;
};

const buildDirectionsUrl = (origin: RouteCoords, destination: RouteCoords) => {
  const originLat = Number(origin?.lat).toFixed(6);
  const originLng = Number(origin?.lng).toFixed(6);
  const destinationLat = Number(destination?.lat).toFixed(6);
  const destinationLng = Number(destination?.lng).toFixed(6);
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${originLat}%2C${originLng}%3B${destinationLat}%2C${destinationLng}`;
};

const isValidPoint = (point?: Partial<RouteCoords> | null) =>
  Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng));

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

const buildMapLayout = (origin: RouteCoords, destination: RouteCoords) => {
  const minLat = Math.min(Number(origin.lat), Number(destination.lat));
  const maxLat = Math.max(Number(origin.lat), Number(destination.lat));
  const minLng = Math.min(Number(origin.lng), Number(destination.lng));
  const maxLng = Math.max(Number(origin.lng), Number(destination.lng));

  const latSpan = Math.max(0.002, maxLat - minLat);
  const lngSpan = Math.max(0.002, maxLng - minLng);
  const latPadding = Math.max(latSpan * 0.28, 0.0012);
  const lngPadding = Math.max(lngSpan * 0.28, 0.0012);

  const north = maxLat + latPadding;
  const south = minLat - latPadding;
  const east = maxLng + lngPadding;
  const west = minLng - lngPadding;

  const projectX = (lng: number) => {
    const normalized = (lng - west) / Math.max(east - west, 0.000001);
    return clamp(normalized * 100, 10, 90);
  };
  const projectY = (lat: number) => {
    const normalized = (north - lat) / Math.max(north - south, 0.000001);
    return clamp(normalized * 100, 12, 88);
  };

  const start = { x: projectX(Number(origin.lng)), y: projectY(Number(origin.lat)) };
  const end = { x: projectX(Number(destination.lng)), y: projectY(Number(destination.lat)) };
  const midX = (start.x + end.x) / 2;
  const controlY = Math.min(start.y, end.y) - Math.max(8, Math.abs(start.x - end.x) * 0.12);

  return {
    start,
    end,
    routePath: `M ${start.x} ${start.y} Q ${midX} ${controlY} ${end.x} ${end.y}`,
    supportPath: `M ${start.x} ${start.y} Q ${midX} ${controlY + 4} ${end.x} ${end.y}`,
  };
};

export function RouteMapView({ origin, destination, zoom = 13, compact = false }: RouteMapViewProps) {
  const isValid = isValidPoint(origin) && isValidPoint(destination);
  const mapLayout = useMemo(
    () => (isValid ? buildMapLayout(origin, destination) : null),
    [destination, isValid, origin]
  );
  const directionsUrl = useMemo(
    () => (isValid ? buildDirectionsUrl(origin, destination) : ''),
    [destination, isValid, origin]
  );

  if (!isValid || !mapLayout) {
    return (
      <div className="flex min-h-[220px] w-full items-center justify-center rounded-[1.35rem] border border-dashed border-stone-300 bg-[linear-gradient(180deg,#fffcf7_0%,#f7f1e7_100%)] px-4 text-sm font-medium text-stone-500">
        Rota indisponível no momento.
      </div>
    );
  }

  const heightClass = compact ? 'h-[180px] sm:h-[200px]' : 'h-[240px] sm:h-[280px]';
  const zoomBadge = Math.max(10, Math.min(18, Number(zoom || 13)));

  return (
    <div className={`overflow-hidden rounded-[1.4rem] border border-[#e7dcc8] bg-[linear-gradient(180deg,#fffaf0_0%,#f8f1e6_100%)] ${heightClass}`}>
      <div className="relative h-full w-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(245,240,228,0.92))]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: compact ? '30px 30px' : '38px 38px',
          }}
        />

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path d={mapLayout.supportPath} fill="none" stroke="rgba(120,113,108,0.12)" strokeWidth="5.6" strokeLinecap="round" />
          <path
            d={mapLayout.routePath}
            fill="none"
            stroke="rgba(245,158,11,0.88)"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeDasharray="0.01 6.4"
          />
          <path d={mapLayout.routePath} fill="none" stroke="rgba(68,64,60,0.68)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx={mapLayout.start.x} cy={mapLayout.start.y} r="4.2" fill="rgba(31,41,55,0.16)" />
          <circle cx={mapLayout.start.x} cy={mapLayout.start.y} r="2.4" fill="#1f2937" />
          <circle cx={mapLayout.end.x} cy={mapLayout.end.y} r="4.8" fill="rgba(234,88,12,0.2)" />
          <circle cx={mapLayout.end.x} cy={mapLayout.end.y} r="2.8" fill="#ea580c" />
          <circle cx={mapLayout.end.x} cy={mapLayout.end.y} r="7.4" fill="none" stroke="rgba(234,88,12,0.22)" strokeWidth="1.1">
            <animate attributeName="r" values="5.8;8.2;5.8" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </svg>

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full border border-stone-900/10 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-stone-700 shadow-[0_12px_24px_-22px_rgba(28,25,23,0.6)]">
            Rota estimada
          </span>
          <span className="rounded-full border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[10px] font-bold text-amber-800">
            Zoom {zoomBadge}
          </span>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-[0_18px_30px_-24px_rgba(28,25,23,0.55)] backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-stone-900" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Origem</p>
              <p className="truncate text-xs font-bold text-stone-800">Loja</p>
            </div>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-amber-300/80 bg-[linear-gradient(135deg,#fff7e7,#f7d58d)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-900 shadow-[0_18px_30px_-24px_rgba(180,83,9,0.62)] transition-transform hover:-translate-y-0.5"
          >
            Abrir no mapa
          </a>

          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-[0_18px_30px_-24px_rgba(28,25,23,0.55)] backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Destino</p>
              <p className="truncate text-xs font-bold text-stone-800">Entrega</p>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute h-9 w-9 rounded-full bg-white/75 shadow-[0_24px_32px_-24px_rgba(120,53,15,0.4)]"
          style={{
            left: `${lerp(mapLayout.start.x, mapLayout.end.x, 0.52)}%`,
            top: `${lerp(mapLayout.start.y, mapLayout.end.y, 0.28)}%`,
          }}
        />
      </div>
    </div>
  );
}
