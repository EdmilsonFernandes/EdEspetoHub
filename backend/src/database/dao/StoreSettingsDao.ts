import { StoreSettings } from '../../entities/StoreSettings';
import { Provide } from '../../ioc/ioc';
import { StoreSettingsDto } from '../../models/dtos/StoreSettingsDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.StoreSettingsDao)
export class StoreSettingsDao extends GenericDao<StoreSettingsDto, StoreSettings> {
  constructor() {
    super(StoreSettingsDto);
  }
}
