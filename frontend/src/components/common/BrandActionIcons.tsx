type BrandActionIconProps = {
  className?: string;
  alt?: string;
};

export const isAirbnbUrlOrLabel = (value?: string | null) =>
  String(value || '').toLowerCase().includes('airbnb');

export const GoogleMapsIcon = ({ className = 'h-4 w-4', alt = '' }: BrandActionIconProps) => (
  <img
    src="/icons/google-maps-3d.avif"
    alt={alt}
    className={`${className} object-contain`}
    loading="lazy"
    decoding="async"
  />
);

export const AirbnbIcon = ({ className = 'h-4 w-4', alt = '' }: BrandActionIconProps) => (
  <img
    src="/icons/airbnb.svg"
    alt={alt}
    className={`${className} object-contain`}
    loading="lazy"
    decoding="async"
  />
);
