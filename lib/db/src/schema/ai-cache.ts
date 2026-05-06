import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const aiCacheTable = pgTable("ai_cache", {
  id:            serial("id").primaryKey(),
  questionHash:  text("question_hash").notNull().unique(),
  questionText:  text("question_text").notNull(),
  responseText:  text("response_text").notNull(),
  slidesJson:    text("slides_json"),
  modelUsed:     text("model_used").notNull(),
  taskType:      text("task_type").notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});
