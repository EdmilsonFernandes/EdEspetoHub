import '../ioc/ioc.loader';

import { container } from '../ioc/ioc';

/**
 * App initialization decorator
 */
export function AppBootstrap() {

  return function<T extends { new (...args: any[]): { bootstrap(): Promise<void> } }>(Target: T) {

    return class extends Target {

      static async start(): Promise<void> {
        try {

          const appInstance = container.get(Target);

          await appInstance.bootstrap();
        } catch (error) {
          console.error('⚠️ Falha crítica na inicialização da aplicação:', error);
          process.exit(1);
        }
      }
    };
  };
}