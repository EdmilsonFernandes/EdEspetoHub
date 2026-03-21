import 'reflect-metadata';
import './ioc/ioc.loader';
import { AppBootstrap } from './decorators/app.bootstrap.decorator';
import { InitializerService } from './common/services/initialize.service';
import { DatabaseService } from './database/data-base.service';
import { Tokens } from './ioc/injectiontokens';
import { Inject, Provide } from './ioc/ioc';
import { LoggerService } from './utils/logger';
import { JobOrchestrator } from './jobs/JobOrchestrator';

@Provide(Tokens.Common.App)
@AppBootstrap()
export class App {
  constructor(
    @Inject(Tokens.Common.Service.InitializerService) private readonly initializer: InitializerService,
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private readonly database: DatabaseService,
    @Inject(Tokens.Jobs.JobOrchestrator) private readonly jobOrchestrator: JobOrchestrator
  ) {}

  public async bootstrap(): Promise<void> {
    this.myLogger.info('Initializing application');
    await this.database.initialize();
    await this.jobOrchestrator.startAll();
    await this.initializer.initApi(parseInt(process.env.PORT || '3000', 10), 'ChamaNoEspeto');
  }
}

// Start the app
(App as any).start();
