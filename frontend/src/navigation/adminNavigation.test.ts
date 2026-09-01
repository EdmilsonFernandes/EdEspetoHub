// Guardião do "não perder nada": inventário congelado da navegação admin.
// Antes da unificação, 5 listas independentes conviviam com labels/ícones/destinos
// divergentes (AdminDashboard, AdminOrders, AdminQueue, AdminHighlights, AdminLayout
// + accountActions + paleta Ctrl+K). Este teste congela o inventário canônico:
// se um item sumir, duplicar ou mudar de destino sem intenção, ele falha.
//
// Mapa antigo → canônico (paridade de DESTINOS, não de ids):
//   "Pagamentos"/"Minha assinatura" (Orders/Queue/Highlights) → pagamentos "Assinatura e plano"
//   "Visibilidade" (Highlights)                       → destaques "Destaques"
//   drawer "Vendas" (→ /admin/orders)                 → pedidos "Histórico de Pedidos"
//   bottom "Vendas" (→ queue completed)               → vendas (superfície bottom/account)
//   drawer cfg-operation/cfg-printer/cfg-permissions  → cfg-device (fusão 16/08)
//   account drawer "Pedidos em operação"              → fila (drawer principal)
//   account drawer 18 atalhos                         → drawer principal; Conta = só conta
import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV_ITEMS,
  filterAdminNavItems,
  getAdminAccountItems,
  getAdminActiveItemId,
  getAdminItemById,
  getAdminNavItems,
  groupAdminNavItems,
  resolveCanUseMotoboys,
} from './adminNavigation';

const LOJISTA = 'LOJISTA';
const OPERATOR = 'OPERATOR';

const sidebarIdsFor = (role: string, canUseMotoboys = true) =>
  getAdminNavItems({ role, canUseMotoboys, surfaces: ['sidebar', 'drawer'] }).map((item) => item.id);

