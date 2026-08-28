-- Cria role apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN;', current_user);
  END IF;
END$$;

-- Cria database se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_schema_migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_ms INTEGER NOT NULL DEFAULT 0,
  app_version TEXT,
  git_sha TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_schema_migrations_executed_at
  ON app_schema_migrations(executed_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone TEXT,
  document TEXT,
  document_type TEXT,
  address TEXT,
  profile_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  user_role TEXT NOT NULL DEFAULT 'STORE_OWNER',
  terms_accepted_at TIMESTAMPTZ,
  lgpd_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_unique
  ON users (document)
  WHERE document IS NOT NULL;

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  logo_url TEXT,
  description TEXT,
  address TEXT,
  primary_color TEXT NOT NULL DEFAULT '#b91c1c',
  secondary_color TEXT,
  pix_key TEXT,
  contact_email TEXT,
  promo_message TEXT,
  prep_base_minutes INT,
  prep_per_item_minutes INT,
  queue_capacity_per_hour INT,
  queue_buffer_minutes INT,
  eta_buffer_minutes INT,
  reservation_capacity INT,
  reservation_lead_time_hours INT,
  plan_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  plan_exempt_label TEXT,
  delivery_radius_km NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  social_links JSONB DEFAULT '[]',
  opening_hours JSONB DEFAULT '[]',
  table_service_settings JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS order_types JSONB DEFAULT '["delivery","pickup","table"]';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS table_service_settings JSONB DEFAULT '{}'::jsonb;
UPDATE store_settings
SET table_service_settings = '{}'::jsonb
WHERE table_service_settings IS NULL OR jsonb_typeof(table_service_settings) <> 'object';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS promo_message TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS prep_base_minutes INT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS prep_per_item_minutes INT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS queue_capacity_per_hour INT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS queue_buffer_minutes INT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS eta_buffer_minutes INT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS plan_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS plan_exempt_label TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC(10,2);
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS geo_source TEXT DEFAULT 'unknown';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS geo_precision TEXT DEFAULT 'unknown';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS reservation_capacity INT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS reservation_lead_time_hours INT;
UPDATE store_settings
SET geo_source = 'imported',
    geo_precision = 'street',
    geo_verified = FALSE
WHERE lat IS NOT NULL
  AND lng IS NOT NULL
  AND COALESCE(geo_precision, 'unknown') = 'unknown'
  AND lat BETWEEN -34 AND 6
  AND lng BETWEEN -74 AND -34
  AND NOT (ABS(lat) < 0.000001 AND ABS(lng) < 0.000001);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  promo_price NUMERIC(10,2),
  promo_active BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT,
  description TEXT,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  manage_stock BOOLEAN NOT NULL DEFAULT FALSE,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_alert INT NOT NULL DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  availability_days JSONB,
  modifiers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, user_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_note TEXT,
  phone TEXT,
  address TEXT,
  table_number TEXT,
  type TEXT NOT NULL DEFAULT 'delivery',
  scheduled_for TIMESTAMPTZ NULL,
  party_size INT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  cash_tendered NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  total NUMERIC(10,2) NOT NULL,
  customer_user_id UUID,
  guest_push_id TEXT,
  fulfillment_mode TEXT,
  condominium_id UUID,
  condominium_event_id UUID,
  condominium_name TEXT,
  condominium_event_title TEXT,
  condominium_fulfillment_mode TEXT,
  condominium_unit TEXT,
  condominium_pickup_location TEXT,
  origin VARCHAR(12),
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  customer_received_at TIMESTAMPTZ,
  customer_received_confirmed_by_user_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_note TEXT;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(10,2);
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS order_shipments (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT,
  service_code TEXT,
  service_name TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'pending_posting',
  quote_payload JSONB,
  tracking_last_event JSONB,
  tracking_last_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_shipments_tracking_code ON order_shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_order_shipments_status ON order_shipments(shipment_status);

CREATE TABLE IF NOT EXISTS order_shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES order_shipments(order_id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_shipment_events_order_event_at ON order_shipment_events(order_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_shipment_events_order_source_status ON order_shipment_events(order_id, source, status);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  cooking_point TEXT,
  pass_skewer BOOLEAN NOT NULL DEFAULT FALSE,
  selected_modifiers JSONB,
  is_printed BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);
ALTER TABLE products
ADD COLUMN IF NOT EXISTS promo_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS availability_days JSONB;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS modifiers JSONB;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manage_stock BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS low_stock_alert INT NOT NULL DEFAULT 3;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS cooking_point TEXT;
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS pass_skewer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_modifiers JSONB;
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS is_printed BOOLEAN NOT NULL DEFAULT FALSE;

-- Índices multi-loja
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  price NUMERIC(10,2) NOT NULL,
  promo_price NUMERIC(10,2),
  duration_days INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, display_name, price, promo_price, duration_days, enabled)
VALUES
  ('basic_monthly', 'Basic Mensal', 89.90, NULL, 30, true),
  ('pro_monthly', 'Pro Mensal', 149.90, NULL, 30, true),
  -- No anual: valor cheio = mensal * 12, promo_price = 15% de desconto.
  ('basic_yearly', 'Basic Anual', 1078.80, 916.98, 365, true),
  ('pro_yearly', 'Pro Anual', 1798.80, 1528.98, 365, true),
  -- Planos fundador (campanha 50 primeiras lojas): preço vitalício travado,
  -- restrito a lojas com attribution founderVipPromotion.
  ('founder_basic_monthly', 'Basic Mensal Fundador', 69.90, NULL, 30, true),
  ('founder_pro_monthly', 'Pro Mensal Fundador', 119.90, NULL, 30, true),
  ('founder_basic_yearly', 'Basic Anual Fundador', 838.80, 712.98, 365, true),
  ('founder_pro_yearly', 'Pro Anual Fundador', 1438.80, 1222.98, 365, true)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS order_eta_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  algo_version TEXT NOT NULL,
  prep_minutes INT NOT NULL,
  queue_minutes INT NOT NULL,
  travel_minutes INT,
  buffer_minutes INT NOT NULL,
  total_minutes INT NOT NULL,
  window_min INT NOT NULL,
  window_max INT NOT NULL,
  distance_km NUMERIC(10,2),
  confidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_eta_estimates_order_id
  ON order_eta_estimates(order_id);
CREATE INDEX IF NOT EXISTS idx_order_eta_estimates_store_id
  ON order_eta_estimates(store_id);

CREATE TABLE IF NOT EXISTS motoboys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  created_by_user_id UUID REFERENCES users(id),
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  cnh_number TEXT,
  cnh_category TEXT,
  cnh_expires_at DATE,
  city TEXT,
  state TEXT,
  address TEXT,
  pix_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_reviews (
  store_reply TEXT,
  store_replied_at TIMESTAMPTZ,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  motoboy_id UUID REFERENCES motoboys(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  store_rating INT NOT NULL CHECK (store_rating BETWEEN 1 AND 5),
  delivery_rating INT CHECK (delivery_rating BETWEEN 1 AND 5),
  comment TEXT,
  store_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip_status TEXT NOT NULL DEFAULT 'NONE',
  tip_provider TEXT,
  tip_provider_id TEXT,
  tip_payment_link TEXT,
  tip_qr_code_base64 TEXT,
  tip_qr_code_text TEXT,
  tip_expires_at TIMESTAMPTZ,
  tip_paid_at TIMESTAMPTZ,
  tip_settlement_mode TEXT NOT NULL DEFAULT 'STORE_PAYOUT',
  tip_payout_status TEXT NOT NULL DEFAULT 'PENDING',
  tip_payout_at TIMESTAMPTZ,
  tip_payout_proof_url TEXT,
  tip_payout_notes TEXT,
  tip_payout_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_reviews_store_id ON order_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_motoboy_id ON order_reviews(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_created_at ON order_reviews(created_at DESC);

CREATE TABLE IF NOT EXISTS motoboy_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(motoboy_id, store_id)
);

CREATE TABLE IF NOT EXISTS order_deliveries (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  motoboy_id UUID REFERENCES motoboys(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  freight_value NUMERIC(10,2),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  expires_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,
  payment_confirmed_by_motoboy_id UUID REFERENCES motoboys(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES order_deliveries(order_id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  from_status TEXT,
  to_status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id ON delivery_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_created_at ON delivery_events(created_at DESC);

-- One active delivery per motoboy at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_delivery_per_motoboy
ON order_deliveries(motoboy_id)
WHERE motoboy_id IS NOT NULL AND status IN ('ACCEPTED','PICKED_UP','IN_TRANSIT');

CREATE TABLE IF NOT EXISTS motoboy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS motoboy_store_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  decided_by_user_id UUID REFERENCES users(id),
  reason TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(motoboy_id, store_id)
);

CREATE TABLE IF NOT EXISTS motoboy_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  motoboy_id UUID REFERENCES motoboys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motoboy_audit_logs_store_id ON motoboy_audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_motoboy_audit_logs_motoboy_id ON motoboy_audit_logs(motoboy_id);

CREATE TABLE IF NOT EXISTS delivery_billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  delivery_count INT NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  penalty_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_rate NUMERIC(6,4) NOT NULL DEFAULT 0.03,
  min_fee NUMERIC(10,2) NOT NULL DEFAULT 0.50,
  cycle_days INT NOT NULL DEFAULT 30,
  penalty_daily_rate NUMERIC(6,4) NOT NULL DEFAULT 0.04,
  penalty_cap_rate NUMERIC(6,4) NOT NULL DEFAULT 1.0,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  provider TEXT,
  provider_id TEXT,
  payment_link TEXT,
  qr_code_base64 TEXT,
  qr_code_text TEXT,
  expires_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_billing_cycles_store ON delivery_billing_cycles(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_billing_cycles_status ON delivery_billing_cycles(status);

CREATE TABLE IF NOT EXISTS delivery_billing_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES delivery_billing_cycles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_billing_charges_cycle ON delivery_billing_charges(cycle_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  reminder_stage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campanha Fundador: 50 vagas de 90 dias para lojas criadas a partir da ativação
-- (founder_vip_count_from; a migration 20260828_001 semeia o mesmo bloco em bases existentes).
INSERT INTO site_settings (key, value)
VALUES
  ('founder_vip_enabled', 'true'),
  ('founder_vip_store_limit', '50'),
  ('founder_vip_days', '90'),
  ('founder_vip_count_from', NOW()::text)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'transactional',
  description TEXT,
  subject TEXT NOT NULL,
  preheader TEXT,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  allow_unsubscribe BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  preheader TEXT,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  allow_unsubscribe BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'marketing',
  source TEXT NOT NULL DEFAULT 'public_link',
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(normalized_email, category)
);

CREATE TABLE IF NOT EXISTS email_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT,
  category TEXT NOT NULL DEFAULT 'transactional',
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  suppression_id UUID REFERENCES email_suppressions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category, active);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_created ON email_send_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_to_email ON email_send_logs(to_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_store ON subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  qr_code_base64 TEXT,
  qr_code_text TEXT,
  payment_link TEXT,
  provider TEXT NOT NULL DEFAULT 'MOCK',
  provider_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'MOCK';
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS qr_code_text TEXT;

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  resend_count INTEGER NOT NULL DEFAULT 0,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  request_ip TEXT,
  last_sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  resend_count INTEGER NOT NULL DEFAULT 0,
  request_ip TEXT,
  last_sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_admins (username, password_hash)
SELECT 'chamanoespetoadmin', crypt('chamanoespeto2026#!', gen_salt('bf'))
WHERE NOT EXISTS (
  SELECT 1 FROM platform_admins WHERE username = 'chamanoespetoadmin'
);

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  store_id UUID,
  role TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_link_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_role ON access_logs(role);
CREATE INDEX IF NOT EXISTS idx_access_logs_store_id ON access_logs(store_id);

CREATE TABLE IF NOT EXISTS condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  logo_url TEXT,
  banner_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  provider_user_id TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_store_payment_accounts_store_provider UNIQUE (store_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_store_payment_accounts_store
ON store_payment_accounts(store_id);

CREATE TABLE IF NOT EXISTS motoboy_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  provider_user_id TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_motoboy_payment_accounts_motoboy_provider UNIQUE (motoboy_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_motoboy_payment_accounts_motoboy
ON motoboy_payment_accounts(motoboy_id);

CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  amount NUMERIC(10,2) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  provider_id TEXT,
  payment_link TEXT,
  qr_code_base64 TEXT,
  qr_code_text TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  provider_payload JSONB,
  refund_status TEXT,
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refund_provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_payments_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_payments_store_created
ON order_payments(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_id
ON order_payments(provider_id);

CREATE INDEX IF NOT EXISTS idx_condominiums_active
ON condominiums(active);

CREATE TABLE IF NOT EXISTS store_condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  schedule JSONB DEFAULT '[]'::jsonb,
  pickup_instructions TEXT,
  pickup_block TEXT,
  pickup_unit TEXT,
  allow_pickup_at_stall BOOLEAN NOT NULL DEFAULT TRUE,
  allow_apartment_delivery BOOLEAN NOT NULL DEFAULT FALSE,
  apartment_delivery_fee NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_store_condominiums_store_condominium UNIQUE (store_id, condominium_id)
);

CREATE INDEX IF NOT EXISTS idx_store_condominiums_condominium
ON store_condominiums(condominium_id);

CREATE INDEX IF NOT EXISTS idx_store_condominiums_store
ON store_condominiums(store_id);

CREATE INDEX IF NOT EXISTS idx_store_condominiums_active
ON store_condominiums(active);

-- Promo Pushes (push promocional pago pelo lojista)
CREATE TABLE IF NOT EXISTS promo_pushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title VARCHAR(80) NOT NULL,
  body VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 4.90,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'PIX',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_provider_id VARCHAR(255),
  payment_link TEXT,
  payment_qr_code_base64 TEXT,
  payment_qr_code_text TEXT,
  payment_expires_at TIMESTAMPTZ,
  payment_paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  sent_at TIMESTAMPTZ,
  sent_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_pushes_store ON promo_pushes(store_id);
CREATE INDEX IF NOT EXISTS idx_promo_pushes_status ON promo_pushes(status);

-- Portal de parceiros de destinos, chalés e serviços
CREATE TABLE IF NOT EXISTS destination_partner_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  invited_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_partner_accounts_status
ON destination_partner_accounts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS destination_partner_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES destination_partner_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_partner_invites_account
ON destination_partner_invites(account_id, used_at, expires_at);

CREATE TABLE IF NOT EXISTS destination_partner_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES destination_partner_accounts(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'OWNER',
  status TEXT NOT NULL DEFAULT 'active',
  created_from_request_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_destination_partner_permissions_resource UNIQUE (account_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_destination_partner_permissions_resource
ON destination_partner_permissions(resource_type, resource_id, status);

CREATE INDEX IF NOT EXISTS idx_destination_partner_permissions_account
ON destination_partner_permissions(account_id, status);

CREATE TABLE IF NOT EXISTS destination_partner_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES destination_partner_accounts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  before_json JSONB DEFAULT '{}'::jsonb,
  after_json JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_partner_audit_logs_account
ON destination_partner_audit_logs(account_id, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.destination_partner_requests') IS NOT NULL THEN
    ALTER TABLE destination_partner_requests
    ADD COLUMN IF NOT EXISTS created_partner_account_id UUID;
    ALTER TABLE destination_partner_requests
    ADD COLUMN IF NOT EXISTS request_source TEXT;
    ALTER TABLE destination_partner_requests
    ADD COLUMN IF NOT EXISTS claimed_hospitality_place_id UUID;
    ALTER TABLE destination_partner_requests
    ADD COLUMN IF NOT EXISTS claimed_listing_id UUID;
    ALTER TABLE destination_partner_requests
    ADD COLUMN IF NOT EXISTS store_id UUID;
  END IF;
END $$;

-- customer_addresses era criada apenas no bloco legado (runMigrations) — backport para banco do zero.
-- condominium_id entra direto (equivalente ao estado pós-migration 20260812_001).
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  recipient_name TEXT,
  phone TEXT,
  cep VARCHAR(8) NOT NULL,
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state VARCHAR(2) NOT NULL,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  condominium_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id ON customer_addresses(user_id);

ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS geo_source TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS geo_precision TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS condominium_id UUID REFERENCES condominiums(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS condominium_block TEXT;
ALTER TABLE IF EXISTS customer_addresses
ADD COLUMN IF NOT EXISTS condominium_unit TEXT;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_condominium
ON customer_addresses(condominium_id) WHERE condominium_id IS NOT NULL;
DO $$
BEGIN
  IF to_regclass('public.customer_addresses') IS NOT NULL THEN
    UPDATE customer_addresses
    SET geo_source = 'imported',
        geo_precision = 'street',
        geo_verified = FALSE
    WHERE lat IS NOT NULL
      AND lng IS NOT NULL
      AND COALESCE(geo_precision, 'unknown') = 'unknown'
      AND lat BETWEEN -34 AND 6
      AND lng BETWEEN -74 AND -34
      AND NOT (ABS(lat) < 0.000001 AND ABS(lng) < 0.000001);
  END IF;
END $$;

ALTER TABLE IF EXISTS hospitality_places
ADD COLUMN IF NOT EXISTS geo_source TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS hospitality_places
ADD COLUMN IF NOT EXISTS geo_precision TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS hospitality_places
ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS hospitality_places
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS hospitality_places
ADD COLUMN IF NOT EXISTS formatted_address TEXT;
DO $$
BEGIN
  IF to_regclass('public.hospitality_places') IS NOT NULL AND to_regclass('public.travel_destinations') IS NOT NULL THEN
    UPDATE hospitality_places hp
    SET geo_source = 'city_fallback',
        geo_precision = 'city',
        geo_verified = FALSE
    FROM travel_destinations td
    WHERE td.id = hp.destination_id
      AND hp.lat IS NOT NULL
      AND hp.lng IS NOT NULL
      AND td.lat IS NOT NULL
      AND td.lng IS NOT NULL
      AND COALESCE(hp.geo_precision, 'unknown') = 'unknown'
      AND hp.lat = td.lat
      AND hp.lng = td.lng;

    UPDATE hospitality_places hp
    SET geo_source = 'imported',
        geo_precision = 'street',
        geo_verified = FALSE
    FROM travel_destinations td
    WHERE td.id = hp.destination_id
      AND hp.lat IS NOT NULL
      AND hp.lng IS NOT NULL
      AND COALESCE(hp.geo_precision, 'unknown') = 'unknown'
      AND hp.lat BETWEEN -34 AND 6
      AND hp.lng BETWEEN -74 AND -34
      AND NOT (ABS(hp.lat) < 0.000001 AND ABS(hp.lng) < 0.000001)
      AND NOT (td.lat IS NOT NULL AND td.lng IS NOT NULL AND hp.lat = td.lat AND hp.lng = td.lng);
  END IF;
END $$;

ALTER TABLE IF EXISTS destination_listings
ADD COLUMN IF NOT EXISTS geo_source TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS destination_listings
ADD COLUMN IF NOT EXISTS geo_precision TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS destination_listings
ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS destination_listings
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS destination_listings
ADD COLUMN IF NOT EXISTS formatted_address TEXT;
DO $$
BEGIN
  IF to_regclass('public.destination_listings') IS NOT NULL AND to_regclass('public.travel_destinations') IS NOT NULL THEN
    UPDATE destination_listings dl
    SET geo_source = 'city_fallback',
        geo_precision = 'city',
        geo_verified = FALSE
    FROM travel_destinations td
    WHERE td.id = dl.destination_id
      AND dl.lat IS NOT NULL
      AND dl.lng IS NOT NULL
      AND td.lat IS NOT NULL
      AND td.lng IS NOT NULL
      AND COALESCE(dl.geo_precision, 'unknown') = 'unknown'
      AND dl.lat = td.lat
      AND dl.lng = td.lng;

    UPDATE destination_listings dl
    SET geo_source = 'imported',
        geo_precision = 'street',
        geo_verified = FALSE
    FROM travel_destinations td
    WHERE td.id = dl.destination_id
      AND dl.lat IS NOT NULL
      AND dl.lng IS NOT NULL
      AND COALESCE(dl.geo_precision, 'unknown') = 'unknown'
      AND dl.lat BETWEEN -34 AND 6
      AND dl.lng BETWEEN -74 AND -34
      AND NOT (ABS(dl.lat) < 0.000001 AND ABS(dl.lng) < 0.000001)
      AND NOT (td.lat IS NOT NULL AND td.lng IS NOT NULL AND dl.lat = td.lat AND dl.lng = td.lng);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.destination_partner_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'destination_partner_requests_claimed_hospitality_place_fkey'
    ) THEN
      ALTER TABLE destination_partner_requests
      ADD CONSTRAINT destination_partner_requests_claimed_hospitality_place_fkey
      FOREIGN KEY (claimed_hospitality_place_id)
      REFERENCES hospitality_places(id)
      ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'destination_partner_requests_claimed_listing_fkey'
    ) THEN
      ALTER TABLE destination_partner_requests
      ADD CONSTRAINT destination_partner_requests_claimed_listing_fkey
      FOREIGN KEY (claimed_listing_id)
      REFERENCES destination_listings(id)
      ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'destination_partner_requests_store_fkey'
    ) THEN
      ALTER TABLE destination_partner_requests
      ADD CONSTRAINT destination_partner_requests_store_fkey
      FOREIGN KEY (store_id)
      REFERENCES stores(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.destination_partner_requests') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_destination_partner_requests_claimed_place
      ON destination_partner_requests(claimed_hospitality_place_id)
      WHERE claimed_hospitality_place_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_destination_partner_requests_claimed_listing
      ON destination_partner_requests(claimed_listing_id)
      WHERE claimed_listing_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_destination_partner_requests_store
      ON destination_partner_requests(store_id)
      WHERE store_id IS NOT NULL;
  END IF;
END $$;

-- 20260816_003_checkout_extras: CPF na nota, observação por item e cupons
DO $$
BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2);
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note VARCHAR(280);

  CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    code VARCHAR(40) NOT NULL,
    discount_type VARCHAR(12) NOT NULL DEFAULT 'percent',
    discount_value NUMERIC(10,2) NOT NULL,
    min_subtotal NUMERIC(10,2),
    expires_at TIMESTAMPTZ,
    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_store_code ON coupons(store_id, code);
END $$;
