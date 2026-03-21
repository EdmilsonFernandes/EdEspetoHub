import { Container, inject } from 'inversify';
import { fluentProvide } from 'inversify-binding-decorators';

/**
 * Singleton container instance
 */
const _container = new Container({
  defaultScope: 'Singleton',
  autobind: true
});

export const container = _container;

/**
 * Inject helper using Inversify
 */
export const Inject = (target: symbol) => inject(target);

/**
 * Provide decorator to register services/controllers
 */
export const Provide = (idt: symbol) =>
  fluentProvide(idt).inSingletonScope().done();
