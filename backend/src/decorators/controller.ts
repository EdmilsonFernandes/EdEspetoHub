import { NextFunction, Request, Response } from 'express';
import { Provide } from '../ioc/ioc';
import jwt from 'jsonwebtoken';
// import { UserRole } from '@shared/enums';
// import { messages } from 'utils/messages';
import { BaseRouterDefinition } from '../models/base-router.model';

export const controllerTokensToInstantiate: Array<symbol> = [];
export const instantiatedControllers: Array<BaseRouterDefinition> = [];

export function RouterController(token: symbol): ClassDecorator
{
  return <T>(target: T): void =>
  {
    Provide(token)(target);
    controllerTokensToInstantiate.push(token);
  };
}

// /**
//  * Decorator para autorizar o acesso com base nas roles do usuário.
//  */
// export function Authorized(...roles: UserRole[])
// {
//   return function (target: any, propertyKey: string, descriptor: PropertyDescriptor)
//   {
//     const originalMethod = descriptor.value;

//     descriptor.value = function (req: Request, res: Response, next: NextFunction)
//     {
//       // 🔹 Forçando a tipagem correta de req.user
//       const user = (req as Request & { user?: Express.UserJwtPayload }).user;

//       if (!user || !roles.includes(user.role))
//       {
//         throw new Error('Forbidden: Insufficient privileges');
//       }

//       try
//       {
//         return originalMethod.apply(this, arguments);
//       } catch (error)
//       {
//         next(error);
//       }
//     };

//     return descriptor;
//   };
// }

// /**
//  * Verifica autenticação e adiciona o usuário ao req.
//  */
// export function isAuth()
// {
//   return function (target: any, propertyKey: string, descriptor: PropertyDescriptor)
//   {
//     const originalMethod = descriptor.value;

//     descriptor.value = function (req: Request, res: Response, next: NextFunction)
//     {
//       const authHeader = req.headers.authorization;

//       if (!authHeader)
//       {
//         throw new Error(messages.TOKEN_NOT_PROVIDED);
//       }

//       const [ , token ] = authHeader.split(' ');

//       try
//       {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
//         (req as Request & { user?: Express.UserJwtPayload }).user =
//           decoded as Express.UserJwtPayload;

//         return originalMethod.apply(this, arguments);
//       } catch (err)
//       {
//         throw new Error(messages.INVALID_TOKEN);
//       }
//     };

//     return descriptor;
//   };
// }
