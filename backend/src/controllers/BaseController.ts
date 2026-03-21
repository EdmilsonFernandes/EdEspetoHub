import { Router, Request, Response, NextFunction } from 'express';
import { BaseRouterDefinition } from '../models/base-router.model';
import { Tokens } from '../ioc/injectiontokens';
import { Provide } from '../ioc/ioc';
import { respondWithError } from '../errors/respondWithError';
import 'reflect-metadata';

@Provide(Tokens.Common.Controller.BaseController)
export abstract class BaseController implements BaseRouterDefinition {
  public router: Router;
  public basePath: string;
  public version: string;
  public controllerReadOrder: number = 0;

  constructor(basePath: string, version: string = 'v1') {
    this.router = Router();
    this.basePath = basePath;
    this.version = version;
  }

  get path(): string {
    return `/api/${this.version}${this.basePath}`;
  }

  public configureRouter(): void {
    const routes: any[] = Reflect.getMetadata('routes', this.constructor) || [];

    routes.forEach(route => {
      const { path, method, methodName, middlewares } = route;
      
      const handler = async (req: Request, res: Response, next: NextFunction) => {
        try {
          await (this as any)[methodName](req, res, next);
        } catch (error) {
          this.fail(res, error, req);
        }
      };

      (this.router as any)[method](path, ...middlewares, handler);
      console.log(`   Mapped [${method.toUpperCase()}] ${this.path}${path}`);
    });
  }

  protected ok(res: Response, data?: any) {
    return res.status(200).json(data);
  }

  protected created(res: Response, data?: any) {
    return res.status(201).json(data);
  }

  protected clientError(res: Response, message: string = 'Bad Request') {
    return res.status(400).json({ message });
  }

  protected unauthorized(res: Response, message: string = 'Unauthorized') {
    return res.status(401).json({ message });
  }

  protected forbidden(res: Response, message: string = 'Forbidden') {
    return res.status(403).json({ message });
  }

  protected notFound(res: Response, message: string = 'Not Found') {
    return res.status(404).json({ message });
  }

  protected fail(res: Response, error: any, req?: Request) {
    console.error(error);
    if (req) {
      return respondWithError(req, res, error);
    }
    const status = error.status || 500;
    const code = error.code || 'GEN-001';
    
    return res.status(status).json({
      success: false,
      code,
      message: error.message || error.toString(),
      details: error.details
    });
  }
}
