# Guia SQL de consultas de manutencao

Este guia reune consultas seguras para diagnostico e manutencao do Ja no Caminho. Ele foi escrito para PostgreSQL e usa as tabelas reais do projeto em producao.

Regra de seguranca:

- Prefira `SELECT` para investigacao.
- Nao selecione `password`, `secret_encrypted`, `access_token_encrypted`, `refresh_token_encrypted` ou token push completo.
- Para qualquer `UPDATE`/`DELETE`, use `BEGIN`, confira com `SELECT`, e finalize com `COMMIT` somente depois de validar.
- Antes de rodar em producao, troque os parametros de exemplo.

## Como conectar

Local:

```bash
docker exec -it janocaminho-postgres psql -U postgres -d espetinho
```

Producao via EC2:

```bash
ssh -i "<sua-chave>.pem" ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com
docker exec -it janocaminho-postgres psql -U postgres -d espetinho
```

Opcionalmente, use variaveis do `psql` para evitar editar o SQL inteiro:

```sql
\set customer_email 'cliente@email.com'
\set customer_phone '11999999999'
\set store_slug 'gustavao-do-espetinho'
\set order_id '00000000-0000-0000-0000-000000000000'
```

## 1. Visao geral rapida do banco

Mostra volumes principais por entidade. Serve para confirmar se o banco esperado esta conectado.

```sql
SELECT 'usuarios' AS entidade, COUNT(*) AS total FROM users
UNION ALL SELECT 'lojas', COUNT(*) FROM stores
UNION ALL SELECT 'produtos', COUNT(*) FROM products
UNION ALL SELECT 'pedidos', COUNT(*) FROM orders
UNION ALL SELECT 'motoboys', COUNT(*) FROM motoboys
UNION ALL SELECT 'tokens_push_cliente', COUNT(*) FROM customer_push_tokens
UNION ALL SELECT 'tokens_push_motoboy', COUNT(*) FROM motoboy_push_tokens
UNION ALL SELECT 'assinaturas', COUNT(*) FROM subscriptions
UNION ALL SELECT 'configuracoes_site', COUNT(*) FROM site_settings
UNION ALL SELECT 'templates_email', COUNT(*) FROM email_templates
UNION ALL SELECT 'descadastros_email', COUNT(*) FROM email_suppressions
ORDER BY entidade;
```

## 2. Usuarios por tipo

Lista usuarios sem expor senha.

```sql
SELECT
  id,
  full_name,
  email,
  username,
  phone,
  user_role,
  email_verified,
  is_active,
  must_change_password,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 100;
```

Resumo por papel:

```sql
SELECT
  user_role,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE is_active) AS ativos,
  COUNT(*) FILTER (WHERE email_verified) AS emails_verificados
FROM users
GROUP BY user_role
ORDER BY total DESC;
```

Buscar usuario por e-mail, telefone, documento ou username:

```sql
\set termo 'cliente@email.com'

SELECT
  id,
  full_name,
  email,
  username,
  phone,
  document_type,
  document,
  user_role,
  email_verified,
  is_active,
  created_at
FROM users
WHERE lower(email) = lower(:'termo')
   OR lower(username) = lower(:'termo')
   OR regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = regexp_replace(:'termo', '\D', '', 'g')
   OR regexp_replace(COALESCE(document, ''), '\D', '', 'g') = regexp_replace(:'termo', '\D', '', 'g')
ORDER BY created_at DESC;
```

## 3. Clientes

Lista clientes finais.

```sql
SELECT
  u.id,
  u.full_name,
  u.email,
  u.phone,
  u.email_verified,
  u.is_active,
  COUNT(o.id) AS pedidos,
  MAX(o.created_at) AS ultimo_pedido
FROM users u
LEFT JOIN orders o ON o.customer_user_id = u.id
WHERE u.user_role = 'CUSTOMER'
GROUP BY u.id, u.full_name, u.email, u.phone, u.email_verified, u.is_active
ORDER BY ultimo_pedido DESC NULLS LAST, u.created_at DESC
LIMIT 100;
```

Enderecos cadastrados do cliente:

```sql
\set customer_email 'cliente@email.com'

SELECT
  ca.id,
  ca.label,
  ca.recipient_name,
  ca.phone,
  ca.street,
  ca.number,
  ca.complement,
  ca.neighborhood,
  ca.city,
  ca.state,
  ca.cep,
  ca.is_default,
  ca.created_at,
  ca.updated_at
FROM customer_addresses ca
JOIN users u ON u.id = ca.user_id
WHERE lower(u.email) = lower(:'customer_email')
ORDER BY ca.is_default DESC, ca.updated_at DESC;
```

## 4. Lojas

Lista lojas com dono, configuracao e plano manual VIP.

```sql
SELECT
  s.id,
  s.name AS loja,
  s.slug,
  s.open,
  u.full_name AS dono,
  u.email AS email_dono,
  ss.city,
  ss.state,
  ss.address,
  ss.is_ordering_enabled,
  ss.order_types,
  ss.table_service_settings,
  ss.plan_exempt,
  ss.plan_exempt_label,
  s.created_at
FROM stores s
JOIN users u ON u.id = s.owner_id
LEFT JOIN store_settings ss ON ss.store_id = s.id
ORDER BY s.created_at DESC
LIMIT 100;
```

Configuração de atendimento em mesa, couvert e taxa de serviço:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  s.name AS loja,
  s.slug,
  ss.order_types,
  ss.table_service_settings->>'couvertEnabled' AS couvert_ativo,
  ss.table_service_settings->>'couvertLabel' AS couvert_nome,
  ss.table_service_settings->>'couvertPrice' AS couvert_valor_por_pessoa,
  ss.table_service_settings->>'serviceChargeEnabled' AS taxa_servico_ativa,
  ss.table_service_settings->>'serviceChargeLabel' AS taxa_servico_nome,
  ss.table_service_settings->>'serviceChargePercent' AS taxa_servico_percentual
