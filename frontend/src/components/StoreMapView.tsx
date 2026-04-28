import { useMemo } from 'react';

type MarkerInput = {
  lat: number;
  lng: number;
  label?: string;
};

type StoreMapViewProps = {
  markers: MarkerInput[];
  zoom?: number;
};

const clampCoordinate = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const buildOpenStreetMapEmbedUrl = (markers: MarkerInput[], zoom = 15) => {
  const safeMarkers = (Array.isArray(markers) ? markers : []).filter(
    (item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng))
  );
  if (!safeMarkers.length) return null;

  const lats = safeMarkers.map((item) => Number(item.lat));
  const lngs = safeMarkers.map((item) => Number(item.lng));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const basePadding = safeMarkers.length > 1 ? 0.006 : 0.0035;
  const latPadding = Math.max((maxLat - minLat) * 0.45, basePadding);
  const lngPadding = Math.max((maxLng - minLng) * 0.45, basePadding);
  const south = clampCoordinate(minLat - latPadding, -90, 90);
  const north = clampCoordinate(maxLat + latPadding, -90, 90);
  const west = clampCoordinate(minLng - lngPadding, -180, 180);
  const east = clampCoordinate(maxLng + lngPadding, -180, 180);
  const primaryMarker = safeMarkers[0];

  const params = new URLSearchParams({
    bbox: `${west.toFixed(6)},${south.toFixed(6)},${east.toFixed(6)},${north.toFixed(6)}`,
    layer: 'mapnik',
  });

  if (safeMarkers.length === 1) {
    params.set('marker', `${Number(primaryMarker.lat).toFixed(6)},${Number(primaryMarker.lng).toFixed(6)}`);
  }

  return {
    embedUrl: `https://www.openstreetmap.org/export/embed.html?${params.toString()}`,
    detailsUrl: `https://www.openstreetmap.org/?mlat=${Number(primaryMarker.lat).toFixed(6)}&mlon=${Number(primaryMarker.lng).toFixed(6)}#map=${Math.max(10, Math.min(18, zoom))}/${Number(primaryMarker.lat).toFixed(6)}/${Number(primaryMarker.lng).toFixed(6)}`,
  };
};

export function StoreMapView({ markers, zoom = 12 }: StoreMapViewProps) {
  const mapData = useMemo(() => buildOpenStreetMapEmbedUrl(markers, zoom), [markers, zoom]);

  if (!mapData) {
    return (
      <div className="flex min-h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        Localização indisponível no momento.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-[220px] w-full sm:h-[260px]">
        <iframe
          title="Mapa da loja"
          src={mapData.embedUrl}
          className="h-full w-full border-0"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        <span>&copy; OpenStreetMap contributors</span>
        <a
          href={mapData.detailsUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-slate-700 hover:text-slate-900"
        >
          Abrir mapa maior
        </a>
      </div>
    </div>
  );
}
