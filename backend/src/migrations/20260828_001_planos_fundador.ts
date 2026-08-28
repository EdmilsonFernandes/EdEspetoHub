import type { SchemaMigration } from '../utils/migrationRunner';

/**
 * Tabela de preços nova + condição Fundador vitalícia (decisão 28/08/2026, docs/PLANOS_PRECOS.md):
 * - basic_monthly 69,90 -> 89,90 · pro_monthly 119,90 -> 149,90 (tabela pública)
 * - planos fundador: founder_basic_monthly 69,90 · founder_pro_monthly 119,90 (+anuais)
 * - ativa a campanha founder_vip: 50 vagas, 90 dias, contadas a partir de founder_vip_count_from
 *   (lojas pré-campanha não ocupam vaga nem recebem a condição)
 */
const migration: SchemaMigration = {
  id: '20260828_001_planos_fundador',
  name: 'Planos fundador (preço vitalício) + tabela nova Basic/Pro + ativa campanha founder_vip',
  checksumSource: `
    UPDATE plans SET price = 89.90 WHERE name = 'basic_monthly' AND price = 69.90;
    UPDATE plans SET price = 149.90 WHERE name = 'pro_monthly' AND price = 119.90;
    INSERT INTO plans (name, display_name, price, promo_price, duration_days, enabled) VALUES
      ('founder_basic_monthly', 'Basic Mensal Fundador', 69.90, NULL, 30, true),
      ('founder_pro_monthly', 'Pro Mensal Fundador', 119.90, NULL, 30, true),
      ('founder_basic_yearly', 'Basic Anual Fundador', 838.80, 712.98, 365, true),
      ('founder_pro_yearly', 'Pro Anual Fundador', 1438.80, 1222.98, 365, true)
    ON CONFLICT (name) DO NOTHING;
    INSERT INTO site_settings (key, value) VALUES
      ('founder_vip_enabled', 'true'),
      ('founder_vip_store_limit', '50'),
      ('founder_vip_days', '90'),
      ('founder_vip_count_from', '<migration-now>')
    ON CONFLICT (key) DO NOTHING;
  `,
  async up(queryRunner) {
    // 1) Tabela nova nos mensais — guarda pelo preço antigo torna no-op em base
    //    nova que já vem com o schema.sql atualizado.
    await queryRunner.query(
      `UPDATE plans SET price = 89.90 WHERE name = 'basic_monthly' AND price = 69.90`
    );
    await queryRunner.query(
      `UPDATE plans SET price = 149.90 WHERE name = 'pro_monthly' AND price = 119.90`
    );

    // 2) Planos fundador: preço travado vitalício (anuais acompanham a derivação
    //    do PlanService: mensal fundador x12, promo 15%).
    await queryRunner.query(`
      INSERT INTO plans (name, display_name, price, promo_price, duration_days, enabled)
      VALUES
        ('founder_basic_monthly', 'Basic Mensal Fundador', 69.90, NULL, 30, true),
        ('founder_pro_monthly', 'Pro Mensal Fundador', 119.90, NULL, 30, true),
        ('founder_basic_yearly', 'Basic Anual Fundador', 838.80, 712.98, 365, true),
        ('founder_pro_yearly', 'Pro Anual Fundador', 1438.80, 1222.98, 365, true)
      ON CONFLICT (name) DO NOTHING
    `);

    // 3) Campanha no ar: 50 vagas para lojas criadas a partir deste momento
    //    (as lojas pré-campanha ficam fora da contagem e da condição).
    const activatedAt = new Date().toISOString();
    await queryRunner.query(`
      INSERT INTO site_settings (key, value)
      VALUES
        ('founder_vip_enabled', 'true'),
        ('founder_vip_store_limit', '50'),
        ('founder_vip_days', '90'),
        ('founder_vip_count_from', '${activatedAt}')
      ON CONFLICT (key) DO NOTHING
    `);
  },
};

export default migration;
