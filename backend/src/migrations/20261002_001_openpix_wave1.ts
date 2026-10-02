import type { SchemaMigration } from '../utils/migrationRunner';

/**
 * WAVE 1 OpenPix (02/10): coluna de provedor no promo_pushes. Todas as outras
 * entidades da Wave 1 (payments, delivery_billing_cycles, order_reviews,
 * featured_product_requests, destination_promotions) JÁ têm coluna de provider
 * varchar — aceitam 'OPENPIX' sem DDL. promo_pushes não tinha: sem ela o
 * refresh-payment não distingue correlationID (OpenPix) de payment id (MP).
 * Idempotente (IF NOT EXISTS); null = legado Mercado Pago.
 */
const migration: SchemaMigration = {
  id: '20261002_001_openpix_wave1',
  name: 'openpix: promo_pushes.payment_provider (Wave 1 PIX plataforma)',
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE promo_pushes ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(64)`);
  },
};

export default migration;
