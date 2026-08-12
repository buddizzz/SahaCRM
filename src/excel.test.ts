import assert from "node:assert/strict";
import { test } from "node:test";
import { mapColumns } from "./excel";

test("patient name maps to اسم المراجع, not اسم المديرية", () => {
  const headers = [
    "اسم المديرية",
    "اسم المركز الصحي",
    "اسم المراجع",
    "رقم الهوية",
    "موعد الحجز",
    "وقت بداية الموعد",
    "اسم الطبيب",
    "اسم التخصص",
    "رقم الجوال",
  ];
  const map = mapColumns(headers);
  assert.equal(map.name, "اسم المراجع");
  assert.equal(map.nationalId, "رقم الهوية");
  assert.equal(map.appointmentDate, "موعد الحجز");
  assert.equal(map.appointmentTime, "وقت بداية الموعد");
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

test("appointment date still maps; near time headers do not steal it", () => {
  const map = mapColumns(["تاريخ الموعد", "وقت الموعد"]);
  assert.equal(map.appointmentDate, "تاريخ الموعد");
  // Time is exact-match only — "وقت الموعد" must not map.
  assert.equal(map.appointmentTime, undefined);
});

test("appointmentTime only matches the exact header وقت بداية الموعد", () => {
  const exact = mapColumns(["وقت بداية الموعد", "موعد الحجز"]);
  assert.equal(exact.appointmentTime, "وقت بداية الموعد");

  // Near variants and older labels must not match.
  const near = mapColumns(["وقت الحجز", "وقت الموعد", "الوقت", "وقت", "Appointment Time", "time"]);
  assert.equal(near.appointmentTime, undefined);

  // Extra spaces / different wording must not match.
  const spaced = mapColumns(["وقت  بداية  الموعد", "وقت بداية الموعد "]);
  assert.equal(spaced.appointmentTime, undefined);
});

test("English headers also map", () => {
  const map = mapColumns(["Patient Name", "National ID", "Mobile", "Doctor", "Specialty"]);
  assert.equal(map.name, "Patient Name");
  assert.equal(map.nationalId, "National ID");
  assert.equal(map.phone, "Mobile");
  assert.equal(map.doctor, "Doctor");
  assert.equal(map.specialty, "Specialty");
});