FROM stores s
JOIN store_settings ss ON ss.store_id = s.id
WHERE s.slug = :'store_slug';
```

Esta configuração não altera pedidos antigos sozinha. Quando o operador aplica couvert ou taxa na fila, o valor entra como item interno do pedido e aparece na impressão.

Buscar loja por slug/nome:

```sql
\set store_search 'gustavao'

SELECT
  s.id,
  s.name,
  s.slug,
  s.open,
  ss.logo_url,
  ss.banner_url,
  ss.banner_position,
  ss.primary_color,
  ss.delivery_radius_km,
  ss.delivery_fee,
  ss.opening_hours,
  ss.order_types,
  ss.is_ordering_enabled
FROM stores s
LEFT JOIN store_settings ss ON ss.store_id = s.id
WHERE s.slug ILIKE '%' || :'store_search' || '%'
   OR s.name ILIKE '%' || :'store_search' || '%'
ORDER BY s.name;
```

Usuarios vinculados a uma loja:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  su.id AS vinculo_id,
  su.role,
  su.is_active AS vinculo_ativo,
  u.id AS user_id,
  u.full_name,
  u.email,
  u.username,
  u.user_role,
  u.is_active AS usuario_ativo,
  su.created_at
FROM store_users su
JOIN stores s ON s.id = su.store_id
JOIN users u ON u.id = su.user_id
WHERE s.slug = :'store_slug'
ORDER BY su.created_at DESC;
```

## 5. Produtos da loja

Lista cardapio de uma loja, incluindo promocao, estoque, disponibilidade e imagem.

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  p.id,
  p.name,
  p.category,
  p.price,
  p.promo_active,
  p.promo_price,
  p.bundle_promo_active,
  p.bundle_promo_qty,
  p.bundle_promo_price,
  p.active,
  p.is_featured,
  p.manage_stock,
  p.stock_quantity,
  p.low_stock_alert,
  p.availability_days,
  p.image_url,
  p.created_at
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE s.slug = :'store_slug'
ORDER BY p.active DESC, p.category NULLS LAST, p.name;
```

Produtos indisponiveis ou sem imagem:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  p.id,
  p.name,
  p.category,
  p.active,
  p.image_url,
  p.availability_days
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE s.slug = :'store_slug'
  AND (p.active = false OR p.image_url IS NULL OR trim(p.image_url) = '')
ORDER BY p.active, p.name;
```

Produtos com estoque baixo:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  p.id,
  p.name,
  p.stock_quantity,
  p.low_stock_alert,
  p.active
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE s.slug = :'store_slug'
  AND p.manage_stock = true
  AND p.stock_quantity <= p.low_stock_alert
ORDER BY p.stock_quantity ASC, p.name;
```

## 6. Pedidos do cliente

Por e-mail do cliente logado:

```sql
\set customer_email 'cliente@email.com'

SELECT
  o.id,
  o.created_at,
  s.name AS loja,
  s.slug AS loja_slug,
  o.customer_name,
  o.phone,
  o.type,
  o.fulfillment_mode,
  o.status,
  o.payment_method,
  o.payment_status,
  o.delivery_fee,
  o.total,
  o.customer_note,
  o.status_timeline
FROM orders o
JOIN stores s ON s.id = o.store_id
JOIN users u ON u.id = o.customer_user_id
WHERE lower(u.email) = lower(:'customer_email')
ORDER BY o.created_at DESC
LIMIT 100;
```

Por telefone, incluindo pedidos guest:

```sql
\set customer_phone '11999999999'

SELECT
  o.id,
  o.created_at,
  s.name AS loja,
  o.customer_name,
  o.phone,
  o.type,
  o.status,
  o.payment_status,
  o.total,
  o.customer_user_id,
  o.guest_push_id
FROM orders o
JOIN stores s ON s.id = o.store_id
WHERE regexp_replace(COALESCE(o.phone, ''), '\D', '', 'g') = regexp_replace(:'customer_phone', '\D', '', 'g')
ORDER BY o.created_at DESC
LIMIT 100;
```

Pedido com itens, pagamento, entrega e gorjeta:

```sql
\set order_id '00000000-0000-0000-0000-000000000000'

SELECT
  o.id,
  o.created_at,
  s.name AS loja,
  o.customer_name,
  o.phone,
  o.address,
  o.table_number,
  o.type,
  o.fulfillment_mode,
  o.status,
  o.payment_method,
  o.payment_status,
  o.delivery_fee,
  o.total,
  o.customer_note,
  jsonb_agg(
    jsonb_build_object(
      'produto', p.name,
      'quantidade', oi.quantity,
      'preco_unitario', oi.price,
      'ponto', oi.cooking_point,
      'modificadores', oi.selected_modifiers,
      'impresso', oi.is_printed
    )
    ORDER BY p.name
  ) FILTER (WHERE oi.id IS NOT NULL) AS itens,
  op.provider AS pagamento_provider,
  op.payment_status AS pagamento_status_detalhado,
  od.status AS entrega_status,
  mu.full_name AS motoboy,
  r.tip_amount AS gorjeta,
  r.tip_status,
  r.tip_settlement_mode,
  r.tip_payout_status
