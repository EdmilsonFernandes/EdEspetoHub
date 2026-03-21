import { StoreUser } from '../../entities/StoreUser';
import { Provide } from '../../ioc/ioc';
import { StoreUserDto } from '../../models/dtos/StoreUserDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.StoreUserRepository)
export class StoreUserDao extends GenericDao<StoreUserDto, StoreUser> {
  constructor() {
    super(StoreUserDto);
  }

  async findByStoreAndUser(storeId: string, userId: string) {
    const repo = await this.getRepository();
    return repo.findOne({ where: { store: { id: storeId }, user: { id: userId } } as any });
  }
}
