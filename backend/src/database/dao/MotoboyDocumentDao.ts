import { MotoboyDocument } from '../../entities/MotoboyDocument';
import { Provide } from '../../ioc/ioc';
import { MotoboyDocumentDto } from '../../models/dtos/MotoboyDocumentDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.MotoboyDocumentDao)
export class MotoboyDocumentDao extends GenericDao<MotoboyDocumentDto, MotoboyDocument> {
  constructor() {
    super(MotoboyDocumentDto);
  }
}
