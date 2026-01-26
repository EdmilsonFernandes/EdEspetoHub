// @ts-nocheck
import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type MarkerInput = {
  lat: number;
  lng: number;
  label?: string;
};

type GoogleMapViewProps = {
  markers: MarkerInput[];
  zoom?: number;
};

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_JS_KEY || '',
  version: 'weekly',
});

export function GoogleMapView({ markers, zoom = 12 }: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hasKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_JS_KEY);

  useEffect(() => {
    if (!hasKey) return () => {};
    let active = true;
    if (!mapRef.current) return () => {};

    loader
      .load()
      .then(() => {
        if (!active || !mapRef.current) return;
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: markers[0]?.lat || -23.55052, lng: markers[0]?.lng || -46.633308 },
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = markers.map((item) => {
          return new google.maps.Marker({
            position: { lat: item.lat, lng: item.lng },
            label: item.label,
            map: mapInstanceRef.current,
          });
        });

        if (markers.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          markers.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
          mapInstanceRef.current.fitBounds(bounds, 60);
        } else if (markers.length === 1) {
          mapInstanceRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
          mapInstanceRef.current.setZoom(zoom);
        }
      })
      .catch((error) => {
        console.error('Google Maps load failed', error);
      });

    return () => {
      active = false;
    };
  }, [markers, zoom]);

  if (!hasKey) {
    return (
      <div className="w-full min-h-[280px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Configure `VITE_GOOGLE_MAPS_JS_KEY` para exibir o mapa.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-200">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
