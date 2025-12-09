CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT,
  phone TEXT,
  address TEXT,
  table_number TEXT,
  type TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  date_string TEXT
);