FROM orders o
JOIN stores s ON s.id = o.store_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN order_payments op ON op.order_id = o.id
LEFT JOIN order_deliveries od ON od.order_id = o.id
LEFT JOIN motoboys m ON m.id = od.motoboy_id
LEFT JOIN users mu ON mu.id = m.user_id
LEFT JOIN order_reviews r ON r.order_id = o.id
WHERE o.id = :'order_id'::uuid
GROUP BY
  o.id, s.name, op.provider, op.payment_status, od.status, mu.full_name,
  r.tip_amount, r.tip_status, r.tip_settlement_mode, r.tip_payout_status;
```

## 7. Fila de pedidos da loja

Pedidos recentes que aparecem na fila/admin.

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  o.id,
  o.created_at,
  o.updated_at,
  o.customer_name,
  o.type,
  o.status,
  o.payment_status,
  o.total,
  o.customer_note,
  COUNT(oi.id) AS total_itens
FROM orders o
JOIN stores s ON s.id = o.store_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE s.slug = :'store_slug'
  AND o.created_at >= NOW() - INTERVAL '2 days'
GROUP BY o.id
ORDER BY o.created_at DESC;
```

Pedidos prontos aguardando motoboy:

```sql
SELECT
  o.id,
  s.name AS loja,
  o.customer_name,
  o.address,
  o.total,
  o.status AS order_status,
  od.status AS delivery_status,
  od.freight_value,
  od.assigned_at AS disponibilizado_em
FROM orders o
JOIN stores s ON s.id = o.store_id
LEFT JOIN order_deliveries od ON od.order_id = o.id
WHERE o.type = 'delivery'
  AND (o.status IN ('READY_FOR_DELIVERY', 'WAITING_FOR_MOTOBOY') OR od.status = 'AVAILABLE')
ORDER BY COALESCE(od.assigned_at, o.created_at) DESC;
```

## 8. Motoboys

Lista motoboys com usuario, documentos e vinculos.

```sql
SELECT
  m.id AS motoboy_id,
  u.full_name,
  u.email,
  u.username,
  u.phone,
  m.status,
  m.city,
  m.state,
  m.vehicle_type,
  m.vehicle_plate,
  m.pix_key,
  m.approved_at,
  COUNT(DISTINCT md.id) AS documentos,
  COUNT(DISTINCT ms.store_id) FILTER (WHERE ms.active) AS lojas_ativas,
  m.created_at
FROM motoboys m
JOIN users u ON u.id = m.user_id
LEFT JOIN motoboy_documents md ON md.motoboy_id = m.id
LEFT JOIN motoboy_stores ms ON ms.motoboy_id = m.id
GROUP BY m.id, u.full_name, u.email, u.username, u.phone
ORDER BY m.created_at DESC;
```

Documentos de um motoboy:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  md.id,
  md.doc_type,
  md.status,
  md.file_key,
  md.metadata,
  md.uploaded_at,
  md.reviewed_at
FROM motoboy_documents md
JOIN motoboys m ON m.id = md.motoboy_id
JOIN users u ON u.id = m.user_id
WHERE lower(u.email) = lower(:'motoboy_email')
ORDER BY md.uploaded_at DESC;
```

Lojas vinculadas ao motoboy:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  s.id AS store_id,
  s.name AS loja,
  s.slug,
  ms.active,
  ms.created_at AS vinculado_em
FROM motoboy_stores ms
JOIN motoboys m ON m.id = ms.motoboy_id
JOIN users u ON u.id = m.user_id
JOIN stores s ON s.id = ms.store_id
WHERE lower(u.email) = lower(:'motoboy_email')
ORDER BY ms.active DESC, s.name;
```

Solicitacoes pendentes de motoboy por loja:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  msr.id,
  u.full_name AS motoboy,
  u.email,
  m.status AS kyc_status,
  msr.status AS request_status,
  msr.reason,
  msr.created_at,
  msr.decided_at
FROM motoboy_store_requests msr
JOIN stores s ON s.id = msr.store_id
JOIN motoboys m ON m.id = msr.motoboy_id
JOIN users u ON u.id = m.user_id
WHERE s.slug = :'store_slug'
ORDER BY msr.created_at DESC;
```

## 9. Entregas e ganhos do motoboy

Entregas recentes de um motoboy:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  od.order_id,
  od.status AS delivery_status,
  od.freight_value,
  od.accepted_at,
  od.picked_up_at,
  od.in_transit_at,
  od.delivered_at,
  od.payment_confirmed_at,
  o.total AS order_total,
  s.name AS loja,
  o.customer_name
FROM order_deliveries od
JOIN motoboys m ON m.id = od.motoboy_id
JOIN users u ON u.id = m.user_id
JOIN orders o ON o.id = od.order_id
JOIN stores s ON s.id = o.store_id
WHERE lower(u.email) = lower(:'motoboy_email')
ORDER BY COALESCE(od.delivered_at, od.accepted_at, o.created_at) DESC
LIMIT 100;
```

Gorjetas recebidas/repassadas:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  r.order_id,
  s.name AS loja,
  r.tip_amount,
  r.tip_status,
  r.tip_settlement_mode,
  r.tip_payout_status,
  r.tip_paid_at,
  r.tip_payout_at,
  r.tip_payout_proof_url,
  r.created_at
FROM order_reviews r
JOIN motoboys m ON m.id = r.motoboy_id
JOIN users u ON u.id = m.user_id
JOIN stores s ON s.id = r.store_id
WHERE lower(u.email) = lower(:'motoboy_email')
  AND COALESCE(r.tip_amount, 0) > 0
ORDER BY r.created_at DESC;
```

## 10. Planos disponiveis

Lista planos comerciais.

```sql
SELECT
  id,
  name,
  display_name,
  price,
  promo_price,
  duration_days,
  enabled,
  created_at
