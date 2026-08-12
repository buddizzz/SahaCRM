export type Category = "family" | "vaccination";

export type CallStatus = "no_answer" | "unsatisfied" | "satisfied";

export interface PatientRecord {
  id: string;
  category: Category;
  name: string;
  nationalId: string;
  appointmentDate: string;
  appointmentTime: string;
  arrivalDate: string;
  doctor: string;
  specialty: string;
  phone: string;
  status: CallStatus | null;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  family: "طب الأسرة",
  vaccination: "التطعيم",
};

export const STATUS_LABELS: Record<CallStatus, string> = {
  no_answer: "لم يرد",
  unsatisfied: "غير راضٍ",
  satisfied: "راضٍ",
};

export const STATUS_COLORS: Record<CallStatus, string> = {
  no_answer: "#dc2626",
  unsatisfied: "#f59e0b",
  satisfied: "#16a34a",
};
