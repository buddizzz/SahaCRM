import assert from "node:assert/strict";
import { test } from "node:test";
import { mapColumns, normalizePhone } from "./excel";

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
