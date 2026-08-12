import { useRef, useState } from "react";
import { parseExcelFile } from "../excel";
import type { Category, PatientRecord } from "../types";

interface Props {
  onLoaded: (records: PatientRecord[]) => void;
}

interface FileState {
  file: File | null;
  count: number | null;
}

export function UploadScreen({ onLoaded }: Props) {
  const [family, setFamily] = useState<FileState>({ file: null, count: null });
  const [vaccination, setVaccination] = useState<FileState>({ file: null, count: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const familyInput = useRef<HTMLInputElement>(null);
  const vaccinationInput = useRef<HTMLInputElement>(null);

  async function preview(file: File, category: Category) {
    try {
      const result = await parseExcelFile(file, category);
      const setter = category === "family" ? setFamily : setVaccination;
      setter({ file, count: result.records.length });
      setError(null);
    } catch {
      setError("تعذّر قراءة الملف. تأكد أنه ملف Excel صالح (.xlsx أو .xls).");
    }
  }

  async function handleStart() {
    if (!family.file && !vaccination.file) {
      setError("الرجاء رفع ملف واحد على الأقل.");
      return;
    }
    setBusy(true);
    try {
      const all: PatientRecord[] = [];
      if (family.file) all.push(...(await parseExcelFile(family.file, "family")).records);
      if (vaccination.file)
        all.push(...(await parseExcelFile(vaccination.file, "vaccination")).records);
      if (all.length === 0) {
        setError("لم يتم العثور على بيانات في الملفات المرفوعة.");
        return;
      }
      onLoaded(all);
    } catch {
      setError("حدث خطأ أثناء معالجة الملفات.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload">
      <p className="upload-intro">
        ارفع ملفات المراجعين بصيغة Excel للبدء. تتم المعالجة داخل متصفحك فقط، ولا يتم رفع أو حفظ أي
        بيانات على أي خادم.
      </p>

      <div className="upload-grid">
        <UploadCard
          title="طب الأسرة"
          icon="🩺"
          state={family}
          inputRef={familyInput}
          onPick={(f) => preview(f, "family")}
          onClear={() => {
            setFamily({ file: null, count: null });
            if (familyInput.current) familyInput.current.value = "";
          }}
        />
        <UploadCard
          title="التطعيم"
          icon="💉"
          state={vaccination}
          inputRef={vaccinationInput}
          onPick={(f) => preview(f, "vaccination")}
          onClear={() => {
            setVaccination({ file: null, count: null });
            if (vaccinationInput.current) vaccinationInput.current.value = "";
          }}
        />
      </div>

      {error && <div className="banner error">{error}</div>}

      <button className="primary big" onClick={handleStart} disabled={busy}>
        {busy ? "جارٍ المعالجة…" : "بدء المتابعة"}
      </button>

      <p className="upload-hint">
        الأعمدة المتوقعة: اسم المراجع، رقم الهوية، موعد الحجز، تاريخ وصول المراجع، اسم الطبيب، اسم التخصص، رقم
        الاتصال. يتم التعرف على الأعمدة تلقائيًا حتى لو اختلفت مسمياتها قليلًا.
      </p>
    </div>
  );
}

interface CardProps {
  title: string;
  icon: string;
  state: FileState;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (file: File) => void;
  onClear: () => void;
}

function UploadCard({ title, icon, state, inputRef, onPick, onClear }: CardProps) {
  return (
    <div className={`upload-card ${state.file ? "filled" : ""}`}>
      <div className="upload-card-icon">{icon}</div>
      <div className="upload-card-title">{title}</div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
      {state.file ? (
        <div className="upload-card-status">
          <span>✓ {state.count} سجل</span>
          <button className="link" onClick={onClear}>
            إزالة
          </button>
        </div>
      ) : (
        <div className="upload-card-status muted">لم يتم اختيار ملف</div>
      )}
    </div>
  );
}
