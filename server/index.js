import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const mapOrderRow = (row) => ({
    id: row.id,
    name: row.customer_name,
    phone: row.phone,
    address: row.address,
    table: row.table_number,
    type: row.type,
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items || [],
    total: Number(row.total) || 0,
    status: row.status,
    payment: row.payment,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
    dateString: row.date_string,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : undefined,
});

const mapCustomerRow = (row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
});

const defaultOwnerId = process.env.DEFAULT_OWNER_ID || "espetinhodatony";

const adminDefaults = {
    username: process.env.ADMIN_USER || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    name: process.env.ADMIN_NAME || "Administrador",
};

const getOwnerId = (req) =>
    (req.headers["x-owner-id"] || req.query.ownerId || req.body?.ownerId || "")
        .toString()
        .trim();

const requireOwner = (req, res) => {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
        res.status(400).json({ error: "ownerId é obrigatório" });
        return null;
    }
    return ownerId;
};

const parseBasicAuth = (req) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Basic ")) return null;
    const token = header.replace("Basic ", "");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [username, ...rest] = decoded.split(":");
    return { username, password: rest.join(":") };
};

const ensureAdminTable = async () => {
    await pool.query(`
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
    `);
};

const verifyConnection = async () => {
    await pool.query("SELECT 1;");
    console.log("✅ Conexão com o banco de dados estabelecida");
};

const ensureDefaultAdmin = async (ownerId = defaultOwnerId) => {
    const existing = await pool.query(
        "SELECT * FROM admin_users WHERE owner_id = $1 AND username = $2",
        [ownerId, adminDefaults.username]
    );

    const hashedPassword = await bcrypt.hash(adminDefaults.password, 10);

    if (existing.rowCount === 0) {
        await pool.query(
            `INSERT INTO admin_users (owner_id, username, password_hash, display_name)
             VALUES ($1, $2, $3, $4)`,
            [ownerId, adminDefaults.username, hashedPassword, adminDefaults.name]
        );
        console.log("👤 Admin padrão criado para", ownerId);
        return;
    }

    const current = existing.rows[0];
    const passwordMatches = await bcrypt.compare(adminDefaults.password, current.password_hash);

    if (!passwordMatches) {
        await pool.query(
            "UPDATE admin_users SET password_hash = $1, display_name = $2, updated_at = NOW() WHERE id = $3",
            [hashedPassword, adminDefaults.name, current.id]
        );
        console.log("🔁 Senha do admin padrão atualizada para", ownerId);
    }
};

const authenticateAdminUser = async (ownerId, username, password) => {
    const result = await pool.query(
        "SELECT * FROM admin_users WHERE owner_id = $1 AND username = $2",
        [ownerId, username]
    );

    if (!result.rowCount) return null;

    const user = result.rows[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) return null;

    return user;
};

