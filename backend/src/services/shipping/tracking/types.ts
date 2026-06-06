import { OrderShipment } from '../../../entities/OrderShipment';

export type ShippingTrackingStatus =
  | 'tracking_code_added'
  | 'tracking_code_updated'
  | 'pending_posting'
  | 'posted'
  | 'in_transit'
  | 'out_for_delivery'
  | 'awaiting_pickup'
  | 'delivery_attempt'
  | 'delivered'
  | 'exception'
  | 'tracking_unavailable';

export type ShippingTrackingEventInput = {
  source: 'seller' | 'carrier' | 'system';
  status: ShippingTrackingStatus | string;
  title: string;
  description?: string | null;
  location?: string | null;
  eventAt?: Date | string | null;
  rawPayload?: Record<string, any> | null;
};

export type ShippingTrackingProviderResult = {
  provider: string;
  status?: ShippingTrackingStatus | string | null;
  events: ShippingTrackingEventInput[];
  unavailableReason?: string | null;
};

export type ShippingTrackingProviderInput = {
  orderId: string;
  trackingCode: string;
  shipment?: OrderShipment | null;
};

export interface ShippingTrackingProvider {
  readonly name: string;
  isConfigured(): boolean;
  fetchTracking(input: ShippingTrackingProviderInput): Promise<ShippingTrackingProviderResult>;
}
