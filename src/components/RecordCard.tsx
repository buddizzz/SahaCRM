import { CATEGORY_LABELS, STATUS_LABELS, type CallStatus, type PatientRecord } from "../types";

interface Props {
  record: PatientRecord;
  callHref: string;
  onCall: () => void;
  onSetStatus: (status: CallStatus) => void;
}

const STATUS_ORDER: CallStatus[] = ["no_answer", "unsatisfied", "satisfied"];

export function RecordCard({ record, callHref, onCall, onSetStatus }: Props) {
  return (
    <div className={`record ${record.status ? `record-${record.status}` : ""}`}>
      <div className="record-head">
        <div>
          <div className="record-name">{record.name || "—"}</div>
          <div className="record-id">هوية: {record.nationalId || "—"}</div>
        </div>
        <span className={`chip chip-${record.category}`}>{CATEGORY_LABELS[record.category]}</span>
      </div>

      <div className="record-fields">
        <Field label="موعد الحجز" value={record.appointmentDate} />
        <Field label="وقت الحجز" value={record.appointmentTime} />
        <Field label="الطبيب" value={record.doctor} />
        <Field label="التخصص" value={record.specialty} />
      </div>

      <div className="record-actions">
        <a
          className="call-btn"
          href={callHref}
          onClick={onCall}
          title="اتصال عبر التطبيق الخارجي"
        >
          <span className="call-icon">📞</span>
          <span>{record.phone || "لا يوجد رقم"}</span>
        </a>

        <div className="status-group" role="group" aria-label="تصنيف المكالمة">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={`status-btn status-${s} ${record.status === s ? "active" : ""}`}
              onClick={() => onSetStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value || "—"}</span>
    </div>
  );
}