const seedDefaultProducts = async (ownerId = defaultOwnerId) => {
    const defaults = [
        {
            name: "Alcatra c/ Bacon",
            price: 10.5,
            category: "espetos",
            image_url:
                "https://i0.wp.com/espetinhodesucesso.com/wp-content/uploads/2018/03/espetinho-de-carne-com-bacon.jpg?w=750&ssl=1",
        },
        {
            name: "Frango c/ Bacon",
            price: 10.5,
            category: "espetos",
            image_url: "https://www.vivaochurrasco.com.br/wp-content/uploads/2019/05/frangocombacon.jpg",
        },
        {
            name: "Carne Bovina",
            price: 8.5,
            category: "espetos",
            image_url: "https://eliteprimebeef.com.br/wp-content/uploads/2016/04/espetinho-de-carne-600x400.jpg",
        },
        {
            name: "Frango",
            price: 8.5,
            category: "espetos",
            image_url: "https://www.vivaespetos.com.br/wp-content/uploads/2019/05/frango.jpg",
        },
        {
            name: "Coração",
            price: 8.5,
            category: "espetos",
            image_url:
                "https://d1muf25xaso8hp.cloudfront.net/https://img.criativodahora.com.br/homologacao/thumbs/2025/07/25/01983fc9-c59b-73dd-93d5-ec62564dd71c.jpg?w=1000&h=&auto=compress&dpr=1&fit=max",
        },
        {
            name: "Linguiça",
            price: 8.5,
            category: "espetos",
            image_url:
                "https://as1.ftcdn.net/jpg/03/51/38/68/1000_F_351386865_CPy3Ir6Go8waqfiNdUWp0aK1YaGU9FdB.jpg",
        },
        {
            name: "Kafta Bovina",
            price: 8.5,
            category: "espetos",
            image_url: "https://cozinhasimples.com.br/wp-content/uploads/kafta-no-palito-cozinha-simples.jpg",
        },
        {
            name: "Kafta de Frango c/ Queijo",
            price: 8.5,
            category: "espetos",
            image_url: "https://s3-sa-east-1.amazonaws.com/loja2/191f40e696fa55001362045933e28607.jpg",
        },
        {
            name: "Torresmo",
            price: 8.5,
            category: "espetos",
            image_url:
                "https://www.minhasreceitas.blog.br/wp-content/webp-express/webp-images/uploads/2021/07/pork-skewer-over-fire-flames-panceta.jpg.webp",
        },
        {
            name: "Pão de Alho",
            price: 8.5,
            category: "espetos",
            image_url: "https://i.pinimg.com/736x/73/9b/c6/739bc692563f9cfa5ab3b2ce91c25e11.jpg",
        },
        {
            name: "Queijo Coalho",
            price: 8.5,
            category: "espetos",
            image_url: "https://content.paodeacucar.com/wp-content/uploads/2019/11/queijo-coalho-churrasco.jpg",
        },
        {
            name: "Costela Bovina",
            price: 8.5,
            category: "espetos",
            image_url: "http://bertioga.tudoem.com.br/assets/img/anuncio/espeto_de_costela_bovina_4.webp",
        },
        {
            name: "Tulipa de Frango",
            price: 8.5,
            category: "espetos",
            image_url:
                "https://andinacocacola.vtexassets.com/arquivos/ids/157883-1200-auto?v=638412015595530000&width=1200&height=auto&aspect=true",
        },
        {
            name: "Refrigerante Lata",
            price: 7.5,
            category: "bebidas",
            image_url: "https://alloydeliveryimages.s3.sa-east-1.amazonaws.com/item_images/11542/669add5769e6e2x9g4.webp",
        },
        {
            name: "Refrigerante Mantiqueira",
            price: 8.5,
            category: "bebidas",
            image_url: "https://refrigerantesmantiqueira.com.br/wp-content/uploads/2023/11/guarana-2-litros.webp",
        },
        {
            name: "Suco",
            price: 7.5,
            category: "bebidas",
            image_url: "https://boomi.b-cdn.net/wp-content/uploads/2024/11/Sucos-de-frutas-sao-ou-nao-sao-saudaveis.png.webp",
        },
        {
            name: "Água",
            price: 3,
            category: "bebidas",
            image_url: "https://andinacocacola.vtexassets.com/arquivos/ids/157883-1200-auto?v=638412015595530000&width=1200&height=auto&aspect=true",
        },
        {
            name: "Cerveja Heineken",
            price: 7,
            category: "bebidas",
            image_url: "https://res.cloudinary.com/piramides/image/upload/c_fill,h_564,w_395/v1/products/16195-heineken-lata-269ml-normal-8un.20251024104230.png?_a=BAAAV6GX",
        },
        {
            name: "Cerveja Skol",
            price: 6,
            category: "bebidas",
            image_url:
                "https://savegnagoio.vtexassets.com/arquivos/ids/451158-1200-auto?v=638610711235400000&width=1200&height=auto&aspect=true",
        },
    ];

    for (const product of defaults) {
        await pool.query(
            `INSERT INTO products (owner_id, name, price, category, description, active, image_url)
             VALUES ($1, $2, $3, $4, NULL, true, $5)
             ON CONFLICT DO NOTHING`,
            [ownerId, product.name, product.price, product.category, product.image_url]
        );
    }
};

const resetDatabase = async (ownerId = defaultOwnerId) => {
    await pool.query("TRUNCATE orders, customers, products RESTART IDENTITY CASCADE;");
    await seedDefaultProducts(ownerId);
    await ensureDefaultAdmin(ownerId);
};

app.get("/products", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const result = await pool.query(
        "SELECT * FROM products WHERE owner_id = $1 ORDER BY category, name",
        [ownerId]
    );
    res.json(result.rows);
});

app.post("/login", async (req, res) => {
    const { username, password, espetoId } = req.body || {};
    const ownerId = (espetoId || defaultOwnerId).trim();

    if (!ownerId) {
        res.status(400).json({ message: "Informe o ID do espeto" });
        return;
    }

    const user = await authenticateAdminUser(ownerId, username, password);
    if (!user) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
    }

    res.json({ token: "ok", name: user.display_name, ownerId: user.owner_id });
});

app.post("/admin/reset", async (req, res) => {
    const ownerId = getOwnerId(req) || defaultOwnerId;

    if (!ownerId) {
        res.status(400).json({ error: "ownerId é obrigatório" });
        return;
    }
    const basicAuth = parseBasicAuth(req);

    if (!basicAuth) {
        res.status(401).json({ message: "Forneça Authorization Basic" });
        return;
    }

    const adminUser = await authenticateAdminUser(ownerId, basicAuth.username, basicAuth.password);
    if (!adminUser) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
    }

    await resetDatabase(ownerId);
    res.json({ message: `Banco reiniciado para ${ownerId}` });
});

