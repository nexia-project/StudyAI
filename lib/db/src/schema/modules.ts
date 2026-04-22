import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
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

// ─── Role access requests (professor / government) ────────────────────────────
export const roleRequestsTable = pgTable("role_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  requestedRole: varchar("requested_role", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // Professor fields
  school: varchar("school", { length: 255 }),
  subject: varchar("subject", { length: 255 }),
  // Government fields
  organ: varchar("organ", { length: 255 }),
  position: varchar("position", { length: 255 }),
  cpf: varchar("cpf", { length: 20 }),
  // Common
  message: varchar("message", { length: 1000 }),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoleRequest = typeof roleRequestsTable.$inferSelect;

// ─── Banco de Questões (teacher's personal question bank) ─────────────────────
export const questionBankTable = pgTable("question_bank", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  materia: varchar("materia", { length: 100 }).notNull(),
  tema: varchar("tema", { length: 255 }).notNull(),
  nivel: varchar("nivel", { length: 50 }).default("Médio"),
  text: text("text").notNull(),
  context: text("context"),
  alternatives: jsonb("alternatives").notNull(),
  correct: integer("correct").notNull().default(0),
  explanation: text("explanation"),
  imageDescription: text("image_description"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuestionBank = typeof questionBankTable.$inferSelect;
export type InsertQuestionBank = typeof questionBankTable.$inferInsert;

// ─── Atividades (teacher sends activities to turmas) ──────────────────────────
export const activitiesTable = pgTable("activities", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  turmaId: varchar("turma_id", { length: 36 }).references(() => turmasTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().default("prova"),
  content: jsonb("content").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Activity = typeof activitiesTable.$inferSelect;
export type InsertActivity = typeof activitiesTable.$inferInsert;

// ─── Activity Submissions (student submissions for teacher activities) ─────────
export const activitySubmissionsTable = pgTable("activity_submissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id", { length: 36 }).notNull().references(() => activitiesTable.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers"),
  score: integer("score"),
  total: integer("total"),
  timeSpentSeconds: integer("time_spent_seconds"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivitySubmission = typeof activitySubmissionsTable.$inferSelect;

// ─── Redações (essay submissions with AI correction) ──────────────────────────
export const redacoesTable = pgTable("redacoes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tema: varchar("tema", { length: 500 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).default("enem"),
  texto: text("texto").notNull(),
  correction: jsonb("correction"),
  scoreTotal: integer("score_total"),
  comp1: integer("comp1"),
  comp2: integer("comp2"),
  comp3: integer("comp3"),
  comp4: integer("comp4"),
  comp5: integer("comp5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Redacao = typeof redacoesTable.$inferSelect;
export type InsertRedacao = typeof redacoesTable.$inferInsert;

// ─── Study Schedules (adaptive study plans) ───────────────────────────────────
export const studySchedulesTable = pgTable("study_schedules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetDate: timestamp("target_date", { withTimezone: true }),
  targetScore: integer("target_score"),
  hoursPerDay: integer("hours_per_day").default(2),
  objetivo: varchar("objetivo", { length: 200 }),
  materiasFocais: jsonb("materias_focais"),
  schedule: jsonb("schedule"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudySchedule = typeof studySchedulesTable.$inferSelect;
export type InsertStudySchedule = typeof studySchedulesTable.$inferInsert;

// ─── Caderno Digital (student notes with AI processing) ───────────────────────
export const cadernoNotesTable = pgTable("caderno_notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  materia: varchar("materia", { length: 100 }),
  tags: jsonb("tags"),
  processedContent: jsonb("processed_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CadernoNote = typeof cadernoNotesTable.$inferSelect;
export type InsertCadernoNote = typeof cadernoNotesTable.$inferInsert;

// ─── AI Cost Log (tracks token usage + cost per AI call) ─────────────────────
export const aiCostLogTable = pgTable("ai_cost_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }),
  feature: varchar("feature", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costUsd: text("cost_usd").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiCostLog = typeof aiCostLogTable.$inferSelect;
export type InsertAiCostLog = typeof aiCostLogTable.$inferInsert;
