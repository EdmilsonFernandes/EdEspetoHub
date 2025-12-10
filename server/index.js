import express from "express";
import cors from "cors";
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

app.get("/products", async (_, res) => {
    const result = await pool.query(
        "SELECT * FROM products ORDER BY category, name"
    );
    res.json(result.rows);
});

app.post("/login", (req, res) => {
    const { username, password } = req.body || {};

    const validUser =
        process.env.ADMIN_USER || process.env.PGUSER || "postgres";
    const validPassword =
        process.env.ADMIN_PASSWORD || process.env.PGPASSWORD || "postgres";

    if (username === validUser && password === validPassword) {
        res.json({ token: "ok", name: "Administrador" });
        return;
    }

    res.status(401).json({ message: "Credenciais inválidas" });
});


app.get(["/customers", "/api/customers"], async (req, res) => {
    const search = (req.query.search || "").toLowerCase();
    let query = "SELECT * FROM customers";
    const params = [];

    if (search) {
        query += " WHERE LOWER(name) LIKE $1";
        params.push(`%${search}%`);
    }

    query += " ORDER BY name";

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapCustomerRow));
});

app.post("/products", async (req, res) => {
    const {
        name,
        price,
        category,
        description,
        active = true,
        imageUrl,
    } = req.body;

    const query =
        "INSERT INTO products (name, price, category, description, active, image_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *";

    const values = [name, price, category, description, active, imageUrl];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
});

app.put("/products/:id", async (req, res) => {
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
        "UPDATE products SET name = $1, price = $2, category = $3, description = $4, active = $5, image_url = $6 WHERE id = $7 RETURNING *";

    const values = [name, price, category, description, active, imageUrl, id];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
});

app.delete("/products/:id", async (req, res) => {
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.status(204).send();
});

app.get("/orders", async (_, res) => {
    const result = await pool.query(
        "SELECT * FROM orders ORDER BY created_at DESC"
    );
    res.json(result.rows.map(mapOrderRow));
});

app.get("/orders/queue", async (_, res) => {
    const result = await pool.query(
        "SELECT * FROM orders WHERE status IN ('pending', 'preparing') ORDER BY created_at ASC"
    );
    res.json(result.rows.map(mapOrderRow));
});

app.post("/orders", async (req, res) => {
    console.log("DEBUG BODY:", req.body);
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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `;

        const values = [
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
                `INSERT INTO customers (name, phone, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (name)
                 DO UPDATE SET phone = COALESCE(EXCLUDED.phone, customers.phone), updated_at = NOW();`,
                [name, phone ?? null]
            );
        }

        res.status(201).json(mapOrderRow(result.rows[0]));
    } catch (err) {
        console.error("Erro ao criar pedido:", err);
        res.status(500).json({ error: "Erro ao criar pedido" });
    }
});

app.patch("/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
    );
    res.json(mapOrderRow(result.rows[0]));
});

app.patch("/orders/:id", async (req, res) => {
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
        "UPDATE orders SET items = $1, total = $2 WHERE id = $3 RETURNING *",
        [JSON.stringify(sanitizedItems), computedTotal, id]
    );

    res.json(mapOrderRow(result.rows[0]));
});

app.listen(port, () => console.log(`API escutando na porta ${port}`));
