/**
 * Didit KYC webhook controller (server-to-server, no auth — HMAC validated
 * inside the service, same pattern as the Mercado Pago webhook).
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-09-08
 */
import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { diditKycService } from '../services/DiditKycService';

export class DiditWebhookController {
  /**
   * Handles Didit `status.updated` webhooks (session decision).
   */
  static async webhook(req: Request, res: Response) {
    try {
      // HMAC must be computed over the exact bytes sent by Didit — the raw
      // body is captured by the express.json `verify` hook in app.ts.
      const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
      const signature = req.headers['x-signature'] as string | undefined;
      const timestamp = req.headers['x-timestamp'] as string | undefined;
      const isTest = req.headers['x-didit-test-webhook'] === 'true';
      const result = await diditKycService.handleWebhook(rawBody, signature, timestamp, req.body, isTest);
      return res.json({ status: 'ok', result });
    } catch (error) {
      return respondWithError(req, res, error, 401);
    }
  }
}
