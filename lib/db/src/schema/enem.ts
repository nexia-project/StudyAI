import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/** Questões ENEM (MC) persistidas para o simulado — payload espelha `EnemQuestao`. */
export const enemQuestionsTable = pgTable("enem_questions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  ano: integer("ano").notNull(),
  area: varchar("area", { length: 2 }).notNull(),
  disciplina: varchar("disciplina", { length: 120 }),
  questao: jsonb("questao").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type EnemQuestionRow = typeof enemQuestionsTable.$inferSelect;
export type InsertEnemQuestionRow = typeof enemQuestionsTable.$inferInsert;
