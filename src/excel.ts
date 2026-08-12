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
  // Strict: only appointment-start headers (بداية الموعد). Never "وقت الحجز".
  ["appointmentTime", ["وقتبدايهالموعد", "وقتبدايهموعد", "بدايهالموعد", "بدايهموعد"]],
  ["appointmentDate", ["التاريخ", "تاريخ", "موعد", "اليوم", "date", "appointment"]],
  ["name", ["اسمالمراجع", "المراجع", "مراجع", "المريض", "مريض", "المستفيد", "مستفيد", "patient", "beneficiary"]],
];

/** Headers that must never be used for appointment start time. */
const APPOINTMENT_TIME_EXCLUDE = ["حجز", "وصول", "booking"];

// Generic name tokens used only as a last resort, guarded by exclusions so a
// column like "اسم المديرية" is never mistaken for the patient name.
const NAME_FALLBACK = ["الاسمالرباعي", "الاسمالكامل", "الاسم", "اسم", "fullname", "name"];
const NAME_EXCLUDE = [
  "مديريه", "مركز", "قطاع", "مستشفى", "مستشفي", "خدمه", "نوع", "الجهه", "الاداره",
  "القسم", "الملف", "المشروع", "الطبيب", "التخصص", "العياده", "الشركه", "وصول",
];

export function mapColumns(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  const used = new Set<string>();
  const timeExclude = APPOINTMENT_TIME_EXCLUDE.map(normalize);

  for (const [field, keywords] of FIELD_KEYWORDS) {
    const normalized = keywords.map(normalize);
    for (const header of headers) {
      if (used.has(header) || map[field]) continue;
      const h = normalize(header);
      if (!h) continue;
      // Never map booking/arrival time columns to appointment start time.
      if (field === "appointmentTime" && timeExclude.some((ex) => h.includes(ex))) continue;
      // appointmentDate must not steal start-time or arrival columns.
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

  // raw:false keeps Excel's displayed values (e.g. "09:30" for time cells)
  // instead of Date objects that would otherwise become "1899-12-31".
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (rows.length === 0) return { records: [], matchedColumns: {}, totalRows: 0 };

  // Map each spreadsheet column header to one of our fields.
  const headers = Object.keys(rows[0]);
  const columnMap = mapColumns(headers);

  const records: PatientRecord[] = [];
  for (const row of rows) {
    const get = (field: Field, kind: "date" | "time" | "text" = "text"): string => {
      const header = columnMap[field];
      return header ? cell(row[header], kind) : "";
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
