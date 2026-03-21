import { SiteSetting } from '../../entities/SiteSetting';
import { Provide } from '../../ioc/ioc';
import { SiteSettingDto } from '../../models/dtos/SiteSettingDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.SiteSettingDao)
export class SiteSettingDao extends GenericDao<SiteSettingDto, SiteSetting> {
  constructor() {
    super(SiteSettingDto);
  }
}
