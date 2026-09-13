import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** rCloud database schema — PostgreSQL (Neon/Supabase-compatible on Netlify). */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // governor | vice_governor | board_member
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  url: text("url").notNull(),
  icon: text("icon").notNull().default("folder"),
  tags: text("tags").notNull().default(""),
  internal: boolean("internal").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const officers = pgTable("officers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  portfolio: text("portfolio"),
  description: text("description").notNull().default(""),
  photoUrl: text("photo_url"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Program"),
  status: text("status").notNull().default("Pending"), // Pending|Ongoing|Completed|Cancelled
  date: timestamp("date"),
  approvedBudget: integer("approved_budget").notNull().default(0),
  actualExpenditure: integer("actual_expenditure").notNull().default(0),
  projectLead: text("project_lead"),
  imageUrl: text("image_url"),
  documentLinks: text("document_links").notNull().default(""), // one external URL per line
  transparencyNotes: text("transparency_notes").notNull().default(""),
  published: boolean("published").notNull().default(true),
  /** Head-admin review state for Board-Member project requests: pending | approved | rejected. */
  approvalStatus: text("approval_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("Advisory"),
  imageUrl: text("image_url"),
  externalUrl: text("external_url"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const budget = pgTable("budget", {
  id: integer("id").primaryKey().default(1),
  totalBudget: integer("total_budget").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** One row per Google Sheet tab; each tab is one date/date-range period. */
export const constituencyPeriods = pgTable("constituency_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** The Sheet tab name, displayed verbatim as the date/date-range. */
  label: text("label").notNull().unique(),
  safe: integer("safe").notNull().default(0),
  baha: integer("baha").notNull().default(0),
  internet: integer("internet").notNull().default(0),
  /** Sheet tab order, preserved so the selector matches the Sheet. */
  position: integer("position").notNull().default(0),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

/** Single-row settings for the Constituency Google Sheet integration. */
export const constituencySettings = pgTable("constituency_settings", {
  id: integer("id").primaryKey().default(1),
  sheetId: text("sheet_id").notNull().default(""),
  lastSyncedAt: timestamp("last_synced_at"),
  lastError: text("last_error").notNull().default(""),
  /** Per-tab problems from the most recent refresh, one per line. */
  tabErrors: text("tab_errors").notNull().default(""),
  tabCount: integer("tab_count").notNull().default(0),
});

/** Single-row settings for the Roomivility Google Sheet integration. */
export const roomfinderSettings = pgTable("roomfinder_settings", {
  id: integer("id").primaryKey().default(1),
  sheetId: text("sheet_id").notNull().default(""),
  lastSyncedAt: timestamp("last_synced_at"),
  lastError: text("last_error").notNull().default(""),
  /** Per-tab problems from the most recent refresh, one per line. */
  tabErrors: text("tab_errors").notNull().default(""),
  tabCount: integer("tab_count").notNull().default(0),
  entryCount: integer("entry_count").notNull().default(0),
});

/** Roomivility schedule entries synced from the Sheet (tabs = Room No). */
export const roomfinderEntries = pgTable("roomfinder_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  room: text("room").notNull(),
  day: text("day").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  course: text("course"),
  section: text("section"),
  instructor: text("instructor"),
  building: text("building"),
  position: integer("position").notNull().default(0),
});

/** Single-row site visibility toggles (Head Admin only). */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  showRoomfinder: boolean("show_roomfinder").notNull().default(true),
  showAnnouncements: boolean("show_announcements").notNull().default(true),
  showResources: boolean("show_resources").notNull().default(true),
  showTransparency: boolean("show_transparency").notNull().default(true),
  showProjects: boolean("show_projects").notNull().default(true),
  showConstituency: boolean("show_constituency").notNull().default(true),
  showOfficers: boolean("show_officers").notNull().default(true),
  showAbout: boolean("show_about").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
