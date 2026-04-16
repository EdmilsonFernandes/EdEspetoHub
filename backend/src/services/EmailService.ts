/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: EmailService.ts
 * @Date: 2026-01-06
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SettingsService } from './SettingsService';

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};
/**
 * Provides EmailService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-06
 */
export class EmailService {
  private transporter?: nodemailer.Transporter;
  private log = logger.child({ scope: 'EmailService' });
  private settingsService = new SettingsService();
  /**
   * Gets logo url.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  private getLogoUrl() {
    const base = env.appUrl?.replace(/\/$/, '') || 'http://localhost:3000';
    return `${base}/janocaminho.jpg`;
  }

  /**
   * Gets transporter.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  private getTransporter() {
    if (!env.email.smtpHost || !env.email.smtpUser || !env.email.smtpPass) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.email.smtpHost,
        port: env.email.smtpPort,
        secure: env.email.smtpSecure,
        auth: {
          user: env.email.smtpUser,
          pass: env.email.smtpPass,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Sends data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async send(payload: EmailPayload) {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.log.info('Email mock', { to: payload.to, subject: payload.subject });
      return;
    }
    await transporter.sendMail({
      from: env.email.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

    /**
   * Retrieves data for get template value.
   *
   * @author Edmilson Lopes
   */
private async getTemplateValue(key: string, fallback: string) {
    try {
      const value = await this.settingsService.getValue(key);
      return this.normalizeBrandingContent(value || fallback);
    } catch {
      return this.normalizeBrandingContent(fallback);
    }
  }

    /**
   * Executes normalize branding content business logic.
   *
   * @author Edmilson Lopes
   */
private normalizeBrandingContent(content: string) {
    return String(content || '')
      .replace(/Chama no Espeto/g, 'Já no Caminho')
      .replace(/chama no espeto/g, 'já no caminho')
      .replace(/www\.chamanoespeto\.com\.br/g, 'www.janocaminho.com.br')
      .replace(/chamanoespeto\.com\.br/g, 'janocaminho.com.br')
      .replace(/\/chama-no-espeto\.jpeg/g, '/janocaminho.jpg')
      .replace(/chama-no-espeto\.jpeg/g, 'janocaminho.jpg');
  }

    /**
   * Executes render template business logic.
   *
   * @author Edmilson Lopes
   */
private renderTemplate(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }

