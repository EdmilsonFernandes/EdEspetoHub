import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { BaseJob } from './BaseJob';
import { LoggerService } from '../utils/logger';
import { SubscriptionService } from '../services/SubscriptionService';

@Provide(Tokens.Jobs.SubscriptionExpirationJob)
export class SubscriptionExpirationJob extends BaseJob {
  protected jobName = 'SubscriptionExpirationJob';
  protected intervalMs = 24 * 60 * 60 * 1000; // Daily

  constructor(
    @Inject(Tokens.Utils.LoggerService) protected readonly logger: LoggerService,
    @Inject(Tokens.Common.Service.SubscriptionService) private readonly subscriptionService: SubscriptionService
  ) {
    super();
  }

  protected async execute(): Promise<void> {
    this.logger.info('Running subscription expiration check...');
    // Implementation details would go here, calling subscriptionService
  }
}
