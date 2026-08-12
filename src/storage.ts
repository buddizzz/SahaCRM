import { normalizePhone } from "./excel";
import type { PatientRecord } from "./types";

// sessionStorage is scoped to the browser tab and is automatically cleared
// when the employee closes the browser/tab. Nothing is persisted to disk or
// sent anywhere, which matches the "no stored data" requirement.
const RECORDS_KEY = "sahacrm.records.v1";
const SCHEME_KEY = "sahacrm.callScheme.v1";

export const DEFAULT_CALL_SCHEME = "tel:";

export function loadRecords(): PatientRecord[] {
  try {
    const raw = sessionStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PatientRecord[];
    if (!Array.isArray(parsed)) return [];
    // Re-normalise phones so numbers already in the session as 9665… show as 05…
    // Default missing fields for sessions saved before those columns existed.
    return parsed.map((r) => ({
      ...r,
      phone: normalizePhone(r.phone ?? ""),
      appointmentTime: r.appointmentTime ?? "",
      arrivalDate: r.arrivalDate ?? "",
    }));
  } catch {
    return [];
  }
}

export function saveRecords(records: PatientRecord[]): void {
  try {
    sessionStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Ignore quota / serialization errors – data is session-only anyway.
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(RECORDS_KEY);
}

export function loadCallScheme(): string {
  return sessionStorage.getItem(SCHEME_KEY) ?? DEFAULT_CALL_SCHEME;
}

export function saveCallScheme(scheme: string): void {
  sessionStorage.setItem(SCHEME_KEY, scheme || DEFAULT_CALL_SCHEME);
}
