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
export function normalize(input: string): string {
  return String(input)
    .replace(/^\uFEFF/, "") // BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/[\u00A0\u202F\u2007\u2060]/g, " ") // nbsp variants → space
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

/**
 * These fields bind ONLY to the exact Excel header (after normalisation).
 * Fuzzy keyword matching must never pick "وقت الحجز" for appointment time.
 */
const EXACT_HEADERS: Array<[Field, string]> = [
  ["appointmentTime", "وقت بداية الموعد"],
  ["arrivalDate", "تاريخ وصول المراجع"],
];

// Strong, specific keywords checked in priority order. The patient-name field
// intentionally does NOT match the bare word "اسم" here, because many columns
// contain it (اسم المديرية، اسم المركز، اسم الطبيب، اسم التخصص). Those are
// resolved by their own strong keywords or excluded from the name fallback.
// appointmentTime / arrivalDate are intentionally absent — exact match only.
const FIELD_KEYWORDS: Array<[Field, string[]]> = [
  ["nationalId", ["الهويه", "هويه", "السجلالمدني", "الرقمالمدني", "الاقامه", "nationalid", "identity", "iqama"]],
  ["specialty", ["التخصص", "تخصص", "العياده", "عياده", "specialty", "speciality", "clinic"]],
  ["doctor", ["الطبيب", "طبيب", "دكتور", "المعالج", "الممارس", "doctor", "physician"]],
  ["phone", ["الجوال", "جوال", "اتصال", "هاتف", "تلفون", "تواصل", "موبايل", "واتس", "phone", "mobile", "tel", "contact", "whatsapp"]],
  ["appointmentDate", ["التاريخ", "تاريخ", "موعد", "اليوم", "date", "appointment"]],
  ["name", ["اسمالمراجع", "المراجع", "مراجع", "المريض", "مريض", "المستفيد", "مستفيد", "patient", "beneficiary"]],
];

// Generic name tokens used only as a last resort, guarded by exclusions so a
// column like "اسم المديرية" is never mistaken for the patient name.
const NAME_FALLBACK = ["الاسمالرباعي", "الاسمالكامل", "الاسم", "اسم", "fullname", "name"];
const NAME_EXCLUDE = [
  "مديريه", "مركز", "قطاع", "مستشفى", "مستشفي", "خدمه", "نوع", "الجهه", "الاداره",
  "القسم", "الملف", "المشروع", "الطبيب", "التخصص", "العياده", "الشركه", "وصول",
];

function findExactHeader(headers: string[], label: string): string | undefined {
  const target = normalize(label);
  return headers.find((header) => normalize(header) === target);
}

export function mapColumns(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  const used = new Set<string>();

  // 1) Exact header names first (وقت بداية الموعد, تاريخ وصول المراجع).
  for (const [field, label] of EXACT_HEADERS) {
    const header = findExactHeader(headers, label);
    if (header) {
      map[field] = header;
      used.add(header);
    }
  }

  // 2) Fuzzy keywords for the remaining fields.
  for (const [field, keywords] of FIELD_KEYWORDS) {
    const normalized = keywords.map(normalize);
    for (const header of headers) {
      if (used.has(header) || map[field]) continue;
      const h = normalize(header);
      if (!h) continue;
      // Do not let appointmentDate claim start-time / arrival columns.
      if (
        field === "appointmentDate" &&
        (h.includes(normalize("بداية")) ||
          h.includes(normalize("وصول")) ||
          h.includes(normalize("وقت")))
      ) {
        continue;
      }
      if (normalized.some((kw) => h.includes(kw))) {
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format an Excel time fraction (0–1) or Date as HH:mm. */
function formatTimeValue(value: Date | number): string {
  if (typeof value === "number") {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${pad2(hours)}:${pad2(minutes)}`;
  }
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

function formatDateValue(value: Date): string {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

/**
 * Convert a spreadsheet cell to display text.
 * Excel time-only serials become Date objects near 1899/1900 — those must show
 * as HH:mm, not as a bogus calendar date like 1899-12-31.
 */
export function cell(value: unknown, kind: "date" | "time" | "text" = "text"): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    if (kind === "time" && value >= 0 && value < 1) return formatTimeValue(value);
    return String(value);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const excelEpoch = value.getFullYear() < 1901;
    if (kind === "time" || excelEpoch) return formatTimeValue(value);
    if (kind === "date") return formatDateValue(value);
    const hasTime =
      value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    return hasTime
      ? `${formatDateValue(value)} ${formatTimeValue(value)}`
      : formatDateValue(value);
  }

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

  // Read header row directly so we can exact-match "وقت بداية الموعد"
  // even when the first data row is sparse.
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (matrix.length === 0) return { records: [], matchedColumns: {}, totalRows: 0 };

  const headerRow = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
  const headers = headerRow.filter((h) => h.length > 0);
  const columnMap = mapColumns(headers);

  // raw:false keeps Excel's displayed values (e.g. "09:30" for time cells)
  // instead of Date objects that would otherwise become "1899-12-31".
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (rows.length === 0) return { records: [], matchedColumns: columnMap, totalRows: 0 };

  const records: PatientRecord[] = [];
  for (const row of rows) {
    const get = (field: Field, kind: "date" | "time" | "text" = "text"): string => {
      const header = columnMap[field];
      if (!header) return "";
      // Prefer the exact mapped header key; also try a normalised key lookup
      // in case SheetJS altered whitespace on the object key.
      if (Object.prototype.hasOwnProperty.call(row, header)) {
        return cell(row[header], kind);
      }
      const target = normalize(header);
      const key = Object.keys(row).find((k) => normalize(k) === target);
      return key ? cell(row[key], kind) : "";
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
      appointmentDate: get("appointmentDate", "date"),
      // Bound exclusively via exact header "وقت بداية الموعد" in mapColumns.
      appointmentTime: get("appointmentTime", "time"),
      arrivalDate: get("arrivalDate", "date"),
      doctor: get("doctor"),
      specialty: get("specialty"),
      phone,
      status: null,
    });
  }

  return { records, matchedColumns: columnMap, totalRows: rows.length };
}
