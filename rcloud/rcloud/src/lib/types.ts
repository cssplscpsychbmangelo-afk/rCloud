/**
 * rCloud data models — mirrored from the PostgreSQL schema
 * (src/lib/server/schema.ts). The public UI consumes these shapes;
 * the database is the source of truth and the admin manages it.
 */

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  internal?: boolean;
  category: string;
  icon: string;
  tags: string[];
  featured: boolean;
  active: boolean;
  displayOrder: number;
}

export type ProjectStatus = "Pending" | "Ongoing" | "Completed" | "Cancelled";

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ProjectStatus;
  date: string | null;
  /** amounts in PHP */
  approvedBudget: number;
  actualExpenditure: number;
  projectLead: string | null;
  imageUrl: string | null;
  documentLinks: string[];
  transparencyNotes: string;
  published: boolean;
}

export interface BudgetSummary {
  totalBudget: number;
  allocated: number;
  utilized: number;
  remaining: number;
  period: string;
}

export interface Officer {
  id: string;
  name: string;
  position: string;
  portfolio: string | null;
  description: string;
  photoUrl: string | null;
  displayOrder: number;
  active: boolean;
}

/**
 * One published availability block for an officer (duty / consultation hours).
 *
 * Two shapes are supported because a council order can publish either:
 *  - `day` set        → repeats every week on that weekday ("weekly")
 *  - `date` set       → happens once on that calendar date ("date")
 * Times are 24-hour "HH:MM" and every field is displayed verbatim.
 */
export interface OfficerAvailability {
  id: string;
  officerId: string;
  kind: "weekly" | "date";
  /** Monday…Sunday when `kind` is "weekly", otherwise "". */
  day: string;
  /** "YYYY-MM-DD" when `kind` is "date", otherwise "". */
  date: string;
  /** 24-hour "HH:MM". */
  start: string;
  end: string;
  /** Where the officer can be found (empty when the source gives none). */
  location: string;
  /** Free note shown verbatim (empty when the source gives none). */
  note: string;
}

export interface ConstituencyPeriod {
  id: string;
  /** Google Sheet tab name — displayed verbatim as the date/date-range. */
  label: string;
  safe: number;
  baha: number;
  internet: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  externalUrl: string | null;
  featured: boolean;
  date: string;
}

export interface ContactLink {
  id: string;
  label: string;
  value: string;
  href: string;
  icon: "facebook" | "phone" | "mail";
}
