import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { LoggerService } from '../../utils/logger';
import swaggerUi from 'swagger-ui-express';
import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide } from '../../ioc/ioc';
import { swaggerDocument } from '../../config/swagger';
import { RequestLoggerMiddleware } from '../../middleware/RequestLoggerMiddleware';
import { AccessLoggerMiddleware } from '../../middleware/AccessLoggerMiddleware';
import { RequestContextMiddleware } from '../../middleware/RequestContextMiddleware';

@Provide(Tokens.Common.Server.HttpConfig)
export class ServerConfig {
  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService,
    @Inject(Tokens.Middleware.RequestLogger) private readonly requestLogger: RequestLoggerMiddleware,
    @Inject(Tokens.Middleware.AccessLogger) private readonly accessLogger: AccessLoggerMiddleware,
    @Inject(Tokens.Middleware.RequestContext) private readonly requestContext: RequestContextMiddleware
  ) {}

  public async configureMiddleware(app: Express, port: number): Promise<void> {
    await this.configureListeningPort(app, port);
    await this.setCors(app);

    app.use(this.requestContext.handle.bind(this.requestContext));
    app.use(helmet());
    
    await this.bodyConfig(app);

    // Apply refactored middlewares
    app.use(this.requestLogger.handle.bind(this.requestLogger));
    app.use(this.accessLogger.handle.bind(this.accessLogger));

    await this.configDocumentation(app);
  }

  private async bodyConfig(app: Express): Promise<void> {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  }

  private async configureListeningPort(app: Express, port: number): Promise<void> {
    app.set('port', parseInt(process.env.PORT || '3000', 10));
  }

  private async setCors(app: Express): Promise<void> {
    const allowedOrigins = [
      'http://localhost:4200',
      'http://18.220.224.248:4200',
    ];

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
      })
    );
  }

  private async configDocumentation(app: Express): Promise<void> {
    try {
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch (e) {
      this.myLogger.error(`Cannot initiate swagger. Error: ${e}`);
    }
  }
}