  /**
   * Sends password reset.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async sendPasswordReset(email: string, link: string) {
    const logoUrl = this.getLogoUrl();
    const subject = await this.getTemplateValue('email_templates.password_reset.subject', 'Redefinir senha - Jano Caminho');
    const textTemplate = await this.getTemplateValue(
      'email_templates.password_reset.text',
      'Recebemos seu pedido para redefinir a senha.\n\nAbra este link para continuar: {{LINK}}\n\nSe não foi você, ignore este e-mail.'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.password_reset.html',
      `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <img src="{{LOGO_URL}}" alt="Jano Caminho" style="width: 120px; height: auto; margin-bottom: 16px;" />
          <h2 style="margin: 0 0 8px; color: #0f172a;">Redefinir senha</h2>
          <p style="margin: 0 0 16px; color: #475569;">Recebemos seu pedido para redefinir a senha.</p>
          <a href="{{LINK}}" style="display: inline-block; padding: 10px 16px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Redefinir senha</a>
          <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Se não foi você, ignore este e-mail.</p>
        </div>
      </div>
    `
    );
    const text = this.renderTemplate(textTemplate, { LINK: link });
    const html = this.renderTemplate(htmlTemplate, { LINK: link, LOGO_URL: logoUrl });
    await this.send({ to: email, subject, text, html });
  }

  /**
   * Sends email verification.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async sendEmailVerification(email: string, link: string, token: string) {
    const logoUrl = this.getLogoUrl();
    const subject = await this.getTemplateValue('email_templates.store_verification.subject', 'Verifique seu e-mail - Jano Caminho');
    const textTemplate = await this.getTemplateValue(
      'email_templates.store_verification.text',
      'Para ativar sua conta, confirme seu e-mail neste link: {{LINK}}\n\nCódigo de ativação (copiar e colar): {{TOKEN}}\n\nSe não foi você, ignore este e-mail.'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.store_verification.html',
      `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);">
            <img src="{{LOGO_URL}}" alt="Jano Caminho" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Confirme seu e-mail</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Ative sua conta para liberar sua loja</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px; color: #475569;">Clique no botao abaixo para ativar sua conta e continuar o pagamento.</p>
            <a href="{{LINK}}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Confirmar e-mail</a>
            <p style="margin: 16px 0 4px; color: #0f172a; font-size: 12px; font-weight: 700;">Código de ativação</p>
            <div style="font-family: monospace; font-size: 12px; line-height: 1.4; color: #0f172a; word-break: break-all; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px;">{{TOKEN}}</div>
            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Se não foi você, ignore este e-mail.</p>
          </div>
        </div>
      </div>
    `
    );
    const text = this.renderTemplate(textTemplate, { LINK: link, TOKEN: token });
    const html = this.renderTemplate(htmlTemplate, { LINK: link, TOKEN: token, LOGO_URL: logoUrl });
    await this.send({ to: email, subject, text, html });
  }

  /**
   * Sends motoboy verification email.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async sendMotoboyVerification(email: string, link: string, token: string) {
    const logoUrl = this.getLogoUrl();
    const loginUrl = `${env.appUrl}/motoboy/login`;
    const subject = await this.getTemplateValue(
      'email_templates.motoboy_verification.subject',
      'Confirme seu e-mail de entregador - Jano Caminho'
    );
    const textTemplate = await this.getTemplateValue(
      'email_templates.motoboy_verification.text',
      'Confirme seu e-mail para ativar sua conta de entregador.\nLink de confirmação: {{LINK}}\nCódigo de ativação: {{TOKEN}}\nDepois, acesse: {{LOGIN_URL}}'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.motoboy_verification.html',
      `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #0f172a 0%, #ef4444 70%, #f97316 100%);">
            <img src="{{LOGO_URL}}" alt="Jano Caminho" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Ative seu cadastro de entregador</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Confirme seu e-mail para receber solicitações das lojas</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px; color: #475569;">Clique no botão para confirmar seu e-mail e concluir o cadastro.</p>
            <a href="{{LINK}}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Confirmar e-mail</a>
            <p style="margin: 16px 0 4px; color: #0f172a; font-size: 12px; font-weight: 700;">Código de ativação</p>
            <div style="font-family: monospace; font-size: 12px; line-height: 1.4; color: #0f172a; word-break: break-all; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px;">{{TOKEN}}</div>
            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Depois de confirmar, acesse: {{LOGIN_URL}}</p>
          </div>
        </div>
      </div>
    `
    );
    const text = this.renderTemplate(textTemplate, { LINK: link, TOKEN: token, LOGIN_URL: loginUrl });
    const html = this.renderTemplate(htmlTemplate, { LINK: link, TOKEN: token, LOGIN_URL: loginUrl, LOGO_URL: logoUrl });
    await this.send({ to: email, subject, text, html });
  }

  /**
   * Sends activation email.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async sendActivationEmail(email: string, slug: string) {
    const adminUrl = `${env.appUrl}/admin`;
    const storeUrl = `${env.appUrl}/${slug}`;
    const logoUrl = this.getLogoUrl();
    const subject = await this.getTemplateValue('email_templates.activation.subject', 'Sua loja está ativa - Jano Caminho');
    const textTemplate = await this.getTemplateValue(
      'email_templates.activation.text',
      'Pagamento aprovado!\n\nAcesse o painel em: {{ADMIN_URL}}\nSlug da loja: {{SLUG}}\nVitrine: {{STORE_URL}}\n\nUse a senha criada no cadastro para entrar.'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.activation.html',
      `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <img src="{{LOGO_URL}}" alt="Jano Caminho" style="width: 120px; height: auto; margin-bottom: 16px;" />
          <h2 style="margin: 0 0 8px; color: #0f172a;">Pagamento aprovado</h2>
          <p style="margin: 0 0 16px; color: #475569;">Sua loja está ativa e pronta para uso.</p>
          <div style="margin-bottom: 12px; color: #0f172a;">
            <strong>Slug da loja:</strong> {{SLUG}}
          </div>
          <div style="margin-bottom: 12px;">
            <a href="{{ADMIN_URL}}" style="color: #dc2626; font-weight: 600; text-decoration: none;">Acessar painel</a>
          </div>
          <div style="margin-bottom: 16px;">
            <a href="{{STORE_URL}}" style="color: #dc2626; font-weight: 600; text-decoration: none;">Ver vitrine</a>
          </div>
          <p style="margin: 0; color: #64748b; font-size: 12px;">Use a senha criada no cadastro para entrar.</p>
        </div>
      </div>
    `
    );
    const text = this.renderTemplate(textTemplate, { ADMIN_URL: adminUrl, STORE_URL: storeUrl, SLUG: slug });
    const html = this.renderTemplate(htmlTemplate, { ADMIN_URL: adminUrl, STORE_URL: storeUrl, SLUG: slug, LOGO_URL: logoUrl });
    await this.send({ to: email, subject, text, html });
  }

    /**
   * Executes send customer welcome business logic.
   *
   * @author Edmilson Lopes
   */
  async sendCustomerWelcome(email: string, fullName: string) {
    const logoUrl = this.getLogoUrl();
    const appUrl = env.appUrl || 'https://janocaminho.com.br';
    const subject = await this.getTemplateValue(
      'email_templates.customer_welcome.subject',
      'Cadastro concluído - Já no Caminho'
    );
    const textTemplate = await this.getTemplateValue(
      'email_templates.customer_welcome.text',
      'Olá, {{NAME}}!\n\nSeu cadastro foi concluído com sucesso.\nAcesse: {{APP_URL}}\n\nBoas compras!'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.customer_welcome.html',
      `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <img src="{{LOGO_URL}}" alt="Já no Caminho" style="width: 120px; height: auto; margin-bottom: 16px;" />
          <h2 style="margin: 0 0 8px; color: #0f172a;">Cadastro concluído</h2>
          <p style="margin: 0 0 16px; color: #475569;">Olá, {{NAME}}! Sua conta foi criada com sucesso.</p>
          <a href="{{APP_URL}}" style="display: inline-block; padding: 10px 16px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Acessar plataforma</a>
          <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Boas compras!</p>
        </div>
      </div>
      `
    );
    const vars = { NAME: fullName || 'Cliente', APP_URL: appUrl, LOGO_URL: logoUrl };
    const text = this.renderTemplate(textTemplate, vars);
    const html = this.renderTemplate(htmlTemplate, vars);
    await this.send({ to: email, subject, text, html });
  }

