-- Cria role apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN;', current_user);
  END IF;
END$$;

-- Cria database se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  plan_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  plan_exempt_label TEXT,
  delivery_radius_km NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  social_links JSONB DEFAULT '[]',
  opening_hours JSONB DEFAULT '[]'
);

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS order_types JSONB DEFAULT '["delivery","pickup","table"]';
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS address TEXT;
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
  phone TEXT,
  address TEXT,
  table_number TEXT,
  type TEXT NOT NULL DEFAULT 'delivery',
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
ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(10,2);
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING';

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
  ('basic_monthly', 'Basic Mensal', 69.90, NULL, 30, true),
  ('pro_monthly', 'Pro Mensal', 119.90, NULL, 30, true),
  -- No anual: valor cheio = mensal * 12, promo_price = 15% de desconto.
  ('basic_yearly', 'Basic Anual', 838.80, 712.98, 365, true),
  ('pro_yearly', 'Pro Anual', 1438.80, 1222.98, 365, true)
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
