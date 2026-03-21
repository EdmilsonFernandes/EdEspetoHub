import { Express, Router } from 'express';
import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide, container } from '../../ioc/ioc';
import { LoggerService } from '../../utils/logger';
import { controllerTokensToInstantiate, instantiatedControllers } from '../../decorators/controller'
import { BaseRouterDefinition } from '../../models/base-router.model';
import { HttpRequestMethod } from '../../models/http-request.model';
import { HttpServer } from '../server/http.server';
import { routerMap } from '../server/router.config';
import { UrlService } from './url.service';

const router = Router();

/**
 * Api initializer service
 */
@Provide(Tokens.Common.Service.InitializerService)
export class InitializerService {
  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService,
    @Inject(Tokens.Common.Server.HttpServer) private readonly httpServer: HttpServer,
    @Inject(Tokens.Common.Service.UrlService) private readonly urlService: UrlService,
  ) {}

  public async initApi(port: number, provider: string): Promise<void> {
    await this.startApi(port, provider);
  }

  private async startApi(port: number, provider: string): Promise<void> {
    await this.myLogger.info('Initializing http server configuration...');
    await this.httpServer.httpInitialConfigurations(port);

    await this._loadAndConfigureControllers();

    await this.myLogger.info('Configuring API routes...');
    await this.configRoutes(this.httpServer.getExpress(), provider);

    await this.myLogger.info('Initializing server listener...');
    await this.httpServer.startListen();
    await this.myLogger.info(`Listening on port ${port}`);
  }

  /**
   * Instantiate registered controllers
   */
  private async _loadAndConfigureControllers(): Promise<void> {
    if (controllerTokensToInstantiate.length === 0) {
      this.myLogger.warn('No controller found.');
      return;
    }

    this.myLogger.info(`Loading and configuring ${controllerTokensToInstantiate.length} controllers...`);

    for (const token of controllerTokensToInstantiate) {
      try {
        const controller = container.get<BaseRouterDefinition>(token);

        if (!controller.version || !controller.basePath) {
          throw new Error(`${controller.constructor.name} does not implement 'BaseRouterDefinition' correctly (missing 'version' or 'basePath').`);
        }

        controller.configureRouter();

        instantiatedControllers.push(controller);
        this.myLogger.debug(`Controller '${controller.constructor.name}' successfully configured.`);

      } catch (error: any) {
        this.myLogger.error(`Failed to configure controllers. ${String(token)}: ${error.message || error}`);
        throw error;
      }
    }
    this.myLogger.info('All controllers configured.');
  }

  private async configRoutes(express: Express, provider: string): Promise<void> {

    for (const route of routerMap) {

      const key = JSON.parse(route[0]);
      const handler = route[1];

      const fullUrl = this.urlService.formatBaseUrl(key.method, key, provider);

      this.myLogger.info(`Registering route: [${key.method.toUpperCase()}] ${fullUrl}`);

      switch (key.method) {
        case HttpRequestMethod.GET:
          router.get(fullUrl, handler);
          break;
        case HttpRequestMethod.POST:
          router.post(fullUrl, handler);
          break;
        case HttpRequestMethod.PUT:
          router.put(fullUrl, handler);
          break;
        case HttpRequestMethod.DELETE:
          router.delete(fullUrl, handler);
          break;
        case HttpRequestMethod.PATCH:
          router.patch(fullUrl, handler);
          break;
        default:
          throw new Error('Http Method request not implemented!');
      }
    }

    express.use(router);
    this.myLogger.info('All routes successfully registered with Express.');
  }
}