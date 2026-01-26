// @ts-nocheck
import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type RouteCoords = {
  lat: number;
  lng: number;
};

type GoogleRouteMapViewProps = {
  origin: RouteCoords;
  destination: RouteCoords;
  zoom?: number;
};

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_JS_KEY || '',
  version: 'weekly',
});

export function GoogleRouteMapView({ origin, destination, zoom = 13 }: GoogleRouteMapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRef = useRef<any>(null);
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
            center: origin,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }
        if (!directionsRef.current) {
          directionsRef.current = new google.maps.DirectionsRenderer({
            suppressMarkers: false,
            preserveViewport: false,
          });
          directionsRef.current.setMap(mapInstanceRef.current);
        }
        const service = new google.maps.DirectionsService();
        service.route(
          {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK' && result) {
              directionsRef.current.setDirections(result);
            }
          }
        );
      })
      .catch((error) => {
        console.error('Google route map load failed', error);
      });

    return () => {
      active = false;
    };
  }, [origin, destination, zoom, hasKey]);

  if (!hasKey) {
    return (
      <div className="w-full min-h-[240px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Configure `VITE_GOOGLE_MAPS_JS_KEY` para exibir o mapa.
      </div>
    );
  }

  return (
    <div className="w-full min-h-[240px] rounded-2xl overflow-hidden border border-slate-200">
      <div ref={mapRef} className="w-full h-full min-h-[240px]" />
    </div>
  );
}
