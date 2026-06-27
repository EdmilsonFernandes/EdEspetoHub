import {
  Buildings,
  ChartBar,
  Compass,
  Cpu,
  CurrencyDollar,
  EnvelopeSimple,
  GitCommit,
  IdentificationCard,
  ImageSquare,
  Megaphone,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
  Storefront,
  TrendUp,
} from '@phosphor-icons/react';

export const SUPER_ADMIN_ACTIVE_SECTION_KEY = 'superadmin:activeSection';

export type SuperAdminNavigationItem = {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  group: string;
  icon: any;
  section?: string;
  route?: string;
  aliases?: string[];
};

export const SUPER_ADMIN_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Visão Geral',
    shortLabel: 'Resumo',
    subtitle: 'Saúde e direção da plataforma',
    icon: ChartBar,
  },
  {
    id: 'operation',
    label: 'Operação',
    shortLabel: 'Operação',
    subtitle: 'Lojas, receita e pagamentos',
    icon: Storefront,
  },
  {
    id: 'ecosystem',
    label: 'Ecossistema',
    shortLabel: 'Ecossistema',
    subtitle: 'Destinos, chalés e condomínios',
    icon: Compass,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    shortLabel: 'Marketing',
    subtitle: 'Push, banners e e-mails',
    icon: Megaphone,
  },
  {
    id: 'trust',
    label: 'Confiança',
    shortLabel: 'Confiança',
    subtitle: 'KYC, segurança e bloqueios',
    icon: ShieldCheck,
  },
  {
    id: 'technical',
    label: 'Técnico',
    shortLabel: 'Técnico',
    subtitle: 'Logs, eventos e versões',
    icon: Cpu,
  },
];

