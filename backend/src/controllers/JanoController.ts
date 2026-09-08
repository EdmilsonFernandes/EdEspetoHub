/**
 * Jano KYC webhook controller (server-to-server, no auth — HMAC validated
 * inside the service, same pattern as the Mercado Pago webhook).
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-09-08
 */
import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { janoKycService } from '../services/JanoKycService';

export class JanoController {
  /**
   * Handles Jano verification result webhooks.
   */
  static async webhook(req: Request, res: Response) {
    try {
      // HMAC must be computed over the exact bytes sent by Jano — the raw
      // body is captured by the express.json `verify` hook in app.ts.
      const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
      const signature = req.headers['x-jano-signature'] as string | undefined;
      const result = await janoKycService.handleWebhook(rawBody, signature, req.body);
      return res.json({ status: 'ok', result });
    } catch (error) {
      return respondWithError(req, res, error, 401);
    }
  }
}