FROM plans
ORDER BY enabled DESC, price ASC, duration_days ASC;
```

## 11. Plano contratado por loja

Assinatura mais recente de cada loja.

```sql
SELECT DISTINCT ON (s.id)
  s.id AS store_id,
  s.name AS loja,
  s.slug,
  p.name AS plano,
  p.display_name AS plano_nome,
  sub.status,
  sub.start_date,
  sub.end_date,
  sub.auto_renew,
  sub.payment_method,
  ss.plan_exempt,
  ss.plan_exempt_label
FROM stores s
LEFT JOIN store_settings ss ON ss.store_id = s.id
LEFT JOIN subscriptions sub ON sub.store_id = s.id
LEFT JOIN plans p ON p.id = sub.plan_id
ORDER BY s.id, sub.created_at DESC NULLS LAST;
```

Plano por e-mail do lojista:

```sql
\set owner_email 'lojista@email.com'

SELECT DISTINCT ON (s.id)
  s.name AS loja,
  s.slug,
  u.email AS dono,
  p.display_name AS plano,
  sub.status,
  sub.start_date,
  sub.end_date,
  ss.plan_exempt,
  ss.plan_exempt_label,
  ss.acquisition_attribution
FROM stores s
JOIN users u ON u.id = s.owner_id
LEFT JOIN store_settings ss ON ss.store_id = s.id
LEFT JOIN subscriptions sub ON sub.store_id = s.id
LEFT JOIN plans p ON p.id = sub.plan_id
WHERE lower(u.email) = lower(:'owner_email')
ORDER BY s.id, sub.created_at DESC NULLS LAST;
```

Lojas com assinatura vencendo/vencida:

```sql
SELECT DISTINCT ON (s.id)
  s.name AS loja,
  s.slug,
  p.display_name AS plano,
  sub.status,
  sub.end_date,
  (sub.end_date::date - CURRENT_DATE) AS dias_restantes,
  u.email AS dono
FROM stores s
JOIN users u ON u.id = s.owner_id
LEFT JOIN subscriptions sub ON sub.store_id = s.id
LEFT JOIN plans p ON p.id = sub.plan_id
WHERE sub.status IN ('TRIAL', 'ACTIVE', 'EXPIRING', 'EXPIRED')
ORDER BY s.id, sub.end_date DESC NULLS LAST;
```

## 12. Campanha VIP fundador

Ver configuracao atual:

```sql
SELECT key, value, updated_at
FROM site_settings
WHERE key LIKE 'founder_vip_%'
ORDER BY key;
```

Status operacional da campanha, mostrando limite, lojas existentes e vagas restantes:

```sql
WITH settings AS (
  SELECT
    COALESCE((SELECT value::boolean FROM site_settings WHERE key = 'founder_vip_enabled'), false) AS enabled,
    COALESCE((SELECT value::int FROM site_settings WHERE key = 'founder_vip_store_limit'), 0) AS store_limit,
    COALESCE((SELECT value::int FROM site_settings WHERE key = 'founder_vip_days'), 0) AS vip_days,
    COALESCE((SELECT value FROM site_settings WHERE key = 'founder_vip_label'), '') AS label
), counts AS (
  SELECT COUNT(*)::int AS current_store_count FROM stores
)
SELECT
  settings.enabled,
  settings.store_limit,
  counts.current_store_count,
  GREATEST(settings.store_limit - counts.current_store_count, 0) AS remaining_slots,
  settings.vip_days,
  settings.label,
  (settings.enabled AND counts.current_store_count < settings.store_limit) AS next_store_is_eligible
FROM settings CROSS JOIN counts;
```

Ativar campanha para 50 primeiras lojas por 90 dias:

```sql
BEGIN;

INSERT INTO site_settings ("key", "value") VALUES
  ('founder_vip_enabled', 'true'),
  ('founder_vip_store_limit', '50'),
  ('founder_vip_days', '90'),
  ('founder_vip_label', 'Campanha fundador - 3 meses de acesso VIP')
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    updated_at = NOW();

SELECT key, value, updated_at
FROM site_settings
WHERE key LIKE 'founder_vip_%'
ORDER BY key;

COMMIT;
```

Alterar o limite para 50 primeiras lojas, sem mudar a duracao:

```sql
UPDATE site_settings
SET value = '50',
    updated_at = NOW()
WHERE key = 'founder_vip_store_limit';
```

Lojas que entraram pela campanha:

```sql
SELECT
  s.name,
  s.slug,
  u.email AS dono,
  ss.acquisition_attribution,
  sub.status,
  sub.end_date
FROM stores s
JOIN users u ON u.id = s.owner_id
LEFT JOIN store_settings ss ON ss.store_id = s.id
LEFT JOIN subscriptions sub ON sub.store_id = s.id
WHERE ss.acquisition_attribution ? 'founderVipPromotion'
ORDER BY s.created_at DESC;
```

Desativar campanha sem apagar historico das lojas ja criadas:

```sql
UPDATE site_settings
SET value = 'false',
    updated_at = NOW()
WHERE key = 'founder_vip_enabled';
```

## 13. MFA ativo do cliente/usuario

MFA de um cliente por e-mail:

```sql
\set customer_email 'cliente@email.com'

SELECT
  u.id,
  u.full_name,
  u.email,
  u.user_role,
  COALESCE(ms.enabled, false) AS mfa_ativo,
  ms.method,
  ms.confirmed_at,
  ms.last_used_at,
  ms.updated_at
FROM users u
LEFT JOIN mfa_settings ms
  ON ms.owner_type = 'USER'
 AND ms.owner_id = u.id
 AND ms.method = 'TOTP'
