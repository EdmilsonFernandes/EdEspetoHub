import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide } from '../../ioc/ioc';
import express from 'express';
import { Express } from 'express';
import { ServerConfig } from './server-config';
import { LoggerService } from '../../utils/logger';

const app: Express = express();
/**
 * Http Server Class
 */
@Provide(Tokens.Common.Server.HttpServer)
export class HttpServer
{
    constructor(
        @Inject(Tokens.Common.Server.HttpConfig) private readonly httpConfig: ServerConfig,
        @Inject(Tokens.Utils.LoggerService) private readonly logger: LoggerService
    ){}


    /**
     * Expose express app.
     * @returns Express
     */
    public getExpress(): Express
    {
        return app;
    }

    /**
     * Configure server
     */
    public async httpInitialConfigurations(port: number): Promise<void>
    {
        await this.httpConfig.configureMiddleware(app, port);
    }

    /**
     * Start server to list to configured port.
     */
    public async startListen(): Promise<void>
    {
      app.listen(app.get('port'), '0.0.0.0', () => {
        this.logger.info(`🚀 Chama no Espeto backend running at http://0.0.0.0:${app.get('port')}`);
      });
    }


}