describe('adminNavigation — inventário congelado', () => {
  it('não tem ids duplicados', () => {
    const ids = ADMIN_NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('IA em 4 destinos (01/09): sidebar lojista com 16 itens, cfg-* só na paleta', () => {
    expect(sidebarIdsFor(LOJISTA)).toEqual([
      'resumo',
      'fila',
      'pedidos',
      'avaliacoes',
      'produtos',
      'estoque',
      'cardapio',
      'destaques',
      'cupons',
      'destinos',
      'condominios',
      'pagamentos',
      'gateway',
      'motoboys',
      'usuarios',
      'config',
    ]);
  });

  it('mantém os 4 destinos do operador (Impressora = config)', () => {
    expect(sidebarIdsFor(OPERATOR)).toEqual(['fila', 'produtos', 'cardapio', 'config']);
    const config = getAdminNavItems({ role: OPERATOR, canUseMotoboys: false }).find((item) => item.id === 'config');
    expect(config?.label).toBe('Impressora');
    expect(config?.action).toEqual({ type: 'config', section: 'printer' });
  });

  it('isolamento por papel (regra de produto): operador NÃO vê item de lojista em nenhuma superfície', () => {
    const lojistaOnly = [
      'resumo', 'pedidos', 'avaliacoes', 'vendas', 'estoque', 'cupons',
      'destaques', 'destinos', 'condominios', 'pagamentos', 'gateway',
      'motoboys', 'usuarios', 'renewal',
      'cfg-hub', 'cfg-profile', 'cfg-channels', 'cfg-delivery', 'cfg-ordering', 'cfg-hours', 'cfg-device',
    ];
    for (const surface of ['sidebar', 'drawer', 'bottom', 'palette', 'account'] as const) {
      const operatorIds = getAdminNavItems({ role: OPERATOR, canUseMotoboys: true, surfaces: [surface] }).map((i) => i.id);
      const vazamentos = operatorIds.filter((id) => lojistaOnly.includes(id));
      expect(vazamentos, `superfície ${surface}`).toEqual([]);
    }
  });

  it('lojista vê TODAS as opções de menu (regra de produto)', () => {
    const lojistaIds = getAdminNavItems({ role: LOJISTA, canUseMotoboys: true }).map((i) => i.id);
    for (const obrigatorio of ['resumo', 'fila', 'pedidos', 'avaliacoes', 'produtos', 'estoque', 'cardapio', 'destaques', 'cupons', 'destinos', 'condominios', 'pagamentos', 'gateway', 'motoboys', 'usuarios', 'config', 'cfg-hub', 'cfg-device']) {
      expect(lojistaIds, `falta ${obrigatorio} pro lojista`).toContain(obrigatorio);
    }
  });

  it('bottom nav 5 fixos (01/09): Início, Pedidos, Loja, Financeiro, Ajustes', () => {
    const bottom = getAdminNavItems({ role: LOJISTA, canUseMotoboys: true, surfaces: ['bottom'] }).map((i) => i.id);
    expect(bottom).toEqual(['resumo', 'fila', 'produtos', 'gateway', 'config']);
    const bottomOperator = getAdminNavItems({ role: OPERATOR, canUseMotoboys: false, surfaces: ['bottom'] }).map((i) => i.id);
    expect(bottomOperator).toEqual(['fila', 'produtos', 'config']);
  });

  it('drawer de conta: só grupo conta + assinatura (decisão 29/08)', () => {
    expect(getAdminAccountItems(LOJISTA).map((item) => item.id)).toEqual(['pagamentos', 'password', 'mfa', 'logout']);
    expect(getAdminAccountItems(OPERATOR).map((item) => item.id)).toEqual(['password', 'mfa', 'logout']);
  });

  it('paleta: todos os itens exceto Resumo (hard guard) + renewal', () => {
    const palette = getAdminNavItems({ role: LOJISTA, canUseMotoboys: true, surfaces: ['palette'] }).map((i) => i.id);
    expect(palette).not.toContain('resumo');
    expect(palette).toContain('renewal');
    expect(palette).toContain('cupons');
    expect(palette).toContain('cfg-hours');
  });

  it('ids extintos não voltam', () => {
    const ids = ADMIN_NAV_ITEMS.map((item) => item.id);
    for (const dead of ['cfg-operation', 'cfg-printer', 'cfg-permissions']) {
      expect(ids).not.toContain(dead);
    }
    // vendas nunca aparece no sidebar/drawer (mata id fantasma do desktop)
    expect(sidebarIdsFor(LOJISTA)).not.toContain('vendas');
  });

  it('labels canônicos matam as divergências', () => {
    expect(getAdminItemById('pagamentos')?.label).toBe('Assinatura e plano');
    expect(getAdminItemById('destaques')?.label).toBe('Destaques');
    expect(getAdminItemById('gateway')?.label).toBe('Pagamentos online');
    expect(getAdminItemById('estoque')?.label).toBe('Estoque');
    expect(getAdminItemById('cardapio')?.label).toBe('Loja Online');
    expect(getAdminItemById('config')?.label).toBe('Configurações da loja');
  });

  it('motoboys continua TAB do dashboard (não rota) com gate', () => {
    expect(getAdminItemById('motoboys')?.action).toEqual({ type: 'tab', tab: 'motoboys' });
    const gated = getAdminNavItems({ role: LOJISTA, canUseMotoboys: false }).find((i) => i.id === 'motoboys');
    expect(gated?.disabled).toBe(true);
  });

  it('vendas aponta pra fila concluída; pedidos pro histórico (destinos antigos preservados)', () => {
    expect(getAdminItemById('vendas')?.action).toEqual({ type: 'queue', forcedTab: 'completed' });
    expect(getAdminItemById('pedidos')?.action).toEqual({ type: 'route', to: '/admin/orders' });
  });
});

describe('adminNavigation — agrupamento', () => {
  it('agrupamento IA 01/09: Resumo solo → Pedidos → Loja → Financeiro → Ajustes → Sair', () => {
    const sections = groupAdminNavItems(getAdminNavItems({ role: LOJISTA, canUseMotoboys: true, surfaces: ['sidebar'] }));
    expect(sections.map((section) => section.type === 'group' ? `${section.id}:${section.children.length}` : section.type === 'item' ? `item:${section.item.id}` : 'logout')).toEqual([
      'item:resumo',
      'operacao:3',
      'loja:7',
      'financeiro:2',
      'ajustes:3',
      'logout',
    ]);
  });

  it('Ajustes = porta única de config + equipe (cfg-* fora do menu)', () => {
    const sections = groupAdminNavItems(getAdminNavItems({ role: LOJISTA, canUseMotoboys: true, surfaces: ['sidebar'] }));
    const ajustes = sections.find((section) => section.type === 'group' && section.id === 'ajustes') as any;
    expect(ajustes.children.map((child: any) => child.id)).toEqual(['config', 'usuarios', 'motoboys']);
  });

  it('operador: config (Impressora) aparece como filho de Ajustes, sem leftover', () => {
    const sections = groupAdminNavItems(getAdminNavItems({ role: OPERATOR, canUseMotoboys: false, surfaces: ['sidebar'] }));
    const ids = sections.map((section) => section.type === 'group' ? `${section.id}:${section.children.map((c) => c.id).join(',')}` : section.type === 'item' ? `item:${section.item.id}` : 'logout');
    expect(ids).toEqual(['operacao:fila', 'loja:produtos,cardapio', 'ajustes:config', 'logout']);
  });
});

describe('adminNavigation — estado ativo unificado', () => {
  it('resolve por pathname', () => {
    expect(getAdminActiveItemId({ pathname: '/admin/queue' })).toBe('fila');
    expect(getAdminActiveItemId({ pathname: '/admin/queue', state: { activeTab: 'completed' } })).toBe('vendas');
    expect(getAdminActiveItemId({ pathname: '/admin/orders' })).toBe('pedidos');
    expect(getAdminActiveItemId({ pathname: '/admin/highlights' })).toBe('destaques');
    expect(getAdminActiveItemId({ pathname: '/admin/motoboys' })).toBe('motoboys');
    expect(getAdminActiveItemId({ pathname: '/admin/coupons' })).toBe('cupons');
  });

  it('no dashboard: state > query > sessionStorage; config destaca cfg-* (aceita cfg e section)', () => {
    expect(getAdminActiveItemId({ pathname: '/admin/dashboard', state: { activeTab: 'produtos' } })).toBe('produtos');
    expect(getAdminActiveItemId({ pathname: '/admin/dashboard', search: '?tab=estoque' })).toBe('estoque');
    expect(getAdminActiveItemId({ pathname: '/admin/dashboard', persistedTab: 'gateway' })).toBe('gateway');
    expect(getAdminActiveItemId({ pathname: '/admin/dashboard', search: '?tab=config&cfg=hours' })).toBe('config');
    expect(getAdminActiveItemId({ pathname: '/admin/dashboard?tab=config&section=profile' })).toBe('config');
    expect(getAdminActiveItemId({ pathname: '/admin/dashboard' })).toBe('fila');
  });
});

describe('adminNavigation — busca e features', () => {
  it('acha por aliases antigos (labels divergentes pré-unificação)', () => {
    const items = getAdminNavItems({ role: LOJISTA, canUseMotoboys: true });
    expect(filterAdminNavItems(items, 'visibilidade').map((i) => i.id)).toEqual(['destaques']);
    expect(filterAdminNavItems(items, 'minha assinatura').map((i) => i.id)).toEqual(['pagamentos']);
    expect(filterAdminNavItems(items, 'impressora').map((i) => i.id)).toEqual(['config', 'cfg-device']);
  });

  it('resolveCanUseMotoboys: VIP, feature flag, trial e planos pro/vip', () => {
    expect(resolveCanUseMotoboys({ store: { settings: { planExempt: true } } })).toBe(true);
    expect(resolveCanUseMotoboys({ features: { motoboyManagement: true } })).toBe(true);
    expect(resolveCanUseMotoboys({ subscription: { status: 'TRIAL' } })).toBe(true);
    expect(resolveCanUseMotoboys({ subscription: { plan: { name: 'Plano Pro' } } })).toBe(true);
    expect(resolveCanUseMotoboys({ subscription: { plan: { name: 'Basic' } } })).toBe(false);
    expect(resolveCanUseMotoboys(null)).toBe(false);
  });
});
