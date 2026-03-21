import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { StoreDao } from '../database/dao/StoreDao';
import { Store } from '../entities/Store';

@Provide(Tokens.Common.Service.StoreService)
export class StoreService {
  constructor(
    @Inject(Tokens.Common.DataLayer.StoreDao) private storeDao: StoreDao
  ) {}

  public async getAllStores(): Promise<Store[]> {
    return this.storeDao.readAll();
  }

  public async getStoreById(id: string): Promise<Store | null> {
    return this.storeDao.getById(id);
  }
}
