# Casos de uso - campanha fundador VIP

Objetivo: liberar uma campanha de entrada para as primeiras lojas sem mexer no VIP manual do superadmin.

## Como funciona

- O VIP manual continua sendo `planExempt` e segue sem prazo, removido manualmente pelo superadmin.
- A campanha automatica usa o `TRIAL` existente com prazo maior, por exemplo 90 dias.
- Ao expirar o prazo promocional, o fluxo atual de assinatura volta a cobrar/renovar normalmente.
- A campanha só roda se a chave `founder_vip_enabled` estiver ativa em `site_settings`.

## Configuracao no banco

```sql
INSERT INTO site_settings ("key", "value") VALUES
  ('founder_vip_enabled', 'true'),
  ('founder_vip_store_limit', '50'),
  ('founder_vip_days', '90'),
  ('founder_vip_label', 'Campanha fundador - 3 meses de acesso VIP')
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", updated_at = NOW();
```

## Como testar manualmente

1. Ative as chaves acima em ambiente de teste.
2. Crie uma loja nova pelo cadastro normal.
3. Confira se a assinatura nasceu como `TRIAL`.
4. Confira se `end_date` ficou aproximadamente 90 dias no futuro.
5. Confira em `store_settings.acquisition_attribution` se existe `founderVipPromotion.applied = true`.
6. Desative `founder_vip_enabled`.
7. Crie outra loja e confirme que voltou ao prazo normal de `trial_days`.
