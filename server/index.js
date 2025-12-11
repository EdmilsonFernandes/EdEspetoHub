import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { resetDatabase } from "./databaseReset.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const validUser = process.env.ADMIN_USER || process.env.PGUSER || "postgres";
const validPassword =
    process.env.ADMIN_PASSWORD || process.env.PGPASSWORD || "postgres";

const isValidAdmin = (username, password) =>
    username === validUser && password === validPassword;

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

app.get("/products", async (req, res) => {
    const ownerId = requireOwner(req, res);
    if (!ownerId) return;

    const result = await pool.query(
        "SELECT * FROM products WHERE owner_id = $1 ORDER BY category, name",
        [ownerId]
    );
    res.json(result.rows);
});

app.post("/login", (req, res) => {
    const { username, password, espetoId } = req.body || {};

    if (isValidAdmin(username, password)) {
        const ownerId = (espetoId || defaultOwnerId).trim();
        if (!ownerId) {
            res.status(400).json({ message: "Informe o ID do espeto" });
            return;
        }

        res.json({
            token: "ok",
            name: process.env.ADMIN_NAME || "Administrador",
            ownerId,
        });
        return;
    }

    res.status(401).json({ message: "Credenciais inválidas" });
});

app.post("/admin/reset-database", async (req, res) => {
    const { username, password } = req.body || {};

    if (!isValidAdmin(username, password)) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
    }

    try {
        await resetDatabase();
        res.json({
            message: "Banco resetado e populado com dados iniciais.",
        });
    } catch (error) {
        console.error("Erro ao resetar banco", error);
        res.status(500).json({
            error: "Falha ao resetar banco",
            detail: error.message,
        });
    }
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

const startServer = async () => {
    try {
        await pool.query("SELECT 1");
    } catch (error) {
        console.error(
            "Falha ao conectar no banco. Verifique PGUSER/PGPASSWORD/PGDATABASE.",
            error.message
        );
        process.exit(1);
    }

    app.listen(port, () => console.log(`API escutando na porta ${port}`));
};

startServer();
