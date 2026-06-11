type BrandActionIconProps = {
  className?: string;
  alt?: string;
};

export const isAirbnbUrlOrLabel = (value?: string | null) =>
  String(value || '').toLowerCase().includes('airbnb');

export const GoogleMapsIcon = ({ className = 'h-4 w-4', alt = '' }: BrandActionIconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    role={alt ? 'img' : undefined}
    aria-label={alt || undefined}
    aria-hidden={alt ? undefined : true}
    focusable="false"
  >
    <path
      d="M12 22s7-6.03 7-13.08C19 4.97 15.87 2 12 2S5 4.97 5 8.92C5 15.97 12 22 12 22Z"
      fill="#34A853"
    />
    <path
      d="M12 2c-2.24 0-4.23 1-5.52 2.59l3.42 3.42A3.05 3.05 0 0 1 12 7.18V2Z"
      fill="#4285F4"
    />
    <path
      d="M5 8.92c0 1.86.49 3.65 1.21 5.28l3.91-3.91A3.1 3.1 0 0 1 9.9 8.01L6.48 4.59A6.75 6.75 0 0 0 5 8.92Z"
      fill="#FBBC04"
    />
    <path
      d="M12 22s2.62-2.25 4.6-5.56l-4.48-4.48a3.06 3.06 0 0 1-2-.67L6.21 14.2C8.08 18.44 12 22 12 22Z"
      fill="#EA4335"
    />
    <path
      d="M18.98 8.92c0-3.95-3.11-6.92-6.98-6.92v5.18c.79 0 1.52.3 2.06.78l3.63-3.26a6.74 6.74 0 0 1 1.29 4.22Z"
      fill="#1A73E8"
    />
    <circle cx="12" cy="9.03" r="2.52" fill="#fff" />
    <circle cx="12" cy="9.03" r="1.22" fill="#336886" opacity="0.72" />
  </svg>
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
