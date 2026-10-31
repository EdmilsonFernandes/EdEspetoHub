import type { SchemaMigration } from '../utils/migrationRunner';

/**
 * Venda por peso (30/10): produtos podem ser vendidos por UNIDADE (comportamento
 * atual, default) ou por PESO (preço por kg + quantidade mínima + incremento em
 * gramas). Itens de pedido ganham snapshot da modalidade e do preço de referência
 * (por unidade ou por kg) — mudanças futuras no cadastro nunca recalculam
 * pedidos antigos.
 *
 * - products.sale_unit: 'UNIT' (default, todos os existentes) | 'WEIGHT'.
 * - products.weight_min_g / weight_step_g: só obrigatórios p/ WEIGHT
 *   (ex.: tomate R$10/kg, mín 250g, incremento 250g → 250/500/750g/1kg).
 * - order_items.quantity: continua sendo a quantidade CANÔNICA — unidades p/
 *   UNIT, GRAMAS INTEIRAS p/ WEIGHT (nunca 0,5 "kg" ambíguo).
 * - order_items.sale_unit: snapshot ('UNIT' quando NULL = pedidos legados).
 * - order_items.unit_price_snapshot: preço de referência do momento (un/kg).
 * - order_items.price: continua sendo o SUBTOTAL snapshot da linha (float BRL).
 *
 * Idempotente (IF NOT EXISTS / sem reescrita de dados).
 */
const migration: SchemaMigration = {
  id: '20261030_001_product_weight_sale',
  name: 'produtos: venda por unidade ou peso (kg) + snapshot no item do pedido',
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_unit VARCHAR(16) NOT NULL DEFAULT 'UNIT'`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_min_g INT`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_step_g INT`);
    await queryRunner.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sale_unit VARCHAR(16) NOT NULL DEFAULT 'UNIT'`);
    await queryRunner.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_snapshot DECIMAL(10,2)`);
  },
};

export default migration;
