// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { mapsService } from '../services/mapsService';

type RouteCoords = {
  lat: number;
  lng: number;
};

type GoogleRouteMapViewProps = {
  origin: RouteCoords;
  destination: RouteCoords;
  zoom?: number;
};

export function GoogleRouteMapView({ origin, destination, zoom = 13 }: GoogleRouteMapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRef = useRef<any>(null);
  const loaderRef = useRef<Loader | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(
    import.meta.env.VITE_GOOGLE_MAPS_JS_KEY || null
  );

  useEffect(() => {
    if (!apiKey) {
      let active = true;
      mapsService.getJsKey().then((key) => {
        if (active) setApiKey(key);
      });
      return () => {
        active = false;
      };
    }
    return () => {};
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) return () => {};
    let active = true;
    if (!mapRef.current) return () => {};

    if (!loaderRef.current) {
      loaderRef.current = new Loader({
        apiKey,
        version: 'weekly',
      });
    }

    loaderRef.current
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
  }, [origin, destination, zoom, apiKey]);

  if (!apiKey) {
    return (
      <div className="w-full min-h-[240px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Carregando mapa...
      </div>
    );
  }

  return (
    <div className="w-full min-h-[240px] rounded-2xl overflow-hidden border border-slate-200">
      <div ref={mapRef} className="w-full h-full min-h-[240px]" />
    </div>
  );
}
