export type CustomerStatus = "lead" | "prospect" | "active" | "churned";

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  totalCustomers: number;
  byStatus: Array<{ status: string; n: number }>;
  openPipeline: number;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: CustomerStatus;
  notes?: string;
}

async function handle<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listCustomers: (q = "") =>
    handle<Customer[]>(fetch(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`)),
  createCustomer: (input: CustomerInput) =>
    handle<Customer>(
      fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  updateCustomer: (id: number, input: Partial<CustomerInput>) =>
    handle<Customer>(
      fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  deleteCustomer: (id: number) =>
    handle<void>(fetch(`/api/customers/${id}`, { method: "DELETE" })),
  stats: () => handle<Stats>(fetch("/api/stats")),
};
