import cors from "cors";
import express, { type Request, type Response } from "express";
import { db, migrate, seedIfEmpty, isValidStatus, CUSTOMER_STATUSES } from "./db.js";

migrate();
seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "sahacrm-server", time: new Date().toISOString() });
});

app.get("/api/stats", (_req: Request, res: Response) => {
  const total = (db.prepare("SELECT COUNT(*) AS n FROM customers").get() as { n: number }).n;
  const byStatus = db
    .prepare("SELECT status, COUNT(*) AS n FROM customers GROUP BY status")
    .all() as Array<{ status: string; n: number }>;
  const pipeline = (
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM deals WHERE stage = 'open'").get() as {
      total: number;
    }
  ).total;
  res.json({ totalCustomers: total, byStatus, openPipeline: pipeline });
});

app.get("/api/customers", (req: Request, res: Response) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  let rows;
  if (search) {
    const like = `%${search}%`;
    rows = db
      .prepare(
        `SELECT * FROM customers
         WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
         ORDER BY created_at DESC`,
      )
      .all(like, like, like);
  } else {
    rows = db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
  }
  res.json(rows);
});

app.get("/api/customers/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Customer not found" });
  res.json(row);
});

app.post("/api/customers", (req: Request, res: Response) => {
  const { name, email, phone, company, status, notes } = req.body ?? {};
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  const finalStatus = status ?? "lead";
  if (!isValidStatus(finalStatus)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${CUSTOMER_STATUSES.join(", ")}` });
  }
  const result = db
    .prepare(
      `INSERT INTO customers (name, email, phone, company, status, notes)
       VALUES (@name, @email, @phone, @company, @status, @notes)`,
    )
    .run({
      name: name.trim(),
      email: email ?? null,
      phone: phone ?? null,
      company: company ?? null,
      status: finalStatus,
      notes: notes ?? null,
    });
  const created = db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put("/api/customers/:id", (req: Request, res: Response) => {
  const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return res.status(404).json({ error: "Customer not found" });

  const { name, email, phone, company, status, notes } = req.body ?? {};
  if (status !== undefined && !isValidStatus(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${CUSTOMER_STATUSES.join(", ")}` });
  }
  db.prepare(
    `UPDATE customers
       SET name = @name, email = @email, phone = @phone, company = @company,
           status = @status, notes = @notes, updated_at = datetime('now')
     WHERE id = @id`,
  ).run({
    id: req.params.id,
    name: name ?? existing.name,
    email: email ?? existing.email,
    phone: phone ?? existing.phone,
    company: company ?? existing.company,
    status: status ?? existing.status,
    notes: notes ?? existing.notes,
  });
  const updated = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  res.json(updated);
});

app.delete("/api/customers/:id", (req: Request, res: Response) => {
  const result = db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Customer not found" });
  res.status(204).end();
});

const PORT = Number(process.env.PORT ?? 4000);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`SahaCRM server listening on http://localhost:${PORT}`);
  });
}

export { app };
