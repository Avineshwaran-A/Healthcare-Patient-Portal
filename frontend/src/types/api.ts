export type Role = "patient" | "doctor" | "admin";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type LabStatus = "requested" | "completed";
export type InvoiceStatus = "unpaid" | "paid" | "void";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface Me {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  patient_id: number | null;
  doctor_id: number | null;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
}

export interface Doctor {
  id: number;
  full_name: string;
  specialty: string;
  qualifications: string;
  experience_years: number;
  consultation_fee: string;
  bio: string | null;
  department: Department | null;
  is_approved: boolean;
}

export interface AvailabilityWindow {
  id?: number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface DoctorDetail extends Doctor {
  availability: AvailabilityWindow[];
}

export interface Slot {
  start_at: string;
  end_at: string;
}

export interface Appointment {
  id: number;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  reason: string | null;
  patient: { id: number; full_name: string };
  doctor: { id: number; full_name: string };
  specialty: string;
  has_record: boolean;
}

export interface PatientProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  emergency_contact: string | null;
  allergies: string | null;
}

export interface MedicalRecord {
  id: number;
  appointment_id: number | null;
  doctor_name: string;
  chief_complaint: string | null;
  assessment: string | null;
  notes: string;
  created_at: string;
}

export interface RxItem {
  id?: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string | null;
}

export interface Prescription {
  id: number;
  appointment_id: number | null;
  doctor_name: string;
  notes: string | null;
  created_at: string;
  items: RxItem[];
}

export interface LabReport {
  id: number;
  appointment_id: number | null;
  doctor_name: string;
  patient_name: string;
  test_name: string;
  status: LabStatus;
  result_summary: string | null;
  has_file: boolean;
  file_name: string | null;
  requested_at: string;
  completed_at: string | null;
}

export interface PatientHistory {
  patient: PatientProfile;
  records: MedicalRecord[];
  prescriptions: Prescription[];
  labs: LabReport[];
}

export interface Invoice {
  id: number;
  appointment_id: number | null;
  patient_name: string;
  description: string;
  amount: string;
  status: InvoiceStatus;
  issued_at: string;
  paid_at: string | null;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UserRow {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface AdminDoctorRow {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  specialty: string;
  registration_number: string;
  department: string | null;
  is_approved: boolean;
  is_active: boolean;
}

export interface AuditEntry {
  id: number;
  actor: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Stats {
  patients: number;
  doctors: number;
  pending_doctors: number;
  departments: number;
  appointments_today: number;
  appointments_upcoming: number;
  appointments_by_status: Record<string, number>;
  revenue_paid: string;
  revenue_outstanding: string;
  appointments_last_7_days: { date: string; count: number }[];
}

export interface DoctorDashboard {
  today: Appointment[];
  upcoming_count: number;
  completed_this_week: number;
  pending_labs: number;
}