WHERE lower(u.email) = lower(:'customer_email');
```

MFA de lojista por slug da loja:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  s.name AS loja,
  u.full_name,
  u.email,
  COALESCE(ms.enabled, false) AS mfa_ativo,
  ms.confirmed_at,
  ms.last_used_at
FROM stores s
JOIN users u ON u.id = s.owner_id
LEFT JOIN mfa_settings ms
  ON ms.owner_type = 'USER'
 AND ms.owner_id = u.id
 AND ms.method = 'TOTP'
WHERE s.slug = :'store_slug';
```

MFA de motoboy por e-mail:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  m.id AS motoboy_id,
  u.full_name,
  u.email,
  m.status,
  COALESCE(ms.enabled, false) AS mfa_ativo,
  ms.confirmed_at,
  ms.last_used_at
FROM motoboys m
JOIN users u ON u.id = m.user_id
LEFT JOIN mfa_settings ms
  ON ms.owner_type = 'USER'
 AND ms.owner_id = u.id
 AND ms.method = 'TOTP'
WHERE lower(u.email) = lower(:'motoboy_email');
```

MFA do Super Admin:

```sql
SELECT
  pa.id,
  pa.username,
  COALESCE(ms.enabled, false) AS mfa_ativo,
  ms.confirmed_at,
  ms.last_used_at
FROM platform_admins pa
LEFT JOIN mfa_settings ms
  ON ms.owner_type = 'PLATFORM_ADMIN'
 AND ms.owner_id = pa.id
 AND ms.method = 'TOTP'
ORDER BY pa.created_at DESC;
```

Dispositivos confiaveis ativos:

```sql
\set customer_email 'cliente@email.com'

SELECT
  td.id,
  td.label,
  td.user_agent,
  td.ip_address,
  td.trusted_at,
  td.expires_at,
  td.last_used_at,
  td.revoked_at
FROM trusted_devices td
JOIN users u ON u.id = td.owner_id
WHERE td.owner_type = 'USER'
  AND lower(u.email) = lower(:'customer_email')
  AND td.revoked_at IS NULL
ORDER BY td.expires_at DESC;
```

Desafios MFA recentes e expirados, sem expor token:

```sql
\set customer_email 'cliente@email.com'

SELECT
  mc.id,
  mc.purpose,
  mc.expires_at,
  mc.consumed_at,
  mc.attempts_count,
  mc.last_attempt_at,
  mc.created_at,
  CASE
    WHEN mc.consumed_at IS NOT NULL THEN 'CONSUMED'
    WHEN mc.expires_at < NOW() THEN 'EXPIRED'
    ELSE 'OPEN'
  END AS estado
FROM mfa_challenges mc
JOIN users u ON u.id = mc.owner_id
WHERE mc.owner_type = 'USER'
  AND lower(u.email) = lower(:'customer_email')
ORDER BY mc.created_at DESC
LIMIT 20;
```

## 14. Tokens push

Cliente logado por e-mail:

```sql
\set customer_email 'cliente@email.com'

SELECT
  cpt.id,
  u.full_name,
  u.email,
  left(cpt.token, 16) || '...' AS token_preview,
  cpt.platform,
  cpt.app_version,
  cpt.device_model,
  cpt.is_active,
  cpt.created_at,
  cpt.updated_at
FROM customer_push_tokens cpt
JOIN users u ON u.id = cpt.user_id
WHERE lower(u.email) = lower(:'customer_email')
ORDER BY cpt.updated_at DESC;
```

Cliente guest por `guest_push_id` do pedido:

```sql
\set guest_push_id 'guest-id-aqui'

SELECT
  id,
  guest_id,
  left(token, 16) || '...' AS token_preview,
  platform,
  app_version,
  device_model,
  is_active,
  created_at,
  updated_at
FROM customer_push_tokens
WHERE guest_id = :'guest_push_id'
ORDER BY updated_at DESC;
```

Motoboy por e-mail:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  mpt.id,
  u.full_name,
  u.email,
  left(mpt.token, 16) || '...' AS token_preview,
  mpt.platform,
  mpt.app_version,
  mpt.device_model,
  mpt.is_active,
  mpt.created_at,
  mpt.updated_at
FROM motoboy_push_tokens mpt
JOIN users u ON u.id = mpt.user_id
WHERE lower(u.email) = lower(:'motoboy_email')
ORDER BY mpt.updated_at DESC;
```

Usuario de loja por slug:

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  supt.id,
  s.name AS loja,
  u.full_name,
  u.email,
  left(supt.token, 16) || '...' AS token_preview,
  supt.platform,
  supt.app_version,
  supt.device_model,
  supt.is_active,
  supt.created_at,
  supt.updated_at
FROM store_user_push_tokens supt
JOIN stores s ON s.id = supt.store_id
JOIN users u ON u.id = supt.user_id
WHERE s.slug = :'store_slug'
ORDER BY supt.updated_at DESC;
```

Resumo de tokens ativos por publico:

```sql
SELECT 'cliente' AS publico, COUNT(*) AS ativos FROM customer_push_tokens WHERE is_active
UNION ALL SELECT 'motoboy', COUNT(*) FROM motoboy_push_tokens WHERE is_active
UNION ALL SELECT 'loja', COUNT(*) FROM store_user_push_tokens WHERE is_active;
```

## 15. Banners da Home e Popup do app

A configuracao da Home fica em `site_settings.key = 'home.config'`.

Ver JSON bruto:

```sql
SELECT
  key,
  jsonb_pretty(value::jsonb) AS config,
  updated_at
