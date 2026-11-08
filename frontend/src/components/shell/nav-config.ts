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
  | "shield";

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
    { href: "/doctor/labs", label: "Lab requests", icon: "flask" },
    { href: "/doctor/availability", label: "Availability", icon: "clock" },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: "home" },
    { href: "/admin/doctors", label: "Doctors", icon: "stethoscope" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/departments", label: "Departments", icon: "building" },
    { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
    { href: "/admin/billing", label: "Billing", icon: "wallet" },
    { href: "/admin/audit", label: "Audit log", icon: "shield" },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Administrator",
};
