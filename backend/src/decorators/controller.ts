import { NextFunction, Request, Response, Router } from 'express';
import { Provide, container } from '../ioc/ioc';
import { BaseRouterDefinition } from '../models/base-router.model';
import { requireAuth, requireRole, UserRole } from '../middleware/authGuard';

export const instantiatedControllers: Array<any> = [];

export function RouterController(token: symbol): ClassDecorator {
  return (target: any): void => {
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
    addMiddleware(target, propertyKey as string, requireAuth);
  };
}

export function Roles(...roles: UserRole[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    addMiddleware(target, propertyKey as string, requireRole(...roles));
  };
}

function addRoute(target: any, path: string, method: HttpMethod, methodName: string, middlewares: any[]): void {
  if (!Reflect.hasMetadata('routes', target.constructor)) {
    Reflect.defineMetadata('routes', [], target.constructor);
  }

  const routes = Reflect.getMetadata('routes', target.constructor) as Array<RouteDefinition>;

  // Merge with middlewares from other decorators (like @Authorize)
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
  if (!Reflect.hasMetadata('routes', target.constructor)) {
    Reflect.defineMetadata('routes', [], target.constructor);
  }

  const routes = Reflect.getMetadata('routes', target.constructor) as Array<RouteDefinition>;
  const route = routes.find(r => r.methodName === methodName);

  if (route) {
    route.middlewares.unshift(middleware);
  } else {
    // If route doesn't exist yet, we might need a way to store it
    // But usually decorators are applied from bottom to top, 
    // so @Get would be called after @Authorize if @Authorize is above @Get.
    // However, MethodDecorators on the same method are executed in order.
    // Let's ensure we handle both cases or document the order.
    // A better way is to store middlewares separately and merge them.
    if (!Reflect.hasMetadata('middlewares', target, methodName)) {
        Reflect.defineMetadata('middlewares', [], target, methodName);
    }
    const middlewares = Reflect.getMetadata('middlewares', target, methodName);
    middlewares.unshift(middleware);
  }
}
