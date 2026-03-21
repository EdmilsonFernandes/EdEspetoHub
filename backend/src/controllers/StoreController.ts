import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { Authorize, Get, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { StoreService } from '../services/StoreService';

@RouterController(Tokens.Common.Controller.StoreController)
export class StoreController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.StoreService) private storeService: StoreService
  ) {
    super('/stores');
  }

  @Get('/')
  @Authorize()
  public async getAll(req: Request, res: Response) {
    try {
      const stores = await this.storeService.getAllStores();
      return this.ok(res, stores);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  @Get('/:id')
  public async getById(req: Request, res: Response) {
    try {
      const store = await this.storeService.getStoreById(req.params.id);
      if (!store) {
        return this.notFound(res, 'Store not found');
      }
      return this.ok(res, store);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
