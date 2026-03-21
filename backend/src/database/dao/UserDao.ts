import { User } from '../../entities/User';
import { Provide } from '../../ioc/ioc';
import { UserDto } from '../../models/dtos/UserDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.UserDao) // Keeping token same for now to avoid massive service changes
export class UserDao extends GenericDao<UserDto, User> {
  constructor() {
    super(UserDto);
  }

  async findByEmail(email: string) {
    const repo = await this.getRepository();
    return repo.findOne({ where: { email } as any });
  }

  async findByLoginIdentifier(identifier: string) {
    const repo = await this.getRepository();
    return repo.findOne({
      where: [
        { email: identifier },
        { phone: identifier },
      ] as any
    });
  }
}
