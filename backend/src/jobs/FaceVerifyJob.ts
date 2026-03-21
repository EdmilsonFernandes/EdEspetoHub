import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { BaseJob } from './BaseJob';
import { LoggerService } from '../utils/logger';
import { FaceVerifyService } from '../services/FaceVerifyService';

@Provide(Tokens.Jobs.FaceVerifyJob)
export class FaceVerifyJob extends BaseJob {
  protected jobName = 'FaceVerifyJob';
  protected intervalMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(Tokens.Utils.LoggerService) protected readonly logger: LoggerService,
    @Inject(Tokens.Common.Service.FaceVerifyService) private readonly faceVerifyService: FaceVerifyService
  ) {
    super();
  }

  protected async execute(): Promise<void> {
    this.logger.info('Running face verification job...');
    // Implementation details
  }
}
