import { PlatformAdmin } from '../../entities/PlatformAdmin';
import { Provide } from '../../ioc/ioc';
import { PlatformAdminDto } from '../../models/dtos/PlatformAdminDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.PlatformAdminDao)
export class PlatformAdminDao extends GenericDao<PlatformAdminDto, PlatformAdmin> {
  constructor() {
    super(PlatformAdminDto);
  }
}
