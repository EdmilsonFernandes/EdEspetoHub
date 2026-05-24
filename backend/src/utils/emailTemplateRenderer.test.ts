import { describe, expect, it } from 'vitest';
import { renderHtmlTemplate, renderPremiumEmailLayout, renderTextTemplate } from './emailTemplateRenderer';

describe('emailTemplateRenderer', () => {
  it('renders text variables and normalizes legacy branding', () => {
    const text = renderTextTemplate('Olá {{NAME}} - Chama no Espeto - {{LINK}}', {
      NAME: 'Cliente',
      LINK: 'https://janocaminho.com.br',
    });

    expect(text).toContain('Olá Cliente');
    expect(text).toContain('Já no Caminho');
    expect(text).toContain('https://janocaminho.com.br');
  });

  it('escapes regular html variables but keeps explicit raw blocks', () => {
    const html = renderHtmlTemplate('<p>{{NAME}}</p>{{{BUTTON}}}', {
      NAME: '<b>Cliente</b>',
      BUTTON: '<a href="https://janocaminho.com.br">Abrir</a>',
    });

    expect(html).toContain('&lt;b&gt;Cliente&lt;/b&gt;');
    expect(html).toContain('<a href="https://janocaminho.com.br">Abrir</a>');
  });

  it('adds unsubscribe only for marketing templates that allow it', () => {
    const rendered = renderPremiumEmailLayout({
      subject: 'Oferta para {{NAME}}',
      preheader: 'Preheader',
      textBody: 'Olá {{NAME}}',
      htmlBody: '<p>Olá {{NAME}}</p>',
      variables: { NAME: 'Cliente' },
      category: 'marketing',
      allowUnsubscribe: true,
      unsubscribeUrl: 'https://janocaminho.com.br/email/unsubscribe?token=abc',
    });

    expect(rendered.subject).toBe('Oferta para Cliente');
    expect(rendered.text).toContain('Cancelar comunicações comerciais');
    expect(rendered.html).toContain('cancele aqui');
  });

  it('does not add marketing unsubscribe to security emails', () => {
    const rendered = renderPremiumEmailLayout({
      subject: 'Código',
      textBody: 'Código {{CODE}}',
      htmlBody: '<p>Código {{CODE}}</p>',
      variables: { CODE: '1234' },
      category: 'security',
      allowUnsubscribe: true,
      unsubscribeUrl: 'https://janocaminho.com.br/email/unsubscribe?token=abc',
    });

    expect(rendered.text).toContain('Mensagem operacional ou de segurança');
    expect(rendered.html).not.toContain('cancele aqui');
  });
});
