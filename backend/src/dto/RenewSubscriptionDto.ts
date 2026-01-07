export interface RenewSubscriptionDto {
  planId?: string;
  autoRenew?: boolean;
  paymentMethod?: string;
}
