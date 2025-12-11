-- ===============================
--   TABELA DE PRODUTOS
-- ===============================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'default_owner',
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  image_url TEXT,
  CONSTRAINT products_owner_name_unique UNIQUE(owner_id, name)
);

-- ===============================
--   TABELA DE PEDIDOS
-- ===============================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'default_owner',
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

-- ===============================
--   TABELA DE CLIENTES
-- ===============================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'default_owner',
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT customers_owner_name_unique UNIQUE(owner_id, name)
);

-- ===============================
--   TABELA DE ADMINISTRADORES
-- ===============================
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT 'Administrador',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT admin_users_owner_username_unique UNIQUE(owner_id, username)
);

-- ===============================
--   POPULAR PRODUTOS (ESPETOS)
-- ===============================
INSERT INTO products (owner_id, name, price, category, description, active, image_url) VALUES
('espetinhodatony', 'Alcatra c/ Bacon', 10.50, 'espetos', NULL, true,
 'https://i0.wp.com/espetinhodesucesso.com/wp-content/uploads/2018/03/espetinho-de-carne-com-bacon.jpg?w=750&ssl=1'),

('espetinhodatony', 'Frango c/ Bacon', 10.50, 'espetos', NULL, true,
 'https://www.vivaochurrasco.com.br/wp-content/uploads/2019/05/frangocombacon.jpg'),

('espetinhodatony', 'Carne Bovina', 8.50, 'espetos', NULL, true,
 'https://eliteprimebeef.com.br/wp-content/uploads/2016/04/espetinho-de-carne-600x400.jpg'),

('espetinhodatony', 'Frango', 8.50, 'espetos', NULL, true,
 'https://www.vivaespetos.com.br/wp-content/uploads/2019/05/frango.jpg'),

('espetinhodatony', 'Coração', 8.50, 'espetos', NULL, true,
 'https://d1muf25xaso8hp.cloudfront.net/https://img.criativodahora.com.br/homologacao/thumbs/2025/07/25/01983fc9-c59b-73dd-93d5-ec62564dd71c.jpg?w=1000&h=&auto=compress&dpr=1&fit=max'),

('espetinhodatony', 'Linguiça', 8.50, 'espetos', NULL, true,
 'https://as1.ftcdn.net/jpg/03/51/38/68/1000_F_351386865_CPy3Ir6Go8waqfiNdUWp0aK1YaGU9FdB.jpg'),

('espetinhodatony', 'Kafta Bovina', 8.50, 'espetos', NULL, true,
 'https://cozinhasimples.com.br/wp-content/uploads/kafta-no-palito-cozinha-simples.jpg'),

('espetinhodatony', 'Kafta de Frango c/ Queijo', 8.50, 'espetos', NULL, true,
 'https://s3-sa-east-1.amazonaws.com/loja2/191f40e696fa55001362045933e28607.jpg'),

('espetinhodatony', 'Torresmo', 8.50, 'espetos', NULL, true,
 'https://www.minhasreceitas.blog.br/wp-content/webp-express/webp-images/uploads/2021/07/pork-skewer-over-fire-flames-panceta.jpg.webp'),

('espetinhodatony', 'Pão de Alho', 8.50, 'espetos', NULL, true,
 'https://i.pinimg.com/736x/73/9b/c6/739bc692563f9cfa5ab3b2ce91c25e11.jpg'),

('espetinhodatony', 'Queijo Coalho', 8.50, 'espetos', NULL, true,
 'https://content.paodeacucar.com/wp-content/uploads/2019/11/queijo-coalho-churrasco.jpg'),

('espetinhodatony', 'Costela Bovina', 8.50, 'espetos', NULL, true,
 'http://bertioga.tudoem.com.br/assets/img/anuncio/espeto_de_costela_bovina_4.webp'),

('espetinhodatony', 'Tulipa de Frango', 8.50, 'espetos', NULL, true,
 'https://andinacocacola.vtexassets.com/arquivos/ids/157883-1200-auto?v=638412015595530000&width=1200&height=auto&aspect=true');

-- ===============================
--   POPULAR PRODUTOS (BEBIDAS)
-- ===============================
INSERT INTO products (owner_id, name, price, category, description, active, image_url) VALUES
('espetinhodatony', 'Refrigerante Lata', 7.50, 'bebidas', NULL, true,
 'https://alloydeliveryimages.s3.sa-east-1.amazonaws.com/item_images/11542/669add5769e6e2x9g4.webp'),

('espetinhodatony', 'Refrigerante Mantiqueira', 8.50, 'bebidas', NULL, true,
 'https://refrigerantesmantiqueira.com.br/wp-content/uploads/2023/11/guarana-2-litros.webp'),

('espetinhodatony', 'Suco', 7.50, 'bebidas', NULL, true,
 'https://boomi.b-cdn.net/wp-content/uploads/2024/11/Sucos-de-frutas-sao-ou-nao-sao-saudaveis.png.webp'),

('espetinhodatony', 'Água', 3.00, 'bebidas', NULL, true,
 'https://andinacocacola.vtexassets.com/arquivos/ids/157883-1200-auto?v=638412015595530000&width=1200&height=auto&aspect=true'),

('espetinhodatony', 'Cerveja Heineken', 7.00, 'bebidas', NULL, true,
 'https://res.cloudinary.com/piramides/image/upload/c_fill,h_564,w_395/v1/products/16195-heineken-lata-269ml-normal-8un.20251024104230.png?_a=BAAAV6GX'),

('espetinhodatony', 'Cerveja Skol', 6.00, 'bebidas', NULL, true,
 'https://savegnagoio.vtexassets.com/arquivos/ids/451158-1200-auto?v=638610711235400000&width=1200&height=auto&aspect=true');

-- ===============================
--   ADMIN PADRÃO
-- ===============================
INSERT INTO admin_users (owner_id, username, password_hash, display_name)
VALUES
('espetinhodatony', 'admin', '$2b$10$3RhSgK5Yp5qPlWCMsFBvEOFbcGELRNy9CVfIOVa5AtwU5W1XSRFSG', 'Administrador')
ON CONFLICT (owner_id, username) DO NOTHING;
