import { AppBootstrap } from 'api/common/decorator/app.boostrap.decorator';
import { InitializerService } from 'api/common/service/initialize.service';
import { DatabaseService } from 'database/data-base.service';
import { Tokens } from 'ioc/injectiontokens';
import { Inject, Provide } from 'ioc/ioc';
import { LoggerService } from 'services/logger/LoggerService';

@Provide(Tokens.App)
@AppBootstrap()
export class App
{
  constructor(
    @Inject(Tokens.Common.Service.InitializerService) private readonly initializer: InitializerService,
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private readonly database: DatabaseService
  )
  {}

  public async bootstrap(): Promise<void>
  {
    this.myLogger.info('Initializing application');
    await this.database.initialize();
    await this.initializer.initApi(parseInt(process.env.PORT || '3000', 10), 'ChamaNoEspeto');
  }
}