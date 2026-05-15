import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

// ─── hermes_memoria_interacao ────────────────────────────────────────────────
// Per-user, per-agent interaction memory (every query a founder/admin sends to
// a Hermes agent and the answer the agent produced). Used both for audit and
// as context for future calls.
export const hermesMemoriaInteracaoTable = pgTable("hermes_memoria_interacao", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id", { length: 100 }).notNull(),
  contexto: text("contexto").notNull(),
  resposta: text("resposta").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── hermes_descobertas_globais ──────────────────────────────────────────────
// Global learnings emitted by agents during daily-learn jobs. Not scoped to a
// single user — these are insights about the platform as a whole.
export const hermesDescobertasGlobaisTable = pgTable("hermes_descobertas_globais", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 100 }).notNull(),
  descoberta: text("descoberta").notNull(),
  evidencia: jsonb("evidencia"),
  importancia: integer("importancia").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── hermes_acoes_proativas ──────────────────────────────────────────────────
// Proactive recommendations emitted by the hourly-proactive cron. May target
// a specific user (userId set) or the whole platform (userId null).
export const hermesAcoesProativasTable = pgTable("hermes_acoes_proativas", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 100 }).notNull(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  descricao: text("descricao").notNull(),
  payload: jsonb("payload"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  executadoEm: timestamp("executado_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HermesMemoriaInteracao = typeof hermesMemoriaInteracaoTable.$inferSelect;
export type InsertHermesMemoriaInteracao = typeof hermesMemoriaInteracaoTable.$inferInsert;

export type HermesDescobertaGlobal = typeof hermesDescobertasGlobaisTable.$inferSelect;
export type InsertHermesDescobertaGlobal = typeof hermesDescobertasGlobaisTable.$inferInsert;

export type HermesAcaoProativa = typeof hermesAcoesProativasTable.$inferSelect;
export type InsertHermesAcaoProativa = typeof hermesAcoesProativasTable.$inferInsert;

// ─── hermes_admin_inbox ──────────────────────────────────────────────────────
// Notificações para admins (listadas via agente inbox; outros agentes/crons INSERT).
export const hermesAdminInboxTable = pgTable("hermes_admin_inbox", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  corpo: text("corpo").notNull(),
  payload: jsonb("payload"),
  lida: boolean("lida").notNull().default(false),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HermesAdminInbox = typeof hermesAdminInboxTable.$inferSelect;
export type InsertHermesAdminInbox = typeof hermesAdminInboxTable.$inferInsert;
