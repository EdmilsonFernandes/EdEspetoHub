export interface BaseRouterDefinition
{
  configureRouter(): void;

  version: string;

  basePath: string;

  path: string;

  controllerReadOrder: number

  globalRoute?: boolean;

}