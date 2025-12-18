import { SubscriptionStatus } from '../entities/Subscription';

export interface CreateSubscriptionDto {
  storeId: string;
  planId: string;
  autoRenew?: boolean;
  status?: SubscriptionStatus;
  startDate?: Date;
  endDate?: Date;
}