export const SUPER_ADMIN_NAV_ITEMS: SuperAdminNavigationItem[] = [
  {
    id: 'executive',
    label: 'Resumo executivo',
    shortLabel: 'Resumo',
    description: 'Indicadores, receita, operação e alertas da plataforma.',
    group: 'overview',
    icon: ChartBar,
    section: 'executive',
    route: '/superadmin',
    aliases: ['dashboard', 'inicio', 'resumo', 'visao geral'],
  },
  {
    id: 'rankings',
    label: 'Rankings',
    description: 'Lojas, vendas e performance comparativa.',
    group: 'overview',
    icon: TrendUp,
    section: 'rankings',
    route: '/superadmin',
    aliases: ['ranking', 'melhores lojas', 'performance'],
  },
  {
    id: 'stores',
    label: 'Lojas',
    description: 'Cadastro, status, VIP e operação de lojistas.',
    group: 'operation',
    icon: Storefront,
    section: 'stores',
    route: '/superadmin',
    aliases: ['lojistas', 'lojas cadastradas', 'vip'],
  },
  {
    id: 'payments',
    label: 'Pagamentos',
    description: 'Planos, cobranças, assinaturas e financeiro.',
    group: 'operation',
    icon: CurrencyDollar,
    section: 'payments',
    route: '/superadmin',
    aliases: ['financeiro', 'planos', 'assinatura', 'receita'],
  },
  {
    id: 'destinations',
    label: 'Destinos',
    description: 'Cidades turísticas, chalés, serviços e parceiros.',
    group: 'ecosystem',
    icon: Compass,
    route: '/superadmin/destinations',
    aliases: ['chales', 'pousadas', 'servicos locais', 'parceiros'],
  },
  {
    id: 'condominiums',
    label: 'Condomínios',
    description: 'Feiras, acessos, agendas e condomínios atendidos.',
    group: 'ecosystem',
    icon: Buildings,
    route: '/superadmin/condominiums',
    aliases: ['feiras', 'condominio', 'agenda'],
  },
  {
    id: 'home-config',
    label: 'Banners da Home',
    description: 'Banners, popup de marketing e vitrine inicial.',
    group: 'marketing',
    icon: ImageSquare,
    route: '/superadmin/home-config',
    aliases: ['home', 'banner', 'popup', 'configuracao da home'],
  },
  {
    id: 'push',
    label: 'Push',
    description: 'Notificações, promoções e histórico de disparos.',
    group: 'marketing',
    icon: Megaphone,
    section: 'push',
    route: '/superadmin',
    aliases: ['notificacao', 'notificacoes', 'campanha'],
  },
  {
    id: 'email-templates',
    label: 'E-mails',
    description: 'Templates, descadastro e logs de envio.',
    group: 'marketing',
    icon: EnvelopeSimple,
    route: '/superadmin/email-templates',
    aliases: ['email', 'template', 'unsubscribe', 'descadastro'],
  },
  {
    id: 'kyc',
    label: 'KYC entregadores',
    shortLabel: 'KYC',
    description: 'Documentos, análise e aprovação de motoboys.',
    group: 'trust',
    icon: IdentificationCard,
    section: 'kyc',
    route: '/superadmin',
    aliases: ['documentos', 'motoboy', 'entregadores'],
  },
  {
    id: 'security',
    label: 'Segurança',
    description: 'Clientes, bloqueios, risco e autenticação.',
    group: 'trust',
    icon: ShieldCheck,
    section: 'security',
    route: '/superadmin',
    aliases: ['bloqueios', 'mfa', 'fraude'],
  },
  {
    id: 'users',
    label: 'Usuários',
    description: 'Buscar usuários por email/ID e ver rotas acessadas.',
    group: 'trust',
    icon: IdentificationCard,
    section: 'users',
    route: '/superadmin',
    aliases: ['acessos', 'logs', 'rotas'],
  },
  {
    id: 'health',
    label: 'Saúde técnica',
    shortLabel: 'Saúde',
    description: 'Banco, conexões, memória e sinais de gargalo.',
    group: 'technical',
    icon: Cpu,
    section: 'health',
    route: '/superadmin',
    aliases: ['saude', 'cpu', 'memoria', 'banco', 'conexoes', 'performance'],
  },
  {
    id: 'logs',
    label: 'Logs',
    description: 'Acessos, auditoria e rastreamento operacional.',
    group: 'technical',
    icon: GitCommit,
    section: 'logs',
    route: '/superadmin',
    aliases: ['auditoria', 'acessos'],
  },
  {
    id: 'events',
    label: 'Eventos',
    description: 'Fila técnica, eventos internos e diagnóstico.',
    group: 'technical',
    icon: Sparkle,
    section: 'events',
    route: '/superadmin',
    aliases: ['fila', 'diagnostico'],
  },
  {
    id: 'versions',
    label: 'Versões',
    description: 'Build atual, commits e histórico de versões.',
    group: 'technical',
    icon: RocketLaunch,
    section: 'versions',
    route: '/superadmin',
    aliases: ['build', 'commit', 'codigo'],
  },
];

export const SUPER_ADMIN_DASHBOARD_SECTIONS = SUPER_ADMIN_NAV_ITEMS.filter((item) => item.section);

export const getSuperAdminGroup = (groupId: string) =>
  SUPER_ADMIN_NAV_GROUPS.find((group) => group.id === groupId);

export const isSuperAdminNavigationItemActive = (
  item: SuperAdminNavigationItem,
  path: string,
  activeSection: string
) => {
  if (item.route && item.route !== '/superadmin') return path.startsWith(item.route);
  if (item.section) return path === '/superadmin' && activeSection === item.section;
  return false;
};

export const normalizeSuperAdminSearch = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const filterSuperAdminNavigationItems = (query: string) => {
  const normalized = normalizeSuperAdminSearch(query);
  if (!normalized) return SUPER_ADMIN_NAV_ITEMS;
  return SUPER_ADMIN_NAV_ITEMS.filter((item) =>
    normalizeSuperAdminSearch([
      item.label,
      item.shortLabel,
      item.description,
      getSuperAdminGroup(item.group)?.label,
      ...(item.aliases || []),
    ].filter(Boolean).join(' ')).includes(normalized)
  );
};
