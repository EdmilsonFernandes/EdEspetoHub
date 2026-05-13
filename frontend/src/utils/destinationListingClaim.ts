const categoryToStoreSegment = (category?: string | null) => {
  const key = String(category || '').toUpperCase();
  if (key.includes('RESTAURANTE') || key === 'NOITE') return 'restaurante';
  if (key === 'LOJA') return 'outros';
  return 'outros';
};

export const buildListingClaimUrl = (destination: any, listing: any) => {
  const params = new URLSearchParams();
  params.set('source', 'destination_listing_claim');
  params.set('destinationListingId', String(listing?.id || ''));
  if (destination?.id) params.set('destinationId', String(destination.id));
  if (destination?.slug) params.set('destinationSlug', String(destination.slug));
  if (destination?.name) params.set('destinationName', String(destination.name));
  if (destination?.city) params.set('city', String(destination.city));
  if (destination?.state) params.set('state', String(destination.state));
  if (listing?.title) {
    params.set('storeName', String(listing.title));
    params.set('listingTitle', String(listing.title));
  }
  if (listing?.description) params.set('description', String(listing.description));
  if (listing?.address) params.set('address', String(listing.address));
  if (listing?.whatsapp || listing?.phone) params.set('phone', String(listing.whatsapp || listing.phone));
  params.set('segment', categoryToStoreSegment(listing?.category));
  return `/create?${params.toString()}`;
};
