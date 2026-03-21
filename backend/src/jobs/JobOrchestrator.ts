import { Provide, Inject, container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { LoggerService } from '../utils/logger';
import { BaseJob } from './BaseJob';

@Provide(Tokens.Jobs.JobOrchestrator)
export class JobOrchestrator {
  private jobs: BaseJob[] = [];

  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly logger: LoggerService
  ) {}

  public async startAll(): Promise<void> {
    this.logger.info('Starting Job Orchestrator...');

    // In a real auto-discovery scenario, we could use decorative metadata 
    // to find all registered jobs. For now, we'll manually list the tokens 
    // to ensure they are explicitly managed.
    const jobTokens = [
      Tokens.Jobs.DeliveryExpirationJob,
      Tokens.Jobs.SubscriptionExpirationJob,
      Tokens.Jobs.FaceVerifyJob,
    ];

    for (const token of jobTokens) {
      try {
        const job = container.get<BaseJob>(token);
        this.jobs.push(job);
        await job.start();
      } catch (error: any) {
        this.logger.error(`Failed to start job for token ${String(token)}: ${error.message}`);
      }
    }

    this.logger.info(`Orchestrator started with ${this.jobs.length} jobs.`);
  }

  public stopAll(): void {
    this.logger.info('Stopping all jobs...');
    for (const job of this.jobs) {
      job.stop();
    }
  }
}
