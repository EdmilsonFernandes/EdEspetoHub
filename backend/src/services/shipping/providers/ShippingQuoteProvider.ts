import { ShippingQuoteProviderInput, ShippingQuoteResult } from '../types';

export interface ShippingQuoteProvider {
  readonly name: string;
  quote(input: ShippingQuoteProviderInput): Promise<ShippingQuoteResult>;
}

