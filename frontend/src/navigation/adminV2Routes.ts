// Rotas da V2 do painel do lojista (/admin/dashboardV2). A fonte dos ITENS
// continua sendo adminNavigation.ts (getAdminNavItems — papéis, gates e grupos
// canônicos); este módulo só traduz item→rota V2 e fornece os metadados de
// cabeçalho de cada seção. Assim o teste de paridade do menu segue guardando a
// V1 e a V2 herda qualquer evolução do inventário.
import { getAdminItemById, type AdminNavItem } from './adminNavigation';

export const ADMIN_V2_BASE = '/admin/dashboardV2';

/** id de seção V2 === id canônico do item de navegação que a abre. */
export type AdminV2SectionId =
  | 'resumo'
  | 'fila'
  | 'pedidos'
  | 'avaliacoes'
  | 'produtos'
  | 'estoque'
  | 'destaques'
  | 'cupons'
  | 'destinos'
  | 'condominios'
  | 'pagamentos'
  | 'gateway'
  | 'motoboys'
  | 'usuarios'
  | 'config';

/** caminho relativo (sob ADMIN_V2_BASE) por id de item canônico. */
const ITEM_PATH: Record<string, string> = {
  resumo: '/',
  fila: '/fila',
  pedidos: '/pedidos',
  avaliacoes: '/avaliacoes',
  produtos: '/produtos',
  estoque: '/estoque',
  destaques: '/destaques',
  cupons: '/cupons',
  destinos: '/destinos',
  condominios: '/condominios',
  pagamentos: '/assinatura',
  gateway: '/gateway',
  motoboys: '/motoboys',
  usuarios: '/usuarios',
  config: '/config',
};

/** seções de config (cfg-*) → /config/<section>; operador cai direto na impressora. */
const CONFIG_SECTION_PATH: Record<string, string> = {
  hub: '/config',
  profile: '/config/perfil',
  channels: '/config/canais',
  delivery: '/config/entrega',
  ordering: '/config/tipos-de-pedido',
  hours: '/config/horarios',
  device: '/config/dispositivo',
  printer: '/config/impressora',
};

export type AdminV2Destination =
  | { kind: 'internal'; path: string; sectionId: AdminV2SectionId }
  | { kind: 'external'; url: string };

/** Traduz o destino de um item canônico para a V2. `null` = item não-navegável
 *  na V2 (eventos de conta, logout — tratados pelo drawer de conta do shell). */
export const navItemToV2Destination = (
  item: AdminNavItem,
  storeSlug = ''
): AdminV2Destination | null => {
  switch (item.id) {
    case 'cardapio':
      return storeSlug ? { kind: 'external', url: `/${storeSlug}` } : null;
    case 'renewal':
      return { kind: 'internal', path: '/assinatura', sectionId: 'pagamentos' };
    default: {
      // Ação de config tem prioridade: o OPERATOR traz section 'printer'
      // reescrita por getAdminNavItems — e o hub 'config' cai em '/config'.
      if (item.action.type === 'config') {
        const cfgPath = CONFIG_SECTION_PATH[item.action.section] || '/config';
        return { kind: 'internal', path: cfgPath, sectionId: 'config' };
      }
      const path = ITEM_PATH[item.id];
      if (path) return { kind: 'internal', path, sectionId: item.id as AdminV2SectionId };
      return null;
    }
  }
};

/** caminho relativo → id de seção (reverso de ITEM_PATH; '/assinatura' → pagamentos). */
const PATH_TO_SECTION: Record<string, AdminV2SectionId> = Object.entries(ITEM_PATH).reduce(
  (acc, [id, path]) => {
    acc[path] = id as AdminV2SectionId;
    return acc;
  },
  {} as Record<string, AdminV2SectionId>
);

/** id da seção ativa a partir do pathname V2 (ex: /admin/dashboardV2/fila → fila). */
export const getV2SectionFromPathname = (pathname: string): AdminV2SectionId | null => {
  const raw = String(pathname || '');
  if (!raw.startsWith(ADMIN_V2_BASE)) return null;
  const rest = raw.slice(ADMIN_V2_BASE.length);
  const segment = rest.replace(/^\/+/, '').split(/[/?#]/)[0] || '';
  if (!segment) return 'resumo';
  if (segment === 'config') return 'config';
  return PATH_TO_SECTION[`/${segment}`] || null;
};

/** Cabeçalho da seção V2: título + descrição curta (fonte: item canônico). */
export const getV2SectionMeta = (sectionId: AdminV2SectionId) => {
  const item = getAdminItemById(sectionId);
  return {
    title: item?.label || '',
    description: item?.description || '',
    icon: item?.icon || null,
  };
};
