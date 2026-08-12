import type { Category, PatientRecord } from "./types";

type Field = keyof Pick<
  PatientRecord,
  | "name"
  | "nationalId"
  | "appointmentDate"
  | "appointmentTime"
  | "arrivalDate"
  | "doctor"
  | "specialty"
  | "phone"
>;

/** Normalise an Arabic/English header for keyword matching. */
function normalize(input: string): string {
  return String(input)
    .replace(/[\u064B-\u0652\u0640]/g, "") // tashkeel + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

// Strong, specific keywords checked in priority order. The patient-name field
// intentionally does NOT match the bare word "اسم" here, because many columns
// contain it (اسم المديرية، اسم المركز، اسم الطبيب، اسم التخصص). Those are
// resolved by their own strong keywords or excluded from the name fallback.
const FIELD_KEYWORDS: Array<[Field, string[]]> = [
  ["nationalId", ["الهويه", "هويه", "السجلالمدني", "الرقمالمدني", "الاقامه", "nationalid", "identity", "iqama"]],
  ["specialty", ["التخصص", "تخصص", "العياده", "عياده", "specialty", "speciality", "clinic"]],
  ["doctor", ["الطبيب", "طبيب", "دكتور", "المعالج", "الممارس", "doctor", "physician"]],
  ["phone", ["الجوال", "جوال", "اتصال", "هاتف", "تلفون", "تواصل", "موبايل", "واتس", "phone", "mobile", "tel", "contact", "whatsapp"]],
  // Arrival must precede appointmentDate: both headers contain "تاريخ".
  ["arrivalDate", ["وصوالمراجع", "تاريخالوصول", "وقتالوصول", "الوصول", "وصول", "arrival"]],
  // Only "وقت بداية الموعد" — never the booking column "وقت الحجز".
  ["appointmentTime", ["وقتبدايهالموعد", "بدايهالموعد"]],
  ["appointmentDate", ["التاريخ", "تاريخ", "موعد", "اليوم", "date", "appointment"]],
  ["name", ["اسمالمراجع", "المراجع", "مراجع", "المريض", "مريض", "المستفيد", "مستفيد", "patient", "beneficiary"]],
];

// Generic name tokens used only as a last resort, guarded by exclusions so a
// column like "اسم المديرية" is never mistaken for the patient name.
const NAME_FALLBACK = ["الاسمالرباعي", "الاسمالكامل", "الاسم", "اسم", "fullname", "name"];
const NAME_EXCLUDE = [
  "مديريه", "مركز", "قطاع", "مستشفى", "مستشفي", "خدمه", "نوع", "الجهه", "الاداره",
  "القسم", "الملف", "المشروع", "الطبيب", "التخصص", "العياده", "الشركه",
];

export function mapColumns(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  const used = new Set<string>();

  for (const [field, keywords] of FIELD_KEYWORDS) {
    const normalized = keywords.map(normalize);
    for (const header of headers) {
      if (used.has(header) || map[field]) continue;
      const h = normalize(header);
      if (h && normalized.some((kw) => h.includes(kw))) {
        map[field] = header;
        used.add(header);
        break;
      }
    }
  }

  if (!map.name) {
    const fallback = NAME_FALLBACK.map(normalize);
    const exclude = NAME_EXCLUDE.map(normalize);
    for (const header of headers) {
      if (used.has(header)) continue;
      const h = normalize(header);
      if (!h) continue;
      if (fallback.some((kw) => h.includes(kw)) && !exclude.some((ex) => h.includes(ex))) {
        map.name = header;
        used.add(header);
        break;
      }
    }
  }

  return map;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/**
 * Normalise Saudi mobile numbers to local form (05XXXXXXXX).
 * Spreadsheet exports often store the international form 9665XXXXXXXX
 * (with or without + / 00); dialling apps expect the local 05… form.
 */
export function normalizePhone(input: string): string {
  if (!input) return "";
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return String(input).trim();

  // 009665… → 9665…
  if (digits.startsWith("00966")) digits = digits.slice(2);

  // 9665XXXXXXXX → 05XXXXXXXX
  if (digits.startsWith("966") && digits.length >= 12) {
    digits = `0${digits.slice(3)}`;
  }

  return digits;
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
  const columnMap = mapColumns(headers);

  const records: PatientRecord[] = [];
  for (const row of rows) {
    const get = (field: Field): string => {
      const header = columnMap[field];
      return header ? cell(row[header]) : "";
    };
    const name = get("name");
    const phone = normalizePhone(get("phone"));
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
      arrivalDate: get("arrivalDate"),
      doctor: get("doctor"),
      specialty: get("specialty"),
      phone,
      status: null,
    });
  }

  return { records, matchedColumns: columnMap, totalRows: rows.length };
}
