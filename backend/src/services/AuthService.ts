/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: AuthService.ts
 */

import bcrypt from 'bcryptjs';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { UserDao } from '../database/dao/UserDao';
import { StoreDao } from '../database/dao/StoreDao';
import { PaymentService } from './PaymentService';
import { EmailService } from './EmailService';
import { PaymentDao } from '../database/dao/PaymentDao';
import { SubscriptionService } from './SubscriptionService';
import { SettingsService } from './SettingsService';
import { StoreUserDao } from '../database/dao/StoreUserDao';
import { UserResponse } from '../models/response/UserResponse';
import { StoreResponse } from '../models/response/StoreResponse';
import { ValidationUtil } from '../utils/ValidationUtil';
import { StringUtil } from '../utils/StringUtil';
import { FileUtil } from '../utils/FileUtil';
import { BusinessUtil } from '../utils/BusinessUtil';

export interface AuthResponse {
  user: UserResponse;
  store?: StoreResponse;
  token?: string;
}

@Provide(Tokens.Common.Service.AuthService)
export class AuthService {
  constructor(
    @Inject(Tokens.Common.DataLayer.UserDao) private userDao: UserDao,
    @Inject(Tokens.Common.DataLayer.StoreDao) private storeDao: StoreDao,
    @Inject(Tokens.Common.Service.PaymentService) private paymentService: PaymentService,
    @Inject(Tokens.Common.Service.EmailService) private emailService: EmailService,
    @Inject(Tokens.Common.DataLayer.PaymentDao) private paymentDao: PaymentDao,
    @Inject(Tokens.Common.Service.SubscriptionService) private subscriptionService: SubscriptionService,
    @Inject(Tokens.Common.Service.SettingsService) private settingsService: SettingsService,
    @Inject(Tokens.Common.DataLayer.StoreUserDao) private storeUserDao: StoreUserDao,
    @Inject(Tokens.Utils.ValidationUtil) private validationUtil: ValidationUtil,
    @Inject(Tokens.Utils.StringUtil) private stringUtil: StringUtil,
    @Inject(Tokens.Utils.FileUtil) private fileUtil: FileUtil,
    @Inject(Tokens.Utils.BusinessUtil) private businessUtil: BusinessUtil
  ) {}

  async login(email: string, password?: string): Promise<AuthResponse> {
    return {
      user: { id: 'mock', fullName: 'Mock', email, role: 'ADMIN', emailVerified: true, createdAt: new Date() }
    };
  }

  async register(data: any, options?: any): Promise<AuthResponse> {
    return {
      user: { id: 'mock', fullName: 'Mock', email: 'mock@example.com', role: 'ADMIN', emailVerified: true, createdAt: new Date() }
    };
  }

  async adminLogin(identifier: string, password?: string): Promise<AuthResponse> {
    return {
      user: { id: 'mock', fullName: 'Mock', email: 'mock@example.com', role: 'ADMIN', emailVerified: true, createdAt: new Date() }
    };
  }

  async superAdminLogin(email: string, password?: string): Promise<AuthResponse> {
    return {
      user: { id: 'mock', fullName: 'Mock', email, role: 'SUPER_ADMIN', emailVerified: true, createdAt: new Date() }
    };
  }

  async verifyEmail(data: any): Promise<{ code: number; redirectUrl: string }> {
    return { code: 200, redirectUrl: '/' };
  }

  async resendVerificationEmail(email: string, options?: any): Promise<void> {
    return;
  }

  async requestPasswordReset(email: string): Promise<{ code: number }> {
    return { code: 200 };
  }

  async resetPassword(token: string, newPassword?: string): Promise<{ code: number }> {
    return { code: 200 };
  }

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    return;
  }
}
