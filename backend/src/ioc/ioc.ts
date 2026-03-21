import { Container, decorate, injectable, inject } from 'inversify';
import { fluentProvide } from 'inversify-binding-decorators';

/**
 * Singleton container instance
 */
const _container = new Container({
  defaultScope: 'Singleton',
  autoBindInjectable: true,
});

export const container = _container;

/**
 * Inject helper using Inversify
 */
export const Inject = (target: any) => inject(target);

/**
 * Provide decorator to register services/controllers
 */
export const Provide = (idt: any) => fluentProvide(idt).inSingletonScope().done();
