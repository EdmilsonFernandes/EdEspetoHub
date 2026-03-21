import { Provide } from '../../ioc/ioc';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';
import { Store } from '../../entities/Store';

@Provide(Tokens.Common.DataLayer.StoreDao)
export class StoreDao extends GenericDao<Store> {
  constructor() {
    super(Store);
  }
}
