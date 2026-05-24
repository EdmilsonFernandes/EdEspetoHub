import { Request, Response } from 'express';
import { EmailPreferenceService } from '../services/EmailPreferenceService';

const preferenceService = new EmailPreferenceService();

const maskEmail = (email: string) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
};

export class EmailPublicController {
  static async previewUnsubscribe(req: Request, res: Response) {
    try {
      const payload = preferenceService.parseUnsubscribeToken(String(req.query.token || ''));
      return res.json({
        email: maskEmail(payload.email),
        category: payload.category,
      });
    } catch {
      return res.status(400).json({ message: 'Link de descadastro inválido ou expirado.' });
    }
  }

  static async unsubscribe(req: Request, res: Response) {
    try {
      const suppression = await preferenceService.suppressFromToken(String(req.body?.token || ''));
      return res.json({
        ok: true,
        email: maskEmail(suppression.email),
        category: suppression.category,
      });
    } catch {
      return res.status(400).json({ message: 'Não foi possível concluir o descadastro.' });
    }
  }

  static async oneClickUnsubscribe(req: Request, res: Response) {
    try {
      await preferenceService.suppressFromToken(String(req.query.token || req.body?.token || ''));
      return res.status(200).send('OK');
    } catch {
      return res.status(400).send('INVALID');
    }
  }
}
