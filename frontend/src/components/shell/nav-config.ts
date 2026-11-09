import type { Role } from "@/types/api";

export type NavIcon =
  | "home"
  | "search"
  | "calendar"
  | "file"
  | "wallet"
  | "user"
  | "flask"
  | "clock"
  | "stethoscope"
  | "users"
  | "building"
  | "shield"
  | "receipt"
  | "pill"
  | "siren";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  patient: [
    { href: "/patient", label: "Overview", icon: "home" },
    { href: "/patient/doctors", label: "Find a doctor", icon: "search" },
    { href: "/patient/appointments", label: "Appointments", icon: "calendar" },
    { href: "/patient/records", label: "Health records", icon: "file" },
    { href: "/patient/billing", label: "Billing", icon: "wallet" },
    { href: "/patient/profile", label: "Profile", icon: "user" },
  ],
  doctor: [
    { href: "/doctor", label: "Today", icon: "home" },
    { href: "/doctor/appointments", label: "Schedule", icon: "calendar" },
    { href: "/doctor/labs", label: "Lab results", icon: "flask" },
    { href: "/doctor/availability", label: "Availability", icon: "clock" },
    { href: "/doctor/emergency", label: "Emergency access", icon: "siren" },
  ],
  lab: [
    { href: "/lab", label: "Work queue", icon: "flask" },
    { href: "/lab/completed", label: "Verified results", icon: "file" },
  ],
  billing: [
    { href: "/billing", label: "Overview", icon: "home" },
    { href: "/billing/invoices", label: "Invoices", icon: "receipt" },
    { href: "/billing/patients", label: "Patients & insurance", icon: "users" },
    { href: "/billing/claims", label: "Insurance claims", icon: "shield" },
    { href: "/billing/prescriptions", label: "Fulfilment", icon: "pill" },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: "home" },
    { href: "/admin/doctors", label: "Doctors", icon: "stethoscope" },
    { href: "/admin/users", label: "Users & staff", icon: "users" },
    { href: "/admin/departments", label: "Departments", icon: "building" },
    { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
    { href: "/admin/audit", label: "Audit log", icon: "shield" },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  doctor: "Doctor",
  lab: "Lab technician",
  billing: "Billing & insurance",
  admin: "Administrator",
};
