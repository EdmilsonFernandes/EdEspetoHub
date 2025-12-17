import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Plan, PlanName } from '../entities/Plan';

export class PlanRepository {
  private repository: Repository<Plan>;

  constructor() {
    this.repository = AppDataSource.getRepository(Plan);
  }

  create(data: Partial<Plan>) {
    return this.repository.create(data);
  }

  save(plan: Plan) {
    return this.repository.save(plan);
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id } });
  }

  findEnabled() {
    return this.repository.find({ where: { enabled: true } });
  }

  findByName(name: PlanName) {
    return this.repository.findOne({ where: { name } });
  }

  findAll() {
    return this.repository.find();
  }
}
