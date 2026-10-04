/**
 * Normalização de texto para busca/comparação — ignora acentos, caixa e espaços.
 * Fonte única (04/10/2026): antes havia 4 cópias idênticas espalhadas
 * (MarketplacePage, useHubStoreDistances, GrillQueue/helpers, SuperAdminDestinations)
 * + dezenas de usos inline de `.normalize('NFD')`. Migrar gradualmente para cá.
 */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}