  /**
   * Sends the 4-digit customer email verification code.
   *
   * @author Edmilson Lopes
   */
  async sendCustomerVerificationCode(email: string, fullName: string, code: string) {
    const logoUrl = this.getLogoUrl();
    const appUrl = env.appUrl || 'https://janocaminho.com.br';
    const codeSpaced = String(code || '').split('').join(' ');
    const subject = await this.getTemplateValue(
      'email_templates.customer_verification.subject',
      'Seu código de acesso - Já no Caminho'
    );
    const textTemplate = await this.getTemplateValue(
      'email_templates.customer_verification.text',
      'Olá, {{NAME}}!\n\nUse este código para confirmar seu e-mail no app: {{CODE}}\n\nO código expira em 30 minutos.\nSe não foi você, ignore este e-mail.\n\nAcesse: {{APP_URL}}'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.customer_verification.html',
      `
      <div style="font-family: Arial, sans-serif; background: radial-gradient(circle at top, #eff6ff 0%, #f8fafc 42%, #e2e8f0 100%); padding: 28px;">
        <div style="max-width: 560px; margin: 0 auto; background: rgba(255,255,255,0.94); border: 1px solid rgba(148,163,184,0.18); border-radius: 28px; overflow: hidden; box-shadow: 0 24px 60px rgba(15,23,42,0.12);">
          <div style="padding: 28px; background: linear-gradient(135deg, #0f3b53 0%, #0d4f66 55%, #2c8c9f 100%); color: #ffffff;">
            <img src="{{LOGO_URL}}" alt="Já no Caminho" style="width: 84px; height: 84px; border-radius: 22px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 10px 30px rgba(15,23,42,0.22);" />
            <p style="margin: 18px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; opacity: 0.78;">Confirmar cadastro</p>
            <h1 style="margin: 10px 0 8px; font-size: 28px; line-height: 1.1;">Seu acesso começa aqui</h1>
            <p style="margin: 0; max-width: 360px; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.86);">Digite o código abaixo no app para concluir sua conta com segurança.</p>
          </div>
          <div style="padding: 28px;">
            <p style="margin: 0 0 10px; color: #0f172a; font-size: 16px; font-weight: 700;">Olá, {{NAME}}</p>
            <p style="margin: 0 0 22px; color: #475569; font-size: 14px; line-height: 1.7;">Use este código de 4 dígitos para validar seu e-mail. Ele expira em 30 minutos e só funciona no app.</p>
            <div style="padding: 18px; border-radius: 24px; background: linear-gradient(135deg, rgba(15,59,83,0.08) 0%, rgba(45,212,191,0.12) 100%); border: 1px solid rgba(45,212,191,0.2); box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: #0f3b53; opacity: 0.75;">Código de confirmação</div>
              <div style="margin-top: 10px; font-size: 38px; line-height: 1; letter-spacing: 0.42em; font-weight: 800; color: #0f172a;">{{CODE_SPACED}}</div>
            </div>
            <div style="margin-top: 22px; padding: 16px 18px; border-radius: 20px; background: rgba(248,250,252,0.9); border: 1px solid rgba(226,232,240,0.9); color: #64748b; font-size: 12px; line-height: 1.7;">
              Se você não iniciou esse cadastro, ignore este e-mail. Sua conta não será ativada sem o código.
            </div>
            <p style="margin: 18px 0 0; color: #94a3b8; font-size: 12px;">App: {{APP_URL}}</p>
          </div>
        </div>
      </div>
      `
    );
    const vars = {
      NAME: fullName || 'Cliente',
      CODE: code,
      CODE_SPACED: codeSpaced,
      APP_URL: appUrl,
      LOGO_URL: logoUrl,
    };
    const text = this.renderTemplate(textTemplate, vars);
    const html = this.renderTemplate(htmlTemplate, vars);
    await this.send({ to: email, subject, text, html });
  }

