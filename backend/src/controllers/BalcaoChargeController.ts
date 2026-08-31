import { Request, Response } from 'express';
import { BalcaoChargeService } from '../services/BalcaoChargeService';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';

const service = new BalcaoChargeService();
const log = logger.child({ scope: 'BalcaoChargeController' });

/**
 * Cobrança no balcão (SDD cobranca-balcao): o lojista cobra o pedido na fila via
 * Pix da loja, maquininha Point ou registro de dinheiro.
 */
export class BalcaoChargeController {
  /** Estado do momento do pagamento: total sugerido, cobrança vigente, métodos. */
  static async getStatus(req: Request, res: Response) {
    try {
      const result = await service.getStatus(
        req.params.storeId,
        req.params.orderId,
        req.auth?.storeId
      );
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  /** Cria a cobrança: { method: 'pix' | 'point' | 'cash', amount?, terminalId? }. */
  static async createCharge(req: Request, res: Response) {
    try {
      const method = String(req.body?.method || '').toLowerCase();
      if (!['pix', 'point', 'cash', 'pix_loja'].includes(method)) {
        return respondWithError(
          req,
          res,
          new AppError('PAY-019', 400, {
            message: 'Forma de recebimento inválida — use pix, point, cash ou pix_loja.',
          }),
          400
        );
      }
      // Forma pré-selecionada na maquininha (Orders API config.payment_method.
      // default_type): debit_card | credit_card | qr (Pix no terminal). Só faz
      // sentido com method=point — sem valor, o terminal pergunta ao cliente.
      const rawPaymentType = String(req.body?.paymentType || '').toLowerCase();
      let paymentType: 'debit_card' | 'credit_card' | 'qr' | undefined;
      if (rawPaymentType) {
        if (method !== 'point' || !['debit_card', 'credit_card', 'qr'].includes(rawPaymentType)) {
          return respondWithError(
            req,
            res,
            new AppError('PAY-019', 400, {
              message: 'Forma inválida — use debit_card, credit_card ou qr (apenas em cobrança de maquininha).',
            }),
            400
          );
        }
        paymentType = rawPaymentType as 'debit_card' | 'credit_card' | 'qr';
      }
      const result = await service.createCharge({
        storeId: req.params.storeId,
        orderId: req.params.orderId,
        method: method as 'pix' | 'point' | 'cash' | 'pix_loja',
        amount: req.body?.amount,
        terminalId: req.body?.terminalId,
        paymentType,
        actorUserId: req.auth?.sub || null,
        authStoreId: req.auth?.storeId,
      });
      return res.status(201).json(result);
    } catch (error: any) {
      log.warn('Balcão charge failed', {
        storeId: req.params.storeId,
        orderId: req.params.orderId,
        code: error?.code,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /** Encerra a cobrança pendente (best-effort no MP) e libera nova tentativa. */
  static async cancelCharge(req: Request, res: Response) {
    try {
      const result = await service.cancelCharge(
        req.params.storeId,
        req.params.orderId,
        req.auth?.storeId
      );
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
