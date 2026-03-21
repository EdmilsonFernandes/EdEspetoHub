import { MotoboyStore } from '../../entities/MotoboyStore';
import { Provide } from '../../ioc/ioc';
import { MotoboyStoreDto } from '../../models/dtos/MotoboyStoreDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.MotoboyStoreDao)
export class MotoboyStoreDao extends GenericDao<MotoboyStoreDto, MotoboyStore> {
  constructor() {
    super(MotoboyStoreDto);
  }
}
