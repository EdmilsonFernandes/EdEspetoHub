type GeocodeResponse = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

type RouteResponse = {
  distanceKm: number;
  durationMin: number | null;
};

type JsKeyResponse = {
  key: string;
};

let cachedJsKey: string | null = null;
let jsKeyPromise: Promise<string | null> | null = null;

const postJson = async <T>(url: string, payload: Record<string, any>): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.message || 'Não foi possível completar a operação.';
    throw new Error(message);
  }

  return response.json();
};

export const mapsService = {
  async getJsKey() {
    if (import.meta.env.VITE_GOOGLE_MAPS_JS_KEY) {
      return import.meta.env.VITE_GOOGLE_MAPS_JS_KEY as string;
    }
    if (cachedJsKey) return cachedJsKey;
    if (!jsKeyPromise) {
      jsKeyPromise = fetch('/api/maps/js-key')
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Não foi possível carregar a chave do Google Maps.');
          }
          const data = (await response.json()) as JsKeyResponse;
          cachedJsKey = data?.key || null;
          return cachedJsKey;
        })
        .catch((error) => {
          console.error('Falha ao buscar chave do Google Maps', error);
          return null;
        });
    }
    return jsKeyPromise;
  },
  geocode(address: string) {
    return postJson<GeocodeResponse>('/api/maps/geocode', { address });
  },
  route(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    return postJson<RouteResponse>('/api/maps/route', { origin, destination });
  },
};
