import type { SchemaMigration } from '../utils/migrationRunner';

/**
 * Cobrança no balcão (SDD cobranca-balcao, T1 — REQ-6/8/15):
 * - provider_order_id: id da ORDER do Mercado Pago (Point) — distinto do provider_id
 *   (id do pagamento) para o webhook do tópico `order` resolver sem quebrar o fluxo Pix;
 * - terminal_id: maquininha que recebeu a cobrança;
 * - metadata: rastro do balcão (chargeSource, ajuste de valor com autor, cash audit).
 * Colunas aditivas nullable — código antigo ignora; reversível com DROP COLUMN.
 */
const migration: SchemaMigration = {
  id: '20260828_002_order_payment_point_charge',
  name: 'order_payments: colunas da cobrança no balcão (Point/ajuste/dinheiro)',
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE order_payments
        ADD COLUMN IF NOT EXISTS provider_order_id varchar NULL,
        ADD COLUMN IF NOT EXISTS terminal_id varchar NULL,
        ADD COLUMN IF NOT EXISTS metadata jsonb NULL
    `);
  },
};

export default migration;
