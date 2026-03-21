import { MotoboyStoreRequest } from '../../entities/MotoboyStoreRequest';
import { Provide } from '../../ioc/ioc';
import { MotoboyStoreRequestDto } from '../../models/dtos/MotoboyStoreRequestDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.MotoboyStoreRequestDao)
export class MotoboyStoreRequestDao extends GenericDao<MotoboyStoreRequestDto, MotoboyStoreRequest> {
  constructor() {
    super(MotoboyStoreRequestDto);
  }
}
