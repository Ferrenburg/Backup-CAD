import type { Database } from "./supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Outage = Database["public"]["Tables"]["outages"]["Row"];
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type CallInsert = Database["public"]["Tables"]["calls"]["Insert"];
export type CallUpdate = Database["public"]["Tables"]["calls"]["Update"];
export type UnitAssignment = Database["public"]["Tables"]["unit_assignments"]["Row"];
export type UnitAssignmentInsert = Database["public"]["Tables"]["unit_assignments"]["Insert"];
export type UnitAssignmentUpdate = Database["public"]["Tables"]["unit_assignments"]["Update"];
export type Lookup = Database["public"]["Tables"]["lookups"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];

export type Role = "readonly" | "dispatcher" | "supervisor" | "admin";
export type Agency = "PD" | "Fire" | "EMS" | "OEM";
export type OutageStatus = "open" | "restored" | "closed";
export type CallStatus = "active" | "cleared" | "voided";

export const LOOKUP_CATEGORIES = [
  "call_source",
  "activity_type",
  "agency",
  "priority",
  "jurisdiction",
  "call_type",
  "disposition",
  "unit_disposition",
] as const;
export type LookupCategory = (typeof LOOKUP_CATEGORIES)[number];

export interface NarrativeEntry {
  at: string; // ISO timestamp
  author: string;
  text: string;
}

export interface NotificationEntry {
  at: string | null;
  by: string | null;
  method: string | null;
}

export const NOTIFICATION_KEYS = [
  "it_vendor",
  "on_duty_sup",
  "director_oem",
  "chief_of_police",
  "fire_chief",
  "allegiance_ems",
  "polk_co_so",
  "tribal_admin",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export const NOTIFICATION_LABELS: Record<NotificationKey, string> = {
  it_vendor: "IT / CAD Vendor",
  on_duty_sup: "On-Duty Supervisor",
  director_oem: "Director, OEM",
  chief_of_police: "Chief of Police",
  fire_chief: "Fire Chief",
  allegiance_ems: "Allegiance EMS",
  polk_co_so: "Polk County Sheriff's Office",
  tribal_admin: "Tribal Administrator",
};

export type NotificationsLog = Partial<Record<NotificationKey, NotificationEntry>>;
