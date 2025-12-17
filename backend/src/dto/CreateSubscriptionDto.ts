export interface CreateSubscriptionDto {
  storeId: string;
  planId: string;
  autoRenew?: boolean;
}
