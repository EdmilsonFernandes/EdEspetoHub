import { Express, Router } from 'express';
import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide, container } from '../../ioc/ioc';
import { LoggerService } from '../../utils/logger';
import { instantiatedControllers } from '../../decorators/controller'
import { BaseController } from '../../controllers/BaseController';
import { HttpServer } from '../server/http.server';

/**
 * Api initializer service
 */
@Provide(Tokens.Common.Service.InitializerService)
export class InitializerService {
  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService,
    @Inject(Tokens.Common.Server.HttpServer) private readonly httpServer: HttpServer,
  ) {}

  public async initApi(port: number, provider: string): Promise<void> {
    await this.startApi(port, provider);
  }

  private async startApi(port: number, provider: string): Promise<void> {
    await this.myLogger.info('Initializing http server configuration...');
    await this.httpServer.httpInitialConfigurations(port);

    await this._loadAndConfigureControllers();

    await this.myLogger.info('Initializing server listener...');
    await this.httpServer.startListen();
  }

  /**
   * Instantiate registered controllers
   */
  private async _loadAndConfigureControllers(): Promise<void> {
    if (instantiatedControllers.length === 0) {
      this.myLogger.warn('No controller found to instantiate.');
      return;
    }

    this.myLogger.info(`Loading and configuring ${instantiatedControllers.length} controllers...`);

    const app = this.httpServer.getExpress();

    for (const token of instantiatedControllers) {
      try {
        const controller = container.get<BaseController>(token);

        controller.configureRouter();

        this.myLogger.info(`🔗 Registering Controller: ${controller.path}`);
        app.use(controller.path, controller.router);

        // Print internal routes for this controller
        this.printControllerRoutes(controller);

      } catch (error: any) {
        this.myLogger.error(`Failed to configure controller for token ${String(token)}: ${error.message || error}`);
        throw error;
      }
    }

    // Health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'UP', timestamp: new Date() });
    });

    this.myLogger.info('All controllers configured.');
  }

  private printControllerRoutes(controller: BaseController): void {
    const routes: any[] = Reflect.getMetadata('routes', controller.constructor) || [];
    routes.forEach(route => {
      const { path, method } = route;
      const fullPath = `${controller.path}${path}`.replace(/\/+/g, '/');
      console.log(`   [${method.toUpperCase().padEnd(6)}] ${fullPath}`);
    });
  }
}
