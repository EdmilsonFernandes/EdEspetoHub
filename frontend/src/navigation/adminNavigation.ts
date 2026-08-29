// Fonte única da navegação do painel admin (lojista/admin/operador).
// Antes disto cada página mantinha sua própria lista (AdminDashboard, AdminOrders,
// AdminQueue, AdminHighlights, AdminLayout) com labels, ícones e destinos divergentes.
// Padrão espelhado em ./superAdminNavigation.ts. Ver adminNavigation.test.ts para o
// inventário congelado (paridade "não perder nada" das 5 listas antigas).
import {
  Buildings,
  ChartBar,
  ChatCircle,
  CheckSquare,
  ClipboardText,
  Clock,
  Compass,
  CreditCard,
  DeviceMobile,
  ForkKnife,
  Gear,
  IdentificationCard,
  LockKey,
  Package,
  PlugsConnected,
  Printer,
  RocketLaunch,
  ShieldCheck,
  Scooter,
  SignOut,
  Sparkle,
  Stack,
  Star,
  Storefront,
  Ticket,
  Truck,
  UsersThree,
} from '@phosphor-icons/react';

export type AdminRole = 'ADMIN' | 'LOJISTA' | 'OPERATOR';
export type AdminNavSurface = 'sidebar' | 'drawer' | 'bottom' | 'palette' | 'account';
export type AdminNavGroupId =
  | 'operacao'
  | 'loja'
  | 'crescer'
  | 'financeiro'
  | 'equipe'
  | 'ajustes'
  | 'conta';

export type AdminNavAction =
  | { type: 'tab'; tab: string }
  | { type: 'route'; to: string; state?: Record<string, unknown> }
  | { type: 'config'; section: string }
  | { type: 'storefront' }
  | { type: 'queue'; forcedTab?: 'queue' | 'inroute' | 'completed' }
  | { type: 'event'; name: string }
  | { type: 'logout' };

export type AdminNavItem = {
  id: string;
  label: string;
  /** Label curto usado no drawer mobile e na bottom nav (ex: "Início", "Fila ao Vivo"). */
  shortLabel?: string;
  /** Descrição usada na paleta de comandos e no drawer de conta. */
  description?: string;
  icon: any;
  group: AdminNavGroupId;
  action: AdminNavAction;
  /** Papéis que veem o item. Default: todos. */
  roles?: AdminRole[];
  /** Item desabilitado quando o gate falha (clique vira upgrade). */
  gate?: 'motoboys';
  /** Onde o item aparece. Default: sidebar + drawer + palette. */
  surfaces?: AdminNavSurface[];
  /** Chave do badge dinâmico — useAdminNav resolve para `badge`. */
  badgeKey?: 'queueCount' | 'motoboysPending';
  /** Valor de badge já resolvido (contagem, "Pro"...). É o que o menu renderiza. */
  badge?: string | number;
  /** Sinônimos de busca (paleta Ctrl+K) — inclui labels antigos divergentes. */
  aliases?: string[];
  /** Resolvido por getAdminNav/useAdminNav quando o gate falha. */
  disabled?: boolean;
  tone?: 'default' | 'amber' | 'violet' | 'danger';
  /** Label/ícone alternativos quando o papel é OPERATOR (ex: config → Impressora). */
  operatorLabel?: string;
  operatorIcon?: any;
};

export const ADMIN_NAV_GROUPS: Array<{ id: AdminNavGroupId; label: string; order: number }> = [
  { id: 'operacao', label: 'Operação', order: 1 },
  { id: 'loja', label: 'Loja', order: 2 },
  { id: 'crescer', label: 'Crescer', order: 3 },
  { id: 'financeiro', label: 'Financeiro', order: 4 },
  { id: 'equipe', label: 'Equipe', order: 5 },
  { id: 'ajustes', label: 'Ajustes', order: 6 },
  { id: 'conta', label: 'Conta', order: 7 },
];

