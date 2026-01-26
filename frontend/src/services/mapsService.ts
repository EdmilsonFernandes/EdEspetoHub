type GeocodeResponse = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

type RouteResponse = {
  distanceKm: number;
  durationMin: number | null;
};

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
  geocode(address: string) {
    return postJson<GeocodeResponse>('/api/maps/geocode', { address });
  },
  route(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    return postJson<RouteResponse>('/api/maps/route', { origin, destination });
  },
};
