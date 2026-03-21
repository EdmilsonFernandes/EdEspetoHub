import { MotoboyAuditLog } from '../../entities/MotoboyAuditLog';
import { Provide } from '../../ioc/ioc';
import { MotoboyAuditLogDto } from '../../models/dtos/MotoboyAuditLogDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.MotoboyAuditLogDao)
export class MotoboyAuditLogDao extends GenericDao<MotoboyAuditLogDto, MotoboyAuditLog> {
  constructor() {
    super(MotoboyAuditLogDto);
  }
}