const STORE_SIDES: AdminNavSurface[] = ['sidebar', 'drawer', 'palette'];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // — Operação —
  {
    id: 'resumo',
    label: 'Resumo',
    shortLabel: 'Início',
    description: 'Visão consolidada da operação, receita e qualidade da loja.',
    icon: ChartBar,
    group: 'operacao',
    action: { type: 'tab', tab: 'resumo' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: ['sidebar', 'drawer', 'bottom', 'account'],
    aliases: ['inicio', 'dashboard', 'resumo executivo'],
  },
  {
    id: 'fila',
    label: 'Gestor de Pedidos',
    shortLabel: 'Fila ao Vivo',
    description: 'Acompanhe pedidos em andamento e a fila da loja em tempo real.',
    icon: CheckSquare,
    group: 'operacao',
    action: { type: 'queue', forcedTab: 'queue' },
    surfaces: ['sidebar', 'drawer', 'bottom'],
    badgeKey: 'queueCount',
    aliases: ['fila', 'pedidos ao vivo', 'monitor'],
  },
  {
    id: 'pedidos',
    label: 'Histórico de Pedidos',
    description: 'Acompanhe status, filtros e histórico dos pedidos em tempo real.',
    icon: ClipboardText,
    group: 'operacao',
    action: { type: 'route', to: '/admin/orders' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['historico', 'vendas', 'pedidos finalizados'],
  },
  {
    id: 'avaliacoes',
    label: 'Avaliações',
    description: 'Notas e comentários dos clientes por pedido.',
    icon: Star,
    group: 'operacao',
    action: { type: 'tab', tab: 'avaliacoes' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['reviews', 'estrelas'],
  },
  // Só na bottom nav / drawer de conta: atalho para a fila já filtrada em concluídos.
  {
    id: 'vendas',
    label: 'Vendas',
    description: 'Pedidos já finalizados na fila.',
    icon: ClipboardText,
    group: 'operacao',
    action: { type: 'queue', forcedTab: 'completed' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: ['bottom', 'account'],
    aliases: ['concluidos', 'finalizados'],
  },
  // — Loja —
  {
    id: 'produtos',
    label: 'Produtos',
    description: 'Gerencie catálogo, preço, disponibilidade e destaque da vitrine.',
    icon: Package,
    group: 'loja',
    action: { type: 'tab', tab: 'produtos' },
    surfaces: ['sidebar', 'drawer', 'bottom', 'account'],
    aliases: ['catalogo', 'cardapio de produtos', 'itens'],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    description: 'Monitore níveis, alertas e movimentações dos produtos.',
    icon: Stack,
    group: 'loja',
    action: { type: 'tab', tab: 'estoque' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['stock', 'inventario'],
  },
  {
    id: 'cardapio',
    label: 'Loja Online',
    description: 'Abra a vitrine pública da loja.',
    icon: Storefront,
    group: 'loja',
    action: { type: 'storefront' },
    surfaces: ['sidebar', 'drawer', 'bottom', 'account'],
    aliases: ['vitrine', 'menu', 'cardapio publico', 'minha vitrine'],
  },
  // — Crescer —
  {
    id: 'destaques',
    label: 'Destaques',
    description: 'Solicite e acompanhe campanhas de destaque para o Hub.',
    icon: Sparkle,
    group: 'crescer',
    action: { type: 'route', to: '/admin/highlights' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['visibilidade', 'campanhas', 'patrocinado'],
  },
  {
    id: 'cupons',
    label: 'Cupons',
    description: 'Crie cupons para seus clientes aplicarem no checkout.',
    icon: Ticket,
    group: 'crescer',
    action: { type: 'tab', tab: 'cupons' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['cupom', 'desconto', 'promocao'],
  },
  {
    id: 'destinos',
    label: 'Destinos',
    description: 'Solicite vínculo com chalés e pousadas onde sua loja entrega.',
    icon: Compass,
    group: 'crescer',
    action: { type: 'tab', tab: 'destinos' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['destinos turisticos', 'chales', 'pousadas'],
  },
  {
    id: 'condominios',
    label: 'Condomínios',
    description: 'Solicite participação em condomínios e acompanhe aprovações da loja.',
    icon: Buildings,
    group: 'crescer',
    action: { type: 'tab', tab: 'condominios' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['feiras', 'condominio'],
  },
  // — Financeiro —
  {
    id: 'pagamentos',
    label: 'Assinatura e plano',
    description: 'Controle assinatura, ciclo e eventos de cobrança da loja.',
    icon: CreditCard,
    group: 'financeiro',
    action: { type: 'tab', tab: 'pagamentos' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: ['sidebar', 'drawer', 'palette', 'account'],
    aliases: ['minha assinatura', 'pagamentos', 'plano', 'assinatura'],
  },
  {
    id: 'gateway',
    label: 'Pagamentos online',
    description: 'Conecte o Mercado Pago para aceitar Pix, crédito e débito online.',
    icon: PlugsConnected,
    group: 'financeiro',
    action: { type: 'tab', tab: 'gateway' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['pagamentos online', 'mercado pago', 'gateway', 'pix'],
  },
  // — Equipe —
  {
    id: 'motoboys',
    label: 'Entregadores',
    description: 'Vínculos, documentos, solicitações e status de entrega.',
    icon: Scooter,
    group: 'equipe',
    action: { type: 'tab', tab: 'motoboys' },
    roles: ['ADMIN', 'LOJISTA'],
    gate: 'motoboys',
    surfaces: STORE_SIDES,
    badgeKey: 'motoboysPending',
    aliases: ['motoboys', 'motoboy', 'equipe de entrega'],
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    description: 'Cadastre e gerencie acessos de admin e operador da loja.',
    icon: UsersThree,
    group: 'equipe',
    action: { type: 'tab', tab: 'usuarios' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['acessos', 'equipe', 'operadores'],
  },
  // — Ajustes —
  // O id precisa continuar sendo 'config' (o sidebar oculta o hub quando existem
  // cfg-* e consome 'config' no ramo sem cfg-* — id diferente viraria leftover).
  // Operador vê este item como "Impressora" apontando direto pra seção printer.
  {
    id: 'config',
    label: 'Configurar loja',
    description: 'Organize perfil, canais, logística, pedidos e horários em blocos separados.',
    icon: Gear,
    group: 'ajustes',
    action: { type: 'config', section: 'hub' },
    operatorLabel: 'Impressora',
    operatorIcon: Printer,
    surfaces: STORE_SIDES,
    aliases: ['configuracoes', 'ajustes', 'impressora'],
  },
  {
    id: 'cfg-hub',
    label: 'Visão geral',
    icon: Gear,
    group: 'ajustes',
    action: { type: 'config', section: 'hub' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['configuracoes gerais'],
  },
  {
    id: 'cfg-profile',
    label: 'Perfil e marca',
    icon: IdentificationCard,
    group: 'ajustes',
    action: { type: 'config', section: 'profile' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['marca', 'logo', 'identidade'],
  },
  {
    id: 'cfg-channels',
    label: 'Promo e contato',
    icon: ChatCircle,
    group: 'ajustes',
    action: { type: 'config', section: 'channels' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['contato', 'redes', 'whatsapp'],
  },
  {
    id: 'cfg-delivery',
    label: 'Entrega e frete',
    icon: Truck,
    group: 'ajustes',
    action: { type: 'config', section: 'delivery' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['frete', 'taxa de entrega', 'logistica'],
  },
  {
    id: 'cfg-ordering',
    label: 'Tipos de pedido',
    icon: ForkKnife,
    group: 'ajustes',
    action: { type: 'config', section: 'ordering' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['modalidades', 'delivery mesa retirada'],
  },
  {
    id: 'cfg-hours',
    label: 'Horários',
    icon: Clock,
    group: 'ajustes',
    action: { type: 'config', section: 'hours' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['funcionamento', 'abertura fechamento'],
  },
  // 3 telas "do celular da loja" fundidas em 1 — auditoria 16/08 (menu 9 -> 7).
  // cfg-operation / cfg-printer / cfg-permissions (ids antigos do drawer) são extintos.
  {
    id: 'cfg-device',
    label: 'Preferências do dispositivo',
    icon: DeviceMobile,
    group: 'ajustes',
    action: { type: 'config', section: 'device' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: STORE_SIDES,
    aliases: ['impressora', 'operacao e som', 'permissoes do app', 'celular da loja'],
  },
  // — Só na paleta —
  {
    id: 'renewal',
    label: 'Trocar assinatura',
    description: 'Abre a tela de renovação/upgrade da assinatura.',
    icon: RocketLaunch,
    group: 'financeiro',
    action: { type: 'route', to: '/admin/renewal' },
    roles: ['ADMIN', 'LOJISTA'],
    surfaces: ['palette'],
    aliases: ['upgrade', 'plano pro', 'renovacao'],
  },
  // — Conta —
  {
    id: 'password',
    label: 'Trocar senha',
    description: 'Atualize a senha deste acesso sem sair da operação.',
    icon: LockKey,
    group: 'conta',
    action: { type: 'event', name: 'admin:open-change-password' },
    surfaces: ['account'],
    aliases: ['senha', 'alterar senha'],
  },
  {
    id: 'mfa',
    label: 'Segurança da conta',
    description: 'Autenticação em dois fatores deste acesso.',
    icon: ShieldCheck,
    group: 'conta',
    action: { type: 'event', name: 'admin:open-mfa' },
    surfaces: ['account'],
    aliases: ['autenticacao', '2fa', 'dois fatores'],
  },
  {
    id: 'logout',
    label: 'Sair',
    description: 'Encerrar a sessão do painel.',
    icon: SignOut,
    group: 'conta',
    action: { type: 'logout' },
    surfaces: ['account'],
    tone: 'danger',
    aliases: ['sair da conta', 'encerrar sessao', 'logout'],
  },
];

export const getAdminItemById = (id: string): AdminNavItem | undefined =>
  ADMIN_NAV_ITEMS.find((item) => item.id === id);

export type AdminNavSession = {
  user?: { role?: string } | null;
  store?: { settings?: Record<string, any>; slug?: string } | null;
  subscription?: { planExempt?: boolean; status?: string; plan?: { name?: string } } | null;
  features?: Record<string, boolean> | null;
};

/** Única cópia da regra de feature de motoboys (antes duplicada em 5 arquivos). */
export const resolveCanUseMotoboys = (session: AdminNavSession | null | undefined): boolean => {
  const isVip = Boolean(session?.store?.settings?.planExempt || session?.subscription?.planExempt);
  const planName = String(session?.subscription?.plan?.name || '').toLowerCase();
  const subscriptionStatus = String(session?.subscription?.status || '').toUpperCase();
  return Boolean(
    isVip ||
      session?.features?.motoboyManagement ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );
};

export type GetAdminNavItemsOptions = {
  role: string;
  canUseMotoboys: boolean;
  surfaces?: AdminNavSurface[];
};

/** Lista canônica já filtrada por papel/superfície, com `disabled` do gate resolvido. */
export const getAdminNavItems = ({
  role,
  canUseMotoboys,
  surfaces,
}: GetAdminNavItemsOptions): AdminNavItem[] => {
  const normalizedRole = String(role || '').toUpperCase();
  const isOperator = normalizedRole === 'OPERATOR';
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(normalizedRole as AdminRole)) return false;
    if (surfaces && !surfaces.some((surface) => (item.surfaces || STORE_SIDES).includes(surface))) {
      return false;
    }
    return true;
  }).map((item) => {
    if (isOperator && item.id === 'config') {
      return {
        ...item,
        label: item.operatorLabel || item.label,
        icon: item.operatorIcon || item.icon,
        action: { type: 'config', section: 'printer' } as AdminNavAction,
      };
    }
    if (item.gate === 'motoboys') return { ...item, disabled: !canUseMotoboys };
    return item;
  });
};

export type AdminNavSection =
  | { type: 'item'; item: AdminNavItem }
  | { type: 'group'; id: string; label: string; children: AdminNavItem[] }
  | { type: 'logout' };

export type AdminNavGroupSection = Extract<AdminNavSection, { type: 'group' }>;

export const isAdminNavGroupSection = (section: AdminNavSection): section is AdminNavGroupSection =>
  section.type === 'group';

const GROUP_ITEM_ORDER: Record<string, string[]> = {
  operacao: ['fila', 'pedidos', 'vendas', 'avaliacoes'],
  loja: ['produtos', 'estoque', 'cardapio'],
  crescer: ['destaques', 'cupons', 'destinos', 'condominios'],
  financeiro: ['pagamentos', 'gateway', 'renewal'],
  equipe: ['motoboys', 'usuarios'],
  ajustes: ['config', 'cfg-hub', 'cfg-profile', 'cfg-channels', 'cfg-delivery', 'cfg-ordering', 'cfg-hours', 'cfg-device'],
};

/**
 * Agrupa itens em seções na ordem canônica do sidebar (Resumo solo → Operação →
 * Loja → Crescer → Financeiro → Equipe → Ajustes → Sair). Substitui o
 * groupedSections hard-coded do AdminDesktopSidebar e o groupedMobileSections do
 * AdminLayout — até então duas cópias com labels diferentes ("Loja" vs "Catálogo").
 * Itens sem grupo conhecido não são descartados silenciosamente: vão pro fim.
 */
export const groupAdminNavItems = (items: AdminNavItem[]): AdminNavSection[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const consumed = new Set<string>();
  const consume = (id: string) => {
    const item = byId.get(id);
    if (item) {
      byId.delete(id); // one-shot: um item nunca aparece em duas seções
      consumed.add(id);
    }
    return item;
  };
  const consumeMany = (ids: string[]) => ids.map(consume).filter(Boolean) as AdminNavItem[];

  const sections: AdminNavSection[] = [];
  const resumo = consume('resumo');
  if (resumo) sections.push({ type: 'item', item: resumo });

  const cfgChildren = items.filter((item) => item.id.startsWith('cfg-'));
  for (const group of ADMIN_NAV_GROUPS) {
    if (group.id === 'conta') continue;
    let children = consumeMany(GROUP_ITEM_ORDER[group.id] || []);
    if (group.id === 'ajustes' && cfgChildren.length > 0) {
      // Com sub-itens, o hub 'config' fica oculto no menu (segue na paleta/ativo).
      consumed.add('config');
      const withoutHub = children.filter((child) => child.id !== 'config');
      children = withoutHub;
    }
    if (children.length) sections.push({ type: 'group', id: group.id, label: group.label, children });
  }
  const logout = byId.get('logout');
  if (logout) consumed.add('logout');
  sections.push({ type: 'logout' });

  const leftovers = items.filter((item) => !consumed.has(item.id) && item.id !== 'logout');
  leftovers.forEach((item) => sections.push({ type: 'item', item }));
  return sections;
};

export type AdminActiveItemInput = {
  pathname: string;
  search?: string;
  state?: { activeTab?: string | null } | null;
  persistedTab?: string;
};

/**
 * Estado ativo unificado. Hoje existem 3 fontes (pathname, location.state.activeTab /
 * ?tab=, sessionStorage admin:activeTab) resolvidas de forma diferente em cada arquivo.
 * No dashboard com aba config, destaca o cfg-* da query (`cfg` ou `section` — o
 * consumidor do AdminDashboard aceita ambos).
 */
export const getAdminActiveItemId = ({
  pathname,
  search = '',
  state,
  persistedTab = '',
}: AdminActiveItemInput): string => {
  const rawPath = String(pathname || '');
  const path = rawPath.split('?')[0];
  const stateTab = String(state?.activeTab || '').trim();
  const queryString = String(search || '') || (rawPath.includes('?') ? rawPath.slice(rawPath.indexOf('?')) : '');
  if (path.startsWith('/admin/queue')) return stateTab === 'completed' || stateTab === 'inroute' ? 'vendas' : 'fila';
  if (path.startsWith('/admin/orders')) return 'pedidos';
  if (path.startsWith('/admin/highlights')) return 'destaques';
  if (path.startsWith('/admin/motoboys')) return 'motoboys';
  if (path.startsWith('/admin/coupons')) return 'cupons';
  if (path.startsWith('/admin/renewal')) return 'pagamentos';
  if (path.startsWith('/admin/dashboard')) {
    const params = new URLSearchParams(queryString);
    const tab = stateTab || String(params.get('tab') || '').trim() || String(persistedTab || '').trim();
    if (tab === 'pedidos') return 'fila';
    if (tab === 'config') {
      const section = String(params.get('cfg') || params.get('section') || 'hub').trim();
      return `cfg-${section}`;
    }
    return tab || 'fila';
  }
  return '';
};

const normalizeAdminSearch = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const getAdminGroupLabel = (groupId: AdminNavGroupId) =>
  ADMIN_NAV_GROUPS.find((group) => group.id === groupId)?.label || '';

/** Busca da paleta de comandos: label + descrição + grupo + aliases, sem acento. */
export const filterAdminNavItems = (items: AdminNavItem[], query: string): AdminNavItem[] => {
  const normalized = normalizeAdminSearch(query);
  if (!normalized) return items;
  return items.filter((item) =>
    normalizeAdminSearch(
      [item.label, item.shortLabel, item.description, getAdminGroupLabel(item.group), ...(item.aliases || [])]
        .filter(Boolean)
        .join(' ')
    ).includes(normalized)
  );
};

/**
 * Items de conta (drawer "Conta"): só o que é de conta. Antes eram 18 atalhos que
 * duplicavam o menu principal — decisão de produto 29/08: navegação mora no drawer
 * principal; Conta = assinatura, senha, MFA e sair.
 */
export const getAdminAccountItems = (role: string): AdminNavItem[] =>
  getAdminNavItems({ role, canUseMotoboys: true, surfaces: ['account'] }).filter(
    (item) => item.group === 'conta' || item.id === 'pagamentos'
  );