app.get(["/customers", "/api/customers"], async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const search = (req.query.search || "").toLowerCase();
    let query = "SELECT * FROM customers WHERE owner_id = $1";
    const params = [ownerId];

    if (search) {
        query += " AND LOWER(name) LIKE $2";
        params.push(`%${search}%`);
    }

    query += " ORDER BY name";

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapCustomerRow));
});

app.post("/products", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const {
        name,
        price,
        category,
        description,
        active = true,
        imageUrl,
    } = req.body;

    const query =
        "INSERT INTO products (owner_id, name, price, category, description, active, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *";

    const values = [
        ownerId,
        name,
        price,
        category,
        description,
        active,
        imageUrl,
    ];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
});

app.put("/products/:id", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const { id } = req.params;
    const {
        name,
        price,
        category,
        description,
        active = true,
        imageUrl,
    } = req.body;

    const query =
        "UPDATE products SET name = $1, price = $2, category = $3, description = $4, active = $5, image_url = $6 WHERE id = $7 AND owner_id = $8 RETURNING *";

    const values = [
        name,
        price,
        category,
        description,
        active,
        imageUrl,
        id,
        ownerId,
    ];
    const result = await pool.query(query, values);
    if (!result.rowCount) {
        res.status(404).json({ error: "Produto não encontrado para este espeto" });
        return;
    }
    res.json(result.rows[0]);
});

app.delete("/products/:id", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const result = await pool.query(
        "DELETE FROM products WHERE id = $1 AND owner_id = $2",
        [req.params.id, ownerId]
    );

    if (!result.rowCount) {
        res.status(404).json({ error: "Produto não encontrado para este espeto" });
        return;
    }

    res.status(204).send();
});

app.get("/orders", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const result = await pool.query(
        "SELECT * FROM orders WHERE owner_id = $1 ORDER BY created_at DESC",
        [ownerId]
    );
    res.json(result.rows.map(mapOrderRow));
});

app.get("/orders/queue", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const result = await pool.query(
        "SELECT * FROM orders WHERE owner_id = $1 AND status IN ('pending', 'preparing') ORDER BY created_at ASC",
        [ownerId]
    );
    res.json(result.rows.map(mapOrderRow));
});

app.post("/orders", async (req, res) => {
    console.log("DEBUG BODY:", req.body);
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    try {
        const {
            name,
            phone,
            address,
            table,
            type,
            items,
            total,
            status = "pending",
            payment = "pix",
        } = req.body;

        const now = new Date();

        const query = `
      INSERT INTO orders (
        owner_id,
        customer_name,
        phone,
        address,
        table_number,
        type,
        items,
        total,
        status,
        payment,
        created_at,
        date_string
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `;

        const values = [
            ownerId,
            name,
            phone,
            address ?? null,
            table ?? null,
            type,
            JSON.stringify(items ?? []),
            total ?? 0,
            status,
            payment,
            now,
            now.toISOString().slice(0, 10), // "2025-12-10"
        ];

        const result = await pool.query(query, values);

        if (name) {
            await pool.query(
                `INSERT INTO customers (owner_id, name, phone, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (owner_id, name)
                 DO UPDATE SET phone = COALESCE(EXCLUDED.phone, customers.phone), updated_at = NOW();`,
                [ownerId, name, phone ?? null]
            );
        }

        res.status(201).json(mapOrderRow(result.rows[0]));
    } catch (err) {
        console.error("Erro ao criar pedido:", err);
        res.status(500).json({ error: "Erro ao criar pedido" });
    }
});

app.patch("/orders/:id/status", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2 AND owner_id = $3 RETURNING *",
        [status, id, ownerId]
    );

    if (!result.rowCount) {
        res.status(404).json({ error: "Pedido não encontrado para este espeto" });
        return;
    }

    res.json(mapOrderRow(result.rows[0]));
});

app.patch("/orders/:id", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const { id } = req.params;
    const { items, total } = req.body;

    if (!Array.isArray(items)) {
        res.status(400).json({ error: "Lista de itens inválida" });
        return;
    }

    const sanitizedItems = items.filter((item) => item && item.qty > 0);
    const computedTotal =
        typeof total === "number"
            ? total
            : sanitizedItems.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);

    const result = await pool.query(
        "UPDATE orders SET items = $1, total = $2 WHERE id = $3 AND owner_id = $4 RETURNING *",
        [JSON.stringify(sanitizedItems), computedTotal, id, ownerId]
    );

    if (!result.rowCount) {
        res.status(404).json({ error: "Pedido não encontrado para este espeto" });
        return;
    }

    res.json(mapOrderRow(result.rows[0]));
});

const start = async () => {
    try {
        await verifyConnection();
        await ensureAdminTable();
        await ensureDefaultAdmin();
        await seedDefaultProducts();
        app.listen(port, () => console.log(`API escutando na porta ${port}`));
    } catch (error) {
        console.error("Erro ao iniciar a API", error);
        process.exit(1);
    }
};

start();
