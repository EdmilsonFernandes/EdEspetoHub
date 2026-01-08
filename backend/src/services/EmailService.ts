import nodemailer from 'nodemailer';
import { env } from '../config/env';

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export class EmailService {
  private transporter?: nodemailer.Transporter;
  private getLogoUrl() {
    const base = env.appUrl?.replace(/\/$/, '') || 'http://localhost:3000';
    return `${base}/chama-no-espeto.jpeg`;
  }

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

  async send(payload: EmailPayload) {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.log('📧 Email mock', JSON.stringify(payload, null, 2));
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

  async sendPasswordReset(email: string, link: string) {
    const subject = 'Redefinir senha - Chama no Espeto';
    const text = `Recebemos seu pedido para redefinir a senha.\n\nAbra este link para continuar: ${link}\n\nSe não foi você, ignore este e-mail.`;
    const logoUrl = this.getLogoUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <img src="${logoUrl}" alt="Chama no Espeto" style="width: 120px; height: auto; margin-bottom: 16px;" />
          <h2 style="margin: 0 0 8px; color: #0f172a;">Redefinir senha</h2>
          <p style="margin: 0 0 16px; color: #475569;">Recebemos seu pedido para redefinir a senha.</p>
          <a href="${link}" style="display: inline-block; padding: 10px 16px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Redefinir senha</a>
          <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Se não foi você, ignore este e-mail.</p>
        </div>
      </div>
    `;
    await this.send({ to: email, subject, text, html });
  }

  async sendEmailVerification(email: string, link: string) {
    const subject = 'Verifique seu e-mail - Chama no Espeto';
    const text = `Para ativar sua conta, confirme seu e-mail neste link: ${link}\n\nSe nao foi voce, ignore este e-mail.`;
    const logoUrl = this.getLogoUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);">
            <img src="${logoUrl}" alt="Chama no Espeto" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Confirme seu e-mail</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Ative sua conta para liberar sua loja</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px; color: #475569;">Clique no botao abaixo para ativar sua conta e continuar o pagamento.</p>
            <a href="${link}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Confirmar e-mail</a>
            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Se nao foi voce, ignore este e-mail.</p>
          </div>
        </div>
      </div>
    `;
    await this.send({ to: email, subject, text, html });
  }

  async sendActivationEmail(email: string, slug: string) {
    const adminUrl = `${env.appUrl}/admin`;
    const storeUrl = `${env.appUrl}/chamanoespeto/${slug}`;
    const subject = 'Sua loja está ativa - Chama no Espeto';
    const text = `Pagamento aprovado!\n\nAcesse o painel em: ${adminUrl}\nSlug da loja: ${slug}\nVitrine: ${storeUrl}\n\nUse a senha criada no cadastro para entrar.`;
    const logoUrl = this.getLogoUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <img src="${logoUrl}" alt="Chama no Espeto" style="width: 120px; height: auto; margin-bottom: 16px;" />
          <h2 style="margin: 0 0 8px; color: #0f172a;">Pagamento aprovado</h2>
          <p style="margin: 0 0 16px; color: #475569;">Sua loja está ativa e pronta para uso.</p>
          <div style="margin-bottom: 12px; color: #0f172a;">
            <strong>Slug da loja:</strong> ${slug}
          </div>
          <div style="margin-bottom: 12px;">
            <a href="${adminUrl}" style="color: #dc2626; font-weight: 600; text-decoration: none;">Acessar painel</a>
          </div>
          <div style="margin-bottom: 16px;">
            <a href="${storeUrl}" style="color: #dc2626; font-weight: 600; text-decoration: none;">Ver vitrine</a>
          </div>
          <p style="margin: 0; color: #64748b; font-size: 12px;">Use a senha criada no cadastro para entrar.</p>
        </div>
      </div>
    `;
    await this.send({ to: email, subject, text, html });
  }

  async sendSubscriptionReminder(email: string, storeName: string, slug: string, daysLeft: number) {
    const adminUrl = `${env.appUrl}/admin`;
    const storeUrl = `${env.appUrl}/chamanoespeto/${slug}`;
    const subject =
      daysLeft <= 0
        ? 'Sua assinatura expira hoje - Chama no Espeto'
        : `Sua assinatura expira em ${daysLeft} dia${daysLeft === 1 ? '' : 's'} - Chama no Espeto`;
    const text = [
      `Olá! A assinatura da loja ${storeName} expira em ${daysLeft <= 0 ? 'hoje' : `${daysLeft} dia(s)`}.`,
      'Acesse o painel para renovar e evitar interrupção no atendimento.',
      adminUrl,
    ].join('\n');
    const logoUrl = this.getLogoUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);">
            <img src="${logoUrl}" alt="Chama no Espeto" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Assinatura prestes a expirar</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Evite interrupções no atendimento</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 8px; color: #475569;">Loja: <strong>${storeName}</strong></p>
            <p style="margin: 0 0 16px; color: #475569;">
              ${daysLeft <= 0 ? 'Sua assinatura expira hoje. Renove agora para manter a loja ativa.' : `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'} para sua assinatura expirar.`}
            </p>
            <a href="${adminUrl}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Renovar assinatura</a>
            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Vitrine: ${storeUrl}</p>
          </div>
        </div>
      </div>
    `;
    await this.send({ to: email, subject, text, html });
  }

  async sendSignupNotification(payload: {
    emails: string[];
    storeName: string;
    ownerName: string;
    ownerEmail: string;
    slug: string;
    createdAt: Date;
  }) {
    if (!payload.emails.length) return;
    const subject = 'Novo cadastro - Chama no Espeto';
    const text = [
      'Novo cadastro recebido.',
      `Loja: ${payload.storeName}`,
      `Slug: ${payload.slug}`,
      `Cliente: ${payload.ownerName} (${payload.ownerEmail})`,
      `Criado em: ${payload.createdAt.toISOString()}`,
    ].join('\n');
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
          </ul>
        </div>
      </div>
    `;
    await Promise.all(
      payload.emails.map((email) => this.send({ to: email, subject, text, html }))
    );
  }
}
