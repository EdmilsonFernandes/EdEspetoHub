import { NextFunction, Request, Response, Router } from 'express';
import { Provide, container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { BaseRouterDefinition } from '../models/base-router.model';
import { UserRole } from '../models/Auth';
import { AuthGuardMiddleware } from '../middleware/AuthGuardMiddleware';
import { SubscriptionGuardMiddleware } from '../middleware/SubscriptionGuardMiddleware';
import { PlanFeatureGuardMiddleware } from '../middleware/PlanFeatureGuardMiddleware';

export const instantiatedControllers: Array<any> = [];

export function RouterController(token: symbol, version?: string): ClassDecorator {
  return (target: any): void => {
    if (version) {
      target.prototype.version = version;
    }
    Provide(token)(target);
    instantiatedControllers.push(token);
  };
}

export enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
}

interface RouteDefinition {
  path: string;
  method: HttpMethod;
  methodName: string;
  middlewares: any[];
}

export function Get(path: string = '', ...middlewares: any[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    addRoute(target, path, HttpMethod.GET, propertyKey as string, middlewares);
  };
}

export function Post(path: string = '', ...middlewares: any[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    addRoute(target, path, HttpMethod.POST, propertyKey as string, middlewares);
  };
}

export function Put(path: string = '', ...middlewares: any[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    addRoute(target, path, HttpMethod.PUT, propertyKey as string, middlewares);
  };
}

export function Delete(path: string = '', ...middlewares: any[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    addRoute(target, path, HttpMethod.DELETE, propertyKey as string, middlewares);
  };
}

export function Authorize(): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    const middleware = (req: Request, res: Response, next: NextFunction) => {
      const authGuard = container.get<AuthGuardMiddleware>(Tokens.Middleware.AuthGuard);
      return authGuard.requireAuth(req, res, next);
    };
    addMiddleware(target, propertyKey as string, middleware);
  };
}

export function Roles(...roles: UserRole[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    const middleware = (req: Request, res: Response, next: NextFunction) => {
      const authGuard = container.get<AuthGuardMiddleware>(Tokens.Middleware.AuthGuard);
      return authGuard.requireRole(...roles)(req, res, next);
    };
    addMiddleware(target, propertyKey as string, middleware);
  };
}

/**
 * Decorator to ensure the store has an active subscription.
 */
export function SubscriptionActive(): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    const middleware = (req: Request, res: Response, next: NextFunction) => {
      const guard = container.get<SubscriptionGuardMiddleware>(Tokens.Middleware.SubscriptionGuard);
      return guard.handle(req, res, next);
    };
    addMiddleware(target, propertyKey as string, middleware);
  };
}

/**
 * Decorator to ensure the store has a specific plan feature enabled.
 */
export function RequireFeature(feature: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    const middleware = (req: Request, res: Response, next: NextFunction) => {
      const guard = container.get<PlanFeatureGuardMiddleware>(Tokens.Middleware.PlanFeatureGuard);
      return guard.handle(feature)(req, res, next);
    };
    addMiddleware(target, propertyKey as string, middleware);
  };
}

function addRoute(target: any, path: string, method: HttpMethod, methodName: string, middlewares: any[]): void {
  if (!Reflect.hasMetadata('routes', target.constructor)) {
    Reflect.defineMetadata('routes', [], target.constructor);
  }

  const routes = Reflect.getMetadata('routes', target.constructor) as Array<RouteDefinition>;

  const metaMiddlewares = Reflect.getMetadata('middlewares', target, methodName) || [];
  const finalMiddlewares = [...metaMiddlewares, ...middlewares];

  routes.push({
    path,
    method,
    methodName,
    middlewares: finalMiddlewares,
  });

  Reflect.defineMetadata('routes', routes, target.constructor);
}

function addMiddleware(target: any, methodName: string, middleware: any): void {
  if (!Reflect.hasMetadata('middlewares', target, methodName)) {
    Reflect.defineMetadata('middlewares', [], target, methodName);
  }
  const middlewares = Reflect.getMetadata('middlewares', target, methodName);
  middlewares.unshift(middleware);
}
