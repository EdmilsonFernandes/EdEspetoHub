export type QuoteItemResolved = {
  productId: string | null;
  quantity: number;
  name: string;
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type QuotePackage = {
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  totalVolumeCm3: number;
};

export type ShippingQuoteServiceItem = {
  serviceCode: string;
  serviceName: string;
  price: number;
  estimatedDays: number;
  currency: string;
};

export type ShippingQuoteResult = {
  provider: string;
  services: ShippingQuoteServiceItem[];
  debug?: Record<string, unknown>;
};

export type ShippingQuoteProviderInput = {
  originZip: string;
  destinationZip: string;
  pkg: QuotePackage;
  items: QuoteItemResolved[];
  baseFee: number;
};
