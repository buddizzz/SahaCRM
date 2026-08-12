import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { cell, mapColumns, normalizePhone, parseExcelFile } from "./excel";

test("patient name maps to اسم المراجع, not اسم المديرية", () => {
  const headers = [
    "اسم المديرية",
    "اسم المركز الصحي",
    "اسم المراجع",
    "رقم الهوية",
    "موعد الحجز",
    "وقت بداية الموعد",
    "تاريخ وصول المراجع",
    "اسم الطبيب",
    "اسم التخصص",
    "رقم الجوال",
  ];
  const map = mapColumns(headers);
  assert.equal(map.name, "اسم المراجع");
  assert.equal(map.nationalId, "رقم الهوية");
  assert.equal(map.appointmentDate, "موعد الحجز");
  assert.equal(map.appointmentTime, "وقت بداية الموعد");
  assert.equal(map.arrivalDate, "تاريخ وصول المراجع");
  assert.equal(map.doctor, "اسم الطبيب");
  assert.equal(map.specialty, "اسم التخصص");
  assert.equal(map.phone, "رقم الجوال");
});

test("directorate/center columns are never used as the name", () => {
  const map = mapColumns(["اسم المديرية", "اسم المركز الصحي", "رقم الهوية"]);
  assert.notEqual(map.name, "اسم المديرية");
  assert.notEqual(map.name, "اسم المركز الصحي");
  assert.equal(map.name, undefined);
});

test("falls back to الاسم when there is no مراجع column", () => {
  const map = mapColumns(["اسم المديرية", "الاسم", "الجوال", "التخصص"]);
  assert.equal(map.name, "الاسم");
  assert.equal(map.phone, "الجوال");
  assert.equal(map.specialty, "التخصص");
});

test("handles diacritics, alef and ta-marbuta variations", () => {
  const map = mapColumns(["اسم المُراجِع", "رقم الهويّة", "الجوّال"]);
  assert.equal(map.name, "اسم المُراجِع");
  assert.equal(map.nationalId, "رقم الهويّة");
  assert.equal(map.phone, "الجوّال");
});

test("time is not misread as the appointment date", () => {
  const map = mapColumns(["تاريخ الموعد", "وقت بداية الموعد"]);
  assert.equal(map.appointmentDate, "تاريخ الموعد");
  assert.equal(map.appointmentTime, "وقت بداية الموعد");
});

test("arrival date is not mistaken for appointment date or patient name", () => {
  const map = mapColumns([
    "اسم المراجع",
    "موعد الحجز",
    "وقت بداية الموعد",
    "تاريخ وصول المراجع",
  ]);
  assert.equal(map.name, "اسم المراجع");
  assert.equal(map.appointmentDate, "موعد الحجز");
  assert.equal(map.appointmentTime, "وقت بداية الموعد");
  assert.equal(map.arrivalDate, "تاريخ وصول المراجع");
});

test("وقت الحجز is never used as appointment start time", () => {
  const map = mapColumns(["موعد الحجز", "وقت الحجز", "وقت بداية الموعد"]);
  assert.equal(map.appointmentDate, "موعد الحجز");
  assert.equal(map.appointmentTime, "وقت بداية الموعد");
});

test("وقت الحجز alone does not map to appointment time", () => {
  const map = mapColumns(["موعد الحجز", "وقت الحجز"]);
  assert.equal(map.appointmentDate, "موعد الحجز");
  assert.equal(map.appointmentTime, undefined);
});

test("وقت بداية موعد without ال still maps", () => {
  const map = mapColumns(["موعد الحجز", "وقت الحجز", "وقت بداية موعد"]);
  assert.equal(map.appointmentTime, "وقت بداية موعد");
});

test("English headers also map", () => {
  const map = mapColumns(["Patient Name", "National ID", "Mobile", "Doctor", "Specialty"]);
  assert.equal(map.name, "Patient Name");
  assert.equal(map.nationalId, "National ID");
  assert.equal(map.phone, "Mobile");
  assert.equal(map.doctor, "Doctor");
  assert.equal(map.specialty, "Specialty");
});

test("normalizePhone converts 9665… to 05…", () => {
  assert.equal(normalizePhone("966512345678"), "0512345678");
  assert.equal(normalizePhone("+966512345678"), "0512345678");
  assert.equal(normalizePhone("00966512345678"), "0512345678");
  assert.equal(normalizePhone("966 5 1234 5678"), "0512345678");
  assert.equal(normalizePhone("0512345678"), "0512345678");
  assert.equal(normalizePhone(""), "");
});

test("cell formats Excel time serials as HH:mm, not 1899 dates", () => {
  assert.equal(cell(0.3958333333, "time"), "09:30");
  const localTime = new Date(1899, 11, 31, 9, 30, 0);
  assert.equal(cell(localTime, "time"), "09:30");
  assert.equal(cell(new Date(2026, 7, 12), "date"), "2026-08-12");
});

test("parseExcelFile reads وقت بداية الموعد, not وقت الحجز", async () => {
  const headers = [
    "اسم المراجع",
    "رقم الهوية",
    "موعد الحجز",
    "وقت الحجز",
    "وقت بداية الموعد",
    "تاريخ وصول المراجع",
    "اسم الطبيب",
    "اسم التخصص",
    "رقم الجوال",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    [
      "محمد أحمد",
      "1012345678",
      "2026-08-12",
      "08:00",
      null,
      "2026-08-12",
      "د. سعاد",
      "طب الأسرة",
      "0501234567",
    ],
  ]);
  // Real MOH exports store start time as an Excel time serial.
  ws["E2"] = { t: "n", v: 0.3958333333, z: "hh:mm" };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المراجعون");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const file = new File([buf], "patients.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const result = await parseExcelFile(file, "family");
  assert.equal(result.matchedColumns.appointmentTime, "وقت بداية الموعد");
  assert.notEqual(result.matchedColumns.appointmentTime, "وقت الحجز");
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].appointmentTime, "09:30");
  assert.notEqual(result.records[0].appointmentTime, "08:00");
  assert.equal(result.records[0].arrivalDate, "2026-08-12");
});
