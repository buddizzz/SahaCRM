import type { Category, PatientRecord } from "./types";

type Field = keyof Pick<
  PatientRecord,
  "name" | "nationalId" | "appointmentDate" | "appointmentTime" | "doctor" | "specialty" | "phone"
>;

/** Normalise an Arabic/English header for keyword matching. */
function normalize(input: string): string {
  return String(input)
    .replace(/[\u064B-\u0652\u0640]/g, "") // tashkeel + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

// Checked in priority order so more specific headers win
// (e.g. "اسم الطبيب" maps to doctor, not name).
const FIELD_KEYWORDS: Array<[Field, string[]]> = [
  ["nationalId", ["هوية", "الهويه", "nationalid", "id"]],
  ["specialty", ["تخصص", "specialty", "speciality"]],
  ["doctor", ["طبيب", "دكتور", "doctor", "physician"]],
  ["phone", ["اتصال", "جوال", "هاتف", "تواصل", "phone", "mobile", "tel", "contact"]],
  ["appointmentTime", ["وقت", "ساعه", "الساعه", "زمن", "time"]],
  ["appointmentDate", ["تاريخ", "موعد", "الحجز", "date", "appointment"]],
  ["name", ["مراجع", "الاسم", "اسم", "name", "patient"]],
];

function matchField(header: string): Field | null {
  const h = normalize(header);
  if (!h) return null;
  for (const [field, keywords] of FIELD_KEYWORDS) {
    if (keywords.some((kw) => h.includes(normalize(kw)))) return field;
  }
  return null;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export interface ParseResult {
  records: PatientRecord[];
  matchedColumns: Partial<Record<Field, string>>;
  totalRows: number;
}

export async function parseExcelFile(file: File, category: Category): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { records: [], matchedColumns: {}, totalRows: 0 };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) return { records: [], matchedColumns: {}, totalRows: 0 };

  // Map each spreadsheet column header to one of our fields.
  const headers = Object.keys(rows[0]);
  const columnMap: Partial<Record<Field, string>> = {};
  for (const header of headers) {
    const field = matchField(header);
    if (field && !columnMap[field]) columnMap[field] = header;
  }

  const records: PatientRecord[] = [];
  for (const row of rows) {
    const get = (field: Field): string => {
      const header = columnMap[field];
      return header ? cell(row[header]) : "";
    };
    const name = get("name");
    const phone = get("phone");
    const nationalId = get("nationalId");
    // Skip fully empty rows.
    if (!name && !phone && !nationalId) continue;
    records.push({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      category,
      name,
      nationalId,
      appointmentDate: get("appointmentDate"),
      appointmentTime: get("appointmentTime"),
      doctor: get("doctor"),
      specialty: get("specialty"),
      phone,
      status: null,
    });
  }

  return { records, matchedColumns: columnMap, totalRows: rows.length };
}
