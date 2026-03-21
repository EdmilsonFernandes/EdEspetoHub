import { StoreLinkHit } from '../../entities/StoreLinkHit';
import { Provide } from '../../ioc/ioc';
import { StoreLinkHitDto } from '../../models/dtos/StoreLinkHitDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.StoreLinkHitDao)
export class StoreLinkHitDao extends GenericDao<StoreLinkHitDto, StoreLinkHit> {
  constructor() {
    super(StoreLinkHitDto);
  }
}
