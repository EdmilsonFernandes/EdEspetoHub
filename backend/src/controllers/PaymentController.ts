import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';

const paymentService = new PaymentService();

export class PaymentController {
  static async confirm(req: Request, res: Response) {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ message: 'paymentId é obrigatório' });

    try {
      const payment = await paymentService.confirmPayment(paymentId);
      return res.json({
        payment: {
          id: payment.id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
        },
        subscriptionStatus: payment.subscription.status,
        storeStatus: payment.store.open ? 'ACTIVE' : 'PENDING_PAYMENT',
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
