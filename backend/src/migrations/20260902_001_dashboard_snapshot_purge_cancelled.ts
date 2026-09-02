import type { SchemaMigration } from '../utils/migrationRunner';

/**
 * Dashboard "em números" (01/09): os snapshots diários passam a excluir pedidos
 * cancelled/awaiting_payment (mesma definição de "pedido real" do relatório de
 * movimento). Regras de escrita mudaram, então as linhas já materializadas
 * contêm receita de pedidos cancelados (~25% de inflação medida em 02/09 na
 * loja-guinea) — a purga força o recompute completo via ensureStoreSnapshots
 * no próximo carregamento de cada dashboard. Tabelas são 100% derivadas:
 * purgar não perde dado-fonte.
 */
const migration: SchemaMigration = {
  id: '20260902_001_dashboard_snapshot_purge_cancelled',
  name: 'dashboard: purga snapshots p/ recompute sem cancelled/awaiting_payment',
  async up(queryRunner) {
    await queryRunner.query(`DELETE FROM store_dashboard_daily_products`);
    await queryRunner.query(`DELETE FROM store_dashboard_daily_metrics`);
  },
};

export default migration;
