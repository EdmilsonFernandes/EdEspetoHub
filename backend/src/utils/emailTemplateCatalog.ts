export type EmailTemplateCategory = 'transactional' | 'security' | 'account' | 'marketing' | 'internal';

export type EmailTemplateDefinition = {
  key: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  subject: string;
  preheader: string;
  textBody: string;
  htmlBody: string;
  variables: string[];
  allowUnsubscribe?: boolean;
  legacySettingPrefix?: string;
};

const codeBox = (variable = 'CODE') => `
  <div style="margin: 22px 0; padding: 18px; border-radius: 24px; background: linear-gradient(135deg, rgba(15,59,83,0.08) 0%, rgba(45,212,191,0.12) 100%); border: 1px solid rgba(45,212,191,0.22); overflow: hidden;">
    <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: #0f3b53; opacity: 0.78;">Codigo</div>
    <div style="margin-top: 10px; font-family: Arial, Helvetica, sans-serif; font-size: 34px; line-height: 1; letter-spacing: 0.16em; font-weight: 900; color: #0f172a; white-space: nowrap; word-break: keep-all; user-select: all;">{{${variable}}}</div>
    <div style="margin-top: 10px; color: #64748b; font-size: 12px; line-height: 1.6;">Copie os numeros juntos, sem espacos.</div>
  </div>
`;

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: 'password_reset',
    name: 'Redefinir senha',
    category: 'security',
    description: 'Enviado quando usuario pede redefinicao de senha.',
    subject: 'Redefinir senha - Já no Caminho',
    preheader: 'Use o link seguro para criar uma nova senha.',
    variables: ['LINK', 'APP_URL'],
    legacySettingPrefix: 'email_templates.password_reset',
    textBody: 'Recebemos seu pedido para redefinir a senha.\n\nAbra este link para continuar: {{LINK}}\n\nSe não foi você, ignore este e-mail.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Redefinir senha</h1>
      <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">Recebemos uma solicitação para alterar sua senha. Use o botão abaixo para continuar com segurança.</p>
      <a href="{{LINK}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Redefinir senha</a>
      <p style="margin: 20px 0 0; color: #64748b; font-size: 12px; line-height: 1.7;">Se você não pediu essa alteração, ignore este e-mail.</p>
    `,
  },
  {
    key: 'password_reset_code',
    name: 'Redefinir senha por código',
    category: 'security',
    description: 'Enviado quando usuario pede redefinicao de senha pelo app usando codigo curto.',
    subject: 'Código para redefinir sua senha - Já no Caminho',
    preheader: 'Digite o código no app para criar uma nova senha.',
    variables: ['CODE', 'LINK', 'APP_URL', 'EXPIRES_MINUTES'],
    textBody: 'Recebemos seu pedido para redefinir a senha.\n\nCódigo: {{CODE}}\n\nCopie os 6 números juntos, sem espaços. O código expira em {{EXPIRES_MINUTES}} minutos.\nSe preferir, abra este link seguro: {{LINK}}\n\nSe não foi você, ignore este e-mail.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Redefinir senha</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Digite este código no app para confirmar que o e-mail é seu e criar uma nova senha.</p>
      ${codeBox()}
      <p style="margin: 0 0 20px; color: #64748b; font-size: 13px; line-height: 1.7;">Copie os <strong>6 números juntos</strong>. O código expira em <strong>{{EXPIRES_MINUTES}} minutos</strong>. Se estiver usando o navegador, você também pode continuar pelo botão abaixo.</p>
      <a href="{{LINK}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Abrir recuperação segura</a>
      <p style="margin: 20px 0 0; color: #64748b; font-size: 12px; line-height: 1.7;">Se você não pediu essa alteração, ignore este e-mail.</p>
    `,
  },
  {
    key: 'store_verification',
    name: 'Confirmar e-mail da loja por link',
    category: 'transactional',
    description: 'Ativacao antiga por link/token para lojista.',
    subject: 'Verifique seu e-mail - Já no Caminho',
    preheader: 'Confirme seu e-mail para liberar sua loja.',
    variables: ['LINK', 'TOKEN', 'APP_URL'],
    legacySettingPrefix: 'email_templates.store_verification',
    textBody: 'Para ativar sua conta, confirme seu e-mail neste link: {{LINK}}\n\nCódigo de ativação: {{TOKEN}}\n\nSe não foi você, ignore este e-mail.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Confirme seu e-mail</h1>
      <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">Esse passo protege sua conta e libera a continuidade do cadastro da loja.</p>
      <a href="{{LINK}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Confirmar e-mail</a>
      <p style="margin: 20px 0 8px; color: #0f172a; font-size: 12px; font-weight: 800;">Token de ativação</p>
      <div style="word-break: break-all; border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 14px; padding: 12px; color: #0f172a; font-family: monospace;">{{TOKEN}}</div>
    `,
  },
  {
    key: 'motoboy_verification',
    name: 'Confirmar e-mail do entregador',
    category: 'transactional',
    description: 'Ativacao de cadastro de entregador independente.',
    subject: 'Confirme seu e-mail de entregador - Já no Caminho',
    preheader: 'Confirme seu cadastro para receber solicitacoes das lojas.',
    variables: ['LINK', 'TOKEN', 'LOGIN_URL'],
    legacySettingPrefix: 'email_templates.motoboy_verification',
    textBody: 'Confirme seu e-mail para ativar sua conta de entregador.\nLink: {{LINK}}\nCódigo: {{TOKEN}}\nDepois, acesse: {{LOGIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Ative seu cadastro de entregador</h1>
      <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">Confirme seu e-mail para receber solicitações das lojas no Já no Caminho.</p>
      <a href="{{LINK}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Confirmar e-mail</a>
      <p style="margin: 20px 0 8px; color: #0f172a; font-size: 12px; font-weight: 800;">Token</p>
      <div style="word-break: break-all; border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 14px; padding: 12px; color: #0f172a; font-family: monospace;">{{TOKEN}}</div>
      <p style="margin: 18px 0 0; color: #64748b; font-size: 12px;">Depois de confirmar, acesse: {{LOGIN_URL}}</p>
    `,
  },
  {
    key: 'activation',
    name: 'Loja ativa',
    category: 'account',
    description: 'Pagamento aprovado e loja liberada.',
    subject: 'Sua loja está ativa - Já no Caminho',
    preheader: 'Sua loja está pronta para vender.',
    variables: ['ADMIN_URL', 'STORE_URL', 'SLUG'],
    legacySettingPrefix: 'email_templates.activation',
    textBody: 'Pagamento aprovado!\n\nAcesse o painel: {{ADMIN_URL}}\nSlug da loja: {{SLUG}}\nVitrine: {{STORE_URL}}\n\nUse a senha criada no cadastro para entrar.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Sua loja está ativa</h1>
      <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">Pagamento aprovado. Sua operação já pode receber pedidos pelo Já no Caminho.</p>
      <div style="margin: 0 0 18px; padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a;"><strong>Slug:</strong> {{SLUG}}</div>
      <a href="{{ADMIN_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Acessar painel</a>
      <a href="{{STORE_URL}}" style="display: inline-block; margin-left: 8px; padding: 13px 18px; border-radius: 14px; background: #eef6f8; color: #153A4C; text-decoration: none; font-weight: 800;">Ver vitrine</a>
    `,
  },
  {
    key: 'customer_welcome',
    name: 'Boas-vindas do cliente',
    category: 'account',
    description: 'Cadastro de cliente concluido.',
    subject: 'Cadastro concluído - Já no Caminho',
    preheader: 'Sua conta foi criada com sucesso.',
    variables: ['NAME', 'APP_URL'],
    legacySettingPrefix: 'email_templates.customer_welcome',
    textBody: 'Olá, {{NAME}}!\n\nSeu cadastro foi concluído com sucesso.\nAcesse: {{APP_URL}}\n\nBoas compras!',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Bem-vindo ao Já no Caminho</h1>
      <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{NAME}}. Sua conta foi criada com sucesso.</p>
      <a href="{{APP_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Abrir app</a>
    `,
  },
  {
    key: 'customer_verification',
    name: 'Código de verificação do cliente',
    category: 'security',
    description: 'OTP de 4 digitos para confirmar e-mail do cliente.',
    subject: 'Seu código de acesso - Já no Caminho',
    preheader: 'Use este código no app para confirmar seu e-mail.',
    variables: ['NAME', 'CODE', 'CODE_SPACED', 'APP_URL'],
    legacySettingPrefix: 'email_templates.customer_verification',
    textBody: 'Olá, {{NAME}}!\n\nUse este código para confirmar seu e-mail no app: {{CODE}}\n\nO código expira em 30 minutos.\nSe não foi você, ignore este e-mail.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Seu acesso começa aqui</h1>
      <p style="margin: 0 0 10px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{NAME}}. Digite o código abaixo no app para concluir sua conta com segurança.</p>
      ${codeBox()}
      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.7;">O código expira em 30 minutos. Se você não iniciou esse cadastro, ignore este e-mail.</p>
    `,
  },
  {
    key: 'customer_order_status_update',
    name: 'Atualização de pedido do cliente',
    category: 'transactional',
    description: 'Fallback por e-mail quando cliente web não tem push ativo para acompanhar mudanças de status do pedido.',
    subject: '{{STATUS_LABEL}} - Pedido {{ORDER_DISPLAY_ID}}',
    preheader: '{{STORE_NAME}} atualizou seu pedido.',
    variables: ['CUSTOMER_NAME', 'STORE_NAME', 'ORDER_DISPLAY_ID', 'STATUS_LABEL', 'STATUS_MESSAGE', 'ORDER_URL'],
    textBody: 'Olá, {{CUSTOMER_NAME}}.\n\n{{STATUS_MESSAGE}}\n\nLoja: {{STORE_NAME}}\nPedido: {{ORDER_DISPLAY_ID}}\n\nAcompanhe aqui: {{ORDER_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">{{STATUS_LABEL}}</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{CUSTOMER_NAME}}. {{STATUS_MESSAGE}}</p>
      <div style="margin: 0 0 20px; padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Loja:</strong> {{STORE_NAME}}</div>
        <div><strong>Pedido:</strong> {{ORDER_DISPLAY_ID}}</div>
      </div>
      <a href="{{ORDER_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Acompanhar pedido</a>
      <p style="margin: 18px 0 0; color: #64748b; font-size: 12px; line-height: 1.7;">Você recebeu este aviso porque este pedido foi feito pela web e não há push ativo neste navegador.</p>
    `,
  },
  {
    key: 'store_verification_code',
    name: 'Código de ativação da loja',
    category: 'security',
    description: 'OTP de 4 digitos para confirmar e-mail do lojista.',
    subject: 'Código para ativar sua loja - Já no Caminho',
    preheader: 'Use este código para ativar sua loja.',
    variables: ['NAME', 'CODE', 'CODE_SPACED', 'APP_URL'],
    legacySettingPrefix: 'email_templates.store_verification_code',
    textBody: 'Olá, {{NAME}}!\n\nUse este código para confirmar seu e-mail e ativar sua loja: {{CODE}}\n\nO código expira em 30 minutos.\nSe não foi você, ignore este e-mail.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Sua loja está quase pronta</h1>
      <p style="margin: 0 0 10px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{NAME}}. Use o código abaixo para validar seu e-mail de lojista.</p>
      ${codeBox()}
      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.7;">O código expira em 30 minutos. A loja não será ativada sem ele.</p>
    `,
  },
  {
    key: 'subscription_reminder',
    name: 'Lembrete de assinatura',
    category: 'account',
    description: 'Aviso de assinatura perto do vencimento.',
    subject: 'Sua assinatura expira em {{DAYS_LEFT}} dia(s) - Já no Caminho',
    preheader: 'Renove para manter sua loja ativa.',
    variables: ['STORE_NAME', 'DAYS_LEFT', 'MESSAGE', 'ADMIN_URL', 'STORE_URL'],
    legacySettingPrefix: 'email_templates.subscription_reminder',
    textBody: 'Olá! A assinatura da loja {{STORE_NAME}} expira em {{DAYS_LEFT}} dia(s).\n{{MESSAGE}}\nAcesse: {{ADMIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Assinatura prestes a expirar</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Loja: <strong>{{STORE_NAME}}</strong></p>
      <div style="margin: 0 0 20px; padding: 16px; border-radius: 18px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412;">{{MESSAGE}}</div>
      <a href="{{ADMIN_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Renovar assinatura</a>
    `,
  },
  {
    key: 'payment_pending',
    name: 'Pagamento pendente',
    category: 'account',
    description: 'Cadastro de loja aguardando pagamento.',
    subject: 'Pagamento pendente - Já no Caminho',
    preheader: 'Finalize para liberar sua loja.',
    variables: ['PAYMENT_URL', 'PROVIDER_URL', 'METHOD_LABEL', 'AMOUNT', 'PAYMENT_NOTE', 'QR_BLOCK', 'PROVIDER_LINK_BLOCK'],
    textBody: 'Recebemos seu cadastro e o pagamento está pendente.\nForma: {{METHOD_LABEL}}\nValor: {{AMOUNT}}\nAcesse o pagamento: {{PAYMENT_URL}}\n{{PAYMENT_NOTE}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Pagamento pendente</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Recebemos seu cadastro. Assim que o pagamento for confirmado, sua loja será liberada automaticamente.</p>
      <div style="margin: 0 0 18px; padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Forma:</strong> {{METHOD_LABEL}}</div>
        <div><strong>Valor:</strong> {{AMOUNT}}</div>
      </div>
      <a href="{{PAYMENT_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Acessar pagamento</a>
      {{{PROVIDER_LINK_BLOCK}}}
      {{{QR_BLOCK}}}
      <p style="margin: 18px 0 0; color: #64748b; font-size: 12px; line-height: 1.7;">{{PAYMENT_NOTE}}</p>
    `,
  },
  {
    key: 'signup_notification',
    name: 'Notificação interna de cadastro',
    category: 'internal',
    description: 'Aviso interno para novos cadastros.',
    subject: '{{TYPE_LABEL}} - Já no Caminho',
    preheader: 'Novo cadastro registrado na plataforma.',
    variables: ['TYPE_LABEL', 'OWNER_NAME', 'OWNER_EMAIL', 'EXTRA_LINES', 'ATTR_LINES', 'EXTRA_HTML', 'ATTR_HTML', 'CREATED_AT'],
    textBody: 'Novo cadastro: {{TYPE_LABEL}}\nNome: {{OWNER_NAME}}\nEmail: {{OWNER_EMAIL}}\nCriado em: {{CREATED_AT}}\n{{EXTRA_LINES}}\n{{ATTR_LINES}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">{{TYPE_LABEL}}</h1>
      <div style="padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Nome:</strong> {{OWNER_NAME}}</div>
        <div><strong>Email:</strong> {{OWNER_EMAIL}}</div>
        <div><strong>Criado em:</strong> {{CREATED_AT}}</div>
        {{{EXTRA_HTML}}}
        {{{ATTR_HTML}}}
      </div>
    `,
  },
  {
    key: 'customer_security_block_alert',
    name: 'Alerta de bloqueio de cliente',
    category: 'internal',
    description: 'Aviso interno de bloqueio de segurança do cliente.',
    subject: 'Bloqueio de segurança - cliente {{EMAIL_OR_NAME}}',
    preheader: 'Cliente entrou em bloqueio de segurança.',
    variables: ['EMAIL_OR_NAME', 'FULL_NAME', 'EMAIL', 'PHONE', 'BLOCK_TYPE', 'SEVERITY', 'BLOCKED_AT', 'BLOCKED_UNTIL', 'REASON', 'METADATA'],
    textBody: 'Um cliente entrou em bloqueio de segurança.\nNome: {{FULL_NAME}}\nE-mail: {{EMAIL}}\nTelefone: {{PHONE}}\nTipo: {{BLOCK_TYPE}}\nSeveridade: {{SEVERITY}}\nMotivo: {{REASON}}\n{{METADATA}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">Cliente bloqueado para revisão</h1>
      <div style="padding: 16px; border-radius: 18px; background: #fff1f2; border: 1px solid #fecdd3; color: #0f172a; line-height: 1.8;">
        <div><strong>Nome:</strong> {{FULL_NAME}}</div>
        <div><strong>E-mail:</strong> {{EMAIL}}</div>
        <div><strong>Telefone:</strong> {{PHONE}}</div>
        <div><strong>Tipo:</strong> {{BLOCK_TYPE}}</div>
        <div><strong>Severidade:</strong> {{SEVERITY}}</div>
        <div><strong>Bloqueado em:</strong> {{BLOCKED_AT}}</div>
        <div><strong>Bloqueado até:</strong> {{BLOCKED_UNTIL}}</div>
      </div>
      <pre style="margin: 18px 0 0; padding: 14px; border-radius: 14px; background: #0f172a; color: #e2e8f0; font-size: 12px; white-space: pre-wrap;">{{METADATA}}</pre>
    `,
  },
  {
    key: 'condominium_access_request',
    name: 'Solicitação de condomínio',
    category: 'internal',
    description: 'Aviso interno de nova solicitação de acesso de condomínio.',
    subject: 'Nova solicitação de condomínio - {{CONDOMINIUM_NAME}}',
    preheader: 'Responsável solicitou acesso ao painel.',
    variables: ['CONDOMINIUM_NAME', 'RESPONSIBLE_NAME', 'RESPONSIBLE_ROLE', 'RESPONSIBLE_EMAIL', 'RESPONSIBLE_PHONE', 'LOCATION', 'ADMIN_URL'],
    textBody: 'Nova solicitação de acesso de condomínio.\nCondomínio: {{CONDOMINIUM_NAME}}\nResponsável: {{RESPONSIBLE_NAME}}\nE-mail: {{RESPONSIBLE_EMAIL}}\nWhatsApp: {{RESPONSIBLE_PHONE}}\nLocal: {{LOCATION}}\nAnalisar: {{ADMIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">Nova solicitação de acesso</h1>
      <div style="padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Condomínio:</strong> {{CONDOMINIUM_NAME}}</div>
        <div><strong>Responsável:</strong> {{RESPONSIBLE_NAME}}</div>
        <div><strong>Cargo:</strong> {{RESPONSIBLE_ROLE}}</div>
        <div><strong>E-mail:</strong> {{RESPONSIBLE_EMAIL}}</div>
        <div><strong>WhatsApp:</strong> {{RESPONSIBLE_PHONE}}</div>
        <div><strong>Local:</strong> {{LOCATION}}</div>
      </div>
      <a href="{{ADMIN_URL}}" style="display: inline-block; margin-top: 18px; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Analisar solicitação</a>
    `,
  },
  {
    key: 'destination_partner_request_notification',
    name: 'Solicitação de parceiro de destinos',
    category: 'internal',
    description: 'Aviso interno quando chalé, pousada, serviço ou restaurante solicita entrada em destinos.',
    subject: 'Nova solicitação em destinos - {{RESOURCE_NAME}}',
    preheader: 'Parceiro pediu análise no Já no Caminho.',
    variables: ['REQUEST_TYPE_LABEL', 'RESOURCE_NAME', 'DESTINATION_NAME', 'RESPONSIBLE_NAME', 'RESPONSIBLE_EMAIL', 'RESPONSIBLE_PHONE', 'LOCATION', 'MESSAGE', 'ADMIN_URL'],
    textBody: 'Nova solicitação em destinos.\nTipo: {{REQUEST_TYPE_LABEL}}\nNome: {{RESOURCE_NAME}}\nDestino: {{DESTINATION_NAME}}\nResponsável: {{RESPONSIBLE_NAME}}\nE-mail: {{RESPONSIBLE_EMAIL}}\nWhatsApp: {{RESPONSIBLE_PHONE}}\nLocal: {{LOCATION}}\nMensagem: {{MESSAGE}}\nAnalisar: {{ADMIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">Nova solicitação em destinos</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Um parceiro pediu para aparecer no Já no Caminho. Revise os dados no Super Admin antes de aprovar.</p>
      <div style="padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Tipo:</strong> {{REQUEST_TYPE_LABEL}}</div>
        <div><strong>Nome:</strong> {{RESOURCE_NAME}}</div>
        <div><strong>Destino:</strong> {{DESTINATION_NAME}}</div>
        <div><strong>Responsável:</strong> {{RESPONSIBLE_NAME}}</div>
        <div><strong>E-mail:</strong> {{RESPONSIBLE_EMAIL}}</div>
        <div><strong>WhatsApp:</strong> {{RESPONSIBLE_PHONE}}</div>
        <div><strong>Local:</strong> {{LOCATION}}</div>
      </div>
      <div style="margin-top: 14px; padding: 14px; border-radius: 16px; background: #eef6f8; border: 1px solid rgba(51,104,134,0.16); color: #153A4C; line-height: 1.7;">
        <strong>Mensagem:</strong> {{MESSAGE}}
      </div>
      <a href="{{ADMIN_URL}}" style="display: inline-block; margin-top: 18px; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Analisar no Super Admin</a>
    `,
  },
  {
    key: 'condominium_access_credentials',
    name: 'Credenciais de condomínio',
    category: 'security',
    description: 'Acesso liberado ao painel do condomínio.',
    subject: 'Acesso liberado - {{CONDOMINIUM_NAME}}',
    preheader: 'Dados temporários de acesso ao painel.',
    variables: ['RESPONSIBLE_NAME', 'CONDOMINIUM_NAME', 'USERNAME', 'TEMPORARY_PASSWORD', 'LOGIN_URL'],
    textBody: 'Olá, {{RESPONSIBLE_NAME}}.\n\nO acesso do condomínio {{CONDOMINIUM_NAME}} foi liberado.\nLogin: {{LOGIN_URL}}\nUsuário: {{USERNAME}}\nSenha temporária: {{TEMPORARY_PASSWORD}}\n\nGuarde estes dados com segurança.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">Painel do condomínio liberado</h1>
      <p style="margin: 0 0 18px; color: #475569;">Olá, {{RESPONSIBLE_NAME}}. O acesso do condomínio <strong>{{CONDOMINIUM_NAME}}</strong> foi liberado.</p>
      <div style="padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Usuário:</strong> {{USERNAME}}</div>
        <div><strong>Senha temporária:</strong> {{TEMPORARY_PASSWORD}}</div>
      </div>
      <a href="{{LOGIN_URL}}" style="display: inline-block; margin-top: 18px; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Entrar no painel</a>
    `,
  },
  {
    key: 'motoboy_store_access_credentials',
    name: 'Credenciais de entregador criado pela loja',
    category: 'security',
    description: 'Conta de entregador criada pela loja.',
    subject: 'Acesso liberado - {{STORE_NAME}}',
    preheader: 'Dados temporários para acessar como entregador.',
    variables: ['FULL_NAME', 'STORE_NAME', 'USERNAME', 'TEMPORARY_PASSWORD', 'LOGIN_URL'],
    textBody: 'Olá, {{FULL_NAME}}.\n\nA loja {{STORE_NAME}} criou seu acesso de entregador.\nLogin: {{LOGIN_URL}}\nUsuário: {{USERNAME}}\nSenha temporária: {{TEMPORARY_PASSWORD}}\n\nNo primeiro acesso, troque sua senha.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">Conta de entregador criada</h1>
      <p style="margin: 0 0 18px; color: #475569;">Olá, {{FULL_NAME}}. A loja <strong>{{STORE_NAME}}</strong> criou seu acesso de entregador.</p>
      <div style="padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.8;">
        <div><strong>Usuário:</strong> {{USERNAME}}</div>
        <div><strong>Senha temporária:</strong> {{TEMPORARY_PASSWORD}}</div>
      </div>
      <a href="{{LOGIN_URL}}" style="display: inline-block; margin-top: 18px; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Entrar como entregador</a>
    `,
  },
  {
    key: 'destination_partner_invite',
    name: 'Convite do parceiro de destinos',
    category: 'account',
    description: 'Enviado quando uma solicitação de chalé, pousada, serviço ou restaurante é aprovada.',
    subject: 'Seu acesso de parceiro foi liberado - Já no Caminho',
    preheader: 'Crie sua senha para atualizar fotos, contatos e informações do seu cadastro.',
    variables: ['PARTNER_NAME', 'RESOURCE_NAME', 'ACTIVATION_URL', 'LOGIN_URL'],
    textBody: 'Olá, {{PARTNER_NAME}}.\n\nSeu acesso para gerenciar {{RESOURCE_NAME}} foi liberado no Já no Caminho.\n\nCrie sua senha neste link: {{ACTIVATION_URL}}\n\nDepois, acesse: {{LOGIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Seu acesso de parceiro foi liberado</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{PARTNER_NAME}}. Agora você pode manter <strong>{{RESOURCE_NAME}}</strong> atualizado no Já no Caminho.</p>
      <div style="margin: 0 0 20px; padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; line-height: 1.7;">
        Atualize fotos, descrição, WhatsApp, Instagram, endereço e instruções úteis para o cliente encontrar você.
      </div>
      <a href="{{ACTIVATION_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Criar minha senha</a>
      <p style="margin: 18px 0 0; color: #64748b; font-size: 12px; line-height: 1.7;">Depois da ativação, acesse o portal em: {{LOGIN_URL}}</p>
    `,
  },
  {
    key: 'destination_store_claim_pending',
    name: 'Loja aguardando análise para assumir serviço',
    category: 'account',
    description: 'Enviado ao lojista quando a loja confirma e-mail e a conversão de serviço em loja fica pendente no Super Admin.',
    subject: 'Recebemos sua solicitação - {{LISTING_NAME}}',
    preheader: 'Sua loja foi confirmada e agora passa por análise de posse.',
    variables: ['RESPONSIBLE_NAME', 'STORE_NAME', 'LISTING_NAME', 'DESTINATION_NAME', 'PLACE_NAMES', 'SUPPORT_EMAIL'],
    textBody: 'Olá, {{RESPONSIBLE_NAME}}.\n\nRecebemos a solicitação da loja {{STORE_NAME}} para assumir {{LISTING_NAME}} em {{DESTINATION_NAME}}.\n\nHospedagens informadas: {{PLACE_NAMES}}\n\nA equipe Já no Caminho vai validar a titularidade antes de liberar o acesso da loja. Você receberá um novo e-mail quando a análise for aprovada ou se precisarmos ajustar alguma informação.\n\nDúvidas: {{SUPPORT_EMAIL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Solicitação recebida</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{RESPONSIBLE_NAME}}. Confirmamos o e-mail da loja <strong>{{STORE_NAME}}</strong> e recebemos sua solicitação para assumir <strong>{{LISTING_NAME}}</strong> em <strong>{{DESTINATION_NAME}}</strong>.</p>
      <div style="margin: 0 0 16px; padding: 16px; border-radius: 18px; background: #eef6f8; border: 1px solid rgba(51,104,134,0.16); color: #153A4C; line-height: 1.7;">
        <strong>Hospedagens informadas:</strong><br />{{PLACE_NAMES}}
      </div>
      <div style="margin: 0 0 18px; padding: 16px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; line-height: 1.7;">
        Para proteger os parceiros do destino, a equipe Já no Caminho valida a titularidade antes de liberar o acesso da loja. Você receberá um novo e-mail quando a análise for aprovada ou se precisarmos ajustar alguma informação.
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.7;">Dúvidas? Responda este e-mail ou fale com {{SUPPORT_EMAIL}}.</p>
    `,
  },
  {
    key: 'destination_store_claim_approved',
    name: 'Loja aprovada para assumir serviço',
    category: 'account',
    description: 'Enviado ao lojista quando o Super Admin aprova a conversão de serviço de destino em loja.',
    subject: 'Sua loja foi aprovada em {{DESTINATION_NAME}} - Já no Caminho',
    preheader: 'O perfil {{LISTING_NAME}} agora está vinculado à sua loja.',
    variables: ['RESPONSIBLE_NAME', 'STORE_NAME', 'LISTING_NAME', 'DESTINATION_NAME', 'PLACE_NAMES', 'ADMIN_URL'],
    textBody: 'Olá, {{RESPONSIBLE_NAME}}.\n\nA loja {{STORE_NAME}} foi aprovada para assumir {{LISTING_NAME}} em {{DESTINATION_NAME}}.\n\nHospedagens vinculadas: {{PLACE_NAMES}}\n\nAcesse o painel da loja: {{ADMIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Loja aprovada</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{RESPONSIBLE_NAME}}. A loja <strong>{{STORE_NAME}}</strong> foi aprovada para assumir <strong>{{LISTING_NAME}}</strong> em <strong>{{DESTINATION_NAME}}</strong>.</p>
      <div style="margin: 0 0 20px; padding: 16px; border-radius: 18px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d; line-height: 1.7;">
        <strong>Hospedagens vinculadas:</strong><br />{{PLACE_NAMES}}
      </div>
      <a href="{{ADMIN_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">Abrir painel da loja</a>
    `,
  },
  {
    key: 'destination_store_claim_rejected',
    name: 'Loja recusada para assumir serviço',
    category: 'account',
    description: 'Enviado ao lojista quando o Super Admin recusa a conversão de serviço de destino em loja.',
    subject: 'Sua solicitação precisa de ajuste - Já no Caminho',
    preheader: 'A solicitação para assumir {{LISTING_NAME}} foi analisada.',
    variables: ['RESPONSIBLE_NAME', 'STORE_NAME', 'LISTING_NAME', 'DESTINATION_NAME', 'REVIEW_NOTE', 'SUPPORT_EMAIL'],
    textBody: 'Olá, {{RESPONSIBLE_NAME}}.\n\nA solicitação da loja {{STORE_NAME}} para assumir {{LISTING_NAME}} em {{DESTINATION_NAME}} foi recusada.\n\nMotivo informado: {{REVIEW_NOTE}}\n\nSe achar que houve engano, responda este e-mail ou fale com {{SUPPORT_EMAIL}}.',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Solicitação analisada</h1>
      <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{RESPONSIBLE_NAME}}. A solicitação da loja <strong>{{STORE_NAME}}</strong> para assumir <strong>{{LISTING_NAME}}</strong> em <strong>{{DESTINATION_NAME}}</strong> foi recusada.</p>
      <div style="margin: 0 0 20px; padding: 16px; border-radius: 18px; background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; line-height: 1.7;">
        <strong>Motivo informado:</strong><br />{{REVIEW_NOTE}}
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.7;">Se achar que houve engano, responda este e-mail ou fale com {{SUPPORT_EMAIL}}.</p>
    `,
  },
  {
    key: 'store_delivery_code_lock_alert',
    name: 'Alerta de código de entrega bloqueado',
    category: 'security',
    description: 'Aviso para loja quando o codigo de entrega falha varias vezes.',
    subject: 'Alerta de segurança na entrega - {{STORE_NAME}}',
    preheader: 'Entrega precisa de atenção manual.',
    variables: ['STORE_NAME', 'ORDER_DISPLAY_ID', 'CUSTOMER_NAME', 'MOTOBOY_NAME', 'ATTEMPTS', 'ADMIN_URL'],
    textBody: 'A entrega {{ORDER_DISPLAY_ID}} foi bloqueada após {{ATTEMPTS}} tentativas inválidas do código.\nLoja: {{STORE_NAME}}\nCliente: {{CUSTOMER_NAME}}\nEntregador: {{MOTOBOY_NAME}}\nPainel: {{ADMIN_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 26px; color: #0f172a;">Código bloqueado após {{ATTEMPTS}} tentativas</h1>
      <p style="margin: 0 0 18px; color: #475569;">A entrega <strong>{{ORDER_DISPLAY_ID}}</strong> precisa de atenção manual antes da conclusão.</p>
      <div style="padding: 16px; border-radius: 18px; background: #fff1f2; border: 1px solid #fecdd3; color: #0f172a; line-height: 1.8;">
        <div><strong>Loja:</strong> {{STORE_NAME}}</div>
        <div><strong>Cliente:</strong> {{CUSTOMER_NAME}}</div>
        <div><strong>Entregador:</strong> {{MOTOBOY_NAME}}</div>
        <div><strong>Tentativas:</strong> {{ATTEMPTS}}</div>
      </div>
      <a href="{{ADMIN_URL}}" style="display: inline-block; margin-top: 18px; padding: 13px 18px; border-radius: 14px; background: #b91c1c; color: #ffffff; text-decoration: none; font-weight: 800;">Abrir fila da loja</a>
    `,
  },
  {
    key: 'marketing_invite',
    name: 'Convite comercial',
    category: 'marketing',
    description: 'Modelo base para campanhas e convites comerciais.',
    subject: 'Conheça o Já no Caminho',
    preheader: 'Uma plataforma para vender e atender melhor na sua região.',
    variables: ['NAME', 'CTA_URL', 'CTA_LABEL'],
    allowUnsubscribe: true,
    textBody: 'Olá, {{NAME}}.\n\nQuero te apresentar o Já no Caminho, uma plataforma para vender, receber pedidos e atender clientes da região.\n\nAcesse: {{CTA_URL}}',
    htmlBody: `
      <h1 style="margin: 0 0 10px; font-size: 28px; line-height: 1.12; color: #0f172a;">Venda mais perto do seu cliente</h1>
      <p style="margin: 0 0 22px; color: #475569; font-size: 15px; line-height: 1.7;">Olá, {{NAME}}. O Já no Caminho conecta lojas, serviços, chalés, condomínios e clientes da região em uma experiência simples e profissional.</p>
      <a href="{{CTA_URL}}" style="display: inline-block; padding: 13px 18px; border-radius: 14px; background: #153A4C; color: #ffffff; text-decoration: none; font-weight: 800;">{{CTA_LABEL}}</a>
    `,
  },
];

export const EMAIL_TEMPLATE_BY_KEY = new Map(DEFAULT_EMAIL_TEMPLATES.map((template) => [template.key, template]));

export const normalizeEmailTemplateCategory = (value?: string | null): EmailTemplateCategory => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['transactional', 'security', 'account', 'marketing', 'internal'].includes(normalized)) {
    return normalized as EmailTemplateCategory;
  }
  return 'transactional';
};

export const isSuppressibleEmailCategory = (category?: string | null) =>
  normalizeEmailTemplateCategory(category) === 'marketing';