  /**
   * Sends subscription reminder.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async sendSubscriptionReminder(email: string, storeName: string, slug: string, daysLeft: number) {
    const adminUrl = `${env.appUrl}/admin`;
    const storeUrl = `${env.appUrl}/${slug}`;
    const logoUrl = this.getLogoUrl();
    const subject = await this.getTemplateValue(
      'email_templates.subscription_reminder.subject',
      daysLeft <= 0
        ? 'Sua assinatura expira hoje - Jano Caminho'
        : `Sua assinatura expira em ${daysLeft} dia${daysLeft === 1 ? '' : 's'} - Jano Caminho`
    );
    const textTemplate = await this.getTemplateValue(
      'email_templates.subscription_reminder.text',
      'Olá! A assinatura da loja {{STORE_NAME}} expira em {{DAYS_LEFT}} dia(s).\nAcesse o painel para renovar e evitar interrupção no atendimento.\n{{ADMIN_URL}}'
    );
    const htmlTemplate = await this.getTemplateValue(
      'email_templates.subscription_reminder.html',
      `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);">
            <img src="{{LOGO_URL}}" alt="Jano Caminho" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Assinatura prestes a expirar</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Evite interrupções no atendimento</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 8px; color: #475569;">Loja: <strong>{{STORE_NAME}}</strong></p>
            <p style="margin: 0 0 16px; color: #475569;">
              {{MESSAGE}}
            </p>
            <a href="{{ADMIN_URL}}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Renovar assinatura</a>
            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Vitrine: {{STORE_URL}}</p>
          </div>
        </div>
      </div>
    `
    );
    const message =
      daysLeft <= 0
        ? 'Sua assinatura expira hoje. Renove agora para manter a loja ativa.'
        : `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'} para sua assinatura expirar.`;
    const text = this.renderTemplate(textTemplate, {
      STORE_NAME: storeName,
      DAYS_LEFT: String(daysLeft),
      ADMIN_URL: adminUrl,
    });
    const html = this.renderTemplate(htmlTemplate, {
      STORE_NAME: storeName,
      STORE_URL: storeUrl,
      ADMIN_URL: adminUrl,
      LOGO_URL: logoUrl,
      MESSAGE: message,
    });
    await this.send({ to: email, subject, text, html });
  }

  /**
   * Sends signup notification.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  async sendSignupNotification(payload: {
    emails: string[];
    storeName: string;
    ownerName: string;
    ownerEmail: string;
    slug: string;
    createdAt: Date;
    acquisitionAttribution?: Record<string, unknown> | null;
  }) {
    if (!payload.emails.length) return;
    const subject = 'Novo cadastro - Jano Caminho';
    const attribution = payload.acquisitionAttribution && typeof payload.acquisitionAttribution === 'object'
      ? payload.acquisitionAttribution
      : null;
    const attributionLines = attribution
      ? [
          `Origem: ${String(attribution.utm_source || 'direto')}`,
          `Meio: ${String(attribution.utm_medium || '-')}`,
          `Campanha: ${String(attribution.utm_campaign || '-')}`,
          `Landing: ${String(attribution.landingPath || '-')}`,
          `Referrer: ${String(attribution.referrer || '-')}`,
          `gclid: ${String(attribution.gclid || '-')}`,
          `fbclid: ${String(attribution.fbclid || '-')}`,
        ]
      : [ 'Origem: não informada' ];
    const text = [
      'Novo cadastro recebido.',
      `Loja: ${payload.storeName}`,
      `Slug: ${payload.slug}`,
      `Cliente: ${payload.ownerName} (${payload.ownerEmail})`,
      `Criado em: ${payload.createdAt.toISOString()}`,
      '',
      ...attributionLines,
    ].join('\n');
    const attributionHtml = attribution
      ? `
          <li><strong>Origem:</strong> ${String(attribution.utm_source || 'direto')}</li>
          <li><strong>Meio:</strong> ${String(attribution.utm_medium || '-')}</li>
          <li><strong>Campanha:</strong> ${String(attribution.utm_campaign || '-')}</li>
          <li><strong>Landing:</strong> ${String(attribution.landingPath || '-')}</li>
          <li><strong>Referrer:</strong> ${String(attribution.referrer || '-')}</li>
          <li><strong>gclid:</strong> ${String(attribution.gclid || '-')}</li>
          <li><strong>fbclid:</strong> ${String(attribution.fbclid || '-')}</li>
        `
      : '<li><strong>Origem:</strong> não informada</li>';
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
          <h2 style="margin: 0 0 8px; color: #0f172a;">Novo cadastro</h2>
          <p style="margin: 0 0 12px; color: #475569;">Um novo cliente criou loja na plataforma.</p>
          <ul style="padding-left: 18px; margin: 0; color: #0f172a;">
            <li><strong>Loja:</strong> ${payload.storeName}</li>
            <li><strong>Slug:</strong> ${payload.slug}</li>
            <li><strong>Cliente:</strong> ${payload.ownerName} (${payload.ownerEmail})</li>
            <li><strong>Criado em:</strong> ${payload.createdAt.toISOString()}</li>
            ${attributionHtml}
          </ul>
        </div>
      </div>
    `;
    await Promise.all(
      payload.emails.map((email) => this.send({ to: email, subject, text, html }))
    );
  }
}