FROM site_settings
WHERE key = 'home.config';
```

Banners de destaque da Home:

```sql
WITH config AS (
  SELECT value::jsonb AS cfg
  FROM site_settings
  WHERE key = 'home.config'
)
SELECT
  banner->>'id' AS id,
  banner->>'title' AS titulo,
  banner->>'description' AS descricao,
  banner->>'imageUrl' AS imagem,
  banner->>'actionUrl' AS acao_url,
  banner->>'actionLabel' AS acao_label,
  (banner->>'order')::int AS ordem,
  (banner->>'active')::boolean AS ativo,
  banner->>'fit' AS fit
FROM config,
LATERAL jsonb_array_elements(COALESCE(cfg->'homeBanners', '[]'::jsonb)) AS banner
ORDER BY ordem;
```

Popup de marketing:

```sql
SELECT
  value::jsonb #>> '{marketingPopup,title}' AS titulo,
  value::jsonb #>> '{marketingPopup,description}' AS descricao,
  value::jsonb #>> '{marketingPopup,imageUrl}' AS imagem,
  value::jsonb #>> '{marketingPopup,actionUrl}' AS acao_url,
  value::jsonb #>> '{marketingPopup,actionLabel}' AS acao_label,
  (value::jsonb #>> '{marketingPopup,active}')::boolean AS ativo,
  value::jsonb #>> '{marketingPopup,fit}' AS fit,
  updated_at
FROM site_settings
WHERE key = 'home.config';
```

## 16. Banners de destinos

Banners cadastrados para cidades/destinos.

```sql
SELECT
  td.name AS destino,
  td.slug AS destino_slug,
  db.title,
  db.subtitle,
  db.image_url,
  db.action_type,
  db.action_target,
  db.sort_order,
  db.active,
  db.updated_at
FROM destination_banners db
JOIN travel_destinations td ON td.id = db.destination_id
ORDER BY td.sort_order, td.name, db.sort_order;
```

Hospedagens e servicos de um destino:

```sql
\set destination_slug 'sao-bento-do-sapucai'

SELECT
  'hospedagem' AS tipo_registro,
  hp.name AS nome,
  hp.type AS categoria,
  hp.address,
  hp.address_number,
  hp.district,
  hp.city,
  hp.state,
  hp.zip_code,
  hp.phone,
  hp.whatsapp,
  hp.lat,
  hp.lng,
  hp.active,
  hp.sort_order
FROM hospitality_places hp
JOIN travel_destinations td ON td.id = hp.destination_id
WHERE td.slug = :'destination_slug'
UNION ALL
SELECT
  'listing' AS tipo_registro,
  dl.title AS nome,
  dl.category AS categoria,
  dl.address,
  dl.address_number,
  dl.district,
  dl.city,
  dl.state,
  dl.zip_code,
  dl.phone,
  dl.whatsapp,
  dl.lat,
  dl.lng,
  dl.active,
  dl.sort_order
FROM destination_listings dl
JOIN travel_destinations td ON td.id = dl.destination_id
WHERE td.slug = :'destination_slug'
ORDER BY tipo_registro, sort_order, nome;
```

Prioridade de servicos por chale/pousada:

```sql
\set place_slug 'pousada-refugio-dos-palmares'

SELECT
  hp.name AS hospedagem,
  dl.title AS servico,
  dl.category AS categoria,
  dl.active AS servico_ativo,
  dlhp.sort_order AS ordem_na_hospedagem,
  dl.sort_order AS ordem_geral_servico,
  dl.whatsapp,
  dl.city,
  dl.state
FROM destination_listing_hospitality_places dlhp
JOIN hospitality_places hp ON hp.id = dlhp.hospitality_place_id
JOIN destination_listings dl ON dl.id = dlhp.listing_id
WHERE hp.slug = :'place_slug'
ORDER BY dlhp.sort_order, dl.featured DESC, dl.sort_order, dl.title;
```

Contas do Portal do Parceiro de Destinos:

```sql
\set email 'parceiro@email.com'

SELECT
  dpa.id,
  dpa.name,
  dpa.email,
  dpa.phone,
  dpa.status,
  dpa.must_change_password,
  dpa.invited_at,
  dpa.activated_at,
  dpa.last_login_at,
  dpa.created_at
FROM destination_partner_accounts dpa
WHERE lower(dpa.email) = lower(:'email')
ORDER BY dpa.created_at DESC;
```

Recursos que um parceiro pode editar:

```sql
\set email 'parceiro@email.com'

SELECT
  dpa.email,
  dpp.resource_type,
  dpp.permission,
  dpp.status AS permissao_status,
  COALESCE(hp.name, dl.title) AS recurso,
  COALESCE(hp.slug, dl.id::text) AS recurso_ref,
  COALESCE(hp.active, dl.active) AS recurso_ativo,
  dpp.created_at
FROM destination_partner_permissions dpp
JOIN destination_partner_accounts dpa ON dpa.id = dpp.account_id
LEFT JOIN hospitality_places hp
  ON dpp.resource_type = 'HOSPITALITY_PLACE'
 AND hp.id = dpp.resource_id
LEFT JOIN destination_listings dl
  ON dpp.resource_type = 'DESTINATION_LISTING'
 AND dl.id = dpp.resource_id
WHERE lower(dpa.email) = lower(:'email')
ORDER BY dpp.created_at DESC;
```

Convites de ativacao pendentes ou expirados:

```sql
\set email 'parceiro@email.com'

SELECT
  dpi.id,
  dpa.email,
  dpi.expires_at,
  dpi.used_at,
  dpi.created_at,
  CASE
    WHEN dpi.used_at IS NOT NULL THEN 'usado'
    WHEN dpi.expires_at < NOW() THEN 'expirado'
    ELSE 'pendente'
  END AS status_convite
FROM destination_partner_invites dpi
JOIN destination_partner_accounts dpa ON dpa.id = dpi.account_id
WHERE lower(dpa.email) = lower(:'email')
ORDER BY dpi.created_at DESC
LIMIT 20;
```

Auditoria de alteracoes feitas pelo parceiro:

```sql
\set email 'parceiro@email.com'

SELECT
  dpal.created_at,
  dpa.email,
  dpal.action,
  dpal.resource_type,
  dpal.resource_id,
  dpal.ip_address,
  left(COALESCE(dpal.user_agent, ''), 120) AS user_agent,
  jsonb_pretty(dpal.before_json) AS antes,
  jsonb_pretty(dpal.after_json) AS depois
FROM destination_partner_audit_logs dpal
LEFT JOIN destination_partner_accounts dpa ON dpa.id = dpal.account_id
WHERE lower(dpa.email) = lower(:'email')
ORDER BY dpal.created_at DESC
LIMIT 50;
```

## 17. Pagamentos de pedido

Pagamentos PIX/cartao de pedidos.

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  op.id,
  op.order_id,
  s.name AS loja,
  op.payment_method,
  op.payment_status,
  op.amount,
  op.provider,
  op.provider_id,
  op.expires_at,
  op.paid_at,
  op.failed_at,
  op.refund_status,
  op.refund_amount,
  op.refunded_at,
  op.created_at
FROM order_payments op
JOIN stores s ON s.id = op.store_id
WHERE s.slug = :'store_slug'
ORDER BY op.created_at DESC
LIMIT 100;
```

Pagamentos pendentes/expirados:

```sql
SELECT
  op.id,
  op.order_id,
  s.name AS loja,
  op.payment_status,
  op.amount,
  op.provider,
  op.provider_id,
  op.expires_at,
  op.created_at
FROM order_payments op
JOIN stores s ON s.id = op.store_id
WHERE op.payment_status IN ('PENDING', 'WAITING_PAYMENT')
   OR (op.paid_at IS NULL AND op.expires_at < NOW())
ORDER BY op.created_at DESC
LIMIT 100;
```

## 18. Pagamentos de assinatura

Historico de pagamentos de planos.

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  pay.id,
  s.name AS loja,
  p.display_name AS plano,
  pay.method,
  pay.status,
  pay.amount,
  pay.provider,
  pay.provider_id,
  pay.expires_at,
  pay.created_at
FROM payments pay
JOIN stores s ON s.id = pay.store_id
JOIN subscriptions sub ON sub.id = pay.subscription_id
JOIN plans p ON p.id = sub.plan_id
WHERE s.slug = :'store_slug'
ORDER BY pay.created_at DESC;
```

Eventos do provedor:

```sql
\set payment_provider_id 'id-do-mercado-pago'

SELECT
  pe.id,
  pe.provider,
  pe.status,
  pe.payload,
  pe.created_at
FROM payment_events pe
JOIN payments p ON p.id = pe.payment_id
WHERE p.provider_id = :'payment_provider_id'
ORDER BY pe.created_at DESC;
```

## 19. Mercado Pago conectado

Conta Mercado Pago da loja, sem expor tokens.

```sql
\set store_slug 'gustavao-do-espetinho'

SELECT
  spa.id,
  s.name AS loja,
  spa.provider,
  spa.status,
  spa.provider_user_id,
  spa.expires_at,
  spa.created_at,
  spa.updated_at,
  CASE WHEN spa.access_token_encrypted IS NULL THEN false ELSE true END AS tem_access_token,
  CASE WHEN spa.refresh_token_encrypted IS NULL THEN false ELSE true END AS tem_refresh_token
FROM store_payment_accounts spa
JOIN stores s ON s.id = spa.store_id
WHERE s.slug = :'store_slug';
```

Conta Mercado Pago do motoboy:

```sql
\set motoboy_email 'motoboy@email.com'

SELECT
  mpa.id,
  u.full_name,
  u.email,
  mpa.provider,
  mpa.status,
  mpa.provider_user_id,
  mpa.expires_at,
  mpa.created_at,
  mpa.updated_at,
  CASE WHEN mpa.access_token_encrypted IS NULL THEN false ELSE true END AS tem_access_token,
  CASE WHEN mpa.refresh_token_encrypted IS NULL THEN false ELSE true END AS tem_refresh_token
FROM motoboy_payment_accounts mpa
JOIN motoboys m ON m.id = mpa.motoboy_id
JOIN users u ON u.id = m.user_id
WHERE lower(u.email) = lower(:'motoboy_email');
```

## 20. Configuracoes globais

Lista chaves salvas em `site_settings`.

```sql
SELECT
  key,
  CASE
    WHEN key = 'home.config' THEN left(value, 240) || CASE WHEN length(value) > 240 THEN '...' ELSE '' END
    ELSE value
  END AS value_preview,
  created_at,
  updated_at
FROM site_settings
ORDER BY key;
```

Chaves alteradas recentemente:

```sql
SELECT key, value, updated_at
FROM site_settings
WHERE updated_at >= NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

## 21. E-mails, templates e descadastros

Templates gerenciados no Super Admin.

```sql
SELECT
  key,
  name,
  category,
  active,
  allow_unsubscribe,
  updated_by,
  updated_at
FROM email_templates
ORDER BY category, key;
```

Preview de assunto e variaveis de um template.

```sql
\set template_key 'marketing_invite'

SELECT
  key,
  subject,
  preheader,
  variables,
  left(text_body, 300) AS text_preview,
  left(html_body, 300) AS html_preview
FROM email_templates
WHERE key = :'template_key';
```

Historico de versoes de um template.

```sql
\set template_key 'marketing_invite'

SELECT
  v.version,
  v.created_by,
  v.created_at,
  v.subject
FROM email_template_versions v
JOIN email_templates t ON t.id = v.template_id
WHERE t.key = :'template_key'
ORDER BY v.version DESC
LIMIT 20;
```

Auditoria de envios recentes. Nao selecione corpo completo quando nao for necessario.

```sql
SELECT
  id,
  template_key,
  category,
  to_email,
  subject,
  status,
  provider,
  error_message,
  created_at
FROM email_send_logs
ORDER BY created_at DESC
LIMIT 100;
```

Envios de um e-mail especifico.

```sql
\set email 'cliente@email.com'

SELECT
  template_key,
  category,
  subject,
  status,
  provider,
  error_message,
  created_at
FROM email_send_logs
WHERE lower(to_email) = lower(:'email')
ORDER BY created_at DESC
LIMIT 100;
```

Descadastros ativos. O descadastro bloqueia apenas e-mails de marketing; e-mails de seguranca, senha, OTP, pagamento e conta continuam sendo enviados.

```sql
SELECT
  id,
  email,
  category,
  source,
  reason,
  created_by,
  created_at
FROM email_suppressions
ORDER BY created_at DESC
LIMIT 100;
```

Verificar se um e-mail esta bloqueado para marketing.

```sql
\set email 'cliente@email.com'

SELECT
  id,
  email,
  category,
  source,
  reason,
  created_at
FROM email_suppressions
WHERE lower(email) = lower(:'email')
  AND category = 'marketing';
```

Remover descadastro manualmente, somente apos confirmacao do usuario.

```sql
\set suppression_id '00000000-0000-0000-0000-000000000000'

BEGIN;

DELETE FROM email_suppressions
WHERE id = :'suppression_id'
RETURNING id, email, category, source, created_at;

COMMIT;
```

## 22. Notificacoes internas

Notificacoes salvas para um usuario.

```sql
\set user_email 'cliente@email.com'

SELECT
  n.id,
  n.title,
  n.body,
  n.url,
  n.image_url,
  n.read,
  n.created_at
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE lower(u.email) = lower(:'user_email')
ORDER BY n.created_at DESC
LIMIT 100;
```

## 23. Auditoria basica

Acessos recentes por papel.

```sql
SELECT
  role,
  method,
  path,
  status,
  COUNT(*) AS total,
  MAX(created_at) AS ultimo_acesso
FROM access_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY role, method, path, status
ORDER BY total DESC
LIMIT 100;
```

Erros HTTP recentes:

```sql
SELECT
  created_at,
  role,
  user_id,
  store_id,
  method,
  path,
  status,
  ip_address,
  left(COALESCE(user_agent, ''), 120) AS user_agent
FROM access_logs
WHERE status >= 400
ORDER BY created_at DESC
LIMIT 100;
```

## 24. Exemplos de manutencao segura

Desativar recebimento de pedidos de uma loja, mantendo a vitrine:

```sql
\set store_slug 'gustavao-do-espetinho'

BEGIN;

UPDATE store_settings ss
SET is_ordering_enabled = false
FROM stores s
WHERE ss.store_id = s.id
  AND s.slug = :'store_slug';

SELECT s.name, s.slug, ss.is_ordering_enabled
FROM stores s
JOIN store_settings ss ON ss.store_id = s.id
WHERE s.slug = :'store_slug';

COMMIT;
```

Reativar pedidos:

```sql
\set store_slug 'gustavao-do-espetinho'

BEGIN;

UPDATE store_settings ss
SET is_ordering_enabled = true
FROM stores s
WHERE ss.store_id = s.id
  AND s.slug = :'store_slug';

SELECT s.name, s.slug, ss.is_ordering_enabled
FROM stores s
JOIN store_settings ss ON ss.store_id = s.id
WHERE s.slug = :'store_slug';

COMMIT;
```

Marcar token push como inativo por preview do token:

```sql
\set token_prefix 'abc123'

BEGIN;

UPDATE customer_push_tokens
SET is_active = false,
    updated_at = NOW()
WHERE token LIKE :'token_prefix' || '%';

SELECT id, left(token, 16) || '...' AS token_preview, is_active, updated_at
FROM customer_push_tokens
WHERE token LIKE :'token_prefix' || '%';

COMMIT;
```

## 25. Quando desconfiar de problema de dados

Use este checklist rapido:

- Home nao carrega banners: consultar `site_settings` com `key = 'home.config'`.
- Cliente nao recebe push: consultar `customer_push_tokens` por e-mail ou `guest_push_id`.
- Motoboy nao recebe fila: consultar `motoboy_push_tokens`, `motoboy_stores`, `motoboy_store_requests` e `order_deliveries`.
- Pedido sumiu da fila: consultar `orders.status`, `orders.type`, `order_deliveries.status` e `orders.created_at`.
- MFA nao pede codigo: consultar `mfa_settings.enabled`, `trusted_devices` ativos e variaveis MFA do backend.
- Loja bloqueada por plano: consultar `subscriptions.status`, `subscriptions.end_date` e `store_settings.plan_exempt`.
- Campanha fundador nao aplicou: consultar `founder_vip_*`, quantidade de lojas e `store_settings.acquisition_attribution`.
- Produto nao aparece: consultar `products.active`, `availability_days`, `store_settings.opening_hours` e `store_settings.is_ordering_enabled`.
- E-mail nao chegou: consultar `email_send_logs.status`, `email_templates.active`, SMTP do backend e `email_suppressions` se for marketing.
