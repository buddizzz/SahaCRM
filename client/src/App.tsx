import { useEffect, useMemo, useState } from "react";
import { api, type Customer, type CustomerStatus, type Stats } from "./api";

const STATUSES: CustomerStatus[] = ["lead", "prospect", "active", "churned"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "lead" as CustomerStatus,
  notes: "",
};

export function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(q = search) {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([api.listCustomers(q), api.stats()]);
      setCustomers(list);
      setStats(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.createCustomer({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    }
  }

  async function cycleStatus(customer: Customer) {
    const next = STATUSES[(STATUSES.indexOf(customer.status) + 1) % STATUSES.length];
    await api.updateCustomer(customer.id, { status: next });
    await refresh();
  }

  async function remove(customer: Customer) {
    await api.deleteCustomer(customer.id);
    await refresh();
  }

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats?.byStatus ?? []) map.set(s.status, s.n);
    return map;
  }, [stats]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◆</span>
          <div>
            <h1>SahaCRM</h1>
            <p>Customer relationships, kept simple.</p>
          </div>
        </div>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "+ New customer"}
        </button>
      </header>

      {error && <div className="banner error">{error}</div>}

      <section className="cards">
        <div className="card">
          <span className="card-label">Total customers</span>
          <span className="card-value">{stats?.totalCustomers ?? "—"}</span>
        </div>
        {STATUSES.map((s) => (
          <div className="card" key={s}>
            <span className="card-label">{s}</span>
            <span className="card-value">{statusCounts.get(s) ?? 0}</span>
          </div>
        ))}
      </section>

      {showForm && (
        <form className="new-form" onSubmit={handleSubmit}>
          <div className="grid">
            <label>
              Name*
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1-202-555-0100"
              />
            </label>
            <label>
              Company
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Acme Inc."
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Context about this relationship…"
            />
          </label>
          <button className="primary" type="submit">
            Save customer
          </button>
        </form>
      )}

      <div className="toolbar">
        <input
          className="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh()}
          placeholder="Search by name, email or company…"
        />
        <button onClick={() => refresh()}>Search</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Loading…
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No customers yet.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.name}</td>
                  <td>{c.company ?? "—"}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>
                    <button
                      className={`status status-${c.status}`}
                      onClick={() => cycleStatus(c)}
                      title="Click to change status"
                    >
                      {c.status}
                    </button>
                  </td>
                  <td>
                    <button className="link danger" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
