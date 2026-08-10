// Generates two sample Excel files (family medicine + vaccination) with fake
// data so the app can be tried without real patient information.
// Usage: npm run gen:samples
import * as fs from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

// The SheetJS ESM build does not auto-load Node's fs; wire it up for writeFile.
XLSX.set_fs(fs);

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "samples");
mkdirSync(outDir, { recursive: true });

const HEADERS = [
  "اسم المراجع",
  "رقم الهوية",
  "موعد الحجز",
  "وقت الحجز",
  "اسم الطبيب",
  "اسم التخصص",
  "رقم الاتصال",
];

function row(name, id, date, time, doctor, specialty, phone) {
  return {
    "اسم المراجع": name,
    "رقم الهوية": id,
    "موعد الحجز": date,
    "وقت الحجز": time,
    "اسم الطبيب": doctor,
    "اسم التخصص": specialty,
    "رقم الاتصال": phone,
  };
}

const family = [
  row("محمد أحمد الغامدي", "1012345678", "2026-08-12", "09:00", "د. سعاد المطيري", "طب الأسرة", "0501234567"),
  row("نورة سعد القحطاني", "1023456789", "2026-08-12", "09:30", "د. خالد العتيبي", "طب الأسرة", "0552345678"),
  row("عبدالله فهد الشهري", "1034567890", "2026-08-12", "10:00", "د. سعاد المطيري", "طب الأسرة", "0533456789"),
  row("ريم ناصر الدوسري", "1045678901", "2026-08-13", "10:30", "د. خالد العتيبي", "طب الأسرة", "0544567890"),
  row("سلطان عمر الحربي", "1056789012", "2026-08-13", "11:00", "د. منى الزهراني", "طب الأسرة", "0565678901"),
];

const vaccination = [
  row("لمى تركي العنزي", "2011223344", "2026-08-12", "08:30", "د. هند البقمي", "التطعيمات", "0501112233"),
  row("فيصل ماجد السبيعي", "2022334455", "2026-08-12", "08:45", "د. هند البقمي", "التطعيمات", "0552223344"),
  row("جواهر بندر الرشيدي", "2033445566", "2026-08-13", "09:15", "د. أمل الشمري", "التطعيمات", "0533334455"),
  row("ياسر وليد المالكي", "2044556677", "2026-08-13", "09:45", "د. أمل الشمري", "التطعيمات", "0544445566"),
];

function write(fileName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المراجعون");
  const path = resolve(outDir, fileName);
  XLSX.writeFile(wb, path);
  console.log(`wrote ${path} (${rows.length} rows)`);
}

write("family-medicine.xlsx", family);
write("vaccination.xlsx", vaccination);
