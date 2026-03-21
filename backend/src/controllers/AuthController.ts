/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: AuthController.ts
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Post, RouterController, Authorize } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

const log = logger.child({ scope: 'AuthController' });

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticação e gestão de usuários
 */
@RouterController(Tokens.Common.Controller.AuthController, 'v1')
export class AuthController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.AuthService) private authService: AuthService
  ) {
    super('/auth', 'v1');
  }

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Cria um novo usuário e loja
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email: { type: string }
   *               password: { type: string }
   *               fullName: { type: string }
   *               storeName: { type: string }
   *     responses:
   *       201:
   *         description: Usuário criado com sucesso
   *       400:
   *         description: Erro na requisição
   */
  @Post('/register')
  async register(req: Request, res: Response) {
    try {
      const result = await this.authService.register(req.body);
      return this.created(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Realiza login do usuário
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email: { type: string }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Login realizado com sucesso
   *       401:
   *         description: Credenciais inválidas
   */
  @Post('/login')
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/admin-login:
   *   post:
   *     summary: Login administrativo
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/admin-login')
  async adminLogin(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;
      const result = await this.authService.adminLogin(identifier, password);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/super-admin-login:
   *   post:
   *     summary: Login Super Admin
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/super-admin-login')
  async superAdminLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.superAdminLogin(email, password);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/verify-email:
   *   post:
   *     summary: Verifica o e-mail do usuário
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/verify-email')
  async verifyEmail(req: Request, res: Response) {
    try {
      const result = await this.authService.verifyEmail(req.body);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/request-password-reset:
   *   post:
   *     summary: Solicita recuperação de senha
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/request-password-reset')
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const result = await this.authService.requestPasswordReset(req.body.email);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: Define uma nova senha
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/reset-password')
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      const result = await this.authService.resetPassword(token, newPassword);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /auth/change-password:
   *   post:
   *     summary: Altera a senha do usuário autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: OK
   */
  @Post('/change-password')
  @Authorize()
  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(req.auth?.sub || '', currentPassword, newPassword);
      return this.ok(res, result);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
