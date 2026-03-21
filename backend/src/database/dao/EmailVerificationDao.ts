import { EmailVerification } from '../../entities/EmailVerification';
import { Provide } from '../../ioc/ioc';
import { EmailVerificationDto } from '../../models/dtos/EmailVerificationDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.EmailVerificationDao)
export class EmailVerificationDao extends GenericDao<EmailVerificationDto, EmailVerification> {
  constructor() {
    super(EmailVerificationDto);
  }
}
