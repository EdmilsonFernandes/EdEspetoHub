import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';

type RouteCoords = {
  lat: number;
  lng: number;
};

type RouteMapViewProps = {
  origin: RouteCoords;
  destination: RouteCoords;
  zoom?: number;
  compact?: boolean;
  originLabel?: string;
  destinationLabel?: string;
  mapActionLabel?: string;
  premiumMotion?: boolean;
  hideAction?: boolean;
};

const isValidPoint = (point?: Partial<RouteCoords> | null) =>
  Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng));

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

const openRouteInSystemBrowser = async (url: string) => {
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      // Fallback handled below.
    }
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
};

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

export function RouteMapView({
  origin,
  destination,
  zoom = 13,
  compact = false,
  originLabel = 'Loja',
  destinationLabel = 'Entrega',
  mapActionLabel = 'Abrir no mapa',
  premiumMotion = false,
  hideAction = false,
}: RouteMapViewProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const isValid = isValidPoint(origin) && isValidPoint(destination);
  const mapLayout = useMemo(
    () => (isValid ? buildMapLayout(origin, destination) : null),
    [destination, isValid, origin]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  if (!isValid || !mapLayout) {
    return (
      <div className="flex min-h-[220px] w-full items-center justify-center rounded-[1.35rem] border border-dashed border-stone-300 bg-[linear-gradient(180deg,#fffcf7_0%,#f7f1e7_100%)] px-4 text-sm font-medium text-stone-500">
        Rota indisponível no momento.
      </div>
    );
  }

  const heightClass = compact ? 'h-[180px] sm:h-[200px]' : 'h-[240px] sm:h-[280px]';
  const zoomBadge = Math.max(10, Math.min(18, Number(zoom || 13)));
  const shouldAnimate = premiumMotion && !reducedMotion;
  const mapSurfaceClass = premiumMotion
    ? 'border-white/85 bg-[radial-gradient(circle_at_12%_0%,rgba(95,211,90,0.20),transparent_34%),radial-gradient(circle_at_90%_8%,rgba(51,104,134,0.18),transparent_38%),linear-gradient(135deg,#fffdf7_0%,#eef7f4_54%,#f4ead6_100%)] shadow-[0_28px_70px_-46px_rgba(15,23,42,0.56)] ring-1 ring-white/65'
    : 'border-[#e7dcc8] bg-[linear-gradient(180deg,#fffaf0_0%,#f8f1e6_100%)]';

  return (
    <div className={`overflow-hidden rounded-[1.4rem] border ${mapSurfaceClass} ${heightClass}`}>
      {premiumMotion ? (
        <style>{`
          @keyframes jnc-route-draw {
            from { stroke-dashoffset: 100; opacity: 0.28; }
            42% { opacity: 1; }
            to { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes jnc-route-flow {
            from { stroke-dashoffset: 22; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes jnc-route-pin-drop {
            0% { opacity: 0; transform: translateY(-14px) scale(0.78); filter: blur(2px); }
            62% { opacity: 1; transform: translateY(2px) scale(1.06); filter: blur(0); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes jnc-route-pulse {
            0%, 100% { transform: scale(1); opacity: 0.72; }
            50% { transform: scale(1.22); opacity: 0.2; }
          }
          @keyframes jnc-route-float {
            0%, 100% { transform: translate3d(-50%, -50%, 0) translateY(0); }
            50% { transform: translate3d(-50%, -50%, 0) translateY(-5px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .jnc-route-draw,
            .jnc-route-flow,
            .jnc-route-pin,
            .jnc-route-float,
            .jnc-route-rider {
              animation: none !important;
            }
          }
        `}</style>
      ) : null}
      <div className="relative h-full w-full">
        <div className={premiumMotion ? 'absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(95,211,90,0.18),_transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.76),rgba(244,248,244,0.9))]' : 'absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(245,240,228,0.92))]'} />
        <div
          className={premiumMotion ? 'absolute inset-0 opacity-55' : 'absolute inset-0 opacity-70'}
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: compact ? '30px 30px' : '38px 38px',
          }}
        />
        {premiumMotion ? (
          <>
            <div className="pointer-events-none absolute left-[8%] top-[18%] h-24 w-24 rounded-full bg-[#5FD35A]/16 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[12%] right-[10%] h-28 w-28 rounded-full bg-[#336886]/14 blur-3xl" />
          </>
        ) : null}

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path d={mapLayout.supportPath} fill="none" stroke="rgba(120,113,108,0.12)" strokeWidth="5.6" strokeLinecap="round" />
          <path
            d={mapLayout.routePath}
            fill="none"
            stroke={premiumMotion ? 'rgba(95,211,90,0.92)' : 'rgba(245,158,11,0.88)'}
            strokeWidth={premiumMotion ? '4.2' : '3.4'}
            strokeLinecap="round"
            strokeDasharray={shouldAnimate ? '100' : '0.01 6.4'}
            strokeDashoffset={shouldAnimate ? '100' : undefined}
            pathLength={100}
            className={shouldAnimate ? 'jnc-route-draw' : undefined}
            style={shouldAnimate ? { animation: 'jnc-route-draw 1.15s cubic-bezier(0.22,1,0.36,1) forwards' } : undefined}
          />
          {premiumMotion ? (
            <path
              d={mapLayout.routePath}
              fill="none"
              stroke="rgba(21,58,76,0.52)"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeDasharray="0.8 5.2"
              pathLength={100}
              className={shouldAnimate ? 'jnc-route-flow' : undefined}
              style={shouldAnimate ? { animation: 'jnc-route-flow 1.35s linear infinite' } : undefined}
            />
          ) : (
            <path d={mapLayout.routePath} fill="none" stroke="rgba(68,64,60,0.68)" strokeWidth="1.2" strokeLinecap="round" />
          )}
          <circle cx={mapLayout.start.x} cy={mapLayout.start.y} r="4.2" fill={premiumMotion ? 'rgba(51,104,134,0.18)' : 'rgba(31,41,55,0.16)'} />
          <circle cx={mapLayout.start.x} cy={mapLayout.start.y} r="2.4" fill={premiumMotion ? '#336886' : '#1f2937'} />
          <circle cx={mapLayout.end.x} cy={mapLayout.end.y} r="4.8" fill={premiumMotion ? 'rgba(95,211,90,0.24)' : 'rgba(234,88,12,0.2)'} />
          <circle cx={mapLayout.end.x} cy={mapLayout.end.y} r="2.8" fill={premiumMotion ? '#2f9c48' : '#ea580c'} />
          <circle cx={mapLayout.end.x} cy={mapLayout.end.y} r="7.4" fill="none" stroke={premiumMotion ? 'rgba(95,211,90,0.32)' : 'rgba(234,88,12,0.22)'} strokeWidth="1.1">
            {!reducedMotion ? (
              <>
                <animate attributeName="r" values="5.8;8.2;5.8" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.2s" repeatCount="indefinite" />
              </>
            ) : null}
          </circle>
          {shouldAnimate ? (
            <circle r="1.6" fill="#153A4C" stroke="white" strokeWidth="0.7" className="jnc-route-rider">
              <animateMotion dur="2.6s" repeatCount="indefinite" path={mapLayout.routePath} rotate="auto" />
            </circle>
          ) : null}
        </svg>

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className={premiumMotion ? 'rounded-full border border-white/75 bg-white/82 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#153A4C] shadow-[0_12px_24px_-22px_rgba(28,25,23,0.6)] backdrop-blur-xl' : 'rounded-full border border-stone-900/10 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-stone-700 shadow-[0_12px_24px_-22px_rgba(28,25,23,0.6)]'}>
            {premiumMotion ? 'Rota viva' : 'Rota estimada'}
          </span>
          <span className={premiumMotion ? 'rounded-full border border-[#5FD35A]/25 bg-[#5FD35A]/14 px-2 py-1 text-[10px] font-bold text-[#153A4C] backdrop-blur-xl' : 'rounded-full border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[10px] font-bold text-amber-800'}>
            Zoom {zoomBadge}
          </span>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <div className={`jnc-route-pin flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-[0_18px_30px_-24px_rgba(28,25,23,0.55)] backdrop-blur ${shouldAnimate ? 'opacity-0' : ''}`} style={shouldAnimate ? { animation: 'jnc-route-pin-drop 0.62s cubic-bezier(0.34,1.56,0.64,1) 0.16s forwards' } : undefined}>
            <span className={premiumMotion ? 'h-2.5 w-2.5 rounded-full bg-[#336886]' : 'h-2.5 w-2.5 rounded-full bg-stone-900'} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Origem</p>
              <p className="truncate text-xs font-bold text-stone-800">{originLabel}</p>
            </div>
          </div>

          {hideAction ? (
            <div className="min-w-[5.5rem] flex-1" aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={() => {
                const geoUrl = `https://www.google.com/maps/dir/?api=1&origin=${Number(origin.lat).toFixed(6)},${Number(origin.lng).toFixed(6)}&destination=${Number(destination.lat).toFixed(6)},${Number(destination.lng).toFixed(6)}&travelmode=driving`;
                void openRouteInSystemBrowser(geoUrl);
              }}
              className={premiumMotion ? 'rounded-2xl border border-white/70 bg-[linear-gradient(135deg,#153A4C,#336886)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_30px_-22px_rgba(51,104,134,0.62)] transition-transform hover:-translate-y-0.5 active:scale-[0.96]' : 'rounded-2xl border border-amber-300/80 bg-[linear-gradient(135deg,#fff7e7,#f7d58d)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-900 shadow-[0_18px_30px_-24px_rgba(180,83,9,0.62)] transition-transform hover:-translate-y-0.5 active:scale-[0.96]'}
            >
              {mapActionLabel}
            </button>
          )}

          <div className={`jnc-route-pin flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-[0_18px_30px_-24px_rgba(28,25,23,0.55)] backdrop-blur ${shouldAnimate ? 'opacity-0' : ''}`} style={shouldAnimate ? { animation: 'jnc-route-pin-drop 0.62s cubic-bezier(0.34,1.56,0.64,1) 0.32s forwards' } : undefined}>
            <span className={premiumMotion ? 'h-2.5 w-2.5 rounded-full bg-[#5FD35A]' : 'h-2.5 w-2.5 rounded-full bg-orange-600'} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Destino</p>
              <p className="truncate text-xs font-bold text-stone-800">{destinationLabel}</p>
            </div>
          </div>
        </div>

        <div
          className={premiumMotion ? 'jnc-route-float pointer-events-none absolute h-10 w-10 rounded-full border border-white/80 bg-white/68 shadow-[0_24px_34px_-24px_rgba(51,104,134,0.45)] backdrop-blur-xl' : 'pointer-events-none absolute h-9 w-9 rounded-full bg-white/75 shadow-[0_24px_32px_-24px_rgba(120,53,15,0.4)]'}
          style={{
            left: `${lerp(mapLayout.start.x, mapLayout.end.x, 0.52)}%`,
            top: `${lerp(mapLayout.start.y, mapLayout.end.y, 0.28)}%`,
            animation: shouldAnimate ? 'jnc-route-float 3.2s ease-in-out infinite' : undefined,
          }}
        />
      </div>
    </div>
  );
}
