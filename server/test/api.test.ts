import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.SAHACRM_DB_PATH = join(mkdtempSync(join(tmpdir(), "sahacrm-")), "test.sqlite");

const { app } = await import("../src/index.js");

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
});

test("health endpoint responds ok", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { status: string };
  assert.equal(body.status, "ok");
});

test("seed data is present", async () => {
  const res = await fetch(`${baseUrl}/api/customers`);
  assert.equal(res.status, 200);
  const rows = (await res.json()) as unknown[];
  assert.ok(rows.length >= 3);
});

test("create, read, update and delete a customer", async () => {
  const createRes = await fetch(`${baseUrl}/api/customers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Person", email: "test@example.com", status: "lead" }),
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as { id: number; name: string; status: string };
  assert.equal(created.name, "Test Person");

  const updateRes = await fetch(`${baseUrl}/api/customers/${created.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "active" }),
  });
  assert.equal(updateRes.status, 200);
  const updated = (await updateRes.json()) as { status: string };
  assert.equal(updated.status, "active");

  const delRes = await fetch(`${baseUrl}/api/customers/${created.id}`, { method: "DELETE" });
  assert.equal(delRes.status, 204);

  const getRes = await fetch(`${baseUrl}/api/customers/${created.id}`);
  assert.equal(getRes.status, 404);
});

test("rejects customer without a name", async () => {
  const res = await fetch(`${baseUrl}/api/customers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "noname@example.com" }),
  });
  assert.equal(res.status, 400);
});
