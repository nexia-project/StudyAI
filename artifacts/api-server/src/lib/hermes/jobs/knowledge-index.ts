import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/** Contagem de documentos pai na base global (knowledge_documents). */
export async function countKnowledgeDocuments(): Promise<number> {
  try {
    const res = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE is_chunk = false OR is_chunk IS NULL
    `);
    return Number((res.rows[0] as { count?: number })?.count ?? 0);
  } catch {
    return 0;
  }
}
