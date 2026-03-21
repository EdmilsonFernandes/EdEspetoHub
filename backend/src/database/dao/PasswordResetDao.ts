import { PasswordReset } from '../../entities/PasswordReset';
import { Provide } from '../../ioc/ioc';
import { PasswordResetDto } from '../../models/dtos/PasswordResetDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.PasswordResetDao)
export class PasswordResetDao extends GenericDao<PasswordResetDto, PasswordReset> {
  constructor() {
    super(PasswordResetDto);
  }
}
