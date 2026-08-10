import { useEffect, useMemo, useState } from "react";
import { RecordCard } from "./components/RecordCard";
import { UploadScreen } from "./components/UploadScreen";
import { exportReportPdf } from "./pdf";
import {
  DEFAULT_CALL_SCHEME,
  clearSession,
  loadCallScheme,
  loadRecords,
  saveCallScheme,
  saveRecords,
} from "./storage";
import {
  CATEGORY_LABELS,
  type CallStatus,
  type Category,
  type PatientRecord,
} from "./types";

type CategoryFilter = "all" | Category;
type StatusFilter = "all" | CallStatus | "none";

export function App() {
  const [records, setRecords] = useState<PatientRecord[]>(() => loadRecords());
  const [callScheme, setCallScheme] = useState<string>(() => loadCallScheme());
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    saveCallScheme(callScheme);
  }, [callScheme]);

  function loadFiles(loaded: PatientRecord[]) {
    setRecords(loaded);
  }

  function setStatus(id: string, status: CallStatus) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === status ? null : status } : r)),
    );
  }

  function endSession() {
    if (!confirm("إنهاء الجلسة سيحذف جميع البيانات من المتصفح. هل تريد المتابعة؟")) return;
    clearSession();
    setRecords([]);
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportReportPdf(records);
    } finally {
      setExporting(false);
    }
  }

  function callHref(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, "");
    return `${callScheme}${digits}`;
  }

  const counts = useMemo(() => {
    return {
      total: records.length,
      no_answer: records.filter((r) => r.status === "no_answer").length,
      unsatisfied: records.filter((r) => r.status === "unsatisfied").length,
      satisfied: records.filter((r) => r.status === "satisfied").length,
      none: records.filter((r) => !r.status).length,
    };
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim();
    return records.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter === "none" && r.status) return false;
      if (statusFilter !== "all" && statusFilter !== "none" && r.status !== statusFilter)
        return false;
      if (q && !`${r.name} ${r.nationalId} ${r.phone} ${r.doctor}`.includes(q)) return false;
      return true;
    });
  }, [records, categoryFilter, statusFilter, search]);

  if (records.length === 0) {
    return (
      <div className="app">
        <Header counts={counts} showActions={false} />
        <UploadScreen onLoaded={loadFiles} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        counts={counts}
        showActions
        exporting={exporting}
        onExport={handleExport}
        onEndSession={endSession}
        onToggleSettings={() => setShowSettings((v) => !v)}
      />

      {showSettings && (
        <div className="settings">
          <label>
            صيغة رابط الاتصال (للربط مع تطبيق خارجي مثل Zain Calls Pro)
            <input
              value={callScheme}
              onChange={(e) => setCallScheme(e.target.value)}
              placeholder={DEFAULT_CALL_SCHEME}
            />
          </label>
          <p className="hint">
            الافتراضي <code>tel:</code> يفتح تطبيق الاتصال على iOS ويمكن تعيين Zain Calls Pro كتطبيق
            الاتصال الافتراضي. إن كان للتطبيق رابط مخصص، أدخله هنا (مثل <code>zaincalls://</code>).
          </p>
          <button className="link" onClick={() => setCallScheme(DEFAULT_CALL_SCHEME)}>
            إعادة للافتراضي
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="tabs">
          <Tab active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
            الكل ({records.length})
          </Tab>
          <Tab active={categoryFilter === "family"} onClick={() => setCategoryFilter("family")}>
            {CATEGORY_LABELS.family}
          </Tab>
          <Tab
            active={categoryFilter === "vaccination"}
            onClick={() => setCategoryFilter("vaccination")}
          >
            {CATEGORY_LABELS.vaccination}
          </Tab>
        </div>
        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">كل التصنيفات</option>
          <option value="none">لم يُصنّف</option>
          <option value="no_answer">لم يرد</option>
          <option value="unsatisfied">غير راضٍ</option>
          <option value="satisfied">راضٍ</option>
        </select>
        <input
          className="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهوية أو الرقم…"
        />
      </div>

      <div className="records">
        {filtered.length === 0 ? (
          <div className="empty">لا توجد سجلات مطابقة.</div>
        ) : (
          filtered.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              callHref={callHref(r.phone)}
              onCall={() => undefined}
              onSetStatus={(s) => setStatus(r.id, s)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface Counts {
  total: number;
  no_answer: number;
  unsatisfied: number;
  satisfied: number;
  none: number;
}

function Header({
  counts,
  showActions,
  exporting,
  onExport,
  onEndSession,
  onToggleSettings,
}: {
  counts: Counts;
  showActions: boolean;
  exporting?: boolean;
  onExport?: () => void;
  onEndSession?: () => void;
  onToggleSettings?: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">صحة</span>
        <div>
          <h1>صحة CRM</h1>
          <p>متابعة المراجعين لموظفي الصحة</p>
        </div>
      </div>
      {showActions && (
        <div className="header-actions">
          <div className="counters">
            <Counter color="#dc2626" label="لم يرد" value={counts.no_answer} />
            <Counter color="#f59e0b" label="غير راضٍ" value={counts.unsatisfied} />
            <Counter color="#16a34a" label="راضٍ" value={counts.satisfied} />
            <Counter color="#94a3b8" label="لم يُصنّف" value={counts.none} />
          </div>
          <button className="ghost" onClick={onToggleSettings} title="إعدادات">
            ⚙︎
          </button>
          <button className="primary" onClick={onExport} disabled={exporting}>
            {exporting ? "جارٍ التصدير…" : "تصدير PDF"}
          </button>
          <button className="danger-btn" onClick={onEndSession}>
            إنهاء الجلسة
          </button>
        </div>
      )}
    </header>
  );
}

function Counter({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="counter">
      <span className="dot" style={{ background: color }} />
      <span className="counter-value">{value}</span>
      <span className="counter-label">{label}</span>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
