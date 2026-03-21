import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import * as crypto from 'crypto'; // Módulo nativo do Node.js
import { LoggerService } from '../../utils/logger';
import swaggerUi from 'swagger-ui-express';
import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide } from '../../ioc/ioc';
import { swaggerDocument } from '../../../swagger';
import { requestContextStore } from '../../utils/request-context.store'; // Importe o store criado

@Provide(Tokens.Common.Server.HttpConfig)
export class ServerConfig {
  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService
  ) {}

  public async configureMiddleware(app: Express, port: number): Promise<void> {

    await this.configureListeningPort(app, port);
    await this.setCors(app);

    app.use(this.contextMiddleware.bind(this));

    app.use(helmet());
    await this.bodyConfig(app);

    app.use(this.reqLogger.bind(this));

    await this.configDocumentation(app);
  }

  private contextMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

    const store = {
      requestId,
      route: req.originalUrl
    };

    requestContextStore.run(store, () => {
      next();
    });
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

  private async reqLogger(req: Request, _res: Response, next: NextFunction): Promise<void> {

    this.myLogger.debug(`Req: ${req.method} ${req.originalUrl}`);

    if (Object.keys(req.query).length > 0) {
      this.myLogger.debug(`Req query: ${JSON.stringify(req.query)}`);
    }
    next();
  }
}