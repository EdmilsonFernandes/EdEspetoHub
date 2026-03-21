import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { BaseJob } from './BaseJob';
import { LoggerService } from '../utils/logger';
import { OrderDeliveryDao } from '../database/dao/OrderDeliveryDao';

@Provide(Tokens.Jobs.DeliveryExpirationJob)
export class DeliveryExpirationJob extends BaseJob {
  protected jobName = 'DeliveryExpirationJob';
  protected intervalMs = Number(process.env.DELIVERY_EXPIRATION_INTERVAL_MS) || 2 * 60 * 1000;

  constructor(
    @Inject(Tokens.Utils.LoggerService) protected readonly logger: LoggerService,
    @Inject(Tokens.Common.DataLayer.OrderDeliveryRepository) private readonly orderDeliveryDao: OrderDeliveryDao
  ) {
    super();
  }

  protected validations(): boolean {
    return process.env.DELIVERY_EXPIRATION_JOB_ENABLED !== 'false';
  }

  protected async execute(): Promise<void> {
    await this.orderDeliveryDao.expireAvailableDeliveries();
  }
}
