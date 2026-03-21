import { Motoboy } from '../../entities/Motoboy';
import { Provide } from '../../ioc/ioc';
import { MotoboyDto } from '../../models/dtos/MotoboyDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.MotoboyDao)
export class MotoboyDao extends GenericDao<MotoboyDto, Motoboy> {
  constructor() {
    super(MotoboyDto);
  }

  async findByUserId(userId: string) {
    const repo = await this.getRepository();
    return repo.findOne({ where: { user: { id: userId } } as any, relations: ['user'] });
  }

  async findAvailableByStoreId(storeId: string) {
    // Implementation
    return [];
  }
}
