import { Request, Response } from 'express';
import { EmailTemplateService } from '../services/EmailTemplateService';
import { EmailPreferenceService } from '../services/EmailPreferenceService';
import { EmailService } from '../services/EmailService';

const templateService = new EmailTemplateService();
const preferenceService = new EmailPreferenceService();
const emailService = new EmailService();

const actorFromRequest = (req: Request) => req.auth?.sub || 'superadmin';

const publicTemplatePayload = (template: any) => ({
  id: template.id,
  key: template.key,
  name: template.name,
  category: template.category,
  description: template.description || '',
  subject: template.subject,
  preheader: template.preheader || '',
  textBody: template.textBody,
  htmlBody: template.htmlBody,
  variables: Array.isArray(template.variables) ? template.variables : [],
  active: Boolean(template.active),
  allowUnsubscribe: Boolean(template.allowUnsubscribe),
  updatedBy: template.updatedBy || null,
  createdAt: template.createdAt || null,
  updatedAt: template.updatedAt || null,
});

export class EmailAdminController {
  static async listTemplates(_req: Request, res: Response) {
    try {
      const templates = await templateService.listTemplates();
      return res.json({ templates: templates.map(publicTemplatePayload) });
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível listar os templates de e-mail.' });
    }
  }

  static async getTemplate(req: Request, res: Response) {
    try {
      const template = await templateService.getTemplate(req.params.key);
      return res.json({ template: publicTemplatePayload(template) });
    } catch (error: any) {
      return res.status(404).json({ message: error?.message || 'Template não encontrado.' });
    }
  }

  static async saveTemplate(req: Request, res: Response) {
    try {
      const template = await templateService.saveTemplate(req.params.key, req.body || {}, actorFromRequest(req));
      return res.json({ template: publicTemplatePayload(template) });
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível salvar o template.' });
    }
  }

  static async previewTemplate(req: Request, res: Response) {
    try {
      const rendered = await templateService.previewTemplate(req.params.key, req.body?.variables || {});
      return res.json(rendered);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível gerar o preview.' });
    }
  }

  static async sendTest(req: Request, res: Response) {
    try {
      const to = String(req.body?.to || '').trim();
      if (!to || !to.includes('@')) return res.status(400).json({ message: 'Informe um e-mail válido para teste.' });
      await emailService.sendTemplate(to, req.params.key, req.body?.variables || {}, { test: true, actor: actorFromRequest(req) });
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível enviar o teste.' });
    }
  }

  static async listSuppressions(req: Request, res: Response) {
    try {
      const suppressions = await preferenceService.listSuppressions(Number(req.query.limit || 100));
      return res.json({ suppressions });
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível listar descadastros.' });
    }
  }

  static async createSuppression(req: Request, res: Response) {
    try {
      const suppression = await preferenceService.suppressEmail({
        email: req.body?.email,
        category: req.body?.category || 'marketing',
        source: 'superadmin',
        reason: req.body?.reason || 'Descadastro manual pelo Super Admin.',
        createdBy: actorFromRequest(req),
      });
      return res.status(201).json({ suppression });
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível cadastrar o descadastro.' });
    }
  }

  static async removeSuppression(req: Request, res: Response) {
    try {
      const removed = await preferenceService.removeSuppression(req.params.suppressionId);
      return res.json({ removed });
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || 'Não foi possível remover o descadastro.' });
    }
  }
}
