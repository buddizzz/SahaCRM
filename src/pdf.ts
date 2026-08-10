import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS, type PatientRecord } from "./types";

function statusCell(record: PatientRecord): { label: string; color: string } {
  if (!record.status) return { label: "لم يُصنّف", color: "#94a3b8" };
  return { label: STATUS_LABELS[record.status], color: STATUS_COLORS[record.status] };
}

function buildReportElement(records: PatientRecord[]): HTMLElement {
  const now = new Date();
  const counts = {
    no_answer: records.filter((r) => r.status === "no_answer").length,
    unsatisfied: records.filter((r) => r.status === "unsatisfied").length,
    satisfied: records.filter((r) => r.status === "satisfied").length,
  };

  const container = document.createElement("div");
  container.setAttribute("dir", "rtl");
  container.style.cssText = [
    "position:fixed",
    "top:0",
    "right:-10000px",
    "width:794px",
    "padding:32px",
    "background:#ffffff",
    "color:#0f172a",
    "font-family:'Cairo','Noto Naskh Arabic',system-ui,sans-serif",
    "box-sizing:border-box",
  ].join(";");

  const rows = records
    .map((r, i) => {
      const s = statusCell(r);
      return `
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
          <td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(r.name) || "—"}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${escapeHtml(r.nationalId) || "—"}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${CATEGORY_LABELS[r.category]}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">
            <span style="display:inline-block;padding:4px 12px;border-radius:999px;color:#fff;font-weight:700;background:${s.color}">${s.label}</span>
          </td>
        </tr>`;
    })
    .join("");

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0e7490;padding-bottom:12px;margin-bottom:16px">
      <div>
        <div style="font-size:26px;font-weight:800;color:#0e7490">صحة CRM</div>
        <div style="font-size:14px;color:#475569">تقرير متابعة المراجعين</div>
      </div>
      <div style="text-align:left;font-size:13px;color:#475569">
        <div>التاريخ: ${now.toLocaleDateString("ar-SA-u-ca-gregory")}</div>
        <div>الوقت: ${now.toLocaleTimeString("ar-SA")}</div>
        <div>الإجمالي: ${records.length} مراجع</div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:18px">
      <div style="flex:1;padding:10px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca">
        <div style="color:#dc2626;font-weight:800;font-size:20px">${counts.no_answer}</div>
        <div style="color:#7f1d1d;font-size:13px">لم يرد</div>
      </div>
      <div style="flex:1;padding:10px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a">
        <div style="color:#d97706;font-weight:800;font-size:20px">${counts.unsatisfied}</div>
        <div style="color:#78350f;font-size:13px">غير راضٍ</div>
      </div>
      <div style="flex:1;padding:10px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0">
        <div style="color:#16a34a;font-weight:800;font-size:20px">${counts.satisfied}</div>
        <div style="color:#14532d;font-size:13px">راضٍ</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#0e7490;color:#fff">
          <th style="padding:10px;border:1px solid #0e7490">#</th>
          <th style="padding:10px;border:1px solid #0e7490">اسم المراجع</th>
          <th style="padding:10px;border:1px solid #0e7490">رقم الهوية</th>
          <th style="padding:10px;border:1px solid #0e7490">القسم</th>
          <th style="padding:10px;border:1px solid #0e7490">التصنيف</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center">
      تم إنشاء هذا التقرير محليًا في المتصفح ولا يتم حفظ أي بيانات على أي خادم.
    </div>
  `;
  return container;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export async function exportReportPdf(records: PatientRecord[]): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const element = buildReportElement(records);
  document.body.appendChild(element);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    pdf.save(`saha-crm-report-${stamp}.pdf`);
  } finally {
    document.body.removeChild(element);
  }
}
