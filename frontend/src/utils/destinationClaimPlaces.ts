export const resolveDestinationClaimPlaces = (payload: any) => {
  const candidates = [
    payload?.hospitalityPlaces,
    payload?.places,
    payload?.destination?.hospitalityPlaces,
  ];
  const places = candidates.find((value) => Array.isArray(value)) || [];

  return places.filter((place: any) => place && place.id && place.name);
};

export const getDestinationClaimPlaceImage = (place: any) => {
  const banners = Array.isArray(place?.bannerUrls) ? place.bannerUrls : [];
  return String(place?.bannerUrl || banners.find(Boolean) || place?.logoUrl || '').trim();
};

export const formatDestinationClaimPlaceAddress = (place: any) => {
  return [
    place?.address,
    place?.addressNumber,
    place?.district,
    place?.city,
    place?.state,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' • ');
};
