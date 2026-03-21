import { Plan } from '../../entities/Plan';
import { Provide } from '../../ioc/ioc';
import { PlanDto } from '../../models/dtos/PlanDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.PlanRepository)
export class PlanDao extends GenericDao<PlanDto, Plan> {
  constructor() {
    super(PlanDto);
  }

  async findAllActive() {
    const repo = await this.getRepository();
    return repo.find({ where: { enabled: true } as any });
  }
}
