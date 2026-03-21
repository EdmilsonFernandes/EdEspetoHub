import { Tokens } from 'ioc/injectiontokens';
import { Inject, Provide } from 'ioc/ioc';
import { RouterConfig } from '../server/router.config';

let _instance: BaseController;

@Provide(Tokens.Common.Controller.BaseController)
export abstract class BaseController {
  @Inject(Tokens.Common.Server.RouterConfig) protected router: RouterConfig;

  constructor() {
    _instance = _instance || this;

    return this;
  }

  public get controllerReadOrder(): number {
    return 100;
  }

  public get globalRoute(): boolean {
    return false;
  }

  public abstract get version(): string;
  public abstract get basePath(): string;

  public configureRouter(): void {
    this.router.setRouteDefinition(this.basePath, this.version, this.controllerReadOrder, this.globalRoute);

    this.defineRoutes();
  }

  protected defineRoutes(): void {
    this.definePostsRoutes();
    this.defineGetsRoutes();
    this.definePutsRoutes();
    this.defineDeletesRoutes();
    this.definePatchRoutes();
  }

  /**
   * All patchs declarations for this Route.
   */
  protected definePatchRoutes(): void {}

  /**
   * All posts declarations for this Route.
   */
  protected definePostsRoutes(): void {}

  /**
   * All gets declarations for this Route.
   */
  protected defineGetsRoutes(): void {}

  /**
   * All gets declarations for this Route.
   */
  protected definePutsRoutes(): void {}

  /**
   * All gets declarations for this Route.
   */
  protected defineDeletesRoutes(): void {}
}
