import express, { Express } from 'express';
import cors from 'cors';
import { Provide, container } from '../../../ioc/ioc';
import { Tokens } from '../../../ioc/injectiontokens';
import { instantiatedControllers } from '../../../decorators/controller';
import { BaseController } from '../../../controllers/BaseController';

@Provide(Tokens.Common.Service.InitializerService)
export class InitializerService {
  private app: Express;

  constructor() {
    this.app = express();
  }

  public async initApi(port: number, appName: string): Promise<void> {
    this.setupMiddleware();
    this.setupRoutes();
    
    this.app.listen(port, () => {
      console.log(`🚀 ${appName} is running on port ${port}`);
    });
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    console.log(`🔌 Registering ${instantiatedControllers.length} controllers`);
    
    instantiatedControllers.forEach((token: symbol) => {
      try {
        const controller = container.get<BaseController>(token);
        controller.configureRouter();
        console.log(`🔗 Controller: ${controller.path}`);
        this.app.use(controller.path, controller.router);
      } catch (error) {
        console.error(`❌ Failed to register controller for token ${token.toString()}:`, error);
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'UP', timestamp: new Date() });
    });
  }

  public getApp(): Express {
    return this.app;
  }
}
