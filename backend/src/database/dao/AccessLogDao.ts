import { AccessLog } from '../../entities/AccessLog';
import { Provide } from '../../ioc/ioc';
import { AccessLogDto } from '../../models/dtos/AccessLogDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.AccessLogRepository)
export class AccessLogDao extends GenericDao<AccessLogDto, AccessLog> {
  constructor() {
    super(AccessLogDto);
  }

  async list(filters: any) {
    const repo = await this.getRepository();
    // Simplified implementation for migration
    return repo.find();
  }
}
