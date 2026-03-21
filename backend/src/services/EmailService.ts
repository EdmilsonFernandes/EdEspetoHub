/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: EmailService.ts
 */

import { SettingsService } from './SettingsService';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Common.Service.EmailService)
export class EmailService {
  constructor(
    @Inject(Tokens.Common.Service.SettingsService) private settingsService: SettingsService
  ) {}

  async send(payload: any) {
    return null;
  }

  async sendActivationEmail(email: string, slug: string) {
    return null;
  }

  async sendPasswordReset(email: string, link: string) {
    return null;
  }

  async sendEmailVerification(email: string, link: string, token: string) {
    return null;
  }

  async sendMotoboyVerification(email: string, link: string, token: string) {
    return null;
  }

  async sendSignupNotification(data: any) {
    return null;
  }
}
