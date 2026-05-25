import { describe, expect, it } from 'vitest';
import { DEFAULT_EMAIL_LOGO_PATH, renderHtmlTemplate, renderPremiumEmailLayout, renderTextTemplate, resolveEmailAssetUrl } from './emailTemplateRenderer';

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

  it('uses the official public jpg logo in the premium layout', () => {
    const rendered = renderPremiumEmailLayout({
      subject: 'Teste',
      textBody: 'Mensagem',
      htmlBody: '<p>Mensagem</p>',
    });

    expect(rendered.html).toContain(`src="https://janocaminho.com.br${DEFAULT_EMAIL_LOGO_PATH}"`);
    expect(rendered.html).not.toContain('janocaminho.png');
  });

  it('normalizes relative and legacy logo URLs to an absolute public asset', () => {
    expect(resolveEmailAssetUrl('/chama-no-espeto.jpeg')).toBe('https://janocaminho.com.br/janocaminho.jpg');
    expect(resolveEmailAssetUrl('janocaminho.jpg')).toBe('https://janocaminho.com.br/janocaminho.jpg');
  });
});
