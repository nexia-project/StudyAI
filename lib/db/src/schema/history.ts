import { sql } from "drizzle-orm";
import { pgTable, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const studyPlansTable = pgTable("study_plans", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  materia: varchar("materia", { length: 255 }).notNull(),
  serie: varchar("serie", { length: 100 }),
  diasProva: integer("dias_prova"),
  plan: jsonb("plan").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const simuladoResultsTable = pgTable("simulado_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studyPlanId: varchar("study_plan_id").references(() => studyPlansTable.id, { onDelete: "set null" }),
  materia: varchar("materia", { length: 255 }).notNull(),
  titulo: varchar("titulo", { length: 500 }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  timeTaken: integer("time_taken"),
  nota: varchar("nota", { length: 10 }),
  answers: jsonb("answers"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flashcardSessionsTable = pgTable("flashcard_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studyPlanId: varchar("study_plan_id").references(() => studyPlansTable.id, { onDelete: "set null" }),
  materia: varchar("materia", { length: 255 }).notNull(),
  diaNumero: integer("dia_numero"),
  totalCards: integer("total_cards").notNull(),
  known: integer("known").notNull(),
  unknown: integer("unknown").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userActivityTable = pgTable("user_activity", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studyDate: varchar("study_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserActivity = typeof userActivityTable.$inferSelect;

export const waitlistTable = pgTable("waitlist", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  source: varchar("source", { length: 100 }).default("landing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Waitlist = typeof waitlistTable.$inferSelect;
export type InsertWaitlist = typeof waitlistTable.$inferInsert;

export const corporateLeadsTable = pgTable("corporate_leads", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  institution: varchar("institution", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  students: varchar("students", { length: 50 }),
  message: varchar("message", { length: 1000 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CorporateLead = typeof corporateLeadsTable.$inferSelect;
export type InsertCorporateLead = typeof corporateLeadsTable.$inferInsert;

export type StudyPlan = typeof studyPlansTable.$inferSelect;
export type InsertStudyPlan = typeof studyPlansTable.$inferInsert;
export type SimuladoResult = typeof simuladoResultsTable.$inferSelect;
export type InsertSimuladoResult = typeof simuladoResultsTable.$inferInsert;
export type FlashcardSession = typeof flashcardSessionsTable.$inferSelect;
export type InsertFlashcardSession = typeof flashcardSessionsTable.$inferInsert;
