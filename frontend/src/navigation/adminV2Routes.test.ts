// Contrato do mapa de rotas da V2: todo item canônico visível no menu precisa
// de um destino V2 (ou ser deliberadamente de conta). Se um item novo entrar
// em adminNavigation sem rota V2, este teste acusa.
import { describe, expect, it } from 'vitest';
import { ADMIN_NAV_ITEMS, getAdminNavItems, groupAdminNavItems } from './adminNavigation';
import { getV2SectionFromPathname, navItemToV2Destination } from './adminV2Routes';

const sidebarItemIds = getAdminNavItems({ role: 'ADMIN', canUseMotoboys: true })
  .filter((item) => (item.surfaces || []).some((surface) => surface === 'sidebar' || surface === 'drawer'))
  .map((item) => item.id);

/** Itens de navegação de página: tudo que aparece no menu lateral da V2. */
const PAGE_ITEM_IDS = sidebarItemIds.filter(
  (id) => !['cfg-hub', 'cfg-profile', 'cfg-channels', 'cfg-delivery', 'cfg-ordering', 'cfg-hours', 'cfg-device'].includes(id)
);

describe('adminV2Routes', () => {
  it('todo item de página do menu tem destino V2', () => {
    const missing = PAGE_ITEM_IDS.filter((id) => {
      const item = ADMIN_NAV_ITEMS.find((entry) => entry.id === id);
      return !navItemToV2Destination(item!, 'loja-teste');
    });
    expect(missing).toEqual([]);
  });

  it('itens de config mapeiam para seções de /config', () => {
    for (const id of ['cfg-profile', 'cfg-channels', 'cfg-delivery', 'cfg-ordering', 'cfg-hours', 'cfg-device']) {
      const item = ADMIN_NAV_ITEMS.find((entry) => entry.id === id)!;
      const destination = navItemToV2Destination(item, '');
      expect(destination?.kind).toBe('internal');
      expect((destination as any).path.startsWith('/config')).toBe(true);
    }
  });

  it('operador: config cai direto na impressora', () => {
    const operatorItems = getAdminNavItems({ role: 'OPERATOR', canUseMotoboys: false });
    const config = operatorItems.find((item) => item.id === 'config')!;
    expect(config.label).toBe('Impressora');
    const destination = navItemToV2Destination(config, '');
    expect((destination as any).path).toBe('/config/impressora');
  });

  it('loja online abre a vitrine externa', () => {
    const item = ADMIN_NAV_ITEMS.find((entry) => entry.id === 'cardapio')!;
    const destination = navItemToV2Destination(item, 'minha-loja');
    expect(destination).toEqual({ kind: 'external', url: '/minha-loja' });
  });

  it('pathname resolve a seção ativa (incluendo sub-rotas de config)', () => {
    expect(getV2SectionFromPathname('/admin/dashboardV2')).toBe('resumo');
    expect(getV2SectionFromPathname('/admin/dashboardV2/fila')).toBe('fila');
    expect(getV2SectionFromPathname('/admin/dashboardV2/assinatura')).toBe('pagamentos');
    expect(getV2SectionFromPathname('/admin/dashboardV2/config/perfil')).toBe('config');
    expect(getV2SectionFromPathname('/outra')).toBeNull();
  });

  it('grupos canônicos continuam íntegros (contrato da V1 intacto)', () => {
    const sections = groupAdminNavItems(
      getAdminNavItems({ role: 'ADMIN', canUseMotoboys: true }).filter(
        (item) => (item.surfaces || []).some((surface) => surface === 'sidebar' || surface === 'drawer')
      )
    );
    const labels = sections.filter((section) => section.type === 'group').map((section) => (section as any).label);
    expect(labels).toEqual(['Pedidos', 'Loja', 'Financeiro', 'Ajustes']);
  });
});
