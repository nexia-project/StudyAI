import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

// ─── Turmas (class groups created by teachers) ───────────────────────────────
export const turmasTable = pgTable("turmas", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  institutionId: varchar("institution_id", { length: 36 }),
  name: varchar("name", { length: 255 }).notNull(),
  serie: varchar("serie", { length: 100 }),
  subject: varchar("subject", { length: 255 }),
  description: varchar("description", { length: 1000 }),
  inviteCode: varchar("invite_code", { length: 20 }).unique().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Turma = typeof turmasTable.$inferSelect;
export type InsertTurma = typeof turmasTable.$inferInsert;

// ─── Turma memberships (students enrolled in a turma) ────────────────────────
export const turmaMembershipsTable = pgTable("turma_memberships", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  turmaId: varchar("turma_id", { length: 36 }).notNull().references(() => turmasTable.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TurmaMembership = typeof turmaMembershipsTable.$inferSelect;

// ─── Turma tasks (assignments for a turma) ────────────────────────────────────
export const turmaTarefasTable = pgTable("turma_tarefas", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  turmaId: varchar("turma_id", { length: 36 }).notNull().references(() => turmasTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: varchar("description", { length: 2000 }),
  materia: varchar("materia", { length: 255 }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TurmaTarefa = typeof turmaTarefasTable.$inferSelect;
export type InsertTurmaTarefa = typeof turmaTarefasTable.$inferInsert;

// ─── Instituições ─────────────────────────────────────────────────────────────
export const instituicoesTable = pgTable("instituicoes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 1000 }),
  primaryColor: varchar("primary_color", { length: 20 }).default("#6366f1"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  cnpj: varchar("cnpj", { length: 20 }),
  adminUserId: varchar("admin_user_id").references(() => usersTable.id),
  // B2B / contract fields
  planType: varchar("plan_type", { length: 50 }).default("trial"),
  contractStart: timestamp("contract_start", { withTimezone: true }),
  contractEnd: timestamp("contract_end", { withTimezone: true }),
  maxUsers: integer("max_users").default(100),
  maxTeachers: integer("max_teachers").default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Instituicao = typeof instituicoesTable.$inferSelect;
export type InsertInstituicao = typeof instituicoesTable.$inferInsert;

// ─── Institution users (user ↔ institution roles) ─────────────────────────────
export const institutionUsersTable = pgTable("institution_users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id", { length: 36 }).notNull().references(() => instituicoesTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("teacher"),
  isApproved: boolean("is_approved").default(false),
  invitedBy: varchar("invited_by"),
  inviteEmail: varchar("invite_email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InstitutionUser = typeof institutionUsersTable.$inferSelect;

// ─── Institution invites (pending invitations by email) ───────────────────────
export const institutionInvitesTable = pgTable("institution_invites", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id", { length: 36 }).notNull().references(() => instituicoesTable.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("teacher"),
  token: varchar("token", { length: 64 }).notNull(),
  invitedBy: varchar("invited_by"),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InstitutionInvite = typeof institutionInvitesTable.$inferSelect;
