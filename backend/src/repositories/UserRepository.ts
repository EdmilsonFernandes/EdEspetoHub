import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  create(data: Partial<User>) {
    return this.repository.create(data);
  }

  save(user: User) {
    return this.repository.save(user);
  }

  findByEmail(email: string) {
    return this.repository.findOne({ where: { email }, relations: ['stores', 'stores.settings'] });
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['stores', 'stores.settings'] });
  }
}
