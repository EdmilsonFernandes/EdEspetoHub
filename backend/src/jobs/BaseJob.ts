import { Tokens } from '../ioc/injectiontokens';
import { Provide } from '../ioc/ioc';
import { LoggerService } from '../utils/logger';

@Provide(Tokens.Jobs.BaseJob)
export abstract class BaseJob {
  protected abstract logger: LoggerService;
  protected abstract jobName: string;
  protected abstract intervalMs: number;

  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  public async start(): Promise<void> {
    if (this.timer) {
      this.logger.warn(`Job ${this.jobName} is already scheduled.`);
      return;
    }

    this.logger.info(`Scheduling job ${this.jobName}`, { intervalMs: this.intervalMs });
    
    // Execute immediately on start
    await this.tick();

    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info(`Job ${this.jobName} stopped.`);
    }
  }

  private async tick(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug(`Job ${this.jobName} is still running, skipping this tick.`);
      return;
    }

    if (!this.validations()) {
      return;
    }

    this.isRunning = true;
    const start = Date.now();

    try {
      this.logger.debug(`Executing job ${this.jobName}...`);
      await this.execute();
      const duration = Date.now() - start;
      this.logger.debug(`Job ${this.jobName} finished successfully`, { durationMs: duration });
    } catch (error: any) {
      this.logger.error(`Job ${this.jobName} failed`, { error: error?.message || String(error) });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Core logic of the job. To be implemented by subclasses.
   */
  protected abstract execute(): Promise<void>;

  /**
   * Pre-execution validations. Can be overridden.
   */
  protected validations(): boolean {
    return true;
  }

  public checkIfItsRunning(): boolean {
    return this.isRunning;
  }

  public getJobName(): string {
    return this.jobName;
  }
}
