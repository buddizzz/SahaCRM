import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dbPath = process.env.SAHACRM_DB_PATH
  ? resolve(process.env.SAHACRM_DB_PATH)
  : resolve(process.cwd(), "data", "sahacrm.sqlite");

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      status TEXT NOT NULL DEFAULT 'lead',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const VALID_STATUS = ["lead", "prospect", "active", "churned"] as const;
export type CustomerStatus = (typeof VALID_STATUS)[number];
export const CUSTOMER_STATUSES = VALID_STATUS;

export function isValidStatus(value: unknown): value is CustomerStatus {
  return typeof value === "string" && (VALID_STATUS as readonly string[]).includes(value);
}

export function seedIfEmpty(): void {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM customers").get() as { n: number }).n;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO customers (name, email, phone, company, status, notes)
     VALUES (@name, @email, @phone, @company, @status, @notes)`,
  );
  const samples = [
    {
      name: "Amina Yusuf",
      email: "amina@brightpath.io",
      phone: "+1-202-555-0181",
      company: "BrightPath",
      status: "active",
      notes: "Renewed annual plan.",
    },
    {
      name: "Diego Fernández",
      email: "diego@nimbus.dev",
      phone: "+1-202-555-0142",
      company: "Nimbus Labs",
      status: "prospect",
      notes: "Requested a demo of the reporting module.",
    },
    {
      name: "Wei Chen",
      email: "wei.chen@harborworks.com",
      phone: "+1-202-555-0113",
      company: "Harbor Works",
      status: "lead",
      notes: "Inbound from newsletter.",
    },
  ];
  const insertMany = db.transaction((rows: typeof samples) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(samples);
}
