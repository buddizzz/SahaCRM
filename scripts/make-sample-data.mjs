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

// Column order mirrors a real MOH daily export: several "اسم ..." columns
// (directorate, health center) appear BEFORE the patient's own name, which is
// exactly what used to confuse the auto-detection.
const HEADERS = [
  "اسم المديرية",
  "اسم المركز الصحي",
  "اسم المراجع",
  "رقم الهوية",
  "موعد الحجز",
  "تاريخ وصول المراجع",
  "اسم الطبيب",
  "اسم التخصص",
  "رقم الجوال",
];

const DIRECTORATE = "مديرية الشؤون الصحية بالرياض";

function row(center, name, id, date, arrival, doctor, specialty, phone) {
  return {
    "اسم المديرية": DIRECTORATE,
    "اسم المركز الصحي": center,
    "اسم المراجع": name,
    "رقم الهوية": id,
    "موعد الحجز": date,
    "تاريخ وصول المراجع": arrival,
    "اسم الطبيب": doctor,
    "اسم التخصص": specialty,
    "رقم الجوال": phone,
  };
}

const family = [
  row("مركز صحي النخيل", "محمد أحمد الغامدي", "1012345678", "2026-08-12", "2026-08-12", "د. سعاد المطيري", "طب الأسرة", "0501234567"),
  row("مركز صحي النخيل", "نورة سعد القحطاني", "1023456789", "2026-08-12", "2026-08-12", "د. خالد العتيبي", "طب الأسرة", "0552345678"),
  row("مركز صحي العليا", "عبدالله فهد الشهري", "1034567890", "2026-08-12", "2026-08-12", "د. سعاد المطيري", "طب الأسرة", "0533456789"),
  row("مركز صحي العليا", "ريم ناصر الدوسري", "1045678901", "2026-08-13", "2026-08-13", "د. خالد العتيبي", "طب الأسرة", "0544567890"),
  row("مركز صحي الملز", "سلطان عمر الحربي", "1056789012", "2026-08-13", "2026-08-13", "د. منى الزهراني", "طب الأسرة", "0565678901"),
];

const vaccination = [
  row("مركز صحي النخيل", "لمى تركي العنزي", "2011223344", "2026-08-12", "2026-08-12", "د. هند البقمي", "التطعيمات", "0501112233"),
  row("مركز صحي العليا", "فيصل ماجد السبيعي", "2022334455", "2026-08-12", "2026-08-12", "د. هند البقمي", "التطعيمات", "0552223344"),
  row("مركز صحي الملز", "جواهر بندر الرشيدي", "2033445566", "2026-08-13", "2026-08-13", "د. أمل الشمري", "التطعيمات", "0533334455"),
  row("مركز صحي الملز", "ياسر وليد المالكي", "2044556677", "2026-08-13", "2026-08-13", "د. أمل الشمري", "التطعيمات", "0544445566"),
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
