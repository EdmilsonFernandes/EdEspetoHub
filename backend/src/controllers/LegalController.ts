/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: LegalController.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { SettingsService } from '../services/SettingsService';
import { respondWithError } from '../errors/respondWithError';

const settingsService = new SettingsService();

/**
 * Provides LegalController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class LegalController {
  /**
   * Gets terms content.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async getTerms(req: Request, res: Response) {
    try {
      const content = await settingsService.getValue('legal.terms');
      return res.json({ content: content || '' });
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Gets LGPD content.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async getLgpd(req: Request, res: Response) {
    try {
      const content = await settingsService.getValue('legal.lgpd');
      return res.json({ content: content || '' });
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Sets a site setting (admin only).
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async setSetting(req: Request, res: Response) {
    try {
      const key = String(req.body?.key || '').trim();
      const value = String(req.body?.value || '');
      if (!key) {
        return res.status(400).json({ message: 'Chave inválida.' });
      }
      const setting = await settingsService.setValue(key, value);
      return res.json(setting);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }
}
