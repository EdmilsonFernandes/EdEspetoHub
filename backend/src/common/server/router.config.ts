import { Request, Response } from 'express';
import { Tokens } from '../../ioc/injectiontokens';
import { Provide, Inject } from '../../ioc/ioc';
import { LoggerService } from '../../utils/logger';
import { BaseRouterDefinition } from '../../models/base-router.model';
import { HttpRequestMethod } from '../../models/http-request.model';

export const routerMap: Map<string, (req: Request, res: Response) => Promise<any>> = new Map();
@Provide(Tokens.Common.Server.RouterConfig)
export class RouterConfig
{

  constructor(
    @Inject(Tokens.Utils.LoggerService) private readonly myLogger: LoggerService
  ){}
  private baseRouterdef: Partial<BaseRouterDefinition>;

  public get(path: string, method: Function): void
  {
    this.addRoute(HttpRequestMethod.GET, path, method);
  }

  public post(path: string, method: Function): void
  {
    this.addRoute(HttpRequestMethod.POST, path, method);
  }

  public put(path: string, method: Function): void
  {
    this.addRoute(HttpRequestMethod.PUT, path, method);
  }

  public delete(path: string, method: Function): void
  {
    this.addRoute(HttpRequestMethod.DELETE, path, method);
  }

  public patch(path: string, method: Function): void
  {
    this.addRoute(HttpRequestMethod.PATCH, path, method);
  }


  public setRouteDefinition(basePath: string, version: string, order: number, globalRoute: boolean): void
  {
    this.baseRouterdef = {
        basePath: basePath,
        controllerReadOrder: order,
        version: version,
        globalRoute
    }
  }
  private addRoute(requestMethod: string, path: string, method: Function): void
  {
    const key = JSON.stringify({
      ...this.baseRouterdef,
      path,
      method: requestMethod
    });

    if(routerMap.has(key)) return;

    routerMap.set(key, async (req: Request, res: Response): Promise<any> => await this.methodExecution(req, res, method));
  }

  private async methodExecution(req: Request, res: Response, method: Function): Promise<Response>
  {
    try{
      const data = await method(req, res);

      if (!res.headersSent) {
          return res.status(200).send(this.isObject(data) ? data : data.toString());
      }
      return res;
    } catch(e: any)
    {
      this.myLogger.error(`Erro na rota ${req.method} ${req.originalUrl}:`, e);

      const errorMessage = e.message || 'Internal Error.';

      return res.status(e.statusCode || 500).json({ message: errorMessage });
    }
  }

  private isObject<T>(data: T): boolean
  {
    if(!data) return false;

    if((typeof data === 'object' || typeof data === 'function') && (data !== null))
      {
          return true;
      }

      return false;
    }
}