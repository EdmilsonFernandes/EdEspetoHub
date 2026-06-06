import { ShippingTrackingProvider, ShippingTrackingProviderInput, ShippingTrackingProviderResult } from './types';

export class ManualShippingTrackingProvider implements ShippingTrackingProvider {
  readonly name = 'manual';

  isConfigured() {
    return true;
  }

  async fetchTracking(input: ShippingTrackingProviderInput): Promise<ShippingTrackingProviderResult> {
    return {
      provider: this.name,
      status: input.trackingCode ? 'posted' : 'pending_posting',
      events: [],
      unavailableReason: 'carrier_provider_not_configured',
    };
  }
}
